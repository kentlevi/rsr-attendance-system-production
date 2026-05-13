/**
 * Rasterises the favicon SVG into the PNG inputs that @capacitor/assets expects.
 * Outputs:
 *   - assets/icon.png             (1024x1024 launcher icon, solid green)
 *   - assets/icon-foreground.png  (1024x1024 transparent "R", centred in safe zone)
 *   - assets/icon-background.png  (1024x1024 solid green background)
 *
 * Run with: npm run assets:from-favicon
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

const PRIMARY = '#0B7A4B';
const SIZE = 1024;

// RSR monogram. Letter-spacing widens the wordmark so it reads clearly at small
// icon sizes; textLength keeps it inside the safe zone regardless of font metrics.
const launcherSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="180" fill="${PRIMARY}" />
  <text x="512" y="620" font-family="Arial Black, Helvetica, sans-serif"
        font-size="340" font-weight="900" letter-spacing="-10"
        text-anchor="middle" textLength="760" lengthAdjust="spacingAndGlyphs"
        fill="white">RSR</text>
</svg>
`;

// Foreground for adaptive icon: transparent background, RSR sized to fit Android's
// 66% safe zone (so the OS round/squircle mask doesn't clip it).
const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <text x="512" y="580" font-family="Arial Black, Helvetica, sans-serif"
        font-size="240" font-weight="900" letter-spacing="-8"
        text-anchor="middle" textLength="560" lengthAdjust="spacingAndGlyphs"
        fill="white">RSR</text>
</svg>
`;

const backgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${PRIMARY}" />
</svg>
`;

async function rasterise(svg, outPath, opts = {}) {
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, { fit: 'contain', background: opts.background ?? { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log(`✓ wrote ${outPath}`);
}

await mkdir(assetsDir, { recursive: true });
await rasterise(launcherSvg, join(assetsDir, 'icon.png'), { background: PRIMARY });
await rasterise(foregroundSvg, join(assetsDir, 'icon-foreground.png'));
await rasterise(backgroundSvg, join(assetsDir, 'icon-background.png'), { background: PRIMARY });

console.log('\nDone. Next steps:');
console.log('  npm run assets:generate    # produces all Android icon densities');
console.log('  npx cap sync android       # syncs them into the Android project');
