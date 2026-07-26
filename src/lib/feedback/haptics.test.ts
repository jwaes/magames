import { describe, it, expect, vi, afterEach } from 'vitest'
import { buzzInvalid } from './haptics'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buzzInvalid', () => {
  it('vibrates with a short double pulse where the API exists', () => {
    // Typed parameter, so `mock.calls[0][0]` below is a real tuple element and
    // not a type error against a zero-arity mock.
    const vibrate = vi.fn((_pattern: number | number[]) => true)
    vi.stubGlobal('navigator', { vibrate })
    buzzInvalid()
    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate.mock.calls[0][0]).toEqual([18, 40, 18])
  })

  it('is a silent no-op where navigator.vibrate is missing (iOS Safari)', () => {
    vi.stubGlobal('navigator', {})
    expect(() => buzzInvalid()).not.toThrow()
  })

  it('swallows a vibrate that throws because policy blocks it', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked by permissions policy')
      }
    })
    expect(() => buzzInvalid()).not.toThrow()
  })
})
