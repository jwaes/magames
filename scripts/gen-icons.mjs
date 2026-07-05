// Rasterize public/favicon.svg into the PNG icons the PWA manifest needs.
// Run with: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(resolve(root, 'public/favicon.svg'))
const outDir = resolve(root, 'public/icons')
mkdirSync(outDir, { recursive: true })

const jobs = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }
]

for (const { file, size } of jobs) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(resolve(outDir, file))
  console.log('wrote', file)
}

// Maskable icon: same art on a full-bleed background with safe padding.
const green = { r: 11, g: 107, b: 58, alpha: 1 }
const inner = await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: green } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile(resolve(outDir, 'icon-512-maskable.png'))
console.log('wrote icon-512-maskable.png')
