import { isTime } from '@/domain/dates';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export interface TimeFieldProps {
  /** `HH:MM`, or null for no time. */
  value: string | null;
  onChange: (time: string | null) => void;
  accessibilityLabel?: string;
}

/** Uses the browser's own time input, which already speaks `HH:MM`. Clearing it removes the time. */
export function TimeField({ value, onChange, accessibilityLabel }: TimeFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <input
      type="time"
      value={value ?? ''}
      aria-label={accessibilityLabel}
      onChange={(event) => onChange(isTime(event.target.value) ? event.target.value : null)}
      style={{
        font: 'inherit',
        fontSize: 16,
        padding: '11px 16px',
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.backgroundElement,
        color: theme.text,
        colorScheme: scheme === 'dark' ? 'dark' : 'light',
        alignSelf: 'flex-start',
      }}
    />
  );
}
