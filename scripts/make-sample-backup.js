// Builds a DueRadar backup full of made-up items, for taking store screenshots
// without showing anyone's real data. Dates count from today, so the Overview
// always has things coming up. Restore it in Settings > Restore from backup.
//
//   node scripts/make-sample-backup.js [output file]
const fs = require('fs');
const path = require('path');

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Today on this computer, as YYYY-MM-DD. */
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Noon UTC, so adding days never crosses a date line. */
const at = (iso) => new Date(`${iso}T12:00:00Z`);
const days = (iso, n) => isoDate(new Date(at(iso).getTime() + n * 86400000));

/** Like the app's addInterval: the 31st plus a month is the end of the next month. */
function months(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(Math.min(d, last))}`;
}

/** The next April 15 after today, when US tax returns are due. */
function nextTaxDay(today) {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-04-15`;
  return today < thisYear ? thisYear : `${year + 1}-04-15`;
}

function buildSampleBackup(today = localToday()) {
  const stamp = `${days(today, -30)}T12:00:00.000Z`;
  const CAR = 1;
  const HOME = 2;

  const assets = [
    { id: CAR, name: 'Honda Civic', kind: 'vehicle', usageUnit: 'mi', details: { plate: '7XYZ482' }, notes: null },
    { id: HOME, name: 'Home', kind: 'home', usageUnit: null, details: {}, notes: null },
  ].map((asset) => ({ ...asset, createdAt: stamp, updatedAt: stamp }));

  // About 880 miles a month, so the tire rotation's distance comes before its date.
  const usageReadings = [
    { assetId: CAR, reading: 39600, date: days(today, -120) },
    { assetId: CAR, reading: 41300, date: days(today, -60) },
    { assetId: CAR, reading: 42980, date: days(today, -3) },
  ];

  const base = {
    amountCents: null,
    currency: 'USD',
    intervalUnit: null,
    intervalCount: null,
    startDate: null,
    dueDate: null,
    dueTime: null,
    reminderDays: null,
    usageInterval: null,
    usageUnit: null,
    nextUsage: null,
    autoRenew: false,
    status: 'active',
    provider: null,
    notes: null,
    details: {},
    parentId: null,
    assetId: null,
  };
  const monthly = { scheduleType: 'recurring', intervalUnit: 'month', intervalCount: 1, autoRenew: true };
  const yearly = { scheduleType: 'recurring', intervalUnit: 'year', intervalCount: 1, autoRenew: true };
  const once = { scheduleType: 'expiry' };
  const every = (count, unit) => ({ scheduleType: 'task', intervalUnit: unit, intervalCount: count });

  const pestControlDone = months(days(today, -3), -3);
  const passportExpires = days(today, 214);
  const licenseExpires = days(today, 380);
  const headphonesBought = days(today, -340);
  const laptopBought = days(today, -250);

  const items = [
    // Subscriptions and bills
    { name: 'Netflix', category: 'subscription', ...monthly, amountCents: 1549, dueDate: days(today, 4) },
    { name: 'Spotify', category: 'subscription', ...monthly, amountCents: 1199, dueDate: days(today, 12) },
    { name: 'iCloud+', category: 'subscription', ...monthly, amountCents: 299, dueDate: days(today, 21) },
    { name: 'Hulu', category: 'subscription', ...monthly, amountCents: 999, dueDate: days(today, 15), status: 'paused' },
    { name: 'Gym membership', category: 'membership', ...monthly, amountCents: 2499, dueDate: days(today, 9) },
    { name: 'Costco membership', category: 'membership', ...yearly, amountCents: 6500, dueDate: days(today, 150) },
    { name: 'Internet', category: 'utility', ...monthly, amountCents: 8000, dueDate: days(today, 17) },
    { name: 'Phone plan', category: 'utility', ...monthly, amountCents: 4500, dueDate: days(today, 24) },
    {
      name: 'Car insurance',
      category: 'insurance',
      scheduleType: 'recurring',
      intervalUnit: 'month',
      intervalCount: 6,
      autoRenew: true,
      amountCents: 61200,
      dueDate: days(today, 55),
      assetId: CAR,
    },
    { name: 'Renters insurance', category: 'insurance', ...yearly, amountCents: 18000, dueDate: days(today, 200), assetId: HOME },
    { name: 'Domain name', category: 'software', ...yearly, autoRenew: false, amountCents: 1499, dueDate: days(today, 26) },
    { name: 'Microsoft 365', category: 'software', ...yearly, amountCents: 9999, dueDate: days(today, 240) },
    { name: 'Travel card annual fee', category: 'card_fee', ...yearly, amountCents: 9500, dueDate: days(today, 130) },

    // Warranties
    {
      name: 'Headphones',
      category: 'warranty',
      ...once,
      amountCents: 34900,
      startDate: headphonesBought,
      dueDate: months(headphonesBought, 12),
      provider: 'Electronics store',
    },
    {
      name: 'Laptop',
      category: 'warranty',
      ...once,
      amountCents: 129900,
      startDate: laptopBought,
      dueDate: months(laptopBought, 24),
      provider: 'Electronics store',
    },

    // Home upkeep
    { name: 'HVAC filter', category: 'maintenance', ...every(3, 'month'), amountCents: 2500, dueDate: days(today, 10), assetId: HOME },
    { name: 'Pest control', category: 'maintenance', ...every(3, 'month'), amountCents: 8900, dueDate: days(today, -3), assetId: HOME },
    { name: 'AC service', category: 'maintenance', ...every(1, 'year'), amountCents: 15000, dueDate: days(today, 160), assetId: HOME },

    // The car: due by date or distance, whichever comes first
    {
      name: 'Oil change',
      category: 'vehicle',
      ...every(6, 'month'),
      amountCents: 5999,
      dueDate: months(days(today, -100), 6),
      usageInterval: 5000,
      usageUnit: 'mi',
      nextUsage: 44900,
      assetId: CAR,
    },
    {
      name: 'Tire rotation',
      category: 'vehicle',
      ...every(6, 'month'),
      amountCents: 3000,
      dueDate: months(days(today, -140), 6),
      usageInterval: 5000,
      usageUnit: 'mi',
      nextUsage: 43600,
      assetId: CAR,
    },
    { name: 'Registration', category: 'vehicle', ...yearly, autoRenew: false, amountCents: 8500, dueDate: days(today, 95), assetId: CAR },

    // Life admin
    {
      name: 'Apartment lease',
      category: 'lease',
      ...once,
      startDate: days(today, -290),
      dueDate: days(today, 75),
      reminderDays: [90, 60, 30],
      assetId: HOME,
    },
    { name: 'Tax return', category: 'tax', ...once, dueDate: nextTaxDay(today) },
    {
      name: "Driver's license",
      category: 'license',
      ...once,
      startDate: months(licenseExpires, -60),
      dueDate: licenseExpires,
      reminderDays: [60, 30, 7],
    },
    {
      name: 'Dentist',
      category: 'appointment',
      ...once,
      dueDate: days(today, 6),
      dueTime: '10:30',
      reminderDays: [1, 0],
      provider: 'Downtown Dental',
    },
    {
      name: 'Annual checkup',
      category: 'appointment',
      ...once,
      dueDate: days(today, -20),
      dueTime: '09:00',
      reminderDays: [1, 0],
    },

    // Documents
    {
      name: 'Passport',
      category: 'document',
      ...once,
      startDate: months(passportExpires, -120),
      dueDate: passportExpires,
      reminderDays: [180, 90, 30],
    },
    { name: 'Birth certificate', category: 'document', ...once },
  ].map((item, index) => ({ ...base, ...item, id: index + 1, createdAt: stamp, updatedAt: stamp }));

  const idOf = (name) => items.find((item) => item.name === name).id;

  // Every price is recorded when it's set; these three went up over time.
  const raises = {
    Netflix: [
      [1349, days(today, -420)],
      [1549, days(today, -150)],
    ],
    Spotify: [
      [1099, days(today, -480)],
      [1199, days(today, -220)],
    ],
    Internet: [
      [5500, days(today, -700)],
      [6500, days(today, -340)],
      [8000, days(today, -70)],
    ],
  };
  const priceHistory = items
    .filter((item) => item.amountCents != null)
    .flatMap((item) =>
      (raises[item.name] ?? [[item.amountCents, days(today, -30)]]).map(([amountCents, effectiveDate]) => ({
        itemId: item.id,
        amountCents,
        currency: 'USD',
        effectiveDate,
      })),
    );

  const completions = [
    { name: 'Oil change', date: days(today, -100), amountCents: 5999, usage: 39900, note: 'Full synthetic' },
    { name: 'Tire rotation', date: days(today, -140), amountCents: 3000, usage: 38600, note: null },
    { name: 'HVAC filter', date: days(today, -82), amountCents: 2500, usage: null, note: null },
    { name: 'Pest control', date: pestControlDone, amountCents: 8900, usage: null, note: 'Inside and outside' },
    { name: 'AC service', date: months(days(today, 160), -12), amountCents: 15000, usage: null, note: null },
  ].map(({ name, ...done }) => ({ itemId: idOf(name), currency: 'USD', ...done }));

  return {
    app: 'DueRadar',
    format: 5,
    exportedAt: new Date().toISOString(),
    settings: { currency: 'USD', remindersEnabled: true, reminderDays: [30, 7, 1], reminderHour: 9, appLock: false },
    items,
    priceHistory,
    attachments: [],
    assets,
    usageReadings,
    completions,
  };
}

module.exports = { buildSampleBackup };

if (require.main === module) {
  const output = process.argv[2] ?? `dueradar-sample-backup-${localToday()}.json`;
  fs.writeFileSync(output, JSON.stringify(buildSampleBackup(), null, 2));
  console.log(`Sample backup written to ${path.resolve(output)}`);
}
