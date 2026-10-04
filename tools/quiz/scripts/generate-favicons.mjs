// One-off asset pipeline: generates the favicon/PWA icon set from the
// simplified circular icon (no wordmark, so it stays legible at 16px).
// Run with: node scripts/generate-favicons.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'public/branding/logo/bbntcog-icon.png';
const OUT_DIR = 'public/branding/favicons';

const PNG_SIZES = [16, 32, 48, 180, 192, 512];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const pngPaths = [];
  for (const size of PNG_SIZES) {
    const path = `${OUT_DIR}/favicon-${size}x${size}.png`;
    await sharp(SOURCE).resize(size, size).png().toFile(path);
    pngPaths.push(path);
    console.log('wrote', path);
  }

  // Friendly aliases the HTML/manifest expect
  await sharp(SOURCE).resize(180, 180).png().toFile(`${OUT_DIR}/apple-touch-icon.png`);
  await sharp(SOURCE).resize(192, 192).png().toFile(`${OUT_DIR}/android-chrome-192x192.png`);
  await sharp(SOURCE).resize(512, 512).png().toFile(`${OUT_DIR}/android-chrome-512x512.png`);

  // Maskable icon needs safe-area padding (icon content within the inner ~80%)
  const maskableSize = 512;
  const inner = Math.round(maskableSize * 0.7);
  const pad = Math.round((maskableSize - inner) / 2);
  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 3, g: 27, b: 78, alpha: 1 }, // brand navy
    },
  })
    .composite([{ input: await sharp(SOURCE).resize(inner, inner).toBuffer(), top: pad, left: pad }])
    .png()
    .toFile(`${OUT_DIR}/maskable-icon-512x512.png`);

  // Multi-resolution .ico for legacy browsers
  const icoBuffer = await pngToIco([
    `${OUT_DIR}/favicon-16x16.png`,
    `${OUT_DIR}/favicon-32x32.png`,
    `${OUT_DIR}/favicon-48x48.png`,
  ]);
  await writeFile(`${OUT_DIR}/favicon.ico`, icoBuffer);
  console.log('wrote', `${OUT_DIR}/favicon.ico`);

  console.log('Favicon generation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
