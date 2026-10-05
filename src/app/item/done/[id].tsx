import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { Button, FormField, TextField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { completeTask, getItem } from '@/db/items';
import { nextAfterDone } from '@/domain/completion';
import { formatDate, todayISO } from '@/domain/dates';
import { centsToInput, parseAmountInput } from '@/domain/money';
import type { Asset, Item } from '@/domain/types';
import { formatDistance, parseDistanceInput, type VehicleUsage } from '@/domain/usage';
import { useAssets } from '@/hooks/use-assets';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { showMessage } from '@/utils/confirm';
import { goBack } from '@/utils/navigation';

/** Records that a task was done, and moves it to its next date and distance. */
export default function MarkDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const data = useAssets();
  // undefined while loading, null when the item does not exist.
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getItem(db, Number(id))
      .then((found) => {
        if (active) setItem(found);
      })
      .catch((error) => console.error('Failed to load item', error));
    return () => {
      active = false;
    };
  }, [db, id]);

  if (item === undefined || !data) return <ThemedView style={styles.fill} />;

  if (item === null || item.scheduleType !== 'task') {
    return (
      <ThemedView style={[styles.fill, styles.centered]}>
        <ThemedText themeColor="textSecondary">This item no longer exists.</ThemedText>
        <Button title="Go back" variant="secondary" onPress={goBack} />
      </ThemedView>
    );
  }

  const asset = data.assets.find((a) => a.id === item.assetId) ?? null;
  return (
    <>
      <Stack.Screen options={{ title: `${item.name}: done` }} />
      <DoneForm item={item} asset={asset} usage={asset ? data.usage.get(asset.id) : undefined} />
    </>
  );
}

type Errors = Partial<Record<'date' | 'usage' | 'amount', string>>;

function DoneForm({
  item,
  asset,
  usage,
}: {
  item: Item;
  asset: Asset | null;
  usage: VehicleUsage | undefined;
}) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [reading, setReading] = useState('');
  const [amount, setAmount] = useState(item.amountCents != null ? centsToInput(item.amountCents) : '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const leave = useUnsavedChanges({
    values: { date, reading, amount, note },
    saving,
    save: () => submit(),
  });

  const vehicle = asset?.kind === 'vehicle' ? asset : null;
  const unit = vehicle?.usageUnit ?? 'km';
  // A reading is needed to work out the next distance; otherwise it's optional.
  const needsReading = vehicle != null && item.usageInterval != null;
  const parsedReading = parseDistanceInput(reading);
  const next = nextAfterDone(item, date, parsedReading);

  const preview = [
    next.dueDate ? formatDate(next.dueDate) : null,
    needsReading && parsedReading != null && next.nextUsage != null
      ? `at ${formatDistance(next.nextUsage, unit)}`
      : null,
  ]
    .filter(Boolean)
    .join(' or ');

  const submit = async () => {
    const nextErrors: Errors = {};
    if (date > today) nextErrors.date = 'This is in the future.';
    let usageValue: number | null = null;
    if (reading.trim()) {
      usageValue = parsedReading;
      if (usageValue == null) nextErrors.usage = 'Enter a whole number, like 45000.';
    } else if (needsReading) {
      nextErrors.usage = 'Enter the odometer reading, so the next distance can be worked out.';
    }
    let amountCents: number | null = null;
    if (amount.trim()) {
      amountCents = parseAmountInput(amount);
      if (amountCents == null) nextErrors.amount = 'Enter an amount like 45.00.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await completeTask(db, item, { date, usage: usageValue, amountCents, note });
    } catch (error) {
      showMessage('Couldn’t save', error instanceof Error ? error.message : String(error));
      return;
    } finally {
      setSaving(false);
    }
    leave();
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.form}>
        <FormField label="Done on" error={errors.date}>
          <DateField value={date} onChange={setDate} accessibilityLabel="Done on" />
        </FormField>

        {vehicle ? (
          <FormField
            label={`Odometer (${unit}${needsReading ? '' : ', optional'})`}
            error={errors.usage}>
            <TextField
              value={reading}
              onChangeText={setReading}
              placeholder={usage ? String(usage.reading) : '45000'}
              keyboardType="number-pad"
              accessibilityLabel={`Odometer reading, in ${unit}`}
            />
            {usage ? (
              <ThemedText type="small" themeColor="textSecondary">
                Last reading: {formatDistance(usage.reading, usage.unit)} on {formatDate(usage.readingDate)}.
              </ThemedText>
            ) : null}
          </FormField>
        ) : null}

        <FormField label={`Cost (${item.currency}, optional)`} error={errors.amount}>
          <TextField
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            accessibilityLabel="Cost"
          />
        </FormField>

        <FormField label="Note (optional)">
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder="Who did it, parts used…"
            accessibilityLabel="Note"
            multiline
            style={styles.note}
          />
        </FormField>

        {preview ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Next due
            </ThemedText>
            <ThemedText>{preview}</ThemedText>
          </ThemedView>
        ) : null}

        <Button title={saving ? 'Saving…' : 'Mark as done'} onPress={submit} disabled={saving} />
      </View>
    </ScrollView>
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
  scroll: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  card: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  note: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
