import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  console.log('[Build Asset Generator] Starting asset generation...');

  const svgSrc = 'public/favicon.svg';
  const deskSrc = 'src/assets/images/pwa_screen_desk_1787317232791.jpg';
  const mobSrc = 'src/assets/images/pwa_screen_mob_1787317211699.jpg';

  if (!fs.existsSync(svgSrc)) {
    console.error('[Build Asset Generator] Source SVG image not found at ' + svgSrc);
    return;
  }

  // Ensure public and public/Site directories exist
  if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
  if (!fs.existsSync('public/Site')) fs.mkdirSync('public/Site', { recursive: true });

  console.log('[Build Asset Generator] Generating icon formats from cute site SVG...');
  const svgBuffer = fs.readFileSync(svgSrc);

  await sharp(svgBuffer, { density: 600 }).resize(512, 512).png().toFile('public/icon-512.png');
  await sharp(svgBuffer, { density: 600 }).resize(512, 512).png().toFile('public/icon.png');
  await sharp(svgBuffer, { density: 600 }).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svgBuffer, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svgBuffer, { density: 600 }).resize(64, 64).png().toFile('public/favicon.png');
  await sharp(svgBuffer, { density: 600 }).resize(48, 48).png().toFile('public/favicon-48.png');
  await sharp(svgBuffer, { density: 600 }).resize(32, 32).png().toFile('public/favicon-32.png');
  await sharp(svgBuffer, { density: 600 }).resize(16, 16).png().toFile('public/favicon-16.png');
  await sharp(svgBuffer, { density: 600 }).resize(32, 32).png().toFile('public/favicon.ico');

  if (fs.existsSync(deskSrc)) {
    console.log('[Build Asset Generator] Generating desktop screenshot...');
    await sharp(deskSrc).resize(1280, 720).png().toFile('public/screenshot-desktop.png');
    await sharp(deskSrc).resize(1200, 630).jpeg({ quality: 90 }).toFile('public/og-banner.jpg');
  }

  if (fs.existsSync(mobSrc)) {
    console.log('[Build Asset Generator] Generating mobile screenshot...');
    await sharp(mobSrc).resize(750, 1334).png().toFile('public/screenshot-mobile.png');
  }

  // Sync all generated assets to public/Site
  const filesToSync = [
    'icon-512.png',
    'icon.png',
    'icon-192.png',
    'apple-touch-icon.png',
    'favicon.png',
    'favicon-32.png',
    'favicon-16.png',
    'favicon.ico',
    'screenshot-desktop.png',
    'screenshot-mobile.png',
    'manifest.json'
  ];

  for (const file of filesToSync) {
    const srcPath = path.join('public', file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join('public/Site', file));
    }
  }

  console.log('[Build Asset Generator] All assets generated and synced successfully!');
}

generateAssets().catch((err) => {
  console.error('[Build Asset Generator] Error generating assets:', err);
  process.exit(1);
});
