<script lang="ts">
  import { game } from '../stores/game.svelte'
  import { settings } from '../stores/settings.svelte'
  import { unlockAudio } from '../sound/sfx'
  import { SUIT_SYMBOL, SUITS, type Card as TCard } from '../engine/cards'
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

<div class="game" onpointerdowncapture={firstTap}>
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
          <Card card={top} hinted={game.hint?.type === 'waste'} onpick={() => game.tap({ type: 'waste' })} />
        {:else}
          <div class="empty"></div>
        {/if}
      </div>

      <div class="gap"></div>

      <!-- Foundations -->
      {#each game.state.foundations as foundation, fi}
        <div class="slot pile">
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
        <div class="column" data-testid="tableau-col" style="height: calc(var(--card-h) * {l.height})">
          {#if column.length === 0}
            <div class="empty"></div>
          {/if}
          {#each l.items as placed (placed.card.id)}
            <div class="stacked" style="top: calc(var(--card-h) * {placed.top})">
              <Card
                card={placed.card}
                hinted={hintedTableau(pile, placed.index)}
                onpick={placed.card.faceUp
                  ? () => game.tap({ type: 'tableau', pile, index: placed.index })
                  : undefined}
              />
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </main>

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
