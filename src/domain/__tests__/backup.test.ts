import { makeItem } from '@/domain/__fixtures__/items';
import { BackupError, createBackup, itemsToCsv, parseBackup } from '@/domain/backup';
import { DEFAULT_SETTINGS } from '@/domain/settings';

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    const items = [
      makeItem({ id: 1, name: 'Car', provider: 'Toyota', notes: 'Line 1\nLine 2' }),
      makeItem({ id: 2, name: 'Car insurance', parentId: 1, autoRenew: false }),
    ];
    const prices = [{ itemId: 1, amountCents: 1000, currency: 'USD', effectiveDate: '2026-10-01' }];
    const settings = { ...DEFAULT_SETTINGS, currency: 'INR', reminderDays: [7] };

    const backup = createBackup(items, prices, settings, new Date('2026-10-03T12:00:00Z'));
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });
});

describe('parseBackup', () => {
  it('rejects files that are not DueRadar backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"items": []}')).toThrow('isn’t a DueRadar backup');
    expect(() => parseBackup(JSON.stringify({ app: 'DueRadar', format: 99, items: [] }))).toThrow(
      'newer version',
    );
  });

  it('rejects damaged items', () => {
    const backup = { app: 'DueRadar', format: 1, items: [{ id: 1, name: '', scheduleType: 'recurring' }] };
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('Item 1 in the backup is damaged.');
  });

  it('repairs what it safely can', () => {
    const backup = {
      app: 'DueRadar',
      format: 1,
      items: [
        { ...makeItem({ id: 5 }), category: 'spaceship', parentId: 99, dueDate: '2026-02-30' },
      ],
      priceHistory: [
        { itemId: 5, amountCents: 500, currency: 'USD', effectiveDate: '2026-10-01' },
        { itemId: 6, amountCents: 500, currency: 'USD', effectiveDate: '2026-10-01' },
      ],
    };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.items[0]).toMatchObject({ category: 'other', parentId: null, dueDate: null });
    expect(parsed.priceHistory).toHaveLength(1);
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('itemsToCsv', () => {
  it('writes a header and quotes cells that need it', () => {
    const csv = itemsToCsv(
      [
        makeItem({
          name: 'Gym, "Pro"',
          amountCents: 12000,
          intervalUnit: 'year',
          dueDate: '2026-11-04',
          notes: 'Two\nlines',
        }),
      ],
      '2026-10-03',
    );
    const [header, row] = csv.replace('﻿', '').split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(header).toBe(
      'Name,Category,Type,Cost,Currency,Frequency,Next date,Auto-renew,Status,Company,Notes,Monthly cost',
    );
    expect(row).toBe(
      '"Gym, ""Pro""",Subscription,Renews,120.00,USD,Yearly,2026-11-04,Yes,Active,,"Two\nlines",10.00',
    );
  });
});
