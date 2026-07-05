<script lang="ts">
  import { match3 } from '../../stores/match3.svelte'
  import { unlockAudio } from '../../sound/sfx'
  import type { Kind } from '../../games/match3/engine/types'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import Tile from './Tile.svelte'

  let { onhome }: { onhome: () => void } = $props()

  const FALL_MS = 240

  interface Placed {
    tile: { id: number; kind: Kind }
    r: number
    c: number
  }
  // Flat, id-keyed list so `animate:flip` animates falls by tile identity.
  const placed = $derived.by(() => {
    const out: Placed[] = []
    const cells = match3.board.cells
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        const cell = cells[r][c]
        if (cell) out.push({ tile: cell, r, c })
      }
    }
    return out
  })

  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function firstTap() {
    unlockAudio()
  }
  function isSelected(r: number, c: number): boolean {
    const s = match3.selected
    return s !== null && s.r === r && s.c === c
  }
  function isExploding(r: number, c: number): boolean {
    return match3.exploding.some((p) => p.r === r && p.c === c)
  }

  // New tiles slide in from just above their cell.
  function drop(_node: Element, { duration = FALL_MS }: { duration?: number } = {}) {
    if (reduce) return { duration: 0 }
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => `transform: translateY(${(t - 1) * 150}%); opacity: ${Math.min(1, t * 2)}`
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="game" onpointerdowncapture={firstTap}>
  <header class="toolbar">
    <button class="tool" onclick={onhome} aria-label="Terug naar menu">🏠<span>Menu</span></button>
    <button class="tool" onclick={() => match3.newGame()} aria-label="Nieuw spel">🔄<span>Nieuw</span></button>
    <div class="spacer"></div>
    <div class="stat"><small>Score</small><strong>{match3.score}</strong></div>
    <div class="stat"><small>Beste</small><strong>{match3.best}</strong></div>
  </header>

  <main class="board-wrap">
    <div class="board" data-testid="match3-board" style="--n: {match3.board.cols}">
      <!-- Click backdrop: one cell per position; selection stays position-based. -->
      {#each match3.board.cells as row, r}
        {#each row as _cell, c}
          <button
            class="cell"
            data-cell={`${r}-${c}`}
            aria-label={`vak ${r + 1}, ${c + 1}`}
            onclick={() => match3.select({ r, c })}
          ></button>
        {/each}
      {/each}

      <!-- Absolutely-positioned tile layer; falls animate via FLIP. -->
      <div class="tiles">
        {#each placed as p (p.tile.id)}
          <div
            class="tile-slot"
            class:exploding={isExploding(p.r, p.c)}
            style="left: calc(var(--cell) * {p.c}); top: calc(var(--cell) * {p.r}); width: var(--cell); height: var(--cell)"
            animate:flip={{ duration: reduce ? 0 : FALL_MS, easing: cubicOut }}
            in:drop
          >
            <Tile kind={p.tile.kind} selected={isSelected(p.r, p.c)} />
          </div>
        {/each}
      </div>

      {#if match3.bigEffect >= 4}
        <div class="big-flash" class:bomb={match3.bigEffect >= 5}></div>
      {/if}
    </div>
  </main>
</div>

<style>
  .game {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #2a3b4d 0%, #1c2836 60%, #141d27 100%);
  }
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
  .board-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(6px, 2vw, 20px);
    min-height: 0;
  }
  .board {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    grid-template-rows: repeat(var(--n), 1fr);
    /* Explicit width AND height (not aspect-ratio) so descendant percentage
       heights resolve — otherwise the tile faces collapse. */
    width: min(96vw, calc(100dvh - 120px));
    height: min(96vw, calc(100dvh - 120px));
    /* Cell size as a length, for scaling the tile symbols. */
    --cell: calc(min(96vw, 100dvh - 120px) / var(--n));
  }
  .cell {
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .cell::after {
    content: '';
    display: block;
    margin: 8%;
    height: 84%;
    border-radius: 18%;
    background: rgba(255, 255, 255, 0.045);
  }
  .tiles {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .tile-slot {
    position: absolute;
  }
  .tile-slot.exploding {
    animation: burst 200ms ease-out forwards;
    z-index: 5;
  }
  @keyframes burst {
    0% {
      transform: scale(1);
    }
    35% {
      transform: scale(1.22);
      filter: brightness(1.6);
    }
    100% {
      transform: scale(0.12);
      opacity: 0;
    }
  }
  .big-flash {
    position: absolute;
    inset: -6%;
    border-radius: 12%;
    pointer-events: none;
    z-index: 6;
    background: radial-gradient(circle, rgba(255, 214, 10, 0.5) 0%, rgba(255, 214, 10, 0) 65%);
    animation: flash 360ms ease-out forwards;
  }
  .big-flash.bomb {
    background: radial-gradient(circle, rgba(120, 200, 255, 0.6) 0%, rgba(120, 200, 255, 0) 70%);
  }
  @keyframes flash {
    0% {
      opacity: 0;
      transform: scale(0.85);
    }
    30% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(1.05);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tile-slot.exploding {
      animation: none;
      opacity: 0;
    }
    .big-flash {
      animation: none;
      opacity: 0;
    }
  }
</style>
