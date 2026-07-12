# Bundled fonts

All three are heavily subset and bundled so the app renders identically on every
device and works fully offline (PWA). Wired up in `src/app.css`.

- **`suits.woff2`** (~3.5 KB) — the four suit glyphs (♥ ♦ ♣ ♠, U+2660–2667) from
  **Noto Sans Symbols 2** (Google, OFL). Scoped by `unicode-range: U+2660-2667`
  so it overrides only the suits — where clubs (♣) and spades (♠) otherwise look
  too alike on many OS fonts.
- **`num-helder.woff2`** (~4 KB) — card ranks in **Atkinson Hyperlegible**
  (Braille Institute, OFL), designed for low vision. The default "Cijfers"
  choice (`@font-face` family `CardNumHelder`).
- **`num-klassiek.woff2`** (~2 KB) — card ranks in **Roboto Slab** (Google,
  Apache 2.0), a classic slab index (family `CardNumKlassiek`).

The two number faces are subset to just the rank glyphs `A J Q K 0-9` and applied
only to the rank via the `--rank-font` CSS variable (chosen in Solitaire
settings → **Cijfers**), so they never touch the suit glyphs.

## Regenerating

```bash
# Suit glyphs
npm i -D @fontsource/noto-sans-symbols-2 subset-font
node -e "
  import('subset-font').then(async ({default: subset}) => {
    const fs = await import('node:fs')
    const src = 'node_modules/@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2'
    const out = await subset(fs.readFileSync(src), '♠♡♢♣♤♥♦♧', { targetFormat: 'woff2' })
    fs.writeFileSync('src/lib/fonts/suits.woff2', out)
    console.log('wrote', out.length, 'bytes')
  })
"
npm uninstall @fontsource/noto-sans-symbols-2 subset-font

# Rank number faces (Helder + Klassiek), subset to A J Q K 0-9
npm i -D @fontsource/atkinson-hyperlegible @fontsource/roboto-slab subset-font
node -e "
  import('subset-font').then(async ({default: subset}) => {
    const fs = await import('node:fs')
    const glyphs = 'AJQK0123456789'
    const jobs = [
      ['node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2', 'src/lib/fonts/num-helder.woff2'],
      ['node_modules/@fontsource/roboto-slab/files/roboto-slab-latin-700-normal.woff2', 'src/lib/fonts/num-klassiek.woff2'],
    ]
    for (const [src, out] of jobs) {
      const buf = await subset(fs.readFileSync(src), glyphs, { targetFormat: 'woff2' })
      fs.writeFileSync(out, buf)
      console.log('wrote', out, buf.length, 'bytes')
    }
  })
"
npm uninstall @fontsource/atkinson-hyperlegible @fontsource/roboto-slab subset-font
```
