<script lang="ts">
  import { game } from '../stores/game.svelte'
  import { settings } from '../stores/settings.svelte'
  import { unlockAudio } from '../sound/sfx'
  import { SUIT_SYMBOL, SUITS, type Card as TCard } from '../engine/cards'
  import { NUM_TABLEAU, canMove, type Source, type Dest } from '../engine/solitaire'
  import Card from './Card.svelte'

  let { onhome, onsettings }: { onhome: () => void; onsettings: () => void } = $props()

  // Vertical overlap of cards in a tableau column, in units of card height.
  const OFFSET_DOWN = 0.17
  const OFFSET_UP = 0.32

  interface Placed {
    card: TCard
    index: number
    top: number
  }
  function layout(col: TCard[]): { items: Placed[]; height: number } {
    const items: Placed[] = []
    let top = 0
    for (let i = 0; i < col.length; i++) {
      items.push({ card: col[i], index: i, top })
      top += col[i].faceUp ? OFFSET_UP : OFFSET_DOWN
    }
    return { items, height: top + 1 }
  }

  function firstTap() {
    unlockAudio()
  }

  const DRAG_THRESHOLD = 10

  interface DragState {
    src: Source
    cards: TCard[]
    startX: number
    startY: number
    x: number
    y: number
    grabX: number
    grabY: number
    active: boolean
  }
  let drag = $state<DragState | null>(null)

  // Piles that the current drag can legally land on (for highlighting).
  const legalTargets = $derived.by(() => {
    const set = new Set<string>()
    if (!drag?.active) return set
    for (let f = 0; f < 4; f++) if (canMove(game.state, drag.src, { type: 'foundation', pile: f })) set.add(`f${f}`)
    for (let t = 0; t < NUM_TABLEAU; t++) if (canMove(game.state, drag.src, { type: 'tableau', pile: t })) set.add(`t${t}`)
    return set
  })

  function pickupCards(src: Source): TCard[] {
    if (src.type === 'waste') {
      const w = game.state.waste
      return w.length ? [w[w.length - 1]] : []
    }
    if (src.type === 'tableau') return game.state.tableau[src.pile].slice(src.index)
    return []
  }

  function startPress(e: PointerEvent, src: Source) {
    // Tap mode: behave as a pure tap on release; no drag bookkeeping needed.
    if (settings.movement === 'tap') {
      game.tap(src)
      return
    }
    const cards = pickupCards(src)
    if (cards.length === 0) return
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    drag = {
      src,
      cards,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      active: false
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  function onMove(e: PointerEvent) {
    if (!drag) return
    drag.x = e.clientX
    drag.y = e.clientY
    if (!drag.active) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (moved > DRAG_THRESHOLD) drag.active = true
    }
  }

  function overlapArea(
    a: { left: number; top: number; right: number; bottom: number },
    b: DOMRect
  ): number {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    return x * y
  }

  // Best-overlap, legal-first: compare the dragged top card's rect against each
  // drop pile's rect; among legal piles pick the largest overlap. `src` is passed
  // explicitly because `drag` is nulled before this runs.
  function resolveDropFor(src: Source, cardLeft: number, cardTop: number): Dest | null {
    const board = document.querySelector('[data-testid="board"]') as HTMLElement | null
    if (!board) return null
    const cs = getComputedStyle(board)
    const w = parseFloat(cs.getPropertyValue('--card-w')) || 80
    const h = parseFloat(cs.getPropertyValue('--card-h')) || 112
    const cardRect = { left: cardLeft, top: cardTop, right: cardLeft + w, bottom: cardTop + h }

    let bestDest: Dest | null = null
    let bestArea = 0
    const check = (dest: Dest, el: Element | null) => {
      if (!el) return
      if (!canMove(game.state, src, dest)) return
      const area = overlapArea(cardRect, el.getBoundingClientRect())
      if (area > 0 && area > bestArea) {
        bestDest = dest
        bestArea = area
      }
    }
    board.querySelectorAll('[data-drop-foundation]').forEach((el) => {
      const pile = Number((el as HTMLElement).dataset.dropFoundation)
      check({ type: 'foundation', pile }, el)
    })
    board.querySelectorAll('[data-drop-tableau]').forEach((el) => {
      const pile = Number((el as HTMLElement).dataset.dropTableau)
      check({ type: 'tableau', pile }, el)
    })
    return bestDest
  }

  function onUp(e: PointerEvent) {
    if (!drag) return
    const d = drag
    drag = null
    if (!d.active) {
      // No real movement → treat as a tap.
      game.tap(d.src)
      return
    }
    const dest = resolveDropFor(d.src, e.clientX - d.grabX, e.clientY - d.grabY)
    if (dest) game.moveTo(d.src, dest)
    else game.showInvalid()
  }

  let ghostCardW = $state(0)
  let ghostCardH = $state(0)
  $effect(() => {
    const board = document.querySelector('[data-testid="board"]') as HTMLElement | null
    if (!board) return
    const cs = getComputedStyle(board)
    ghostCardW = parseFloat(cs.getPropertyValue('--card-w')) || 0
    ghostCardH = parseFloat(cs.getPropertyValue('--card-h')) || 0
  })

  const mmss = $derived.by(() => {
    const s = game.seconds
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  })

  function hintedTableau(pile: number, index: number): boolean {
    const h = game.hint
    return h?.type === 'tableau' && h.pile === pile && h.index === index
  }
</script>

<!-- Pointer tracking here powers drag-and-drop; the board's cards remain individually focusable buttons. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="game" onpointerdowncapture={firstTap} onpointermove={onMove} onpointerup={onUp}>
  <!-- Toolbar -->
  <header class="toolbar">
    <button class="tool" onclick={onhome} aria-label="Terug naar menu">🏠<span>Menu</span></button>
    <button class="tool" onclick={() => game.newGame()} aria-label="Nieuw spel">🔄<span>Nieuw</span></button>
    <button class="tool" onclick={() => game.undo()} disabled={!game.canUndo} aria-label="Zet terugnemen"
      >↩️<span>Terug</span></button
    >
    <button class="tool" onclick={() => game.showHint()} aria-label="Hint">💡<span>Hint</span></button>
    {#if game.canAutoFinish}
      <button class="tool accent" onclick={() => game.autoFinish()} aria-label="Automatisch afmaken"
        >✨<span>Afmaken</span></button
      >
    {/if}
    <div class="spacer"></div>
    <div class="stat"><small>Tijd</small><strong>{mmss}</strong></div>
    <div class="stat"><small>Zetten</small><strong>{game.moves}</strong></div>
    <button class="tool" onclick={onsettings} aria-label="Instellingen">⚙️<span>Meer</span></button>
  </header>

  <!-- Board -->
  <main class="board" data-testid="board">
    <div class="top-row">
      <!-- Stock -->
      <div class="slot pile" data-testid="stock">
        {#if game.state.stock.length}
          <Card card={{ id: 'stock', suit: 'spades', rank: 1, faceUp: false }} onpick={() => game.drawStock()} />
        {:else}
          <button class="empty recycle" onclick={() => game.drawStock()} aria-label="Opnieuw delen">↺</button>
        {/if}
      </div>

      <!-- Waste -->
      <div class="slot pile" data-testid="waste">
        {#if game.state.waste.length}
          {@const top = game.state.waste[game.state.waste.length - 1]}
          <Card card={top} hinted={game.hint?.type === 'waste'} onpointerdown={(e) => startPress(e, { type: 'waste' })} />
        {:else}
          <div class="empty"></div>
        {/if}
      </div>

      <div class="gap"></div>

      <!-- Foundations -->
      {#each game.state.foundations as foundation, fi}
        <div class="slot pile" data-drop-foundation={fi} class:legal={legalTargets.has(`f${fi}`)}>
          {#if foundation.length}
            <Card card={foundation[foundation.length - 1]} onpick={() => game.tap({ type: 'foundation', pile: fi })} />
          {:else}
            <div class="empty suit">{SUIT_SYMBOL[SUITS[fi]]}</div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Tableau -->
    <div class="tableau">
      {#each game.state.tableau as column, pile}
        {@const l = layout(column)}
        <div
          class="column"
          data-testid="tableau-col"
          data-drop-tableau={pile}
          class:legal={legalTargets.has(`t${pile}`)}
          style="height: calc(var(--card-h) * {l.height})"
        >
          {#if column.length === 0}
            <div class="empty"></div>
          {/if}
          {#each l.items as placed (placed.card.id)}
            <div class="stacked" style="top: calc(var(--card-h) * {placed.top})">
              <Card
                card={placed.card}
                hinted={hintedTableau(pile, placed.index)}
                onpointerdown={placed.card.faceUp
                  ? (e) => startPress(e, { type: 'tableau', pile, index: placed.index })
                  : undefined}
              />
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </main>

  {#if drag?.active}
    <div class="drag-layer">
      {#each drag.cards as c, i (c.id)}
        <div
          class="ghost"
          style="left: {drag.x - drag.grabX}px; top: {drag.y - drag.grabY + i * 0.32 * ghostCardH}px; width: {ghostCardW}px; height: {ghostCardH}px"
        >
          <Card card={c} />
        </div>
      {/each}
    </div>
  {/if}

  {#if game.won}
    <div class="win" role="dialog" aria-label="Gewonnen">
      <div class="win-card">
        <div class="trophy">🏆</div>
        <h2>Gewonnen!</h2>
        <p>In {mmss} met {game.moves} zetten.</p>
        <button class="big-btn" onclick={() => game.newGame()}>Nog een spel</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .game {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #128a4c 0%, #0b6b3a 55%, #073f22 100%);
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: stretch;
    gap: clamp(4px, 0.8vw, 10px);
    padding: clamp(4px, 1vw, 10px);
    background: rgba(0, 0, 0, 0.28);
  }
  .tool {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: clamp(48px, 8vw, 84px);
    padding: 6px 8px;
    border: none;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: clamp(18px, 2.4vw, 26px);
    line-height: 1;
    cursor: pointer;
  }
  .tool span {
    font-size: clamp(11px, 1.4vw, 15px);
    font-weight: 700;
  }
  .tool:disabled {
    opacity: 0.35;
  }
  .tool.accent {
    background: #ffd60a;
    color: #1a1a1a;
  }
  .spacer {
    flex: 1;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    padding: 0 clamp(4px, 1vw, 12px);
    min-width: clamp(52px, 7vw, 90px);
  }
  .stat small {
    opacity: 0.8;
    font-size: clamp(10px, 1.3vw, 14px);
  }
  .stat strong {
    font-size: clamp(18px, 2.6vw, 30px);
    font-variant-numeric: tabular-nums;
  }

  /* Board sizing: seven columns must fit the width. */
  .board {
    --gap: clamp(5px, 1.1vw, 16px);
    --card-w: min(calc((100vw - var(--gap) * 8) / 7), 15vh);
    --card-h: calc(var(--card-w) * 1.4);
    flex: 1;
    padding: var(--gap);
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 1.4);
    overflow: hidden;
  }

  .top-row,
  .tableau {
    display: grid;
    grid-template-columns: repeat(7, var(--card-w));
    gap: var(--gap);
    justify-content: center;
  }

  .slot,
  .column {
    position: relative;
    width: var(--card-w);
  }
  .slot {
    height: var(--card-h);
  }
  .gap {
    width: var(--card-w);
  }
  .stacked {
    position: absolute;
    left: 0;
    width: var(--card-w);
    height: var(--card-h);
  }

  .empty {
    position: absolute;
    inset: 0;
    border: 2px dashed rgba(255, 255, 255, 0.4);
    border-radius: calc(var(--card-w) * 0.09);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: calc(var(--card-w) * 0.5);
    background: rgba(255, 255, 255, 0.06);
  }
  .empty.recycle {
    cursor: pointer;
    border-style: solid;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    font-size: calc(var(--card-w) * 0.55);
  }

  .legal::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: calc(var(--card-w) * 0.09);
    box-shadow: 0 0 0 4px rgba(255, 214, 10, 0.85);
    pointer-events: none;
    z-index: 40;
  }
  .drag-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 300;
  }
  .ghost {
    position: fixed;
    transform: scale(1.04);
    filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.35));
  }
  @media (prefers-reduced-motion: reduce) {
    .ghost {
      transform: none;
    }
  }

  /* Win overlay */
  .win {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    z-index: 100;
    animation: fade 0.3s ease;
  }
  .win-card {
    background: #fff;
    border-radius: 20px;
    padding: clamp(20px, 4vw, 44px);
    text-align: center;
    color: #16181d;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
  .trophy {
    font-size: clamp(56px, 12vw, 110px);
  }
  .win-card h2 {
    margin: 0.2em 0;
    font-size: clamp(28px, 5vw, 46px);
  }
  .win-card p {
    font-size: clamp(16px, 2.4vw, 22px);
    color: #444;
  }
  .big-btn {
    margin-top: 0.8em;
    padding: 0.6em 1.4em;
    font-size: clamp(18px, 3vw, 26px);
    font-weight: 800;
    border: none;
    border-radius: 14px;
    background: #0b6b3a;
    color: #fff;
    cursor: pointer;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
