/**
 * Rasterize brand mark into Chrome/PWA icon sizes.
 * Run from repo root: node apps/web/scripts/generate-brand-icons.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const markSvg = readFileSync(join(publicDir, "brand", "logo-mark.svg"));

const targets = [
  { file: "favicon-16.png", size: 16 },
  { file: "favicon-32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icons/icon-192.png", size: 192 },
  { file: "icons/icon-512.png", size: 512 },
  { file: "icons/icon-maskable-512.png", size: 512, maskable: true },
  { file: "icon-1024.png", size: 1024 }
];

function maskableSvg(size) {
  // Safe-zone padding (~20%) for Android maskable icons.
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" fill="#10151C"/>
  <svg x="${pad}" y="${pad}" width="${inner}" height="${inner}" viewBox="0 0 64 64">
    <path d="M18 18h28v7.5H27.5V29H42v7H27.5v9.5H18V18z" fill="#FFFFFF"/>
    <circle cx="48" cy="48" r="7" fill="#2B8FF0"/>
    <path d="M46.2 48h3.6M48 46.2v3.6" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
</svg>`);
}

mkdirSync(join(publicDir, "icons"), { recursive: true });

for (const target of targets) {
  const out = join(publicDir, target.file);
  const input = target.maskable ? maskableSvg(target.size) : markSvg;
  await sharp(input)
    .resize(target.size, target.size, { fit: "contain", background: { r: 16, g: 21, b: 28, alpha: 1 } })
    .png()
    .toFile(out);
  console.log(`Wrote ${target.file} (${target.size}x${target.size})`);
}

// Multi-size ICO for classic Chrome/browser tabs.
const ico16 = await sharp(markSvg).resize(16, 16).png().toBuffer();
const ico32 = await sharp(markSvg).resize(32, 32).png().toBuffer();
// Sharp cannot write .ico natively; write PNG favicon and a simple ICO-like fallback path.
writeFileSync(join(publicDir, "favicon.ico"), ico32);
console.log("Wrote favicon.ico (32px PNG bytes — browsers accept PNG favicons via link tags)");

// Also keep a dedicated favicon.png for explicit link tags
await sharp(markSvg).resize(32, 32).png().toFile(join(publicDir, "favicon.png"));
console.log("Wrote favicon.png");
console.log("Brand icons generated.");
