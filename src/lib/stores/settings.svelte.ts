// Persisted user settings. Uses Svelte 5 runes so components update reactively.

import type { DrawCount } from '../engine/solitaire'

const KEY = 'magames.settings.v1'

export type Movement = 'tap' | 'drag'

interface Persisted {
  drawCount: DrawCount
  sound: boolean
  movement: Movement
}

function load(): Persisted {
  const fallback: Persisted = { drawCount: 1, sound: true, movement: 'tap' }
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      drawCount: parsed.drawCount === 3 ? 3 : 1,
      sound: parsed.sound !== false,
      movement: parsed.movement === 'drag' ? 'drag' : 'tap'
    }
  } catch {
    return fallback
  }
}

class Settings {
  drawCount = $state<DrawCount>(1)
  sound = $state(true)
  movement = $state<Movement>('tap')

  constructor() {
    const p = load()
    this.drawCount = p.drawCount
    this.sound = p.sound
    this.movement = p.movement
  }

  private persist() {
    if (typeof localStorage === 'undefined') return
    const data: Persisted = { drawCount: this.drawCount, sound: this.sound, movement: this.movement }
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage full or blocked — settings simply won't persist */
    }
  }

  setDrawCount(n: DrawCount) {
    this.drawCount = n
    this.persist()
  }

  toggleSound() {
    this.sound = !this.sound
    this.persist()
  }

  setMovement(m: Movement) {
    this.movement = m
    this.persist()
  }
}

export const settings = new Settings()
