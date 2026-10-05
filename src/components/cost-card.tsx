import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatMoney } from '@/domain/money';
import type { CurrencyTotal } from '@/domain/summary';
import { useTheme } from '@/hooks/use-theme';

/**
 * What items cost a month and a year, and how many are active. Costs in other
 * currencies are listed under the main one. With `onPress`, the card is a
 * button with an arrow.
 */
export function CostCard({
  totals,
  currency,
  activeCount,
  title,
  onPress,
  children,
}: {
  /** Monthly totals per currency, largest first. */
  totals: readonly CurrencyTotal[];
  /** The currency of the zero shown when there are no totals. */
  currency: string;
  activeCount: number;
  title?: string;
  onPress?: () => void;
  /** Shown at the bottom of the card. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const [primary, ...others] = totals;
  const main = primary?.currency ?? currency;
  const cents = primary?.monthlyCents ?? 0;
  const monthly = formatMoney(Math.round(cents), main);
  const yearly = formatMoney(Math.round(cents * 12), main);
  const count = `${activeCount} active ${activeCount === 1 ? 'item' : 'items'}`;
  const otherMonthly = others.map((total) => ({
    currency: total.currency,
    amount: formatMoney(Math.round(total.monthlyCents), total.currency),
  }));

  const content = (
    <>
      {title ? (
        <View style={styles.titleRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {title}
          </ThemedText>
          {onPress ? <Icon name="chevron" color={theme.textSecondary} size={16} /> : null}
        </View>
      ) : null}
      <View style={styles.totalRow}>
        <ThemedText type="subtitle">{monthly}</ThemedText>
        <ThemedText themeColor="textSecondary">/ month</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {yearly} per year · {count}
      </ThemedText>
      {otherMonthly.map(({ currency: code, amount }) => (
        <ThemedText key={code} type="small" themeColor="textSecondary">
          + {amount} / month
        </ThemedText>
      ))}
      {children}
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        `${monthly} a month`,
        ...otherMonthly.map(({ amount }) => `plus ${amount} a month`),
        `${yearly} a year`,
        count,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
