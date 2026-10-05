import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { PickedPhoto } from '@/attachments/pick';
import { attachmentsSupported } from '@/attachments/storage';
import { CategoryPicker } from '@/components/category-picker';
import { DateField } from '@/components/date-field';
import { DocumentPhotosField } from '@/components/document-photos-field';
import {
  Button,
  ChipButtons,
  ChipGroup,
  FormField,
  SwitchRow,
  TextField,
} from '@/components/form-controls';
import { ReceiptField } from '@/components/receipt-field';
import { ReminderField } from '@/components/reminder-field';
import { ThemedText } from '@/components/themed-text';
import { TimeField } from '@/components/time-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { DocumentPhoto } from '@/db/attachments';
import { ASSET_KINDS, assetKindsLabel } from '@/domain/assets';
import {
  getCategory,
  recurringWording,
  scheduleLabel,
  type CategoryId,
} from '@/domain/categories';
import { addInterval, formatDate, todayISO } from '@/domain/dates';
import {
  DEFAULT_FREQUENCY,
  FREQUENCY_PRESETS,
  frequencyLabel,
  type Frequency,
} from '@/domain/frequency';
import { centsToInput, DEFAULT_CURRENCY, parseAmountInput } from '@/domain/money';
import { DEFAULT_SETTINGS } from '@/domain/settings';
import {
  findTemplates,
  POPULAR_TEMPLATES,
  templateSchedule,
  TEMPLATES,
  type ItemTemplate,
} from '@/domain/templates';
import type { Asset, AssetKind, ItemInput, ItemStatus, ScheduleType } from '@/domain/types';
import { formatDistance, parseDistanceInput } from '@/domain/usage';
import { useAssets } from '@/hooks/use-assets';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { showMessage } from '@/utils/confirm';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const frequencyKey = (f: Frequency) => `${f.unit}:${f.count}`;

const NO_ASSET = 'none';
const NO_PHOTOS: DocumentPhoto[] = [];

/** The reminders a category suggests for a new item, or null to follow the settings. */
const suggestedReminders = (id: CategoryId, schedule: ScheduleType): number[] | null => {
  const days = getCategory(id).reminderDays?.[schedule];
  return days ? [...days] : null;
};

/** The photos in the form when it's saved, and whether they changed. */
export interface FileChanges {
  receipt: PickedPhoto | null;
  receiptChanged: boolean;
  photos: DocumentPhoto[];
  photosChanged: boolean;
}

interface ItemFormProps {
  initial?: ItemInput;
  /** The item's saved receipt photo, if it has one. */
  initialReceipt?: PickedPhoto | null;
  /** The item's saved document photos, decrypted. */
  initialPhotos?: DocumentPhoto[];
  /** Currency for a new item. Edits keep the item's own currency. */
  defaultCurrency?: string;
  /** Category and vehicle or home for a new item, e.g. when adding from a vehicle's page. */
  defaultCategory?: CategoryId;
  defaultAssetId?: number;
  submitLabel: string;
  /** Saves the item. The screen closes once it's done. */
  onSubmit: (input: ItemInput, files: FileChanges) => Promise<void>;
  /**
   * Shows a delete button. Deletes the item after asking, and resolves to
   * whether it did; the screen then closes.
   */
  onDelete?: () => Promise<boolean>;
  /** Extra content shown above the fields, e.g. renewal status. */
  header?: ReactNode;
}

type Errors = Partial<Record<'name' | 'amount' | 'dueDate' | 'usageInterval' | 'nextUsage', string>>;

export function ItemForm({
  initial,
  initialReceipt = null,
  initialPhotos = NO_PHOTOS,
  defaultCurrency,
  defaultCategory,
  defaultAssetId,
  submitLabel,
  onSubmit,
  onDelete,
  header,
}: ItemFormProps) {
  const theme = useTheme();
  const assetData = useAssets();
  const settings = useSettings();
  const assets = assetData?.assets ?? [];
  const currency = initial?.currency ?? defaultCurrency ?? DEFAULT_CURRENCY;
  const startCategory = initial?.category ?? defaultCategory ?? 'subscription';
  const startSchedule = initial?.scheduleType ?? getCategory(startCategory).schedules[0];
  const [name, setName] = useState(initial?.name ?? '');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>(startCategory);
  const [schedule, setSchedule] = useState<ScheduleType>(startSchedule);
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
  const [dueTime, setDueTime] = useState<string | null>(initial?.dueTime ?? null);
  // Whether a quick-add template filled in the dates, so another template may replace them.
  const [datesFromTemplate, setDatesFromTemplate] = useState(false);
  // The length shortcut (e.g. a 2-year warranty) that matches the dates, if any.
  const [lengthYears, setLengthYears] = useState<number | null>(() =>
    initial?.startDate && initial.dueDate
      ? (getCategory(startCategory).lengthYears?.find(
          (y) => addInterval(initial.startDate!, 'year', y) === initial.dueDate,
        ) ?? null)
      : null,
  );
  const [reminderDays, setReminderDays] = useState<number[] | null>(
    initial ? initial.reminderDays : suggestedReminders(startCategory, startSchedule),
  );
  // Once the user picks reminders, changing the category no longer changes them.
  const [remindersEdited, setRemindersEdited] = useState(initial != null);
  const [receipt, setReceipt] = useState<PickedPhoto | null>(initialReceipt);
  const [receiptChanged, setReceiptChanged] = useState(false);
  const [photos, setPhotos] = useState<DocumentPhoto[]>(initialPhotos);
  const [photosChanged, setPhotosChanged] = useState(false);
  // Some documents, like a birth certificate, never expire.
  const [hasDate, setHasDate] = useState(initial ? initial.dueDate != null : true);
  const [autoRenew, setAutoRenew] = useState(initial?.autoRenew ?? true);
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? 'active');
  const [provider, setProvider] = useState(initial?.provider ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [assetId, setAssetId] = useState<number | null>(initial?.assetId ?? defaultAssetId ?? null);
  const [usageInterval, setUsageInterval] = useState(
    initial?.usageInterval != null ? String(initial.usageInterval) : '',
  );
  const [nextUsage, setNextUsage] = useState(initial?.nextUsage != null ? String(initial.nextUsage) : '');
  // Once the user types the due reading, it's no longer filled in for them.
  const [nextUsageEdited, setNextUsageEdited] = useState(initial?.nextUsage != null);
  // A template's distance, applied once a vehicle is chosen and its unit is known.
  const [pendingDistance, setPendingDistance] = useState<ItemTemplate['distance'] | null>(null);
  // Whether that distance filled in the interval, so a vehicle with another unit can replace it.
  const [intervalFromTemplate, setIntervalFromTemplate] = useState(false);
  // IDs of the vehicles and homes there were when the user went to add a new one.
  const [assetsBeforeNew, setAssetsBeforeNew] = useState<number[] | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const leave = useUnsavedChanges({
    values: {
      name,
      category,
      schedule,
      amount,
      frequency,
      startDate,
      dueDate,
      dueTime,
      reminderDays,
      receipt: receipt?.uri,
      photos: photos.map((photo) => photo.key),
      hasDate,
      autoRenew,
      status,
      provider,
      notes,
      assetId,
      usageInterval,
      nextUsage,
    },
    saving,
    save: () => submit(),
  });

  const recurring = schedule === 'recurring';
  const repeats = schedule !== 'expiry';
  const categoryInfo = getCategory(category);
  const wording = categoryInfo.wording;
  const renewal = recurringWording(categoryInfo);
  // A start date (e.g. purchase date) only where the category has a name for it.
  const showStartDate = schedule === 'expiry' && wording?.startDate != null;
  const isWarranty = category === 'warranty' && schedule === 'expiry';
  // Whether the item has a due date: always, except a document that never expires.
  const canSkipDate = schedule === 'expiry' && categoryInfo.dateOptional === true;
  const dated = !canSkipDate || hasDate;
  const lengthOptions = schedule === 'expiry' && dated ? (categoryInfo.lengthYears ?? []) : [];
  const showTime = schedule === 'expiry' && dated && categoryInfo.time === true;
  const keepsReceipt = categoryInfo.receipts === true && attachmentsSupported;
  const keepsPhotos = categoryInfo.documentPhotos === true && attachmentsSupported;
  const dueDateLabel =
    schedule === 'recurring'
      ? renewal.dateLabel
      : schedule === 'task'
        ? 'Next due date'
        : wording?.dueDate || wording?.expires || 'Expiry date';
  const providerLabel = wording?.provider ?? 'Company or store';

  // Vehicles and homes this category's items can belong to.
  const assetKinds: readonly AssetKind[] = categoryInfo.assets?.kinds ?? [];
  const matchingAssets = assets.filter((a) => assetKinds.includes(a.kind));
  const selectedAsset = matchingAssets.find((a) => a.id === assetId) ?? null;
  const showAssets =
    assetKinds.length > 0 && (categoryInfo.assets!.offerNew || matchingAssets.length > 0);
  // Distances apply to a vehicle's tasks, in the vehicle's unit.
  const vehicle = schedule === 'task' && selectedAsset?.kind === 'vehicle' ? selectedAsset : null;
  const unit = vehicle?.usageUnit ?? 'km';
  const vehicleUsage = vehicle ? assetData?.usage.get(vehicle.id) : undefined;

  /**
   * Fills in the due reading from the vehicle's latest one, until the user
   * types their own. Without a reading to go on, it's left empty.
   */
  const suggestNextUsage = (interval: number | null, asset: Asset | null) => {
    if (nextUsageEdited) return;
    const usage = asset ? assetData?.usage.get(asset.id) : undefined;
    setNextUsage(interval != null && usage ? String(usage.reading + interval) : '');
  };

  /** For a vehicle's task: the distance a template suggested, in its unit, and the reading it's due at. */
  const fillDistance = (asset: Asset | null, forSchedule: ScheduleType) => {
    if (asset?.kind !== 'vehicle' || forSchedule !== 'task') return;
    let interval = parseDistanceInput(usageInterval);
    if ((interval == null || intervalFromTemplate) && pendingDistance) {
      interval = pendingDistance[asset.usageUnit ?? 'km'];
      setUsageInterval(String(interval));
      setIntervalFromTemplate(true);
    }
    suggestNextUsage(interval, asset);
  };

  const selectAsset = (asset: Asset | null) => {
    setAssetId(asset?.id ?? null);
    fillDistance(asset, schedule);
  };

  // Back from adding a vehicle or home: choose the new one.
  if (assetsBeforeNew && assetData) {
    const created = assetData.assets.find((a) => !assetsBeforeNew.includes(a.id));
    if (created) {
      setAssetsBeforeNew(null);
      selectAsset(created);
    }
  }

  const addAsset = (kind: AssetKind) => {
    if (!assetData) return;
    setAssetsBeforeNew(assetData.assets.map((a) => a.id));
    router.push({ pathname: '/asset/new', params: { kind } });
  };

  const changeStartDate = (date: string) => {
    setStartDate(date);
    setDatesFromTemplate(false);
    if (lengthYears) setDueDate(addInterval(date, 'year', lengthYears));
  };
  const changeDueDate = (date: string) => {
    setDueDate(date);
    setDatesFromTemplate(false);
    setLengthYears(null);
  };
  const chooseLength = (years: number) => {
    const start = startDate ?? todayISO();
    setStartDate(start);
    setLengthYears(years);
    setDueDate(addInterval(start, 'year', years));
    setDatesFromTemplate(false);
  };
  const changeReminders = (days: number[] | null) => {
    setReminderDays(days);
    setRemindersEdited(true);
  };
  /** New items take the reminders a category suggests, until the user picks their own. */
  const suggestReminders = (id: CategoryId, forSchedule: ScheduleType) => {
    if (!remindersEdited) setReminderDays(suggestedReminders(id, forSchedule));
  };
  const changeReceipt = (photo: PickedPhoto | null) => {
    setReceipt(photo);
    setReceiptChanged(true);
  };
  const changePhotos = (next: DocumentPhoto[]) => {
    setPhotos(next);
    setPhotosChanged(true);
  };
  const changeUsageInterval = (text: string) => {
    setUsageInterval(text);
    setIntervalFromTemplate(false);
    suggestNextUsage(parseDistanceInput(text), vehicle);
  };
  const changeNextUsage = (text: string) => {
    setNextUsage(text);
    setNextUsageEdited(true);
  };

  // Keep an unusual saved frequency selectable alongside the presets.
  const frequencyOptions = FREQUENCY_PRESETS.map((p) => ({ value: frequencyKey(p), label: p.label }));
  if (!frequencyOptions.some((o) => o.value === frequencyKey(frequency))) {
    frequencyOptions.push({ value: frequencyKey(frequency), label: frequencyLabel(frequency) });
  }

  // The category's schedule types, plus a saved one it no longer offers.
  const scheduleOptions = categoryInfo.schedules.map((value) => ({
    value,
    label: scheduleLabel(categoryInfo, value),
  }));
  if (!categoryInfo.schedules.includes(schedule)) {
    scheduleOptions.push({ value: schedule, label: scheduleLabel(categoryInfo, schedule) });
  }

  /**
   * Switches category. New items take the category's usual schedule and
   * reminders, and the only vehicle or home there is when the category is
   * about them. Returns the vehicle or home the item then belongs to.
   */
  const applyCategory = (id: CategoryId, nextSchedule: ScheduleType): Asset | null => {
    setCategory(id);
    setSchedule(nextSchedule);
    suggestReminders(id, nextSchedule);
    const info = getCategory(id);
    if (info.lengthYears !== categoryInfo.lengthYears) setLengthYears(null);
    const kinds = info.assets?.kinds ?? [];
    const candidates = assets.filter((a) => kinds.includes(a.kind));
    let asset = candidates.find((a) => a.id === assetId) ?? null;
    if (!asset && !initial && info.assets?.offerNew && candidates.length === 1) asset = candidates[0];
    setAssetId(asset?.id ?? null);
    return asset;
  };

  const chooseCategory = (id: CategoryId) => {
    const nextSchedule = initial ? schedule : getCategory(id).schedules[0];
    fillDistance(applyCategory(id, nextSchedule), nextSchedule);
  };

  const chooseSchedule = (value: ScheduleType) => {
    setSchedule(value);
    suggestReminders(category, value);
    fillDistance(selectedAsset, value);
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
    setAppliedTemplate(template.name);
    const nextSchedule = templateSchedule(template);
    if (template.frequency) setFrequency(template.frequency);
    if (nextSchedule === 'recurring') setAutoRenew(template.autoRenew ?? true);

    // Dates an earlier suggestion filled in give way to this one's; dates the user chose stay.
    const today = todayISO();
    const ownStart = datesFromTemplate ? null : startDate;
    const ownDue = datesFromTemplate ? null : dueDate;
    let nextStart = ownStart;
    let nextDue = ownDue;
    let filled = false;
    if (nextSchedule === 'task' && template.frequency && !ownDue) {
      // As if it was just done; the user can change the date.
      nextDue = addInterval(today, template.frequency.unit, template.frequency.count);
      filled = true;
    } else if (nextSchedule === 'expiry' && template.warrantyYears) {
      // Bought today, unless the user already picked the purchase date.
      nextStart = ownStart ?? today;
      nextDue = addInterval(nextStart, 'year', template.warrantyYears);
      filled = true;
    }
    setStartDate(nextStart);
    setDueDate(nextDue);
    setDatesFromTemplate(filled);
    setHasDate(!template.noDate);

    const asset = applyCategory(template.category, nextSchedule);
    if (nextSchedule === 'expiry' && template.warrantyYears) setLengthYears(template.warrantyYears);

    // Kept for when a vehicle is chosen later, since the distance depends on its unit.
    setPendingDistance(template.distance ?? null);
    if (template.distance && asset?.kind === 'vehicle') {
      const interval = template.distance[asset.usageUnit ?? 'km'];
      setUsageInterval(String(interval));
      setIntervalFromTemplate(true);
      suggestNextUsage(interval, asset);
    } else {
      setUsageInterval('');
      setIntervalFromTemplate(false);
      if (!nextUsageEdited) setNextUsage('');
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
    if (dated && !dueDate) {
      next.dueDate =
        schedule === 'task'
          ? 'Choose when it’s next due.'
          : isWarranty
            ? 'Choose when the warranty ends.'
            : `Choose the ${dueDateLabel.toLowerCase()}.`;
    } else if (dated && dueDate && showStartDate && startDate && dueDate < startDate) {
      next.dueDate = `This is before the ${wording?.startDate?.toLowerCase() ?? 'start date'}.`;
    }
    let interval: number | null = null;
    let dueAt: number | null = null;
    if (vehicle && usageInterval.trim()) {
      interval = parseDistanceInput(usageInterval);
      if (interval == null || interval === 0) next.usageInterval = 'Enter a whole number, like 10000.';
      dueAt = parseDistanceInput(nextUsage);
      if (!nextUsage.trim()) next.nextUsage = 'Enter the odometer reading it’s due at.';
      else if (dueAt == null) next.nextUsage = 'Enter a whole number, like 55000.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const distance = vehicle != null && interval != null;
    setSaving(true);
    try {
      await onSubmit(
        {
          name,
          category,
          scheduleType: schedule,
          amountCents,
          currency,
          intervalUnit: repeats ? frequency.unit : null,
          intervalCount: repeats ? frequency.count : null,
          // Hidden fields keep what was saved before.
          startDate: showStartDate ? startDate : (initial?.startDate ?? null),
          dueDate: dated ? dueDate : null,
          dueTime: showTime ? dueTime : null,
          reminderDays: dated ? reminderDays : null,
          usageInterval: distance ? interval : null,
          usageUnit: distance ? unit : null,
          nextUsage: distance ? dueAt : null,
          autoRenew: recurring && autoRenew,
          status,
          provider,
          notes,
          assetId: showAssets ? (selectedAsset?.id ?? null) : null,
        },
        // Photos only go with categories that show them. A saved one stays with the
        // item if its category changes, and shows again if it changes back.
        {
          receipt: keepsReceipt ? receipt : null,
          receiptChanged: keepsReceipt && receiptChanged,
          photos: keepsPhotos ? photos : [],
          photosChanged: keepsPhotos && photosChanged,
        },
      );
    } catch (error) {
      showMessage('Couldn’t save', error instanceof Error ? error.message : String(error));
      return;
    } finally {
      setSaving(false);
    }
    leave();
  };

  const remove = async () => {
    try {
      if (await onDelete?.()) leave();
    } catch (error) {
      showMessage('Couldn’t delete', error instanceof Error ? error.message : String(error));
    }
  };

  const costLabel =
    schedule === 'recurring'
      ? `${renewal.costLabel} (${currency})`
      : schedule === 'task'
        ? `Cost each time (${currency}, optional)`
        : `${isWarranty ? 'Price paid' : 'Cost'} (${currency}, optional)`;

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
            placeholder="Netflix, car insurance, laptop, oil change…"
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
          <CategoryPicker value={category} onChange={chooseCategory} />
        </FormField>

        {showAssets ? (
          <FormField label={`${assetKindsLabel(assetKinds)} (optional)`}>
            <ChipGroup
              accessibilityLabel={assetKindsLabel(assetKinds)}
              options={[
                { value: NO_ASSET, label: 'None' },
                ...matchingAssets.map((a) => ({
                  value: String(a.id),
                  label: a.name,
                  color: ASSET_KINDS[a.kind].color,
                })),
              ]}
              value={selectedAsset ? String(selectedAsset.id) : NO_ASSET}
              onChange={(value) =>
                selectAsset(value === NO_ASSET ? null : (assets.find((a) => String(a.id) === value) ?? null))
              }
            />
            {categoryInfo.assets?.offerNew ? (
              <ChipButtons
                accessibilityLabel="Add"
                options={assetKinds.map((kind) => ({
                  value: kind,
                  label: `+ New ${ASSET_KINDS[kind].label.toLowerCase()}`,
                }))}
                onPress={addAsset}
              />
            ) : null}
          </FormField>
        ) : null}

        {scheduleOptions.length > 1 ? (
          <FormField label="Type">
            <ChipGroup
              accessibilityLabel="Type"
              options={scheduleOptions}
              value={schedule}
              onChange={chooseSchedule}
            />
            {schedule === 'task' ? (
              <ThemedText type="small" themeColor="textSecondary">
                Mark it done, and the next date counts from that day.
              </ThemedText>
            ) : null}
          </FormField>
        ) : null}

        <FormField label={costLabel} error={errors.amount}>
          <TextField
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            accessibilityLabel={costLabel.replace(/ \(.*\)$/, '')}
          />
        </FormField>

        {repeats ? (
          <FormField label="How often">
            <ChipGroup
              accessibilityLabel="How often"
              options={frequencyOptions}
              value={frequencyKey(frequency)}
              onChange={(key) => {
                const [unitName, count] = key.split(':');
                setFrequency({ unit: unitName as Frequency['unit'], count: Number(count) });
              }}
            />
          </FormField>
        ) : null}

        {vehicle ? (
          <FormField label={`Or every (${unit}, optional)`} error={errors.usageInterval}>
            <TextField
              value={usageInterval}
              onChangeText={changeUsageInterval}
              placeholder={unit === 'mi' ? '5000' : '10000'}
              keyboardType="number-pad"
              accessibilityLabel={`Distance between services in ${unit}`}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Whichever comes first, the time or the distance.
            </ThemedText>
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

        {lengthOptions.length > 0 ? (
          <FormField label={wording?.length ?? 'Length'}>
            <ChipGroup
              accessibilityLabel={wording?.length ?? 'Length'}
              options={lengthOptions.map((y) => ({
                value: String(y),
                label: y === 1 ? '1 year' : `${y} years`,
              }))}
              value={lengthYears ? String(lengthYears) : null}
              onChange={(value) => chooseLength(Number(value))}
            />
          </FormField>
        ) : null}

        {canSkipDate ? (
          <SwitchRow
            label="Has an expiry date"
            description={hasDate ? undefined : 'Kept without a date, like a birth certificate.'}
            value={hasDate}
            onValueChange={setHasDate}
          />
        ) : null}

        {dated ? (
          <FormField label={dueDateLabel} error={errors.dueDate}>
            <DateField value={dueDate} onChange={changeDueDate} accessibilityLabel={dueDateLabel} />
          </FormField>
        ) : null}

        {showTime ? (
          <FormField label="Time (optional)">
            <TimeField value={dueTime} onChange={setDueTime} accessibilityLabel="Time" />
          </FormField>
        ) : null}

        {vehicle && usageInterval.trim() ? (
          <FormField label={`Next due at (${unit})`} error={errors.nextUsage}>
            <TextField
              value={nextUsage}
              onChangeText={changeNextUsage}
              placeholder={vehicleUsage ? String(vehicleUsage.reading + (parseDistanceInput(usageInterval) ?? 0)) : ''}
              keyboardType="number-pad"
              accessibilityLabel={`Odometer reading it's next due at, in ${unit}`}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {vehicleUsage
                ? `Odometer: ${formatDistance(vehicleUsage.reading, vehicleUsage.unit)} on ${formatDate(vehicleUsage.readingDate)}.`
                : `${vehicle.name} has no odometer reading yet. Add one on its page.`}
            </ThemedText>
          </FormField>
        ) : null}

        {recurring ? (
          <SwitchRow
            label={renewal.autoLabel}
            description={autoRenew ? renewal.autoOn : renewal.autoOff}
            value={autoRenew}
            onValueChange={setAutoRenew}
          />
        ) : null}

        {dated ? (
          <FormField label="Reminders">
            <ReminderField
              value={reminderDays}
              onChange={changeReminders}
              settingsDays={settings?.reminderDays ?? DEFAULT_SETTINGS.reminderDays}
              remindersEnabled={settings?.remindersEnabled ?? true}
            />
          </FormField>
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
            placeholder={wording?.providerPlaceholder ?? 'Who you pay'}
            accessibilityLabel={providerLabel}
          />
        </FormField>

        {keepsReceipt ? (
          <FormField label="Receipt (optional)">
            <ReceiptField value={receipt} onChange={changeReceipt} />
          </FormField>
        ) : null}

        {keepsPhotos ? (
          <FormField label="Photos of the document (optional)">
            <DocumentPhotosField
              value={photos}
              onChange={changePhotos}
              appLockOn={settings?.appLock ?? false}
            />
          </FormField>
        ) : null}

        <FormField label="Notes (optional)">
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Plan, account email, part numbers…"
            accessibilityLabel="Notes"
            multiline
            style={styles.notes}
          />
        </FormField>

        <Button title={saving ? 'Saving…' : submitLabel} onPress={submit} disabled={saving} />
        {onDelete ? <Button title="Delete item" variant="danger" onPress={remove} disabled={saving} /> : null}
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
