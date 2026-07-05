<script lang="ts">
  import { type Card, rankLabel, SUIT_SYMBOL, SUIT_COLOR } from '../engine/cards'

  let {
    card,
    hinted = false,
    onpick
  }: {
    card: Card
    hinted?: boolean
    onpick?: (e: MouseEvent) => void
  } = $props()

  const color = $derived(SUIT_COLOR[card.suit])
</script>

{#if card.faceUp}
  <button
    class="card face"
    class:hinted
    style="color: {color}"
    onclick={onpick}
    aria-label={`${rankLabel(card.rank)} ${card.suit}`}
    type="button"
  >
    <!-- One big corner index (rank over suit) — the key readability lesson. -->
    <span class="corner">
      <span class="rank">{rankLabel(card.rank)}</span>
      <span class="mini-suit">{SUIT_SYMBOL[card.suit]}</span>
    </span>
    <!-- One large central pictogram. -->
    <span class="pip" aria-hidden="true">{SUIT_SYMBOL[card.suit]}</span>
  </button>
{:else}
  <button class="card back" onclick={onpick} aria-label="Verdekte kaart" type="button"></button>
{/if}

<style>
  .card {
    position: absolute;
    inset: 0;
    width: var(--card-w);
    height: var(--card-h);
    border-radius: calc(var(--card-w) * 0.09);
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    border: 2px solid rgba(0, 0, 0, 0.18);
    background: #fff;
    box-shadow: 0 calc(var(--card-w) * 0.02) calc(var(--card-w) * 0.05) rgba(0, 0, 0, 0.28);
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: none;
    overflow: hidden;
    transition: transform 0.08s ease;
  }
  .card:active {
    transform: translateY(-2px) scale(1.02);
  }

  .corner {
    position: absolute;
    top: calc(var(--card-h) * 0.04);
    left: calc(var(--card-w) * 0.06);
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 0.92;
    font-weight: 800;
  }
  .rank {
    font-size: calc(var(--card-w) * 0.46);
    font-variant-numeric: tabular-nums;
  }
  .mini-suit {
    font-size: calc(var(--card-w) * 0.3);
  }

  .pip {
    position: absolute;
    right: calc(var(--card-w) * 0.06);
    bottom: calc(var(--card-h) * 0.02);
    font-size: calc(var(--card-w) * 0.62);
    line-height: 1;
    opacity: 0.9;
  }

  .back {
    background:
      repeating-linear-gradient(45deg, #1e5aa8 0 8px, #1a4f95 8px 16px);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow:
      inset 0 0 0 3px rgba(255, 255, 255, 0.65),
      0 calc(var(--card-w) * 0.02) calc(var(--card-w) * 0.05) rgba(0, 0, 0, 0.28);
  }

  .hinted {
    animation: pulse 0.8s ease-in-out infinite;
    z-index: 50;
  }
  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(255, 214, 10, 0);
    }
    50% {
      box-shadow: 0 0 0 calc(var(--card-w) * 0.08) rgba(255, 214, 10, 0.8);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .hinted {
      transition: none;
      animation: none;
    }
  }
</style>
