import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function TextField({ style, ...props }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
      {...props}
    />
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

/** Pick one option. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => (
        <Chip
          key={option.value}
          option={option}
          role="radio"
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

/** Pick any number of options. */
export function MultiChipGroup<T extends string>({
  options,
  values,
  onToggle,
  accessibilityLabel,
}: {
  options: readonly ChipOption<T>[];
  values: readonly T[];
  onToggle: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.chips} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => (
        <Chip
          key={option.value}
          option={option}
          role="checkbox"
          selected={values.includes(option.value)}
          onPress={() => onToggle(option.value)}
        />
      ))}
    </View>
  );
}

/** A row of chip-shaped buttons, e.g. suggestions. */
export function ChipButtons<T extends string>({
  options,
  onPress,
  accessibilityLabel,
}: {
  options: readonly ChipOption<T>[];
  onPress: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.chips} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => (
        <Chip
          key={option.value}
          option={option}
          role="button"
          selected={false}
          onPress={() => onPress(option.value)}
        />
      ))}
    </View>
  );
}

function Chip<T extends string>({
  option,
  role,
  selected,
  onPress,
}: {
  option: ChipOption<T>;
  role: 'radio' | 'checkbox' | 'button';
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={option.label}
      aria-checked={role === 'button' ? undefined : selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.backgroundElement,
          borderColor: selected ? theme.tint : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      {option.color ? (
        <View style={[styles.dot, { backgroundColor: selected ? theme.onTint : option.color }]} />
      ) : null}
      <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
        {option.label}
      </ThemedText>
    </Pressable>
  );
}

/** A labelled on/off switch with an optional explanation underneath. */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <ThemedText>{label}</ThemedText>
        {description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';
  // Secondary buttons get their own shade and an outline so they read as
  // buttons on both the page background and on cards.
  const surface = primary
    ? { backgroundColor: theme.tint }
    : { backgroundColor: theme.backgroundSelected, borderColor: theme.border, borderWidth: 1 };
  const color = primary ? theme.onTint : variant === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, surface, (pressed || disabled) && styles.pressed]}>
      <ThemedText type="smallBold" style={{ color }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.6,
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
});
