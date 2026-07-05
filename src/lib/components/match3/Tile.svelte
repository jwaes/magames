<script lang="ts">
  import type { Kind } from '../../games/match3/engine/types'

  const KINDS = [
    { label: 'rode cirkel', color: '#e5352b', glyph: '●' },
    { label: 'blauw vierkant', color: '#1560c8', glyph: '■' },
    { label: 'gele ster', color: '#e8b800', glyph: '★' },
    { label: 'groene driehoek', color: '#1f8a3b', glyph: '▲' },
    { label: 'paarse ruit', color: '#7b2ff2', glyph: '◆' },
    { label: 'oranje hart', color: '#e8720c', glyph: '♥' }
  ]

  let { kind, selected = false, onpick }: { kind: Kind; selected?: boolean; onpick?: () => void } = $props()
  const k = $derived(KINDS[kind])
</script>

<button
  class="tile"
  class:selected
  style="color: {k.color}"
  aria-label={k.label}
  onclick={onpick}
  type="button">{k.glyph}</button
>

<style>
  .tile {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 16%;
    /* Scale the symbol to the tile (container query units) so it stays big and
       clear at any grid size — key for low vision. */
    font-size: 62cqmin;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    transition: transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .tile.selected {
    transform: scale(0.86);
    box-shadow: 0 0 0 4px #ffd60a;
  }
</style>
