import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { PickedPhoto } from '@/attachments/pick';
import { attachmentsSupported } from '@/attachments/storage';
import { DateField } from '@/components/date-field';
import {
  Button,
  ChipButtons,
  ChipGroup,
  FormField,
  SwitchRow,
  TextField,
} from '@/components/form-controls';
import { ReceiptField } from '@/components/receipt-field';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AVAILABLE_CATEGORIES, getCategory, type CategoryId } from '@/domain/categories';
import { addInterval, todayISO } from '@/domain/dates';
import {
  DEFAULT_FREQUENCY,
  FREQUENCY_PRESETS,
  frequencyLabel,
  type Frequency,
} from '@/domain/frequency';
import { centsToInput, DEFAULT_CURRENCY, parseAmountInput } from '@/domain/money';
import { findTemplates, POPULAR_TEMPLATES, TEMPLATES, type ItemTemplate } from '@/domain/templates';
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

/** Warranty length shortcuts; picking one sets the end date from the purchase date. */
const WARRANTY_YEARS = [1, 2, 3, 5] as const;

/** What happened to the receipt photo while the form was open. */
export interface ReceiptChange {
  photo: PickedPhoto | null;
  changed: boolean;
}

interface ItemFormProps {
  initial?: ItemInput;
  /** The item's saved receipt photo, if it has one. */
  initialReceipt?: PickedPhoto | null;
  /** Currency for a new item. Edits keep the item's own currency. */
  defaultCurrency?: string;
  submitLabel: string;
  onSubmit: (input: ItemInput, receipt: ReceiptChange) => Promise<void>;
  /** Extra content shown above the fields, e.g. renewal status. */
  header?: ReactNode;
  /** Extra content shown below the save button, e.g. a delete button. */
  footer?: ReactNode;
}

type Errors = Partial<Record<'name' | 'amount' | 'dueDate', string>>;

export function ItemForm({
  initial,
  initialReceipt = null,
  defaultCurrency,
  submitLabel,
  onSubmit,
  header,
  footer,
}: ItemFormProps) {
  const theme = useTheme();
  const currency = initial?.currency ?? defaultCurrency ?? DEFAULT_CURRENCY;
  const [name, setName] = useState(initial?.name ?? '');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
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
  const [startDate, setStartDate] = useState<string | null>(initial?.startDate ?? null);
  const [dueDate, setDueDate] = useState<string | null>(initial?.dueDate ?? null);
  const [warrantyYears, setWarrantyYears] = useState<number | null>(() =>
    initial?.startDate && initial.dueDate
      ? (WARRANTY_YEARS.find((y) => addInterval(initial.startDate!, 'year', y) === initial.dueDate) ?? null)
      : null,
  );
  const [receipt, setReceipt] = useState<PickedPhoto | null>(initialReceipt);
  const [receiptChanged, setReceiptChanged] = useState(false);
  const [autoRenew, setAutoRenew] = useState(initial?.autoRenew ?? true);
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? 'active');
  const [provider, setProvider] = useState(initial?.provider ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const recurring = schedule === 'recurring';
  const categoryInfo = getCategory(category);
  const wording = categoryInfo.wording;
  // A start date (e.g. purchase date) only where the category has a name for it.
  const showStartDate = !recurring && wording?.startDate != null;
  const isWarranty = category === 'warranty' && !recurring;
  const dueDateLabel = recurring ? 'Next renewal date' : (wording?.expires ?? 'Expiry date');
  const providerLabel = wording?.provider ?? 'Company or store';

  const changeStartDate = (date: string) => {
    setStartDate(date);
    if (warrantyYears) setDueDate(addInterval(date, 'year', warrantyYears));
  };
  const changeDueDate = (date: string) => {
    setDueDate(date);
    setWarrantyYears(null);
  };
  const chooseWarrantyYears = (years: number) => {
    const start = startDate ?? todayISO();
    setStartDate(start);
    setWarrantyYears(years);
    setDueDate(addInterval(start, 'year', years));
  };
  const changeReceipt = (photo: PickedPhoto | null) => {
    setReceipt(photo);
    setReceiptChanged(true);
  };

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

  // Quick-add: popular picks before typing, matches while typing. New items only.
  const suggestions: readonly ItemTemplate[] = initial
    ? []
    : name.trim()
      ? findTemplates(name).filter((t) => t.name !== appliedTemplate)
      : POPULAR_TEMPLATES;

  const applyTemplate = (templateName: string) => {
    const template = TEMPLATES.find((t) => t.name === templateName);
    if (!template) return;
    setName(template.name);
    setCategory(template.category);
    setAppliedTemplate(template.name);
    if (template.frequency) {
      setSchedule('recurring');
      setFrequency(template.frequency);
      setAutoRenew(true);
    } else {
      setSchedule('expiry');
      chooseWarrantyYears(template.warrantyYears);
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
      next.dueDate = recurring
        ? 'Choose the next renewal date.'
        : isWarranty
          ? 'Choose when the warranty ends.'
          : 'Choose the expiry date.';
    } else if (showStartDate && startDate && dueDate < startDate) {
      next.dueDate = `This is before the ${wording?.startDate?.toLowerCase() ?? 'start date'}.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await onSubmit(
        {
          name,
          category,
          scheduleType: schedule,
          amountCents,
          currency,
          intervalUnit: recurring ? frequency.unit : null,
          intervalCount: recurring ? frequency.count : null,
          // Hidden fields keep what was saved before.
          startDate: showStartDate ? startDate : (initial?.startDate ?? null),
          dueDate,
          autoRenew: recurring && autoRenew,
          status,
          provider,
          notes,
        },
        { photo: receipt, changed: receiptChanged },
      );
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
            placeholder="Netflix, Costco, car insurance, laptop…"
            accessibilityLabel="Name"
            autoFocus={!initial}
            returnKeyType="next"
          />
          {suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              <ThemedText type="small" themeColor="textSecondary">
                {name.trim() ? 'Tap to fill in the details' : 'Popular'}
              </ThemedText>
              <ChipButtons
                accessibilityLabel="Suggestions"
                options={suggestions.map((t) => ({
                  value: t.name,
                  label: t.name,
                  color: getCategory(t.category).color,
                }))}
                onPress={applyTemplate}
              />
            </View>
          ) : null}
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

        <FormField
          label={recurring ? `Cost per renewal (${currency})` : `Price paid (${currency}, optional)`}
          error={errors.amount}>
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

        {showStartDate ? (
          <FormField label={`${wording?.startDate} (optional)`}>
            <DateField
              value={startDate}
              onChange={changeStartDate}
              accessibilityLabel={wording?.startDate}
            />
          </FormField>
        ) : null}

        {isWarranty ? (
          <FormField label="Warranty length">
            <ChipGroup
              accessibilityLabel="Warranty length"
              options={WARRANTY_YEARS.map((y) => ({
                value: String(y),
                label: y === 1 ? '1 year' : `${y} years`,
              }))}
              value={warrantyYears ? String(warrantyYears) : null}
              onChange={(value) => chooseWarrantyYears(Number(value))}
            />
          </FormField>
        ) : null}

        <FormField label={dueDateLabel} error={errors.dueDate}>
          <DateField value={dueDate} onChange={changeDueDate} accessibilityLabel={dueDateLabel} />
        </FormField>

        {recurring ? (
          <SwitchRow
            label="Renews automatically"
            description={
              autoRenew
                ? 'The renewal date moves forward on its own.'
                : 'Shown as overdue until you mark it renewed.'
            }
            value={autoRenew}
            onValueChange={setAutoRenew}
          />
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

        <FormField label={`${providerLabel} (optional)`}>
          <TextField
            value={provider}
            onChangeText={setProvider}
            placeholder={isWarranty ? 'Where you bought it' : 'Who you pay'}
            accessibilityLabel={providerLabel}
          />
        </FormField>

        {categoryInfo.receipts && attachmentsSupported ? (
          <FormField label="Receipt (optional)">
            <ReceiptField value={receipt} onChange={changeReceipt} />
          </FormField>
        ) : null}

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
  suggestions: {
    gap: Spacing.two,
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
