<script lang="ts">
  import { match3 } from '../../stores/match3.svelte'
  import Tile from './Tile.svelte'

  let { onhome, onsettings }: { onhome: () => void; onsettings: () => void } = $props()

  function isSelected(r: number, c: number): boolean {
    const s = match3.selected
    return s !== null && s.r === r && s.c === c
  }
</script>

<div class="game">
  <header class="toolbar">
    <button class="tool" onclick={onhome} aria-label="Terug naar menu">🏠<span>Menu</span></button>
    <button class="tool" onclick={() => match3.newGame()} aria-label="Nieuw spel">🔄<span>Nieuw</span></button>
    <div class="spacer"></div>
    <div class="stat"><small>Score</small><strong>{match3.score}</strong></div>
    <div class="stat"><small>Beste</small><strong>{match3.best}</strong></div>
    <button class="tool" onclick={onsettings} aria-label="Instellingen">⚙️<span>Meer</span></button>
  </header>

  <main class="board-wrap">
    <div
      class="board"
      data-testid="match3-board"
      style="--n: {match3.board.cols}"
    >
      {#each match3.board.cells as row, r}
        {#each row as cell, c}
          <div class="cell" data-cell={`${r}-${c}`}>
            {#if cell}
              <Tile kind={cell.kind} selected={isSelected(r, c)} onpick={() => match3.select({ r, c })} />
            {/if}
          </div>
        {/each}
      {/each}
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
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    gap: clamp(3px, 0.8vw, 8px);
    width: min(96vw, calc(100dvh - 120px));
    aspect-ratio: 1;
  }
  .cell {
    aspect-ratio: 1;
  }
</style>
