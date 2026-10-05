import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { CostCard } from '@/components/cost-card';
import { Button } from '@/components/form-controls';
import { ItemRow } from '@/components/item-row';
import { ScrollPage } from '@/components/scroll-page';
import { Section } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CATEGORIES, getCategory } from '@/domain/categories';
import { todayISO } from '@/domain/dates';
import { DEFAULT_CURRENCY } from '@/domain/money';
import { itemSections, monthlyTotals } from '@/domain/summary';
import { useAssets } from '@/hooks/use-assets';
import { useItems } from '@/hooks/use-items';
import { useSettings } from '@/hooks/use-settings';
import { goBack } from '@/utils/navigation';

/** A category's items, with edit and delete on each, and what they cost a month. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const items = useItems();
  const assetData = useAssets();
  const settings = useSettings();
  const category = CATEGORIES.find((c) => c.id === id);

  if (!category) {
    return (
      <ThemedView style={[styles.fill, styles.centered]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This category doesn’t exist.</ThemedText>
        <Button title="Go back" variant="secondary" onPress={goBack} />
      </ThemedView>
    );
  }

  const title = <Stack.Screen options={{ title: category.label }} />;
  if (items === null || assetData === null) return <ThemedView style={styles.fill}>{title}</ThemedView>;

  // Unknown categories count as Other, as everywhere else.
  const inCategory = items.filter((item) => getCategory(item.category).id === category.id);
  const sections = itemSections(inCategory, todayISO(), assetData.usage);
  const totals = monthlyTotals(inCategory);
  const assetNames = new Map(assetData.assets.map((a) => [a.id, a.name]));
  const assetName = (assetId: number | null) => (assetId != null ? (assetNames.get(assetId) ?? null) : null);

  return (
    <>
      {title}
      <ScrollPage>
        {totals.length > 0 ? (
          <CostCard
            totals={totals}
            currency={settings?.currency ?? DEFAULT_CURRENCY}
            activeCount={inCategory.filter((item) => item.status === 'active').length}
          />
        ) : null}
        {sections.map((section) => (
          <Section key={section.key} title={`${section.label} · ${section.rows.length}`}>
            {section.rows.map(({ item, due }, index) => (
              <ItemRow
                key={item.id}
                item={item}
                due={due}
                number={index + 1}
                assetName={assetName(item.assetId)}
                showActions
              />
            ))}
          </Section>
        ))}
        {inCategory.length === 0 ? (
          <ThemedText themeColor="textSecondary">No items in this category.</ThemedText>
        ) : null}
        <Button
          title="Add an item"
          variant="secondary"
          onPress={() => router.push({ pathname: '/item/new', params: { category: category.id } })}
        />
      </ScrollPage>
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
