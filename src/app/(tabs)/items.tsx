import { Fragment, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AssetRow } from '@/components/asset-row';
import { ItemRow } from '@/components/item-row';
import { SearchField } from '@/components/search-field';
import { Section, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { todayISO } from '@/domain/dates';
import { matchesAssetSearch, matchesSearch } from '@/domain/search';
import { toDueItem } from '@/domain/summary';
import type { Asset } from '@/domain/types';
import { formatDistance } from '@/domain/usage';
import { useAssets } from '@/hooks/use-assets';
import { useItems } from '@/hooks/use-items';

export default function ItemsScreen() {
  const items = useItems();
  const assetData = useAssets();
  const [query, setQuery] = useState('');

  if (items === null || assetData === null) return <ThemedView style={styles.fill} />;

  const today = todayISO();
  const assetNames = new Map(assetData.assets.map((a) => [a.id, a.name]));
  const assetName = (id: number | null) => (id != null ? (assetNames.get(id) ?? null) : null);
  const rows = items.map((item) => ({ item, due: toDueItem(item, today, assetData.usage) }));
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
  const matches = sections.map((section) =>
    section.rows.filter((r) => matchesSearch(r.item, query, assetName(r.item.assetId))),
  );
  const matchCount = matches.reduce((sum, list) => sum + list.length, 0);
  const assets = assetData.assets.filter((asset) => matchesAssetSearch(asset, query));

  const assetSubtitle = (asset: Asset) => {
    const count = items.filter((item) => item.assetId === asset.id).length;
    const usage = assetData.usage.get(asset.id);
    const plate = typeof asset.details.plate === 'string' ? asset.details.plate : null;
    return [`${count} ${count === 1 ? 'item' : 'items'}`, usage && formatDistance(usage.reading, usage.unit), plate]
      .filter(Boolean)
      .join(' · ');
  };

  const assetSection =
    assets.length > 0 ? (
      <Section title={`Vehicles and homes · ${assets.length}`}>
        {assets.map((asset) => (
          <AssetRow key={asset.id} asset={asset} subtitle={assetSubtitle(asset)} />
        ))}
      </Section>
    ) : null;

  return (
    <TabScreen title="All items">
      {items.length === 0 ? (
        <ThemedText themeColor="textSecondary">No items yet. Tap “Add” to start.</ThemedText>
      ) : null}
      {sections.map((section, index) => {
        const visible = matches[index];
        const count = searching
          ? `${visible.length} of ${section.rows.length}`
          : String(section.rows.length);
        return (
          <Fragment key={section.key}>
            {/* The first section holds the search box, so it stays in place while typing. */}
            {index === 0 || visible.length > 0 ? (
              <Section title={`${section.label} · ${count}`}>
                {index === 0 ? (
                  <SearchField value={query} onChangeText={setQuery} placeholder="Search items" />
                ) : null}
                {index === 0 && searching && matchCount === 0 && assets.length === 0 ? (
                  <ThemedText themeColor="textSecondary">No items match “{query.trim()}”.</ThemedText>
                ) : null}
                {visible.map(({ item, due }) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    due={due}
                    assetName={assetName(item.assetId)}
                    showActions
                  />
                ))}
              </Section>
            ) : null}
            {/* Vehicles and homes come right after the active items. */}
            {index === 0 ? assetSection : null}
          </Fragment>
        );
      })}
      {sections.length === 0 ? assetSection : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
