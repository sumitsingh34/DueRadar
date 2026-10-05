// Renders the DueRadar icon set (app icon, Android adaptive icon layers,
// splash, favicon and notification icon) from the SVG drawn below.
//
// sharp is not an app dependency, so install it just for this run:
//   npm install --no-save sharp
//   node scripts/make-icons.js [output dir] [preview dir]
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const outDir = process.argv[2] ?? path.join(__dirname, '..', 'assets', 'images');
const previewDir = process.argv[3] ?? path.join(os.tmpdir(), 'dueradar-icon-preview');
// Google Play listing graphics, in the folder layout fastlane uses.
const storeDir = path.join(__dirname, '..', 'fastlane', 'metadata', 'android', 'en-US', 'images');
const SIZE = 1024;
const C = SIZE / 2;
const BLUE_TOP = '#46A7FF';
const BLUE_BOTTOM = '#0B6BD3';
const AMBER = '#FFC53D';

const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

/** The radar: outer ring, inner ring, sweep line with a fading trail, centre dot and a blip. */
function glyph(R, { mono = false, color = '#ffffff', accent = AMBER } = {}) {
  const [lx, ly] = polar(R, -30); // leading edge of the sweep
  const [tx, ty] = polar(R, -100); // end of the trail
  const [bx, by] = polar(R * 0.6, -66); // the blip, just swept
  const [g1x, g1y] = polar(R * 0.7, -30);
  const [g2x, g2y] = polar(R * 0.7, -100);
  const trail = `M ${C} ${C} L ${tx} ${ty} A ${R} ${R} 0 0 1 ${lx} ${ly} Z`;
  return `
    <defs>
      <linearGradient id="trail" gradientUnits="userSpaceOnUse" x1="${g1x}" y1="${g1y}" x2="${g2x}" y2="${g2y}">
        <stop offset="0" stop-color="${color}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${mono ? '' : `<path d="${trail}" fill="url(#trail)"/>`}
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${color}" stroke-width="${R * 0.11}"/>
    <circle cx="${C}" cy="${C}" r="${R * 0.6}" fill="none" stroke="${color}" stroke-width="${R * 0.085}"
      ${mono ? '' : 'stroke-opacity="0.75"'}/>
    <line x1="${C}" y1="${C}" x2="${lx}" y2="${ly}" stroke="${color}" stroke-width="${R * 0.1}" stroke-linecap="round"/>
    <circle cx="${C}" cy="${C}" r="${R * 0.12}" fill="${color}"/>
    ${mono ? '' : `<circle cx="${bx}" cy="${by}" r="${R * 0.21}" fill="${accent}" fill-opacity="0.3"/>`}
    <circle cx="${bx}" cy="${by}" r="${R * 0.13}" fill="${mono ? color : accent}"/>`;
}

const background = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BLUE_TOP}"/>
      <stop offset="1" stop-color="${BLUE_BOTTOM}"/>
    </linearGradient>
  </defs>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;

const files = {
  // Full-bleed: iOS and stores apply their own mask, and transparency is not allowed.
  'icon.png': svg(`${background}<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>${glyph(330)}`),
  // Android adaptive icon layers. The foreground keeps inside the 66/108 safe zone.
  'android-icon-background.png': svg(`${background}<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>`),
  'android-icon-foreground.png': svg(glyph(255)),
  'android-icon-monochrome.png': svg(glyph(255, { mono: true })),
  // Shown on the blue splash background.
  'splash-icon.png': svg(glyph(440)),
};

const roundedIcon = svg(
  `${background}<rect width="${SIZE}" height="${SIZE}" rx="230" fill="url(#bg)"/>${glyph(330)}`,
);

(async () => {
  for (const [name, source] of Object.entries(files)) {
    await sharp(Buffer.from(source)).png().toFile(path.join(outDir, name));
  }
  // Web favicon: rounded so it looks like an app icon in the browser tab.
  await sharp(Buffer.from(roundedIcon)).resize(48, 48).png().toFile(path.join(outDir, 'favicon.png'));
  // Android status bar icon: white silhouette on transparent, 96 x 96.
  await sharp(Buffer.from(svg(glyph(440, { mono: true }))))
    .resize(96, 96)
    .png()
    .toFile(path.join(outDir, 'notification-icon.png'));

  // Google Play: a 512 x 512 icon (Play adds the rounded corners) and a 1024 x 500 feature graphic.
  fs.mkdirSync(storeDir, { recursive: true });
  await sharp(Buffer.from(files['icon.png'])).resize(512, 512).png().toFile(path.join(storeDir, 'icon.png'));
  const radar = await sharp(Buffer.from(files['splash-icon.png'])).resize(330, 330).png().toBuffer();
  const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
    ${background}<rect width="1024" height="500" fill="url(#bg)"/>
    <g font-family="Segoe UI, Roboto, Arial, sans-serif" fill="#ffffff">
      <text x="460" y="225" font-size="92" font-weight="700">DueRadar</text>
      <text x="463" y="295" font-size="40" fill-opacity="0.92">See what's coming</text>
      <text x="463" y="345" font-size="40" fill-opacity="0.92">before it's due.</text>
    </g>
  </svg>`;
  const featureGraphic = await sharp(Buffer.from(banner))
    .composite([{ input: radar, left: 75, top: 85 }])
    .png()
    .toBuffer();
  // Play takes a feature graphic only as a JPEG or a PNG without an alpha channel.
  await sharp(featureGraphic).removeAlpha().png().toFile(path.join(storeDir, 'featureGraphic.png'));

  // Previews for checking: a launcher-style circle mask and the rounded icon.
  fs.mkdirSync(previewDir, { recursive: true });
  const layers = await sharp(Buffer.from(files['android-icon-background.png']))
    .composite([{ input: Buffer.from(files['android-icon-foreground.png']) }])
    .png()
    .toBuffer();
  // Launchers show the middle 72 of 108 dp.
  const visible = Math.round((SIZE * 72) / 108);
  const offset = Math.round((SIZE - visible) / 2);
  const circleMask = Buffer.from(
    `<svg width="${visible}" height="${visible}"><circle cx="${visible / 2}" cy="${visible / 2}" r="${visible / 2}"/></svg>`,
  );
  const cropped = await sharp(layers)
    .extract({ left: offset, top: offset, width: visible, height: visible })
    .png()
    .toBuffer();
  const masked = await sharp(cropped)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  await sharp(masked).resize(256, 256).png().toFile(path.join(previewDir, 'android-launcher.png'));
  await sharp(Buffer.from(roundedIcon)).resize(256, 256).png().toFile(path.join(previewDir, 'rounded.png'));
  await sharp(Buffer.from(files['android-icon-monochrome.png']))
    .flatten({ background: '#1C1B1F' })
    .resize(128, 128)
    .png()
    .toFile(path.join(previewDir, 'monochrome.png'));
  console.log(`Icons written to ${outDir} and ${storeDir}; previews in ${previewDir}`);
})();
