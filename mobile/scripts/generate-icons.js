#!/usr/bin/env node
'use strict';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assets = path.join(__dirname, '..', 'assets');

async function convert(svgPath, outPath, size) {
  const svg = fs.readFileSync(svgPath);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(outPath);
  const { size: bytes } = fs.statSync(outPath);
  console.log(`wrote ${path.relative(process.cwd(), outPath)} (${size}×${size}, ${(bytes / 1024).toFixed(1)} KB)`);
}

async function verifyDimensions(filePath, expectedSize) {
  const meta = await sharp(filePath).metadata();
  if (meta.width !== expectedSize || meta.height !== expectedSize) {
    throw new Error(`${filePath}: expected ${expectedSize}×${expectedSize}, got ${meta.width}×${meta.height}`);
  }
}

async function main() {
  const iconSvg = path.join(assets, 'icon.svg');
  const splashSvg = path.join(assets, 'splash-icon.svg');

  await convert(iconSvg,   path.join(assets, 'icon.png'),          1024);
  await convert(iconSvg,   path.join(assets, 'adaptive-icon.png'), 1024);
  await convert(iconSvg,   path.join(assets, 'favicon.png'),         48);
  await convert(splashSvg, path.join(assets, 'splash-icon.png'),    200);

  // Verify dimensions
  await verifyDimensions(path.join(assets, 'icon.png'),          1024);
  await verifyDimensions(path.join(assets, 'adaptive-icon.png'), 1024);
  await verifyDimensions(path.join(assets, 'favicon.png'),         48);
  await verifyDimensions(path.join(assets, 'splash-icon.png'),    200);

  console.log('all dimensions verified ✓');
}

main().catch((err) => { console.error(err); process.exit(1); });
