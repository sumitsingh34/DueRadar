import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { atTime, formatTime, toTimeString } from '@/domain/dates';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export interface TimeFieldProps {
  /** `HH:MM`, or null for no time. */
  value: string | null;
  onChange: (time: string | null) => void;
  accessibilityLabel?: string;
}

/** An optional time of day. The web version lives in time-field.web.tsx. */
export function TimeField({ value, onChange, accessibilityLabel }: TimeFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const date = atTime('2000-01-01', value ?? '09:00');

  const remove = value ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Remove the time"
      hitSlop={8}
      onPress={() => onChange(null)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="small" themeColor="textSecondary">
        Remove
      </ThemedText>
    </Pressable>
  ) : null;

  if (Platform.OS === 'ios' && value) {
    return (
      <View style={styles.row}>
        <DateTimePicker
          value={date}
          mode="time"
          display="compact"
          accentColor={theme.tint}
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          accessibilityLabel={accessibilityLabel}
          onValueChange={(_, picked) => onChange(toTimeString(picked))}
        />
        {remove}
      </View>
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        onValueChange: (_, picked) => onChange(toTimeString(picked)),
      });
    } else {
      // iOS shows the inline compact picker once a time is set.
      onChange('09:00');
    }
  };

  return (
    <View style={styles.row}>
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
          {value ? formatTime(value) : 'Add a time'}
        </ThemedText>
      </Pressable>
      {remove}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
