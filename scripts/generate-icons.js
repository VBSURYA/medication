import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generate() {
  const iconSvg = fs.readFileSync(path.resolve('public/icons/icon.svg'));
  const maskableSvg = fs.readFileSync(path.resolve('public/icons/icon-maskable.svg'));

  await sharp(iconSvg)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/icons/icon-192.png'));

  await sharp(iconSvg)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/icon-512.png'));

  await sharp(iconSvg)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/icons/apple-touch-icon.png'));

  await sharp(maskableSvg)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/icons/icon-192-maskable.png'));

  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/icon-512-maskable.png'));

  fs.copyFileSync(path.resolve('public/icons/icon.svg'), path.resolve('public/favicon.svg'));

  console.log('All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
