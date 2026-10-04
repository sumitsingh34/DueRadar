import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getCategory } from '@/domain/categories';
import { formatDate } from '@/domain/dates';
import { costSuffix } from '@/domain/frequency';
import { formatMoney } from '@/domain/money';
import { dueLabel, type DueItem } from '@/domain/summary';
import type { Item } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

const STATUS_LABELS = { active: null, paused: 'Paused', cancelled: 'Cancelled' } as const;

export function ItemRow({ item, due }: { item: Item; due: DueItem | null }) {
  const theme = useTheme();
  const statusLabel = STATUS_LABELS[item.status];
  const subtitle =
    statusLabel ??
    (due ? `${dueLabel(due)} · ${formatDate(due.dueDate)}` : 'No date set');

  let price: string | null = null;
  if (item.amountCents != null) {
    price = formatMoney(item.amountCents, item.currency);
    if (item.scheduleType === 'recurring' && item.intervalUnit && item.intervalCount) {
      price += costSuffix({ unit: item.intervalUnit, count: item.intervalCount });
    }
  }

  return (
    <Link href={{ pathname: '/item/[id]', params: { id: String(item.id) } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.dot, { backgroundColor: getCategory(item.category).color }]} />
        <View style={styles.text}>
          <ThemedText numberOfLines={1}>{item.name}</ThemedText>
          <ThemedText
            type="small"
            numberOfLines={1}
            themeColor={!statusLabel && due && due.daysUntil < 0 ? 'danger' : 'textSecondary'}>
            {subtitle}
          </ThemedText>
        </View>
        {price ? <ThemedText type="smallBold">{price}</ThemedText> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
