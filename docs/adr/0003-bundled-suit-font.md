# 3. Bundle a subset suit font for cross-device glyphs

**Status:** Accepted (2026-07-05)

## Context

The player has low vision. Suit symbols (♥ ♦ ♣ ♠) were rendered as Unicode glyphs in the
OS system font. That font differs per device (iPad Safari vs Android vs desktop), and in
several of them **clubs (♣) and spades (♠) are nearly indistinguishable** — a real
readability failure. Two rejected alternatives: recolouring suits (a four-colour deck) —
the user wants to **keep classic red/black**; and hand-drawing SVG suit shapes — "do not
think you can be a better font/symbol designer than the specialists."

## Decision

**Bundle** the four suit glyphs, subset from **Noto Sans Symbols 2** (Google, OFL license),
into a ~3.5 KB `src/lib/fonts/suits.woff2`. Register it in `src/app.css` via `@font-face`
with `unicode-range: U+2660-2667` so it overrides **only** the suit characters and nothing
else. Colours stay classic red/black. Regeneration steps are documented in
`src/lib/fonts/README.md`.

## Consequences

- Suits render **identically on every device**; Noto's spade sits on a distinct pedestal
  base, unmistakable from the three-lobe club.
- Self-hosted and tiny → works offline, respects the strict no-external-host PWA model,
  negligible bundle cost (precached by the service worker).
- Keeps the traditional red/black look the user wants.
- Trade-off: a font artifact is committed to the repo; provenance/regeneration is documented
  so it stays reproducible.
