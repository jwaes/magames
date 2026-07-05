# Architecture Decision Records

Short records of the significant, hard-to-reverse decisions behind **magames** — an
ad-free, large-print card-game PWA built for an 80-year-old, low-vision player.

Format: [Nygard-style](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
Each ADR has **Status · Context · Decision · Consequences**. ADRs are immutable once
Accepted; to change one, add a new ADR that supersedes it.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-ui-free-immutable-engine.md) | UI-free, immutable game engine | Accepted |
| [0002](0002-runes-stores-localstorage.md) | Svelte 5 runes stores with localStorage persistence | Accepted |
| [0003](0003-bundled-suit-font.md) | Bundle a subset suit font for cross-device glyphs | Accepted |
| [0004](0004-tap-default-hybrid-drag.md) | Tap-to-move default, hybrid drag optional | Accepted |
| [0005](0005-local-stats-and-truly-stuck-loss.md) | Local-only stats with honest truly-stuck loss | Accepted |
