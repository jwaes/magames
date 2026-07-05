<script lang="ts">
  import { match3 } from '../../stores/match3.svelte'
  import type { Speed } from '../../stores/match3.svelte'

  let { onclose }: { onclose: () => void } = $props()

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }

  const speeds: { value: Speed; label: string; sub: string }[] = [
    { value: 'rustig', label: 'Rustig', sub: 'Langzaam' },
    { value: 'normaal', label: 'Normaal', sub: '' },
    { value: 'snel', label: 'Snel', sub: '' }
  ]
  const sizes = [6, 7, 8] as const

  function chooseSize(n: 6 | 7 | 8) {
    match3.setGridSize(n)
    match3.newGame() // resize takes effect on a fresh board
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose} role="presentation">
  <div class="panel" role="dialog" aria-modal="true" aria-label="Instellingen" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <h2>Instellingen</h2>

    <section>
      <h3>Snelheid</h3>
      <p class="hint">Hoe snel de animaties gaan.</p>
      <div class="choices">
        {#each speeds as s}
          <button class:selected={match3.speed === s.value} onclick={() => match3.setSpeed(s.value)}>
            <strong>{s.label}</strong>{#if s.sub}<span>{s.sub}</span>{/if}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <h3>Bordgrootte</h3>
      <div class="choices">
        {#each sizes as n}
          <button class:selected={match3.gridSize === n} onclick={() => chooseSize(n)}>
            <strong>{n} × {n}</strong>
          </button>
        {/each}
      </div>
      <p class="note">Start een nieuw spel.</p>
    </section>

    <section>
      <h3>Geluid</h3>
      <button class="toggle" class:on={match3.sound} onclick={() => match3.toggleSound()}>
        <span>{match3.sound ? '🔊 Aan' : '🔇 Uit'}</span>
      </button>
    </section>

    <div class="actions">
      <button class="primary" onclick={onclose}>Klaar</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 16px;
  }
  .panel {
    background: #fff;
    color: #16181d;
    border-radius: 20px;
    padding: clamp(18px, 3vw, 32px);
    width: min(520px, 92vw);
    max-height: 90dvh;
    overflow: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
  h2 {
    margin: 0 0 0.5em;
    font-size: clamp(24px, 4vw, 34px);
  }
  h3 {
    margin: 0.2em 0;
    font-size: clamp(18px, 2.6vw, 24px);
  }
  .hint {
    margin: 0 0 0.6em;
    color: #555;
    font-size: clamp(14px, 2vw, 18px);
  }
  section {
    margin-bottom: 1.4em;
  }
  .choices {
    display: flex;
    gap: 12px;
  }
  .choices button,
  .toggle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 0.8em;
    border: 3px solid #ddd;
    border-radius: 14px;
    background: #f7f7f7;
    cursor: pointer;
    font-size: clamp(16px, 2.4vw, 22px);
  }
  .choices button strong {
    font-size: clamp(18px, 2.8vw, 26px);
  }
  .choices button span {
    color: #666;
    font-size: clamp(13px, 1.8vw, 16px);
  }
  .choices button.selected,
  .toggle.on {
    border-color: #0b6b3a;
    background: #e8f6ee;
  }
  .note {
    margin: 0.5em 0 0;
    color: #888;
    font-size: clamp(12px, 1.7vw, 15px);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1em;
  }
  .actions button {
    padding: 0.6em 1.4em;
    border: none;
    border-radius: 12px;
    font-size: clamp(16px, 2.4vw, 22px);
    font-weight: 700;
    cursor: pointer;
  }
  .primary {
    background: #0b6b3a;
    color: #fff;
  }
</style>
