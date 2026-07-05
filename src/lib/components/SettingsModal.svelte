<script lang="ts">
  import { settings } from '../stores/settings.svelte'
  import { game } from '../stores/game.svelte'

  let { onclose }: { onclose: () => void } = $props()

  function chooseDraw(n: 1 | 3) {
    settings.setDrawCount(n)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- Backdrop closes on click; keyboard users close with Escape (handled above). -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose} role="presentation">
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-label="Instellingen"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
  >
    <h2>Instellingen</h2>

    <section>
      <h3>Moeilijkheid</h3>
      <p class="hint">Hoeveel kaarten je per keer omdraait.</p>
      <div class="choices">
        <button class:selected={settings.drawCount === 1} onclick={() => chooseDraw(1)}>
          <strong>1 kaart</strong><span>Makkelijk</span>
        </button>
        <button class:selected={settings.drawCount === 3} onclick={() => chooseDraw(3)}>
          <strong>3 kaarten</strong><span>Moeilijker</span>
        </button>
      </div>
      <p class="note">Gaat in bij een nieuw spel.</p>
    </section>

    <section>
      <h3>Geluid</h3>
      <button class="toggle" class:on={settings.sound} onclick={() => settings.toggleSound()}>
        <span>{settings.sound ? '🔊 Aan' : '🔇 Uit'}</span>
      </button>
    </section>

    <div class="actions">
      <button
        class="secondary"
        onclick={() => {
          game.newGame()
          onclose()
        }}>Nieuw spel</button
      >
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
  .choices button.selected {
    border-color: #0b6b3a;
    background: #e8f6ee;
  }
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
    gap: 12px;
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
  .secondary {
    background: #eee;
    color: #333;
  }
  .primary {
    background: #0b6b3a;
    color: #fff;
  }
</style>
