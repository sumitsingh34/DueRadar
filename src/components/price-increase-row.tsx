import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getCategory } from '@/domain/categories';
import { formatDate } from '@/domain/dates';
import type { PriceIncrease } from '@/domain/insights';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';

/** "Internet  $55.00 → $80.00 since Jan 1, 2024  +45%". Opens the item. */
export function PriceIncreaseRow({ increase }: { increase: PriceIncrease }) {
  const theme = useTheme();
  const { item, fromCents, toCents, since, percent } = increase;
  const from = formatMoney(fromCents, item.currency);
  const to = formatMoney(toCents, item.currency);
  const categoryColor = getCategory(item.category).color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}: up ${percent}%, from ${from} to ${to} since ${formatDate(since)}`}
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: categoryColor },
        pressed && styles.pressed,
      ]}>
      <View style={styles.text}>
        <ThemedText numberOfLines={1}>{item.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {from} → {to} · since {formatDate(since)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" themeColor="danger">
        +{percent}%
      </ThemedText>
    </Pressable>
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
    borderWidth: 1.5,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
