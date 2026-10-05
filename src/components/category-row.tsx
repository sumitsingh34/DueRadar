import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { costSuffix } from '@/domain/frequency';
import { formatMoney } from '@/domain/money';
import type { CategoryCosts } from '@/domain/summary';
import { useTheme } from '@/hooks/use-theme';

const PER_MONTH = costSuffix({ unit: 'month', count: 1 });

/** A category in a list, with what it costs a month. Tapping it opens its items. */
export function CategoryRow({
  costs,
  share,
}: {
  costs: CategoryCosts;
  /** Its part of the total, e.g. "40%". */
  share?: string | null;
}) {
  const theme = useTheme();
  const { category, itemCount, totals } = costs;
  const subtitle = [`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`, share].filter(Boolean).join(' · ');
  const amounts = totals.map((total) => ({
    currency: total.currency,
    amount: formatMoney(Math.round(total.monthlyCents), total.currency),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[category.label, subtitle, ...amounts.map(({ amount }) => `${amount} a month`)].join(', ')}
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: category.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: category.color },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.dot, { backgroundColor: category.color }]} />
      <View style={styles.text}>
        <ThemedText numberOfLines={1}>{category.label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
      {amounts.length > 0 ? (
        <View style={styles.amounts}>
          {amounts.map(({ currency, amount }) => (
            <ThemedText key={currency} type="smallBold">
              {amount}
              {PER_MONTH}
            </ThemedText>
          ))}
        </View>
      ) : null}
      <Icon name="chevron" color={theme.textSecondary} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
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
  amounts: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.6,
  },
});
