# Honest Hint & Illegal-Move Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Solitaire hint tell the player *why* it has nothing to suggest — draw a card, take one back off a foundation, or the game is genuinely over — and give refused moves a wiggle plus a haptic buzz.

**Architecture:** `findHint` stops returning a bare `Source | null` and returns a `Hint` discriminated union (`move` / `draw` / `stuck`), computed entirely in the pure engine. The store maps those three outcomes onto three existing UI affordances: the card pulse, a new deck pulse, and the already-built "Geen zetten meer mogelijk" overlay. Illegal-move feedback is a `shake` prop on `Card.svelte` driven by a short-lived `shakeId` in `Solitaire.svelte`, plus a guarded `navigator.vibrate` helper.

**Tech Stack:** Svelte 5 runes, TypeScript strict, Vitest + @testing-library/svelte, Playwright.

## Global Constraints

- Engine stays pure and UI-free: no DOM, no `settings`, no sound in `src/lib/engine/*` (ADR 1).
- All new player-facing copy is **Dutch**.
- Every animation must degrade under `prefers-reduced-motion: reduce`.
- `isStuck` must never false-positive; do not weaken it. Reuse it, don't reimplement it.
- Design decisions are recorded in `docs/adr/0006-hint-with-a-reason-and-illegal-move-feedback.md` — read it before starting.
- Verification gate for the whole branch: `npm run check` (0 errors, 0 warnings), `npx vitest run`, `npx playwright test`, `npm run build`.

---

### Task 1: Engine — `Hint` union, `draw` and `stuck` reasons, last-resort foundation pull

**Files:**
- Modify: `src/lib/engine/solitaire.ts:271-305` (replace `allSources` usage in `findHint`)
- Test: `src/lib/engine/solitaire.test.ts:259-292` (update the 4 existing `findHint` tests, add 5)

**Interfaces:**
- Consumes: existing `Source`, `GameState`, `autoDest`, `move`, `isStuck`, `placeableAnywhere`, `uncoversCard`, `allSources`, `NUM_TABLEAU` — all already in this file.
- Produces:
  ```ts
  export type Hint =
    | { kind: 'move'; src: Source }
    | { kind: 'draw' }
    | { kind: 'stuck' }
  export function findHint(state: GameState): Hint | null
  ```
  Task 3 imports both `findHint` and `type Hint`.

- [ ] **Step 1: Update the four existing `findHint` tests to the new shape**

In `src/lib/engine/solitaire.test.ts`, replace the bodies of the existing assertions in `describe('findHint', ...)`:

```ts
  it('prefers a foundation move above anything else', () => {
    const s = emptyState()
    // A lone Ace on the waste can go to its foundation.
    s.waste = [card('spades', 1)]
    // Plus a purely lateral tableau move (red 5 -> another black 6) that we must NOT prefer.
    s.tableau[0] = [card('spades', 6), card('hearts', 5)]
    s.tableau[1] = [card('clubs', 6)]
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'waste' } })
  })

  it('hints a tableau move that uncovers a face-down card', () => {
    const s = emptyState()
    s.tableau[0] = [card('clubs', 9, false), card('hearts', 5)] // face-down under a red 5
    s.tableau[1] = [card('spades', 6)] // black 6 accepts the red 5
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'tableau', pile: 0, index: 1 } })
  })

  it('does NOT hint a pointless lateral move (returns null)', () => {
    const s = emptyState()
    // Red 5 sits on a black 6 with nothing hidden beneath; moving it to an
    // equivalent black 6 reveals nothing and must not be suggested. The board
    // is not dead either (that lateral move is legal), so this is null, not 'stuck'.
    s.tableau[0] = [card('spades', 6), card('hearts', 5)]
    s.tableau[1] = [card('clubs', 6)]
    expect(findHint(s)).toBeNull()
  })

  it('hints a waste card that can join the tableau', () => {
    const s = emptyState()
    s.waste = [card('hearts', 5)] // red 5
    s.tableau[0] = [card('spades', 6)] // black 6 accepts it
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'waste' } })
  })
```

- [ ] **Step 2: Add the five new tests**

Append inside the same `describe('findHint', ...)` block:

```ts
  it("says 'draw' when only a card still in the deck can help", () => {
    const s = emptyState()
    // Two black/red 2s that cannot stack on each other — no board move at all.
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // …but an Ace is still buried in the stock, and an Ace always has a home.
    s.stock = [card('clubs', 1, false)]
    expect(findHint(s)).toEqual({ kind: 'draw' })
  })

  it("says 'draw' when the deck is spent but the waste still holds a playable card", () => {
    const s = emptyState()
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // Top of waste (the 9) is unplayable, but recycling brings the Ace back round.
    s.waste = [card('clubs', 1), card('diamonds', 9)]
    expect(findHint(s)).toEqual({ kind: 'draw' })
  })

  it("says 'stuck' when nothing on the board or in the deck can ever help", () => {
    const s = emptyState()
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    expect(findHint(s)).toEqual({ kind: 'stuck' })
  })

  it('suggests taking a card back off a foundation when that unblocks another card', () => {
    const s = emptyState()
    // Hearts foundation holds A..5, so its top card is the red 5.
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4, 5].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6)] // black 6 — the red 5 can come back here…
    s.tableau[1] = [card('clubs', 9, false), card('spades', 4)] // …freeing this black 4
    // Before the pull nothing is productive: the black 4 has no red 5 to sit on.
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'foundation', pile: SUITS.indexOf('hearts') } })
  })

  it('does NOT suggest a foundation pull whose only follow-up is putting the same card back', () => {
    const s = emptyState()
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4, 5].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6)] // the red 5 fits here, but nothing else follows
    // Pulling 5♥ onto the 6♠ only lets 5♥ go straight back — an infinite loop, not a hint.
    // The board is not dead (that pull is legal), so this is null rather than 'stuck'.
    expect(findHint(s)).toBeNull()
  })
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/engine/solitaire.test.ts`
Expected: FAIL — the four updated tests fail on shape (`{type:'waste'}` received, `{kind:'move',…}` expected) and the five new ones fail (`null` received). TypeScript may also flag `Rank` usage — `Rank` is already imported at the top of this file, so no import change is needed.

- [ ] **Step 4: Implement in `src/lib/engine/solitaire.ts`**

Replace the whole `findHint` block (currently lines 283-305, the doc comment plus the function) with:

```ts
/** Where a hint points, and why. `null` means only pointless shuffles remain. */
export type Hint =
  | { kind: 'move'; src: Source }
  /** No board move helps, but a card still in the stock/waste is playable — turn the deck. */
  | { kind: 'draw' }
  /** `isStuck` agrees: nothing can ever help. */
  | { kind: 'stuck' }

/**
 * A source whose move makes real progress, in priority order:
 *   1. onto a foundation,
 *   2. a waste card onto the tableau (uses a drawn card),
 *   3. a tableau move that uncovers a face-down card.
 * Lateral moves — e.g. shifting a red 5 from one black 6 to an equivalent black
 * 6, revealing nothing — never count. `exceptCardId` ignores one specific card,
 * which is how the foundation-pull search avoids recommending a loop.
 */
function productiveSource(state: GameState, exceptCardId?: string): Source | null {
  const sources = allSources(state).filter((src) => {
    if (exceptCardId === undefined) return true
    return pickup(state, src)[0]?.id !== exceptCardId
  })

  for (const src of sources) {
    if (autoDest(state, src)?.type === 'foundation') return src
  }
  for (const src of sources) {
    if (src.type === 'waste' && autoDest(state, src)) return src
  }
  for (const src of sources) {
    if (src.type === 'tableau' && uncoversCard(state, src) && autoDest(state, src)) return src
  }
  return null
}

/**
 * Suggest the next genuinely useful action — and when there isn't one, say why.
 * A bare `null` used to mean three different things (draw a card / the game is
 * dead / only shuffles remain), which left the UI unable to do more than buzz.
 */
export function findHint(state: GameState): Hint | null {
  const productive = productiveSource(state)
  if (productive) return { kind: 'move', src: productive }

  // Nothing on the board helps — would turning the deck bring up something playable?
  for (const c of [...state.stock, ...state.waste]) {
    if (placeableAnywhere(state, c)) return { kind: 'draw' }
  }

  // Last resort: take a card back off a foundation, but only when it unblocks a
  // DIFFERENT card. Without that guard the "unblocking" move found is putting the
  // same card straight back, and the hint would suggest an infinite loop.
  for (let f = 0; f < state.foundations.length; f++) {
    const pile = state.foundations[f]
    if (pile.length === 0) continue
    const src: Source = { type: 'foundation', pile: f }
    const pulledId = pile[pile.length - 1].id
    for (let q = 0; q < NUM_TABLEAU; q++) {
      const next = move(state, src, { type: 'tableau', pile: q })
      if (next && productiveSource(next, pulledId)) return { kind: 'move', src }
    }
  }

  if (isStuck(state)) return { kind: 'stuck' }
  return null
}
```

Notes for the implementer:
- `pickup`, `placeableAnywhere`, `isStuck`, `uncoversCard` and `allSources` are all already defined in this file. `placeableAnywhere` and `isStuck` are declared *below* `findHint`; that is fine — function declarations hoist.
- Do **not** delete `allSources` or `uncoversCard`; `productiveSource` uses both.
- Leave `isStuck` itself untouched.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/engine/solitaire.test.ts`
Expected: PASS, all tests in the file green.

Then run `npm run check`. Expected: it will report errors in `src/lib/stores/game.svelte.ts` because `findHint` now returns `Hint`, not `Source`. **That is expected and Task 3 fixes it** — do not patch the store here.

- [ ] **Step 6: Commit**

```bash
git add src/lib/engine/solitaire.ts src/lib/engine/solitaire.test.ts
git commit -m "feat(solitaire): findHint reports draw/stuck reasons and last-resort foundation pulls"
```

---

### Task 2: Haptics helper

Independent of Task 1 — can run in parallel.

**Files:**
- Create: `src/lib/feedback/haptics.ts`
- Test: `src/lib/feedback/haptics.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function buzzInvalid(): void` — Task 4 imports this.

- [ ] **Step 1: Write the failing test**

Create `src/lib/feedback/haptics.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buzzInvalid } from './haptics'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buzzInvalid', () => {
  it('vibrates with a short double pulse where the API exists', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate })
    buzzInvalid()
    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate.mock.calls[0][0]).toEqual([18, 40, 18])
  })

  it('is a silent no-op where navigator.vibrate is missing (iOS Safari)', () => {
    vi.stubGlobal('navigator', {})
    expect(() => buzzInvalid()).not.toThrow()
  })

  it('swallows a vibrate that throws because policy blocks it', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked by permissions policy')
      }
    })
    expect(() => buzzInvalid()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/feedback/haptics.test.ts`
Expected: FAIL — "Failed to resolve import ./haptics".

- [ ] **Step 3: Write the implementation**

Create `src/lib/feedback/haptics.ts`:

```ts
// Physical feedback for "that isn't allowed".

type Vibrator = Navigator & { vibrate?: (pattern: number | number[]) => boolean }

/**
 * A short double buzz for a refused move.
 *
 * Guarded on purpose: `navigator.vibrate` is unsupported on iOS Safari, which is
 * the target device, so on the player's iPad this is a silent no-op and the
 * on-screen wiggle carries the whole signal. It is kept because it costs nothing
 * and does work on Android. Some browsers also throw when a permissions policy
 * blocks vibration, so the call itself is wrapped.
 */
export function buzzInvalid(): void {
  if (typeof navigator === 'undefined') return
  const { vibrate } = navigator as Vibrator
  if (typeof vibrate !== 'function') return
  try {
    vibrate.call(navigator, [18, 40, 18])
  } catch {
    /* vibration blocked — nothing to do */
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/feedback/haptics.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feedback/haptics.ts src/lib/feedback/haptics.test.ts
git commit -m "feat(feedback): guarded haptic buzz for refused moves"
```

---

### Task 3: Store — map the three hint outcomes onto UI state

Depends on Task 1.

**Files:**
- Modify: `src/lib/stores/game.svelte.ts` (lines 28-31 state, 47-60 `newGame`, 63-81 `#commit`, 116-127 `undo`, 144-153 `showHint`/`#findHint`)
- Test: `src/lib/stores/game.hint.test.ts` (create)

**Interfaces:**
- Consumes: `findHint(state): Hint | null` from Task 1.
- Produces: `game.hintDeck: boolean` — Task 4 reads it to pulse the stock pile. `game.hint: Source | null` keeps its existing meaning and type.

- [ ] **Step 1: Write the failing test**

Create `src/lib/stores/game.hint.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { game } from './game.svelte'
import { SUITS, type Card, type Suit, type Rank } from '../engine/cards'
import { NUM_TABLEAU, type GameState } from '../engine/solitaire'

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp }
}

function emptyState(): GameState {
  return {
    stock: [],
    waste: [],
    foundations: SUITS.map(() => []),
    tableau: Array.from({ length: NUM_TABLEAU }, () => []),
    drawCount: 1,
    moves: 0
  }
}

/** A board with no move at all, so each test only varies what is in the deck. */
function deadBoard(): GameState {
  const s = emptyState()
  s.tableau[0] = [card('spades', 2)]
  s.tableau[1] = [card('hearts', 2)]
  return s
}

beforeEach(() => {
  game.newGame(1, 1)
})

describe('showHint', () => {
  it('pulses a card when a useful move exists', () => {
    const s = emptyState()
    s.waste = [card('hearts', 5)]
    s.tableau[0] = [card('spades', 6)]
    game.state = s
    game.showHint()
    expect(game.hint).toEqual({ type: 'waste' })
    expect(game.hintDeck).toBe(false)
    expect(game.stuck).toBe(false)
  })

  it('pulses the deck when the player should draw', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.showHint()
    expect(game.hintDeck).toBe(true)
    expect(game.hint).toBeNull()
    expect(game.stuck).toBe(false)
  })

  it('declares the game stuck when nothing can ever help', () => {
    game.state = deadBoard()
    game.showHint()
    expect(game.stuck).toBe(true)
    expect(game.hint).toBeNull()
    expect(game.hintDeck).toBe(false)
  })

  it('clears a deck pulse once the player draws', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.showHint()
    expect(game.hintDeck).toBe(true)
    game.drawStock()
    expect(game.hintDeck).toBe(false)
  })

  it('clears a deck pulse on undo and on a new game', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.drawStock() // so there is history to undo
    game.showHint()
    game.hintDeck = true
    game.undo()
    expect(game.hintDeck).toBe(false)

    game.hintDeck = true
    game.newGame(1, 1)
    expect(game.hintDeck).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/stores/game.hint.test.ts`
Expected: FAIL — `game.hintDeck` is undefined, and TypeScript reports it does not exist on the store.

- [ ] **Step 3: Implement the store changes**

In `src/lib/stores/game.svelte.ts`:

a) Change the import on line 12 to bring the type along:

```ts
  findHint,
  type Hint,
```

Place `type Hint` alongside the other `type` imports in the same braces (after `type GameState` is fine); keep `findHint` in the value list.

b) After the existing `hint` declaration (line 29), add:

```ts
  /** True when the hint is "turn the deck", pulsing the stock pile instead of a card. */
  hintDeck = $state(false)
```

c) In `newGame`, after `this.stuck = false` (line 52), add:

```ts
    this.hintDeck = false
```

d) In `#commit`, replace `this.hint = null` (line 66) with:

```ts
    this.hint = null
    this.hintDeck = false
```

e) In `undo`, replace `this.hint = null` (line 121) with:

```ts
    this.hint = null
    this.hintDeck = false
```

f) Replace `showHint` and the now-redundant `#findHint` (lines 144-153) with:

```ts
  /**
   * Suggest the next useful action. Three outcomes, three affordances: pulse a
   * card, pulse the deck, or surface the "no moves left" overlay. That last one
   * is why this is the honest answer to "is this game still alive?" — the
   * overlay used to be reachable only after a successful move.
   */
  showHint(): void {
    const h = findHint(this.state)
    this.hint = h?.kind === 'move' ? h.src : null
    this.hintDeck = h?.kind === 'draw'
    if (h?.kind === 'stuck') {
      this.stuck = true
      this.#stopTimer()
    }
    play(h && h.kind !== 'stuck' ? 'flip' : 'invalid', settings.sound)
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stores/game.hint.test.ts && npx vitest run && npm run check`
Expected: the new file PASSES (5 tests), the whole unit suite passes, and `npm run check` reports **0 errors, 0 warnings** (Task 1's expected breakage is now resolved).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/game.svelte.ts src/lib/stores/game.hint.test.ts
git commit -m "feat(solitaire): hint pulses the deck, and reports a dead game on demand"
```

---

### Task 4: UI — wiggle on refusal, pulse on the deck

Depends on Tasks 1-3.

**Files:**
- Modify: `src/lib/components/Card.svelte` (props block lines 4-14, `<button class="card face">` line 20, styles)
- Modify: `src/lib/components/Solitaire.svelte` (imports line 6-8, `animatedTap` lines 64-98, `onUp` lines 309-321, `drawDeck` lines 133-139, `stockPile` snippet lines 395-403, styles)
- Test: `src/lib/components/Solitaire.shake.test.ts` (create)

**Interfaces:**
- Consumes: `buzzInvalid()` from Task 2; `game.hintDeck` from Task 3.
- Produces: a `shake?: boolean` prop on `Card.svelte`; CSS classes `.shake` (Card) and `.slot.deck-hint` / `.slot.shake` (Solitaire). The wiggle keyframes must be **named `wiggle`** in both components — the E2E test in Task 5 matches on the animation name. Note Svelte **prefixes** the scope hash (`svelte-1udyrqm-wiggle`), it does not suffix it, so that match must be `.includes('wiggle')`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/components/Solitaire.shake.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/svelte'
import Card from './Card.svelte'
import Solitaire from './Solitaire.svelte'
import { game } from '../stores/game.svelte'

afterEach(cleanup)

describe('refused-move wiggle', () => {
  it('Card marks itself as shaking when told to', () => {
    render(Card, { props: { card: { id: 'x', suit: 'hearts', rank: 5, faceUp: true }, shake: true } })
    expect(screen.getByRole('button')).toHaveClass('shake')
  })

  it('Card is not shaking by default', () => {
    render(Card, { props: { card: { id: 'x', suit: 'hearts', rank: 5, faceUp: true } } })
    expect(screen.getByRole('button')).not.toHaveClass('shake')
  })
})

describe('deck hint', () => {
  it('marks the stock pile when the hint says to draw', async () => {
    game.newGame(1, 1)
    game.hintDeck = true
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByTestId('stock')).toHaveClass('deck-hint')
  })

  it('leaves the stock pile unmarked otherwise', async () => {
    game.newGame(1, 1)
    game.hintDeck = false
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByTestId('stock')).not.toHaveClass('deck-hint')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/components/Solitaire.shake.test.ts`
Expected: FAIL — `shake` is not a known prop and the `deck-hint` class is absent.

- [ ] **Step 3a: Add the `shake` prop to `Card.svelte`**

Extend the props block (lines 4-14) to:

```svelte
  let {
    card,
    hinted = false,
    shake = false,
    onpick,
    onpointerdown
  }: {
    card: Card
    hinted?: boolean
    shake?: boolean
    onpick?: (e: MouseEvent) => void
    onpointerdown?: (e: PointerEvent) => void
  } = $props()
```

Add the class to the face button (line 20-22):

```svelte
  <button
    class="card face"
    class:hinted
    class:shake
```

Add these styles after the `.hinted` / `@keyframes pulse` block:

```css
  /* A refused move: a short headshake on the card the player actually tapped,
     so the feedback says WHICH card, not just "no". */
  .shake {
    animation: wiggle 0.25s ease-in-out;
    z-index: 40;
  }
  @keyframes wiggle {
    0%,
    100% {
      transform: translateX(0);
    }
    15% {
      transform: translateX(-5%);
    }
    35% {
      transform: translateX(5%);
    }
    55% {
      transform: translateX(-3.5%);
    }
    75% {
      transform: translateX(2%);
    }
  }
```

Extend the existing reduced-motion block at the bottom of the file so the wiggle degrades to a red outline:

```css
  @media (prefers-reduced-motion: reduce) {
    .card,
    .hinted,
    .shake {
      transition: none;
      animation: none;
    }
    .shake {
      box-shadow: 0 0 0 calc(var(--card-w) * 0.06) rgba(190, 30, 30, 0.8);
    }
  }
```

- [ ] **Step 3b: Wire refusal + deck pulse into `Solitaire.svelte`**

Add to the imports at the top of the `<script>`:

```ts
  import { buzzInvalid } from '../feedback/haptics'
```

After the `MOVE_MS` constant (line 26), add the shake state and trigger:

```ts
  const SHAKE_MS = 250

  // A refused move wiggles the card the player tapped and buzzes (where the
  // device supports it — not on iOS). Only one card shakes at a time.
  let shakeId = $state<string | null>(null)
  let shakeDeck = $state(false)
  let shakeTimer: ReturnType<typeof setTimeout> | null = null

  function rejectMove(id: string | null) {
    buzzInvalid()
    if (shakeTimer) clearTimeout(shakeTimer)
    // Drop the class first so refusing the SAME card twice restarts the animation
    // instead of being a no-op (the class never changed).
    shakeId = null
    shakeDeck = id === null
    if (id !== null) {
      requestAnimationFrame(() => {
        shakeId = id
      })
    }
    shakeTimer = setTimeout(() => {
      shakeId = null
      shakeDeck = false
    }, SHAKE_MS)
  }
```

Add the timer to the existing `onDestroy` (line 105-107) so a pending shake cannot fire after unmount:

```ts
  onDestroy(() => {
    unmounted = true
    if (shakeTimer) clearTimeout(shakeTimer)
  })
```

In `animatedTap`, replace the early-return line 69:

```ts
    if (reduceMotion || game.moves === before) return // nothing moved (or motion off)
```

with:

```ts
    if (game.moves === before) {
      // The move was refused — say so physically, on the card that was tapped.
      rejectMove(cards[0]?.id ?? null)
      return
    }
    if (reduceMotion) return
```

In `drawDeck` (lines 133-139), replace the early-return line 139:

```ts
    if (reduceMotion || game.moves === before || !stockRect || !wasteRect) return
```

with:

```ts
    if (game.moves === before) {
      // Deck and waste are both empty: there is nothing left to turn.
      rejectMove(null)
      return
    }
    if (reduceMotion || !stockRect || !wasteRect) return
```

In `onUp` (line 318-320), replace:

```ts
    if (dest) game.moveTo(d.src, dest)
    else game.showInvalid()
```

with:

```ts
    if (dest) game.moveTo(d.src, dest)
    else {
      game.showInvalid()
      rejectMove(d.cards[0]?.id ?? null)
    }
```

Change the `stockPile` snippet (lines 395-403) to carry both classes:

```svelte
    {#snippet stockPile()}
      <div
        class="slot pile"
        class:deck-hint={game.hintDeck}
        class:shake={shakeDeck}
        data-testid="stock"
      >
        {#if game.state.stock.length}
          <Card card={{ id: 'stock', suit: 'spades', rank: 1, faceUp: false }} onpick={drawDeck} />
        {:else}
          <button class="empty recycle" onclick={drawDeck} aria-label="Opnieuw delen">↺</button>
        {/if}
      </div>
    {/snippet}
```

Pass `shake` to the three `<Card>` instances that can be refused — the waste top, the foundation tops, and the tableau cards. Each already has a `data-cid` wrapper or a card in scope; add `shake={shakeId === <that card>.id}`:
- waste top (line ~411): `shake={shakeId === top.id}`
- foundation top (line ~428): `shake={shakeId === ftop.id}`
- tableau cards: find the `<Card>` inside the `.stacked` wrapper and add `shake={shakeId === c.id}` using whatever the loop variable for that card is.

Add to `Solitaire.svelte`'s styles (near the existing `.slot` rules):

```css
  /* "Turn the deck" hint, and the deck's own refusal shake. Same treatment as a
     card so the two feedback languages match. */
  .slot.deck-hint {
    animation: deckpulse 0.8s ease-in-out infinite;
    border-radius: calc(var(--card-w) * 0.09);
  }
  @keyframes deckpulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(255, 214, 10, 0);
    }
    50% {
      box-shadow: 0 0 0 calc(var(--card-w) * 0.08) rgba(255, 214, 10, 0.8);
    }
  }
  .slot.shake {
    animation: wiggle 0.25s ease-in-out;
  }
  @keyframes wiggle {
    0%,
    100% {
      transform: translateX(0);
    }
    15% {
      transform: translateX(-5%);
    }
    35% {
      transform: translateX(5%);
    }
    55% {
      transform: translateX(-3.5%);
    }
    75% {
      transform: translateX(2%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .slot.deck-hint,
    .slot.shake {
      animation: none;
    }
    .slot.deck-hint {
      box-shadow: 0 0 0 calc(var(--card-w) * 0.06) rgba(255, 214, 10, 0.9);
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/Solitaire.shake.test.ts && npx vitest run && npm run check`
Expected: the new file PASSES (4 tests), the full unit suite passes, `npm run check` reports 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Card.svelte src/lib/components/Solitaire.svelte src/lib/components/Solitaire.shake.test.ts
git commit -m "feat(solitaire): wiggle refused moves and pulse the deck when a draw is the hint"
```

---

### Task 5: End-to-end coverage

Depends on Task 4.

**Files:**
- Modify: `tests/e2e/solitaire.spec.ts` (append two tests)

**Interfaces:**
- Consumes: the `wiggle` keyframe name and `deck-hint` class from Task 4.

- [ ] **Step 1: Write the failing tests**

Append to `tests/e2e/solitaire.spec.ts`:

```ts
test('tapping a card with nowhere to go wiggles it instead of silently doing nothing', async ({
  page
}) => {
  // Seed 1 deals the queen of diamonds alone in column 1. There is no black king
  // and no empty column, so she has no legal destination — a guaranteed refusal.
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()

  // Count wiggle animations rather than racing the 250ms class. Svelte PREFIXES
  // the component scope hash onto keyframe names (svelte-1udyrqm-wiggle), so this
  // has to be a substring match, not a prefix one.
  await page.evaluate(() => {
    ;(window as unknown as { __wiggles: number }).__wiggles = 0
    document.addEventListener(
      'animationstart',
      (e) => {
        if ((e as AnimationEvent).animationName.includes('wiggle')) {
          ;(window as unknown as { __wiggles: number }).__wiggles++
        }
      },
      true
    )
  })

  await page.getByRole('button', { name: 'Q diamonds' }).click()

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __wiggles: number }).__wiggles))
    .toBe(1)
  // …and the refusal really was a refusal: no move was counted.
  await expect(page.locator('.stat', { hasText: 'Zetten' }).locator('strong')).toHaveText('0')
})

test('Hint points at the deck when drawing is the useful move', async ({ page }) => {
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()

  const stock = page.getByTestId('stock')
  await expect(stock).not.toHaveClass(/deck-hint/)

  // Keep asking for a hint, taking the suggested board move each time, until the
  // only useful thing left is to turn the deck. Bounded so a regression fails
  // fast instead of hanging.
  let pulsed = false
  for (let i = 0; i < 12 && !pulsed; i++) {
    await page.getByRole('button', { name: 'Hint' }).click()
    if (await stock.evaluate((el) => el.classList.contains('deck-hint'))) {
      pulsed = true
      break
    }
    const hintedCard = page.locator('.card.hinted').first()
    if ((await hintedCard.count()) === 0) break
    await hintedCard.click()
    await page.waitForTimeout(300) // let the glide finish
  }
  expect(pulsed).toBe(true)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test tests/e2e/solitaire.spec.ts -g "wiggles it|points at the deck"`
Expected: FAIL before Task 4 is in place. If Task 4 is already merged in the working tree, they should pass — in that case confirm they fail by temporarily reverting the `class:shake` binding, then restore it.

- [ ] **Step 3: Verify the seed-1 assumption**

The queen-of-diamonds claim must be checked, not trusted. Run:

```bash
npx playwright test tests/e2e/solitaire.spec.ts -g "wiggles it" --project=ipad-landscape
```

If it fails because `Q diamonds` *can* move on seed 1, pick a different card by adding a temporary `console.log` of the tableau tops, then update both the card name and the comment to match reality. **Do not leave a stale comment describing a card that is not the one being tapped.**

- [ ] **Step 4: Run the full E2E suite**

Run: `npm run build && npx playwright test`
Expected: PASS — all tests across both iPad projects.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/solitaire.spec.ts
git commit -m "test(solitaire): cover the refusal wiggle and the deck hint end to end"
```

---

### Task 6: Whole-branch verification

- [ ] **Step 1: Run every gate**

```bash
npm run check && npx vitest run && npm run build && npx playwright test
```

Expected: check 0 errors / 0 warnings; all unit tests pass (77 existing + 5 hint + 3 haptics + 4 component + 5 engine ≈ 94); build succeeds; all E2E pass.

- [ ] **Step 2: Confirm the ADR matches what was built**

Re-read `docs/adr/0006-hint-with-a-reason-and-illegal-move-feedback.md`. If any decision changed during implementation, amend the ADR in the same commit — an ADR that describes something other than the code is worse than none.

- [ ] **Step 3: Commit any fixes and push**

```bash
git push -u origin feat/solitaire-honest-hint-and-illegal-feedback
```

---

## Self-Review

**Spec coverage:**
- "hint should check if things are still possible" → Task 1 (`Hint` union) + Task 3 (`stuck` reachable from Hint).
- "does not show the hint of hitting the deck for a new card" → Task 1 `{kind:'draw'}` + Task 3 `hintDeck` + Task 4 `.deck-hint`.
- "doesn't suggest to bring back a card" → Task 1 foundation pull, last resort, ping-pong guarded.
- "unsolvable state should be shown, and suggest to start a new state" → Task 3 sets `game.stuck`; the overlay and its **Nieuw spel** button already exist at `Solitaire.svelte:536` and are covered by `Solitaire.stuck.test.ts`.
- "shake or wiggle indication" → Task 4 `.shake` on Card + Task 5 E2E.
- "rumble vibration if available" → Task 2 `buzzInvalid`, honestly documented as a no-op on iOS.

**Known risk carried deliberately:** the seed-1 "Q diamonds has no move" assumption in Task 5 is derived from a screenshot, not from running the code — Task 5 Step 3 exists specifically to verify or correct it.
