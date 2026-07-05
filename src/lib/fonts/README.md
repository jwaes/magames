# suits.woff2

`suits.woff2` (~3.5 KB) contains **only** the four playing-card suit glyphs
(♥ ♦ ♣ ♠, U+2660–2667), subset from **Noto Sans Symbols 2** (Google, OFL license).

We bundle it so the suits render identically on every device instead of relying
on the OS font — where clubs (♣) and spades (♠) often look too alike. It's wired
up in `src/app.css` via an `@font-face` with `unicode-range: U+2660-2667`, so it
overrides only the suit characters and nothing else.

## Regenerating

```bash
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
```
