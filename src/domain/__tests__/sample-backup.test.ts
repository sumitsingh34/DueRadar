import { vehiclesNeedingReading } from '@/domain/assets';
import { parseBackup } from '@/domain/backup';
import { findPriceIncreases } from '@/domain/insights';
import { buildDashboard, costsByCategory, itemSections } from '@/domain/summary';
import { buildUsageMap } from '@/domain/usage';

import { buildSampleBackup } from '../../../scripts/make-sample-backup';

const TODAY = '2026-10-05';

/** The sample backup for store screenshots, read the way a restore reads it. */
describe('sample backup', () => {
  const sample = buildSampleBackup(TODAY);
  const backup = parseBackup(JSON.stringify(sample));
  const usage = buildUsageMap(
    backup.assets,
    backup.usageReadings.map((reading, index) => ({ id: index + 1, ...reading })),
  );
  const summary = buildDashboard(backup.items, TODAY, 30, usage);

  it('restores without dropping anything', () => {
    expect(backup.items).toHaveLength(sample.items.length);
    expect(backup.priceHistory).toHaveLength(sample.priceHistory.length);
    expect(backup.completions).toHaveLength(sample.completions.length);
    expect(backup.usageReadings).toHaveLength(sample.usageReadings.length);
    expect(backup.assets.map((asset) => asset.name)).toEqual(['Honda Civic', 'Home']);
    expect(backup.items.filter((item) => item.assetId != null)).toHaveLength(
      sample.items.filter((item) => item.assetId != null).length,
    );
  });

  it('fills the Overview: one thing that needs attention, a busy month and price rises', () => {
    expect(summary.needsAttention.map((due) => due.item.name)).toEqual(['Pest control']);
    expect(summary.upcoming.length).toBeGreaterThanOrEqual(8);
    expect(findPriceIncreases(backup.items, backup.priceHistory).map((rise) => rise.item.name)).toEqual([
      'Internet',
      'Netflix',
      'Spotify',
    ]);
    expect(vehiclesNeedingReading(backup.assets, backup.items, usage, TODAY)).toEqual([]);
  });

  it('spreads the costs over several categories', () => {
    const withCost = costsByCategory(backup.items, 'USD').filter((costs) => costs.totals.length > 0);
    expect(withCost.length).toBeGreaterThanOrEqual(6);
  });

  it('estimates the tire rotation from the distance driven', () => {
    const tires = summary.upcoming.find((due) => due.item.name === 'Tire rotation');
    expect(tires).toMatchObject({ estimated: true, overdue: false });
  });

  it('has a past appointment and a paused subscription for All items', () => {
    expect(itemSections(backup.items, TODAY, usage).map((section) => section.key)).toEqual([
      'active',
      'past',
      'inactive',
    ]);
  });
});
