/**
 * Generate PWA icons from Fitchef3 logo – 192, 512 (any + maskable), apple-touch 180
 * Run: node scripts/generate-pwa-icons.js
 */
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const SOURCE = path.join(__dirname, '../public/images/Fitchef3 logo.png');
const OUT_DIR = path.join(__dirname, '../public/images/pwa');

async function run() {
  const buf = await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();

  await fs.promises.mkdir(OUT_DIR, { recursive: true });

  await sharp(buf).resize(192, 192).png().toFile(path.join(OUT_DIR, 'icon-192.png'));
  await sharp(buf).resize(512, 512).png().toFile(path.join(OUT_DIR, 'icon-512.png'));

  await sharp(buf).resize(192, 192).png().toFile(path.join(OUT_DIR, 'maskable-192.png'));
  await sharp(buf).resize(512, 512).png().toFile(path.join(OUT_DIR, 'maskable-512.png'));

  await sharp(buf).resize(180, 180).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));

  console.log('PWA icons generated from Fitchef3 logo');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
