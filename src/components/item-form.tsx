import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { Button, ChipGroup, FormField, TextField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AVAILABLE_CATEGORIES, getCategory, type CategoryId } from '@/domain/categories';
import {
  DEFAULT_FREQUENCY,
  FREQUENCY_PRESETS,
  frequencyLabel,
  type Frequency,
} from '@/domain/frequency';
import { centsToInput, DEFAULT_CURRENCY, parseAmountInput } from '@/domain/money';
import type { ItemInput, ItemStatus } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

type FormSchedule = 'recurring' | 'expiry';

const SCHEDULE_OPTIONS = [
  { value: 'recurring', label: 'Renews' },
  { value: 'expiry', label: 'Expires once' },
] as const;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const frequencyKey = (f: Frequency) => `${f.unit}:${f.count}`;

interface ItemFormProps {
  initial?: ItemInput;
  submitLabel: string;
  onSubmit: (input: ItemInput) => Promise<void>;
  /** Extra content shown above the fields, e.g. renewal status. */
  header?: ReactNode;
  /** Extra content shown below the save button, e.g. a delete button. */
  footer?: ReactNode;
}

type Errors = Partial<Record<'name' | 'amount' | 'dueDate', string>>;

export function ItemForm({ initial, submitLabel, onSubmit, header, footer }: ItemFormProps) {
  const theme = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'subscription');
  const [schedule, setSchedule] = useState<FormSchedule>(
    initial?.scheduleType === 'expiry' ? 'expiry' : 'recurring',
  );
  const [amount, setAmount] = useState(
    initial?.amountCents != null ? centsToInput(initial.amountCents) : '',
  );
  const [frequency, setFrequency] = useState<Frequency>(
    initial?.intervalUnit && initial.intervalCount
      ? { unit: initial.intervalUnit, count: initial.intervalCount }
      : DEFAULT_FREQUENCY,
  );
  const [dueDate, setDueDate] = useState<string | null>(initial?.dueDate ?? null);
  const [autoRenew, setAutoRenew] = useState(initial?.autoRenew ?? true);
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? 'active');
  const [provider, setProvider] = useState(initial?.provider ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const recurring = schedule === 'recurring';

  // Keep an unusual saved frequency selectable alongside the presets.
  const frequencyOptions = FREQUENCY_PRESETS.map((p) => ({ value: frequencyKey(p), label: p.label }));
  if (!frequencyOptions.some((o) => o.value === frequencyKey(frequency))) {
    frequencyOptions.push({ value: frequencyKey(frequency), label: frequencyLabel(frequency) });
  }

  const chooseCategory = (id: CategoryId) => {
    setCategory(id);
    // New items follow the category's usual schedule; edits keep what the user chose.
    if (!initial) {
      const defaultSchedule = getCategory(id).defaultSchedule;
      setSchedule(defaultSchedule === 'expiry' ? 'expiry' : 'recurring');
    }
  };

  const submit = async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter a name.';
    let amountCents: number | null = null;
    if (amount.trim()) {
      amountCents = parseAmountInput(amount);
      if (amountCents == null) next.amount = 'Enter an amount like 15.99.';
    }
    if (!dueDate) {
      next.dueDate = recurring ? 'Choose the next renewal date.' : 'Choose the expiry date.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({
        name,
        category,
        scheduleType: schedule,
        amountCents,
        currency: initial?.currency ?? DEFAULT_CURRENCY,
        intervalUnit: recurring ? frequency.unit : null,
        intervalCount: recurring ? frequency.count : null,
        dueDate,
        autoRenew: recurring && autoRenew,
        status,
        provider,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.form}>
        {header}
        <FormField label="Name" error={errors.name}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Netflix, Costco, car insurance…"
            accessibilityLabel="Name"
            autoFocus={!initial}
            returnKeyType="next"
          />
        </FormField>

        <FormField label="Category">
          <ChipGroup
            accessibilityLabel="Category"
            options={AVAILABLE_CATEGORIES.map((c) => ({ value: c.id, label: c.label, color: c.color }))}
            value={category}
            onChange={chooseCategory}
          />
        </FormField>

        <FormField label="Type">
          <ChipGroup
            accessibilityLabel="Type"
            options={SCHEDULE_OPTIONS}
            value={schedule}
            onChange={setSchedule}
          />
        </FormField>

        <FormField label={recurring ? 'Cost per renewal' : 'Price paid (optional)'} error={errors.amount}>
          <TextField
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            accessibilityLabel={recurring ? 'Cost per renewal' : 'Price paid'}
          />
        </FormField>

        {recurring ? (
          <FormField label="How often">
            <ChipGroup
              accessibilityLabel="How often"
              options={frequencyOptions}
              value={frequencyKey(frequency)}
              onChange={(key) => {
                const [unit, count] = key.split(':');
                setFrequency({ unit: unit as Frequency['unit'], count: Number(count) });
              }}
            />
          </FormField>
        ) : null}

        <FormField label={recurring ? 'Next renewal date' : 'Expiry date'} error={errors.dueDate}>
          <DateField
            value={dueDate}
            onChange={setDueDate}
            accessibilityLabel={recurring ? 'Next renewal date' : 'Expiry date'}
          />
        </FormField>

        {recurring ? (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText>Renews automatically</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {autoRenew
                  ? 'The renewal date moves forward on its own.'
                  : 'Shown as overdue until you mark it renewed.'}
              </ThemedText>
            </View>
            <Switch
              value={autoRenew}
              onValueChange={setAutoRenew}
              accessibilityLabel="Renews automatically"
              trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
            />
          </View>
        ) : null}

        {initial ? (
          <FormField label="Status">
            <ChipGroup
              accessibilityLabel="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </FormField>
        ) : null}

        <FormField label="Company or store (optional)">
          <TextField
            value={provider}
            onChangeText={setProvider}
            placeholder="Who you pay"
            accessibilityLabel="Company or store"
          />
        </FormField>

        <FormField label="Notes (optional)">
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Plan, account email, cancellation steps…"
            accessibilityLabel="Notes"
            multiline
            style={styles.notes}
          />
        </FormField>

        <Button title={saving ? 'Saving…' : submitLabel} onPress={submit} disabled={saving} />
        {footer}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: Spacing.half,
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
