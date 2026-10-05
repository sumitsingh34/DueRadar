import { makeAsset, makeItem, makeTask } from '@/domain/__fixtures__/items';
import { BackupError, createBackup, itemsToCsv, parseBackup, type BackupContents } from '@/domain/backup';
import { DEFAULT_SETTINGS } from '@/domain/settings';

const EMPTY: BackupContents = {
  settings: DEFAULT_SETTINGS,
  items: [],
  priceHistory: [],
  attachments: [],
  assets: [],
  usageReadings: [],
  completions: [],
};

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    const contents: BackupContents = {
      settings: { ...DEFAULT_SETTINGS, currency: 'INR', reminderDays: [7] },
      items: [
        makeItem({ id: 1, name: 'Car', provider: 'Toyota', notes: 'Line 1\nLine 2' }),
        makeItem({ id: 2, name: 'Car insurance', parentId: 1, autoRenew: false, assetId: 7 }),
        makeTask({ id: 3, assetId: 7 }),
        makeItem({ id: 4, name: 'Dentist', category: 'appointment', scheduleType: 'expiry', dueTime: '14:30', reminderDays: [1, 0] }),
      ],
      priceHistory: [{ itemId: 1, amountCents: 1000, currency: 'USD', effectiveDate: '2026-10-01' }],
      attachments: [
        {
          itemId: 1,
          kind: 'receipt',
          fileName: '1-1730000000000.jpg',
          mimeType: 'image/jpeg',
          createdAt: '2026-10-01T09:00:00.000Z',
          data: 'aGVsbG8=',
        },
      ],
      assets: [makeAsset({ id: 7, details: { plate: 'ABC-1234' } }), makeAsset({ id: 8, kind: 'home', name: 'Home', usageUnit: null })],
      usageReadings: [{ assetId: 7, reading: 40000, date: '2026-09-01' }],
      completions: [
        { itemId: 3, date: '2026-04-01', amountCents: 4500, currency: 'USD', usage: 40000, note: 'Synthetic' },
      ],
    };

    const backup = createBackup(contents, new Date('2026-10-03T12:00:00Z'));
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('still reads format 1 backups, which have no receipts', () => {
    const backup = { app: 'DueRadar', format: 1, items: [makeItem({ id: 1 })] };
    expect(parseBackup(JSON.stringify(backup)).attachments).toEqual([]);
  });

  it('reads format 2 backups, which have no vehicles, homes or history', () => {
    const item: Record<string, unknown> = { ...makeItem({ id: 1 }) };
    delete item.assetId;
    const parsed = parseBackup(JSON.stringify({ app: 'DueRadar', format: 2, items: [item], attachments: [] }));
    expect(parsed.items[0].assetId).toBeNull();
    expect(parsed.assets).toEqual([]);
    expect(parsed.usageReadings).toEqual([]);
    expect(parsed.completions).toEqual([]);
  });
});

describe('backup receipts', () => {
  const receipt = (overrides: object) => ({
    itemId: 1,
    kind: 'receipt',
    fileName: 'ok.jpg',
    data: 'aGVsbG8=',
    ...overrides,
  });

  it('skips receipts that could write outside the receipts folder or are damaged', () => {
    const backup = {
      app: 'DueRadar',
      format: 2,
      items: [makeItem({ id: 1 })],
      attachments: [
        receipt({ fileName: '../../evil.jpg' }),
        receipt({ fileName: 'sub/dir.jpg' }),
        receipt({ fileName: '.hidden' }),
        receipt({ fileName: 'bad-data.jpg', data: 'not base64!' }),
        receipt({ fileName: 'orphan.jpg', itemId: 9 }),
        receipt({ fileName: 'good.jpg' }),
        receipt({ fileName: 'good.jpg' }),
      ],
    };
    expect(parseBackup(JSON.stringify(backup)).attachments.map((a) => a.fileName)).toEqual(['good.jpg']);
  });
});

describe('backup vehicles and homes', () => {
  it('drops damaged ones and unlinks their items, readings and history', () => {
    const backup = {
      ...createBackup(EMPTY),
      items: [makeTask({ id: 1, assetId: 5 }), makeTask({ id: 2, assetId: 6 })],
      assets: [
        makeAsset({ id: 5 }),
        { id: 6, name: '', kind: 'vehicle' },
        { id: 7, name: 'Boat', kind: 'boat' },
        makeAsset({ id: 5, name: 'Duplicate' }),
      ],
      usageReadings: [
        { assetId: 5, reading: 100, date: '2026-10-01' },
        { assetId: 6, reading: 100, date: '2026-10-01' },
        { assetId: 5, reading: -1, date: '2026-10-01' },
        { assetId: 5, reading: 100, date: 'yesterday' },
      ],
      completions: [
        { itemId: 1, date: '2026-10-01', amountCents: null, currency: null, usage: null, note: null },
        { itemId: 9, date: '2026-10-01' },
        { itemId: 1, date: 'not a date' },
      ],
    };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.assets.map((a) => a.name)).toEqual(['Honda Civic']);
    expect(parsed.items.map((i) => i.assetId)).toEqual([5, null]);
    expect(parsed.usageReadings).toEqual([{ assetId: 5, reading: 100, date: '2026-10-01' }]);
    expect(parsed.completions).toHaveLength(1);
  });

  it('reads the planned "usage" schedule as a task, and gives vehicles a unit', () => {
    const backup = {
      ...createBackup(EMPTY),
      items: [{ ...makeTask({ id: 1, assetId: 5 }), scheduleType: 'usage' }],
      assets: [{ ...makeAsset({ id: 5 }), usageUnit: 'furlongs' }],
    };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.items[0].scheduleType).toBe('task');
    expect(parsed.assets[0].usageUnit).toBe('km');
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
        { ...makeItem({ id: 5 }), category: 'spaceship', parentId: 99, assetId: 3, dueDate: '2026-02-30' },
      ],
      priceHistory: [
        { itemId: 5, amountCents: 500, currency: 'USD', effectiveDate: '2026-10-01' },
        { itemId: 6, amountCents: 500, currency: 'USD', effectiveDate: '2026-10-01' },
      ],
    };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.items[0]).toMatchObject({ category: 'other', parentId: null, assetId: null, dueDate: null });
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
      'Name,Category,Type,Cost,Currency,Frequency,Next date,Start or purchase date,Auto-renew,Status,Company,Notes,Monthly cost,Vehicle or home,Distance interval,Next due at',
    );
    expect(row).toBe(
      '"Gym, ""Pro""",Subscription,Renews,120.00,USD,Yearly,2026-11-04,,Yes,Active,,"Two\nlines",10.00,,,',
    );
  });

  it('includes the vehicle and distances of a task', () => {
    const csv = itemsToCsv([makeTask()], '2026-10-03', [makeAsset()]);
    const row = csv.replace('﻿', '').split('\r\n')[1];
    expect(row).toBe(
      'Oil change,Vehicle,Repeats when done,45.00,USD,Every 6 months,2027-04-01,,,Active,,,7.50,Honda Civic,10000 km,50000 km',
    );
  });
});

describe('backup times and reminders', () => {
  it('keeps valid ones and drops the rest', () => {
    const backup = {
      ...createBackup(EMPTY),
      items: [
        { ...makeItem({ id: 1 }), dueTime: '25:00', reminderDays: 'soon' },
        { ...makeItem({ id: 2 }), dueTime: '09:05', reminderDays: [7, 30, 7, -1] },
      ],
    };
    const [bad, good] = parseBackup(JSON.stringify(backup)).items;
    expect(bad).toMatchObject({ dueTime: null, reminderDays: null });
    expect(good).toMatchObject({ dueTime: '09:05', reminderDays: [30, 7] });
  });
});

describe('backup document photos', () => {
  it('keeps them apart from receipts, even with the same file name', () => {
    const photo = { itemId: 1, fileName: '1-1.jpg', mimeType: 'image/jpeg', createdAt: '2026-10-05T00:00:00.000Z', data: 'aGVsbG8=' };
    const backup = {
      ...createBackup(EMPTY),
      items: [makeItem({ id: 1, category: 'document', scheduleType: 'expiry', dueDate: null })],
      attachments: [
        { ...photo, kind: 'receipt' },
        { ...photo, kind: 'document' },
        { ...photo, kind: 'document' },
        { ...photo, kind: 'contract' },
      ],
    };
    expect(parseBackup(JSON.stringify(backup)).attachments.map((a) => a.kind)).toEqual(['receipt', 'document']);
  });
});
