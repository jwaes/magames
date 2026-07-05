// Tiny synthesized sound effects using the Web Audio API.
// No audio files => nothing to download, works offline, gentle on old devices.

type SfxName = 'place' | 'flip' | 'invalid' | 'deal' | 'win'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

/** iOS/Safari only allows audio after a user gesture — call this on first tap. */
export function unlockAudio(): void {
  const a = audio()
  if (a && a.state === 'suspended') void a.resume()
}

function tone(freq: number, durationMs: number, type: OscillatorType, gain = 0.08): void {
  const a = audio()
  if (!a) return
  const now = a.currentTime
  const osc = a.createOscillator()
  const env = a.createGain()
  osc.type = type
  osc.frequency.value = freq
  env.gain.setValueAtTime(0.0001, now)
  env.gain.exponentialRampToValueAtTime(gain, now + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  osc.connect(env).connect(a.destination)
  osc.start(now)
  osc.stop(now + durationMs / 1000 + 0.02)
}

/**
 * A match "pop". The sound differs by run length — a 3 is a soft blip, a 4 is
 * brighter with a sparkle, a 5+ is a richer chord — and the pitch rises with
 * cascade depth so chains feel satisfying. Called on every cascade.
 */
export function playPop(runLength: number, cascade = 1, enabled = true): void {
  if (!enabled) return
  const step = Math.min(cascade - 1, 8) // rise with cascade, then plateau
  const bump = 1 + step * 0.06
  if (runLength >= 5) {
    // Rich, celebratory chord.
    ;[523, 659, 784].forEach((f, i) => window.setTimeout(() => tone(f * bump, 220, 'sine', 0.09), i * 45))
  } else if (runLength === 4) {
    // Bright pop + a little sparkle above.
    tone(440 * bump, 120, 'triangle', 0.08)
    window.setTimeout(() => tone(880 * bump, 90, 'sine', 0.05), 60)
  } else {
    // Soft blip for a plain 3.
    tone(300 * bump, 90, 'sine', 0.07)
  }
}

/** Play a named effect. `enabled` lets callers respect the mute setting cheaply. */
export function play(name: SfxName, enabled = true): void {
  if (!enabled) return
  switch (name) {
    case 'place':
      tone(320, 70, 'sine')
      break
    case 'flip':
      tone(520, 55, 'triangle', 0.05)
      break
    case 'invalid':
      tone(140, 130, 'sawtooth', 0.05)
      break
    case 'deal':
      tone(420, 45, 'sine', 0.04)
      break
    case 'win':
      // A cheerful little rising arpeggio.
      ;[523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 180, 'sine', 0.09), i * 130))
      break
  }
}
