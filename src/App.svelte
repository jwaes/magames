<script lang="ts">
  import Home from './lib/components/Home.svelte'
  import Solitaire from './lib/components/Solitaire.svelte'
  import SettingsModal from './lib/components/SettingsModal.svelte'
  import { game } from './lib/stores/game.svelte'

  type Screen = 'home' | 'solitaire'
  let screen = $state<Screen>('home')
  let showSettings = $state(false)

  // An optional ?seed= gives a reproducible deal — handy for testing and for
  // sharing "the same game" with someone. Ignored when absent (random deal).
  function seedFromUrl(): number | undefined {
    if (typeof location === 'undefined') return undefined
    const raw = new URLSearchParams(location.search).get('seed')
    if (raw === null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }

  function play(id: string) {
    if (id === 'solitaire') {
      game.newGame(undefined, seedFromUrl())
      screen = 'solitaire'
    }
  }
</script>

{#if screen === 'home'}
  <Home onplay={play} onsettings={() => (showSettings = true)} />
{:else}
  <Solitaire onhome={() => (screen = 'home')} onsettings={() => (showSettings = true)} />
{/if}

{#if showSettings}
  <SettingsModal onclose={() => (showSettings = false)} />
{/if}
