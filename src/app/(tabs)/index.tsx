import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AssetRow } from '@/components/asset-row';
import { Button } from '@/components/form-controls';
import { ItemRow } from '@/components/item-row';
import { PriceIncreaseRow } from '@/components/price-increase-row';
import { Section, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { vehiclesNeedingReading } from '@/domain/assets';
import { daysBetween, todayISO } from '@/domain/dates';
import { findPriceIncreases } from '@/domain/insights';
import { DEFAULT_CURRENCY, formatMoney } from '@/domain/money';
import { buildDashboard, describeDays } from '@/domain/summary';
import { useAssets } from '@/hooks/use-assets';
import { useItems, usePriceHistory } from '@/hooks/use-items';
import { useSettings } from '@/hooks/use-settings';

const UPCOMING_DAYS = 30;
const MAX_PRICE_INCREASES = 3;

export default function OverviewScreen() {
  const items = useItems();
  const history = usePriceHistory();
  const settings = useSettings();
  const assetData = useAssets();

  if (items === null || assetData === null) return <ThemedView style={styles.fill} />;

  if (items.length === 0) {
    return (
      <TabScreen title="Overview">
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Never miss a renewal</ThemedText>
          <ThemedText themeColor="textSecondary">
            Add the things you pay for again and again: streaming, gym, phone plan, insurance,
            domains, memberships. Add warranties and the upkeep of your home and car too. You’ll see
            what they cost each month and what’s coming up next.
          </ThemedText>
          <Button title="Add your first item" onPress={() => router.push('/item/new')} />
        </ThemedView>
      </TabScreen>
    );
  }

  const today = todayISO();
  const summary = buildDashboard(items, today, UPCOMING_DAYS, assetData.usage);
  const [primary, ...otherCurrencies] = summary.totals;
  const monthly = primary?.monthlyCents ?? 0;
  const currency = primary?.currency ?? settings?.currency ?? DEFAULT_CURRENCY;
  const increases = history ? findPriceIncreases(items, history).slice(0, MAX_PRICE_INCREASES) : [];
  const assetNames = new Map(assetData.assets.map((a) => [a.id, a.name]));
  const assetName = (id: number | null) => (id != null ? (assetNames.get(id) ?? null) : null);
  const staleReadings = vehiclesNeedingReading(assetData.assets, items, assetData.usage, today);

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

      {summary.needsAttention.length > 0 || staleReadings.length > 0 ? (
        <Section title="Needs attention">
          {summary.needsAttention.map((due) => (
            <ItemRow key={due.item.id} item={due.item} due={due} assetName={assetName(due.item.assetId)} />
          ))}
          {staleReadings.map(({ asset, lastDate }) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              warn
              subtitle={
                lastDate
                  ? `Update the odometer: last read ${describeDays(daysBetween(lastDate, today))} ago`
                  : 'Add an odometer reading to track distances'
              }
            />
          ))}
        </Section>
      ) : null}

      <Section title={`Next ${UPCOMING_DAYS} days`}>
        {summary.upcoming.length > 0 ? (
          summary.upcoming.map((due) => (
            <ItemRow key={due.item.id} item={due.item} due={due} assetName={assetName(due.item.assetId)} />
          ))
        ) : (
          <ThemedText themeColor="textSecondary">Nothing due in the next {UPCOMING_DAYS} days.</ThemedText>
        )}
      </Section>

      {increases.length > 0 ? (
        <Section title="Price went up">
          {increases.map((increase) => (
            <PriceIncreaseRow key={increase.item.id} increase={increase} />
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
