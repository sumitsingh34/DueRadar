import { isISODate } from '@/domain/dates';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export interface DateFieldProps {
  /** `YYYY-MM-DD`, or null when not set yet. */
  value: string | null;
  onChange: (iso: string) => void;
  accessibilityLabel?: string;
}

/** Uses the browser's own date input, which already speaks `YYYY-MM-DD`. */
export function DateField({ value, onChange, accessibilityLabel }: DateFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <input
      type="date"
      value={value ?? ''}
      aria-label={accessibilityLabel}
      onChange={(event) => {
        if (isISODate(event.target.value)) onChange(event.target.value);
      }}
      style={{
        font: 'inherit',
        fontSize: 16,
        padding: '11px 16px',
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.backgroundElement,
        color: theme.text,
        colorScheme: scheme === 'dark' ? 'dark' : 'light',
      }}
    />
  );
}
