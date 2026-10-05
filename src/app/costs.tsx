import { StyleSheet, View } from 'react-native';

import { CategoryRow } from '@/components/category-row';
import { CostCard } from '@/components/cost-card';
import { ScrollPage } from '@/components/scroll-page';
import { Section } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_CURRENCY } from '@/domain/money';
import { costsByCategory, monthlyTotals, totalIn, type CategoryCosts } from '@/domain/summary';
import { useItems } from '@/hooks/use-items';
import { useSettings } from '@/hooks/use-settings';

/** What each category costs a month. Each one opens its items. */
export default function CostsScreen() {
  const items = useItems();
  const settings = useSettings();

  if (items === null) return <ThemedView style={styles.fill} />;

  const totals = monthlyTotals(items);
  // Shares are of the main currency's total, as on the Overview.
  const currency = totals[0]?.currency ?? settings?.currency ?? DEFAULT_CURRENCY;
  const total = totalIn(totals, currency);
  const categories = costsByCategory(items, currency);
  const withCost = categories.filter((costs) => costs.totals.length > 0);
  const noCost = categories.filter((costs) => costs.totals.length === 0);

  const share = (costs: CategoryCosts) => {
    const cents = totalIn(costs.totals, currency);
    if (cents === 0) return null;
    const percent = (cents / total) * 100;
    return percent < 0.5 ? 'under 1%' : `${Math.round(percent)}%`;
  };

  return (
    <ScrollPage>
      <CostCard
        totals={totals}
        currency={currency}
        activeCount={items.filter((item) => item.status === 'active').length}>
        {total > 0 ? (
          <ShareBar
            parts={withCost.map((costs) => ({
              key: costs.category.id,
              color: costs.category.color,
              cents: totalIn(costs.totals, currency),
            }))}
          />
        ) : null}
      </CostCard>

      {withCost.length > 0 ? (
        <Section title="By category">
          {withCost.map((costs) => (
            <CategoryRow key={costs.category.id} costs={costs} share={share(costs)} />
          ))}
        </Section>
      ) : null}

      {noCost.length > 0 ? (
        <Section title="No recurring cost">
          {noCost.map((costs) => (
            <CategoryRow key={costs.category.id} costs={costs} />
          ))}
        </Section>
      ) : null}

      {categories.length === 0 ? (
        <ThemedText themeColor="textSecondary">No items yet.</ThemedText>
      ) : null}
    </ScrollPage>
  );
}

/** Each category's part of the monthly cost, in its color. The list below says the same in words. */
function ShareBar({ parts }: { parts: { key: string; color: string; cents: number }[] }) {
  return (
    <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {parts
        .filter((part) => part.cents > 0)
        .map((part) => (
          <View key={part.key} style={{ flex: part.cents, backgroundColor: part.color }} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    gap: 2,
    marginTop: 4,
    borderRadius: 5,
    overflow: 'hidden',
  },
});
