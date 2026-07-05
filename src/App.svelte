<script lang="ts">
  import Home from './lib/components/Home.svelte'
  import Solitaire from './lib/components/Solitaire.svelte'
  import SettingsModal from './lib/components/SettingsModal.svelte'
  import StatsScreen from './lib/components/StatsScreen.svelte'
  import Match3 from './lib/components/match3/Match3.svelte'
  import { game } from './lib/stores/game.svelte'
  import { match3 } from './lib/stores/match3.svelte'

  type Screen = 'home' | 'solitaire' | 'stats' | 'match3'
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
    } else if (id === 'match3') {
      match3.newGame(seedFromUrl())
      screen = 'match3'
    }
  }

  function goHome() {
    game.leave()
    screen = 'home'
  }
</script>

{#if screen === 'home'}
  <Home onplay={play} onsettings={() => (showSettings = true)} onstats={() => (screen = 'stats')} />
{:else if screen === 'stats'}
  <StatsScreen onclose={() => (screen = 'home')} />
{:else if screen === 'match3'}
  <Match3 onhome={() => (screen = 'home')} />
{:else}
  <Solitaire onhome={goHome} onsettings={() => (showSettings = true)} />
{/if}

{#if showSettings}
  <SettingsModal onclose={() => (showSettings = false)} />
{/if}
