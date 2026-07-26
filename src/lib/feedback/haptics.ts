// Physical feedback for "that isn't allowed".

type Vibrator = Navigator & { vibrate?: (pattern: number | number[]) => boolean }

/**
 * A short double buzz for a refused move.
 *
 * Guarded on purpose: `navigator.vibrate` is unsupported on iOS Safari, which is
 * the target device, so on the player's iPad this is a silent no-op and the
 * on-screen wiggle carries the whole signal. It is kept because it costs nothing
 * and does work on Android. Some browsers also throw when a permissions policy
 * blocks vibration, so the call itself is wrapped.
 */
export function buzzInvalid(): void {
  if (typeof navigator === 'undefined') return
  const { vibrate } = navigator as Vibrator
  if (typeof vibrate !== 'function') return
  try {
    vibrate.call(navigator, [18, 40, 18])
  } catch {
    /* vibration blocked — nothing to do */
  }
}
