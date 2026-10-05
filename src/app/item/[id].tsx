import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PickedPhoto } from '@/attachments/pick';
import { attachmentUri } from '@/attachments/storage';
import { Button } from '@/components/form-controls';
import { Icon } from '@/components/icon';
import { ItemForm } from '@/components/item-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getReceipt, setReceipt } from '@/db/attachments';
import { onDataChanged } from '@/db/events';
import {
  deleteItem,
  getItem,
  getPriceHistory,
  listCompletions,
  markRenewed,
  updateItem,
} from '@/db/items';
import { ASSET_KINDS } from '@/domain/assets';
import { getCategory, recurringWording } from '@/domain/categories';
import { formatDate, todayISO } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { dueLabel, fullDueDate, toDueItem } from '@/domain/summary';
import type { Completion, Item, PricePoint } from '@/domain/types';
import { formatDistance } from '@/domain/usage';
import { useAssets } from '@/hooks/use-assets';
import { useTheme } from '@/hooks/use-theme';
import { confirmAsync, showMessage } from '@/utils/confirm';
import { goBack } from '@/utils/navigation';

/** Manual renewals can be confirmed this many days before they are due. */
const RENEW_WINDOW_DAYS = 30;
/** History entries shown; older ones are counted. */
const HISTORY_SHOWN = 5;

interface Loaded {
  item: Item | null;
  history: PricePoint[];
  completions: Completion[];
  receipt: PickedPhoto | null;
}

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const assetData = useAssets();
  // Undefined while loading.
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  // Reloads when the screen comes back into focus, e.g. after "Mark as done".
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const item = await getItem(db, Number(id));
        const [history, completions, attachment] = item
          ? await Promise.all([getPriceHistory(db, item.id), listCompletions(db, item.id), getReceipt(db, item.id)])
          : [[], [], null];
        if (!active) return;
        setLoaded({
          item,
          history,
          completions,
          receipt: attachment ? { uri: attachmentUri(attachment.path), mimeType: attachment.mimeType } : null,
        });
      };
      const reload = () => {
        load().catch((error) => console.error('Failed to load item', error));
      };
      reload();
      const unsubscribe = onDataChanged(reload);
      return () => {
        active = false;
        unsubscribe();
      };
    }, [db, id]),
  );

  if (loaded === undefined) return <ThemedView style={styles.fill} />;
  const { item, history, completions, receipt } = loaded;

  if (item === null) {
    return (
      <ThemedView style={[styles.fill, styles.centered]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This item no longer exists.</ThemedText>
        <Button title="Go back" variant="secondary" onPress={goBack} />
      </ThemedView>
    );
  }

  const asset = assetData?.assets.find((a) => a.id === item.assetId) ?? null;
  const usage = asset ? assetData?.usage.get(asset.id) : undefined;
  const due = toDueItem(item, todayISO(), assetData?.usage);
  const active = item.status === 'active';
  const canMarkRenewed =
    active &&
    item.scheduleType === 'recurring' &&
    !item.autoRenew &&
    item.dueDate != null &&
    item.intervalUnit != null &&
    item.intervalCount != null &&
    due != null &&
    due.daysUntil <= RENEW_WINDOW_DAYS;
  const canMarkDone = active && item.scheduleType === 'task';
  const renewal = recurringWording(getCategory(item.category));

  const remove = async () => {
    const confirmed = await confirmAsync(
      `Delete ${item.name}?`,
      'Its history and any receipt will be deleted too. This can’t be undone.',
      'Delete',
    );
    if (!confirmed) return;
    await deleteItem(db, item.id);
    goBack();
  };

  const distanceUnit = item.usageUnit ?? asset?.usageUnit ?? null;
  const historyLine = (c: Completion) =>
    [
      formatDate(c.date),
      c.usage != null && distanceUnit ? formatDistance(c.usage, distanceUnit) : null,
      c.amountCents != null ? formatMoney(c.amountCents, c.currency ?? item.currency) : null,
      c.note,
    ]
      .filter(Boolean)
      .join(' · ');

  const showCard =
    (due && active) || history.length > 1 || completions.length > 0 || asset || canMarkDone;
  const header = showCard ? (
    <ThemedView type="backgroundElement" style={styles.card}>
      {due && active ? (
        <View style={styles.block}>
          <ThemedText themeColor={due.overdue ? 'danger' : due.past ? 'textSecondary' : 'text'}>
            {dueLabel(due)} · {fullDueDate(due)}
          </ThemedText>
          {due.distance ? (
            <ThemedText type="small" themeColor="textSecondary">
              Due at {formatDistance(due.distance.target, due.distance.unit)}
              {usage ? ` · odometer ${formatDistance(usage.reading, usage.unit)} on ${formatDate(usage.readingDate)}` : ''}
            </ThemedText>
          ) : item.nextUsage != null && item.usageUnit && asset ? (
            <ThemedText type="small" themeColor="textSecondary">
              Due at {formatDistance(item.nextUsage, item.usageUnit)}. Add an odometer reading to {asset.name} to
              track it.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {asset ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${asset.name}`}
          onPress={() => router.push({ pathname: '/asset/[id]', params: { id: String(asset.id) } })}
          style={({ pressed }) => [styles.assetLink, pressed && styles.pressed]}>
          <Icon name={asset.kind} color={ASSET_KINDS[asset.kind].color} size={18} />
          <ThemedText type="smallBold" style={styles.assetName}>
            {asset.name}
          </ThemedText>
          <Icon name="chevron" color={theme.textSecondary} size={16} />
        </Pressable>
      ) : null}

      {history.length > 1 ? (
        <View style={styles.block}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Price history
          </ThemedText>
          <ThemedText>{history.map((p) => formatMoney(p.amountCents, p.currency)).join(' → ')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Since {formatDate(history[0].effectiveDate)}
          </ThemedText>
        </View>
      ) : null}

      {completions.length > 0 ? (
        <View style={styles.block}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {item.scheduleType === 'task' ? 'Done' : renewal.history}
          </ThemedText>
          {completions.slice(0, HISTORY_SHOWN).map((c) => (
            <ThemedText key={c.id} type="small">
              {historyLine(c)}
            </ThemedText>
          ))}
          {completions.length > HISTORY_SHOWN ? (
            <ThemedText type="small" themeColor="textSecondary">
              and {completions.length - HISTORY_SHOWN} more
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {canMarkDone ? (
        <Button
          title="Mark as done"
          onPress={() => router.push({ pathname: '/item/done/[id]', params: { id: String(item.id) } })}
        />
      ) : null}
      {canMarkRenewed ? (
        <Button
          title={renewal.confirm}
          onPress={() => {
            markRenewed(db, item).catch((error) => showMessage('Couldn’t save', String(error)));
          }}
        />
      ) : null}
    </ThemedView>
  ) : null;

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ItemForm
        // Remount with fresh values after the item changes, e.g. "Mark as renewed".
        key={item.updatedAt}
        initial={item}
        initialReceipt={receipt}
        submitLabel="Save changes"
        onSubmit={async (input, receiptChange) => {
          await updateItem(db, item.id, input);
          if (receiptChange.changed) {
            try {
              await setReceipt(db, item.id, receiptChange.photo);
            } catch (error) {
              showMessage('Saved, but the receipt wasn’t', error instanceof Error ? error.message : String(error));
            }
          }
          goBack();
        }}
        header={header}
        footer={<Button title="Delete item" variant="danger" onPress={remove} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  block: {
    gap: Spacing.half,
  },
  assetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  assetName: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
