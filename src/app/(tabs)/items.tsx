import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ItemRow } from '@/components/item-row';
import { SearchField } from '@/components/search-field';
import { Section, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { todayISO } from '@/domain/dates';
import { matchesSearch } from '@/domain/search';
import { toDueItem } from '@/domain/summary';
import { useItems } from '@/hooks/use-items';

export default function ItemsScreen() {
  const items = useItems();
  const [query, setQuery] = useState('');

  if (items === null) return <ThemedView style={styles.fill} />;

  const today = todayISO();
  const rows = items.map((item) => ({ item, due: toDueItem(item, today) }));
  const sections = [
    {
      key: 'active',
      label: 'Active',
      rows: rows
        .filter((r) => r.item.status === 'active')
        .sort((a, b) => (a.due?.daysUntil ?? Infinity) - (b.due?.daysUntil ?? Infinity)),
    },
    { key: 'inactive', label: 'Paused or cancelled', rows: rows.filter((r) => r.item.status !== 'active') },
  ].filter((section) => section.rows.length > 0);

  const searching = query.trim() !== '';
  const matches = sections.map((section) => section.rows.filter((r) => matchesSearch(r.item, query)));
  const matchCount = matches.reduce((sum, list) => sum + list.length, 0);

  return (
    <TabScreen title="All items">
      {items.length === 0 ? (
        <ThemedText themeColor="textSecondary">No items yet. Tap “Add” to start.</ThemedText>
      ) : null}
      {sections.map((section, index) => {
        const visible = matches[index];
        // The first section holds the search box, so it stays in place while typing.
        if (index > 0 && visible.length === 0) return null;
        const count = searching
          ? `${visible.length} of ${section.rows.length}`
          : String(section.rows.length);
        return (
          <Section key={section.key} title={`${section.label} · ${count}`}>
            {index === 0 ? (
              <SearchField value={query} onChangeText={setQuery} placeholder="Search items" />
            ) : null}
            {index === 0 && searching && matchCount === 0 ? (
              <ThemedText themeColor="textSecondary">No items match “{query.trim()}”.</ThemedText>
            ) : null}
            {visible.map(({ item, due }) => (
              <ItemRow key={item.id} item={item} due={due} showActions />
            ))}
          </Section>
        );
      })}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
