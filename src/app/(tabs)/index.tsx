import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/form-controls';
import { ItemRow } from '@/components/item-row';
import { Section, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { todayISO } from '@/domain/dates';
import { DEFAULT_CURRENCY, formatMoney } from '@/domain/money';
import { buildDashboard } from '@/domain/summary';
import { useItems } from '@/hooks/use-items';
import { useSettings } from '@/hooks/use-settings';

const UPCOMING_DAYS = 30;

export default function OverviewScreen() {
  const items = useItems();
  const settings = useSettings();

  if (items === null) return <ThemedView style={styles.fill} />;

  if (items.length === 0) {
    return (
      <TabScreen title="Overview">
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Never miss a renewal</ThemedText>
          <ThemedText themeColor="textSecondary">
            Add the things you pay for again and again: streaming, gym, phone plan, insurance,
            domains, memberships. You’ll see what they cost each month and what’s coming up next.
          </ThemedText>
          <Button title="Add your first item" onPress={() => router.push('/item/new')} />
        </ThemedView>
      </TabScreen>
    );
  }

  const summary = buildDashboard(items, todayISO(), UPCOMING_DAYS);
  const [primary, ...otherCurrencies] = summary.totals;
  const monthly = primary?.monthlyCents ?? 0;
  const currency = primary?.currency ?? settings?.currency ?? DEFAULT_CURRENCY;

  return (
    <TabScreen title="Overview">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Recurring costs
        </ThemedText>
        <View style={styles.totalRow}>
          <ThemedText type="subtitle">{formatMoney(Math.round(monthly), currency)}</ThemedText>
          <ThemedText themeColor="textSecondary">/ month</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {formatMoney(Math.round(monthly * 12), currency)} per year · {summary.activeCount} active
          {summary.activeCount === 1 ? ' item' : ' items'}
        </ThemedText>
        {otherCurrencies.map((total) => (
          <ThemedText key={total.currency} type="small" themeColor="textSecondary">
            + {formatMoney(Math.round(total.monthlyCents), total.currency)} / month
          </ThemedText>
        ))}
      </ThemedView>

      {summary.needsAttention.length > 0 ? (
        <Section title="Needs attention">
          {summary.needsAttention.map((due) => (
            <ItemRow key={due.item.id} item={due.item} due={due} />
          ))}
        </Section>
      ) : null}

      <Section title={`Next ${UPCOMING_DAYS} days`}>
        {summary.upcoming.length > 0 ? (
          summary.upcoming.map((due) => <ItemRow key={due.item.id} item={due.item} due={due} />)
        ) : (
          <ThemedText themeColor="textSecondary">Nothing due in the next {UPCOMING_DAYS} days.</ThemedText>
        )}
      </Section>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
});
