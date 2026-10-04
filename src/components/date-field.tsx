import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatDate, fromISODate, todayISO, toISODate } from '@/domain/dates';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export interface DateFieldProps {
  /** `YYYY-MM-DD`, or null when not set yet. */
  value: string | null;
  onChange: (iso: string) => void;
  accessibilityLabel?: string;
}

/** Native date input. The web version lives in date-field.web.tsx. */
export function DateField({ value, onChange, accessibilityLabel }: DateFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  if (Platform.OS === 'ios' && value) {
    return (
      <DateTimePicker
        value={fromISODate(value)}
        mode="date"
        display="compact"
        accentColor={theme.tint}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'}
        accessibilityLabel={accessibilityLabel}
        onValueChange={(_, date) => onChange(toISODate(date))}
        style={styles.compact}
      />
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ? fromISODate(value) : new Date(),
        mode: 'date',
        onValueChange: (_, date) => onChange(toISODate(date)),
      });
    } else {
      // iOS shows the inline compact picker once a date is set.
      onChange(todayISO());
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={open}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText themeColor={value ? 'text' : 'textSecondary'}>
        {value ? formatDate(value) : 'Choose a date'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: {
    alignSelf: 'flex-start',
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.6,
  },
});
