import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  console.log('[Build Asset Generator] Starting asset generation...');

  const iconSrc = 'src/assets/images/schoolvan_app_icon_1786580259195.jpg';
  const deskSrc = 'src/assets/images/schoolvan_desktop_screenshot_1786580276088.jpg';
  const mobSrc = 'src/assets/images/schoolvan_mobile_screenshot_1786580288879.jpg';

  if (!fs.existsSync(iconSrc)) {
    console.error('[Build Asset Generator] Source icon image not found at ' + iconSrc);
    return;
  }

  // Ensure public and public/Site directories exist
  if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
  if (!fs.existsSync('public/Site')) fs.mkdirSync('public/Site', { recursive: true });

  console.log('[Build Asset Generator] Generating icon formats...');
  await sharp(iconSrc).resize(512, 512).png().toFile('public/icon-512.png');
  await sharp(iconSrc).resize(512, 512).png().toFile('public/icon.png');
  await sharp(iconSrc).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(iconSrc).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(iconSrc).resize(64, 64).png().toFile('public/favicon.png');
  await sharp(iconSrc).resize(32, 32).png().toFile('public/favicon-32.png');
  await sharp(iconSrc).resize(16, 16).png().toFile('public/favicon-16.png');
  await sharp(iconSrc).resize(32, 32).png().toFile('public/favicon.ico');

  if (fs.existsSync(deskSrc)) {
    console.log('[Build Asset Generator] Generating desktop screenshot...');
    await sharp(deskSrc).resize(1280, 720).png().toFile('public/screenshot-desktop.png');
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
