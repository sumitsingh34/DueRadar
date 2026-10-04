import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PickedPhoto } from '@/attachments/pick';
import { attachmentUri } from '@/attachments/storage';
import { Button } from '@/components/form-controls';
import { ItemForm } from '@/components/item-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getReceipt, setReceipt } from '@/db/attachments';
import { deleteItem, getItem, getPriceHistory, setDueDate, updateItem } from '@/db/items';
import { addInterval, formatDate, todayISO } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { dueLabel, toDueItem } from '@/domain/summary';
import type { Item, PricePoint } from '@/domain/types';
import { confirmAsync, showMessage } from '@/utils/confirm';
import { goBack } from '@/utils/navigation';

/** Manual renewals can be confirmed this many days before they are due. */
const RENEW_WINDOW_DAYS = 30;

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  // undefined while loading, null when the item does not exist.
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [receipt, setReceiptPhoto] = useState<PickedPhoto | null>(null);
  // Bumped to reload the item after it changes on this screen.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const found = await getItem(db, Number(id));
      const prices = found ? await getPriceHistory(db, found.id) : [];
      const attachment = found ? await getReceipt(db, found.id) : null;
      if (active) {
        setItem(found);
        setHistory(prices);
        setReceiptPhoto(
          attachment ? { uri: attachmentUri(attachment.path), mimeType: attachment.mimeType } : null,
        );
      }
    })().catch((error) => console.error('Failed to load item', error));
    return () => {
      active = false;
    };
  }, [db, id, version]);

  if (item === undefined) return <ThemedView style={styles.fill} />;

  if (item === null) {
    return (
      <ThemedView style={[styles.fill, styles.centered]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This item no longer exists.</ThemedText>
        <Button title="Go back" variant="secondary" onPress={goBack} />
      </ThemedView>
    );
  }

  const due = toDueItem(item, todayISO());
  const canMarkRenewed =
    item.status === 'active' &&
    item.scheduleType === 'recurring' &&
    !item.autoRenew &&
    item.dueDate != null &&
    item.intervalUnit != null &&
    item.intervalCount != null &&
    due != null &&
    due.daysUntil <= RENEW_WINDOW_DAYS;

  const markRenewed = async () => {
    if (!item.dueDate || !item.intervalUnit || !item.intervalCount) return;
    await setDueDate(db, item.id, addInterval(item.dueDate, item.intervalUnit, item.intervalCount));
    setVersion((v) => v + 1);
  };

  const remove = async () => {
    const confirmed = await confirmAsync(
      `Delete ${item.name}?`,
      'Its price history and any receipt will be deleted too. This can’t be undone.',
      'Delete',
    );
    if (!confirmed) return;
    await deleteItem(db, item.id);
    goBack();
  };

  const header =
    due || history.length > 1 ? (
      <ThemedView type="backgroundElement" style={styles.card}>
        {due && item.status === 'active' ? (
          <ThemedText themeColor={due.daysUntil < 0 ? 'danger' : 'text'}>
            {dueLabel(due)} · {formatDate(due.dueDate)}
          </ThemedText>
        ) : null}
        {history.length > 1 ? (
          <View style={styles.history}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Price history
            </ThemedText>
            <ThemedText>
              {history.map((p) => formatMoney(p.amountCents, p.currency)).join(' → ')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Since {formatDate(history[0].effectiveDate)}
            </ThemedText>
          </View>
        ) : null}
        {canMarkRenewed ? <Button title="Mark as renewed" onPress={markRenewed} /> : null}
      </ThemedView>
    ) : null;

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ItemForm
        // Remount with fresh values after "Mark as renewed" changes the item.
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
  history: {
    gap: Spacing.half,
  },
});
