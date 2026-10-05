import { ChipGroup, MultiChipGroup } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import {
  describeReminderDays,
  ITEM_REMINDER_DAY_OPTIONS,
  reminderDayLabel,
} from '@/domain/settings';

const MODES = [
  { value: 'settings', label: 'As in Settings' },
  { value: 'custom', label: 'Custom' },
] as const;

/**
 * An item's reminders: the ones from Settings (null), or its own days before
 * the date, such as 90, 60 and 30 days before a lease ends.
 */
export function ReminderField({
  value,
  onChange,
  settingsDays,
  remindersEnabled,
}: {
  value: number[] | null;
  onChange: (days: number[] | null) => void;
  settingsDays: readonly number[];
  remindersEnabled: boolean;
}) {
  const toggle = (option: string) => {
    if (!value) return;
    const day = Number(option);
    const days = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(days.sort((a, b) => b - a));
  };

  return (
    <>
      <ChipGroup
        accessibilityLabel="Reminders"
        options={MODES}
        value={value ? 'custom' : 'settings'}
        onChange={(mode) => onChange(mode === 'custom' ? [...(value ?? settingsDays)] : null)}
      />
      {value ? (
        <MultiChipGroup
          accessibilityLabel="Days before"
          options={ITEM_REMINDER_DAY_OPTIONS.map((d) => ({ value: String(d), label: reminderDayLabel(d) }))}
          values={value.map(String)}
          onToggle={toggle}
        />
      ) : null}
      <ThemedText type="small" themeColor={remindersEnabled ? 'textSecondary' : 'warning'}>
        {describeReminderDays(value ?? settingsDays)}.
        {remindersEnabled ? '' : ' Reminders are turned off in Settings.'}
      </ThemedText>
    </>
  );
}
