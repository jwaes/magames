# 2. Svelte 5 runes stores with localStorage persistence

**Status:** Accepted (2026-07-05)

## Context

The app needs reactive UI state (current game, settings, and — as of this increment —
stats) that survives reloads and app restarts on the iPad, works fully offline, and needs
no backend, accounts, or network (a privacy- and simplicity-first product for one player).

## Decision

Model shared state as **Svelte 5 runes classes** in `*.svelte.ts` files, each exporting a
**singleton** (`game`, `settings`, `stats`). Persist user data to **`localStorage`** under
versioned keys (`magames.settings.v1`, `magames.stats.v1`). Loads merge parsed data onto
defaults and tolerate malformed/absent storage by falling back to defaults. Pure reducer
logic lives in framework-free modules; the runes store is a thin reactive+persistence wrapper.

## Consequences

- Fully offline, zero backend, no PII leaves the device — matches the product's intent.
- Reactivity is automatic in components via `$state`/`$derived`.
- Versioned keys give a clean migration path; merging onto defaults keeps old saves valid
  when fields are added.
- Testable: pure reducers are unit-tested directly; stores are tested via jsdom's
  `localStorage`.
- Trade-off: `localStorage` is device-local — stats/settings don't sync across devices.
  Accepted; sync is a non-goal.
