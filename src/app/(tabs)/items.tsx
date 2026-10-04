import { StyleSheet } from 'react-native';

import { ItemRow } from '@/components/item-row';
import { Section, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { todayISO } from '@/domain/dates';
import { toDueItem } from '@/domain/summary';
import { useItems } from '@/hooks/use-items';

export default function ItemsScreen() {
  const items = useItems();

  if (items === null) return <ThemedView style={styles.fill} />;

  const today = todayISO();
  const rows = items.map((item) => ({ item, due: toDueItem(item, today) }));
  const active = rows
    .filter((r) => r.item.status === 'active')
    .sort((a, b) => (a.due?.daysUntil ?? Infinity) - (b.due?.daysUntil ?? Infinity));
  const inactive = rows.filter((r) => r.item.status !== 'active');

  return (
    <TabScreen title="All items">
      {items.length === 0 ? (
        <ThemedText themeColor="textSecondary">No items yet. Tap “Add” to start.</ThemedText>
      ) : null}
      {active.length > 0 ? (
        <Section title={`Active · ${active.length}`}>
          {active.map(({ item, due }) => (
            <ItemRow key={item.id} item={item} due={due} showActions />
          ))}
        </Section>
      ) : null}
      {inactive.length > 0 ? (
        <Section title={`Paused or cancelled · ${inactive.length}`}>
          {inactive.map(({ item, due }) => (
            <ItemRow key={item.id} item={item} due={due} showActions />
          ))}
        </Section>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
