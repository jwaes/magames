<script lang="ts">
  import { stats } from '../stores/stats.svelte'
  import { formatDuration, formatClock } from '../stats/stats'

  let { onclose }: { onclose: () => void } = $props()

  const d = $derived(stats.data)
  const tiles = $derived([
    { label: 'Gewonnen', value: String(d.gamesWon) },
    { label: 'Speeltijd', value: formatDuration(d.totalSeconds) },
    { label: 'Dagreeks', value: `🔥 ${d.currentDayStreak}`, sub: `beste ${d.bestDayStreak}` },
    { label: 'Winreeks', value: String(d.currentWinStreak), sub: `beste ${d.bestWinStreak}` },
    { label: 'Snelste tijd', value: d.bestTimeSeconds === null ? '—' : formatClock(d.bestTimeSeconds) },
    { label: 'Minste zetten', value: d.fewestMoves === null ? '—' : String(d.fewestMoves) }
  ])
</script>

<div class="screen">
  <header>
    <button class="back" onclick={onclose} aria-label="Terug">‹ Terug</button>
    <h1>Statistieken</h1>
    <div class="spacer"></div>
  </header>

  <div class="grid">
    {#each tiles as t}
      <div class="tile">
        <span class="value">{t.value}</span>
        <span class="label">{t.label}</span>
        {#if t.sub}<span class="sub">{t.sub}</span>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100vw;
    padding: clamp(12px, 3vw, 36px);
    box-sizing: border-box;
    background: radial-gradient(circle at 50% 20%, #128a4c 0%, #0b6b3a 55%, #073f22 100%);
    color: #fff;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  h1 {
    font-size: clamp(24px, 5vw, 44px);
    margin: 0;
  }
  .back {
    font-size: clamp(16px, 2.6vw, 22px);
    font-weight: 700;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 12px;
    padding: 0.4em 0.8em;
    color: #fff;
    cursor: pointer;
  }
  .spacer {
    flex: 1;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(130px, 26vw, 220px), 1fr));
    gap: clamp(10px, 2.4vw, 22px);
    align-content: center;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: #fff;
    color: #16181d;
    border-radius: 18px;
    padding: clamp(14px, 3vw, 28px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    aspect-ratio: 3 / 2;
  }
  .value {
    font-size: clamp(26px, 5vw, 44px);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: clamp(14px, 2.2vw, 20px);
    color: #444;
  }
  .sub {
    font-size: clamp(11px, 1.7vw, 15px);
    color: #888;
  }
</style>
