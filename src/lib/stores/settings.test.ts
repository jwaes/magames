import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('settings.movement', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults to tap and persists a change to a fresh instance', async () => {
    const { settings } = await import('./settings.svelte')
    expect(settings.movement).toBe('tap')
    settings.setMovement('drag')
    expect(settings.movement).toBe('drag')

    // Reset the module registry so a fresh singleton re-reads localStorage.
    vi.resetModules()
    const again = await import('./settings.svelte')
    expect(again.settings.movement).toBe('drag')
  })
})

describe('settings.stockRight', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults to false (deck left) and persists a change', async () => {
    const { settings } = await import('./settings.svelte')
    expect(settings.stockRight).toBe(false)
    settings.setStockRight(true)
    expect(settings.stockRight).toBe(true)

    vi.resetModules()
    const again = await import('./settings.svelte')
    expect(again.settings.stockRight).toBe(true)
  })
})
