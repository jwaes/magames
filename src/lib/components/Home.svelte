<script lang="ts">
  import { GAMES } from '../games/registry'

  let { onplay, onsettings }: { onplay: (id: string) => void; onsettings: () => void } = $props()
</script>

<div class="home">
  <header>
    <h1>Kaartspellen</h1>
    <button class="gear" onclick={onsettings} aria-label="Instellingen">⚙️</button>
  </header>

  <div class="grid">
    {#each GAMES as g}
      <button class="tile" disabled={!g.available} onclick={() => g.available && onplay(g.id)}>
        <span class="icon" aria-hidden="true">{g.icon}</span>
        <span class="name">{g.name}</span>
        <span class="sub">{g.available ? g.subtitle : 'Binnenkort'}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100vw;
    padding: clamp(16px, 4vw, 48px);
    box-sizing: border-box;
    background: radial-gradient(circle at 50% 20%, #128a4c 0%, #0b6b3a 55%, #073f22 100%);
    color: #fff;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h1 {
    font-size: clamp(28px, 6vw, 56px);
    margin: 0;
  }
  .gear {
    font-size: clamp(24px, 5vw, 40px);
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 14px;
    padding: 0.3em 0.5em;
    color: #fff;
    cursor: pointer;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(140px, 30vw, 240px), 1fr));
    gap: clamp(12px, 3vw, 28px);
    align-content: center;
    justify-items: center;
    padding-top: 4vh;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    width: 100%;
    max-width: 280px;
    aspect-ratio: 3 / 4;
    border: none;
    border-radius: 22px;
    background: #fff;
    color: #16181d;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    transition: transform 0.1s ease;
  }
  .tile:not(:disabled):active {
    transform: scale(0.97);
  }
  .tile:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .icon {
    font-size: clamp(48px, 12vw, 96px);
  }
  .name {
    font-size: clamp(20px, 3.4vw, 32px);
    font-weight: 800;
  }
  .sub {
    font-size: clamp(13px, 2vw, 18px);
    color: #555;
  }
</style>
