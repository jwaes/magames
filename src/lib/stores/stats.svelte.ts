// Reactive, persisted wrapper around the pure stats reducers.
import {
  type Stats,
  type WinRecords,
  EMPTY_STATS,
  markPlayed,
  recordWin,
  recordLoss,
  recordAbandon
} from '../stats/stats'

const KEY = 'magames.stats.v1'
const pad = (n: number) => String(n).padStart(2, '0')

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function load(): Stats {
  if (typeof localStorage === 'undefined') return { ...EMPTY_STATS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY_STATS }
    // Merge onto defaults so older/partial saves stay valid.
    return { ...EMPTY_STATS, ...(JSON.parse(raw) as Partial<Stats>) }
  } catch {
    return { ...EMPTY_STATS }
  }
}

class StatsStore {
  data = $state<Stats>(load())

  #persist() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data))
    } catch {
      /* storage full or blocked — stats simply won't persist */
    }
  }

  markPlayed(): void {
    this.data = markPlayed(this.data, todayLocal())
    this.#persist()
  }

  recordWin(o: { seconds: number; moves: number }): WinRecords {
    const { stats, records } = recordWin(this.data, o)
    this.data = stats
    this.#persist()
    return records
  }

  recordLoss(o: { seconds: number }): void {
    this.data = recordLoss(this.data, o)
    this.#persist()
  }

  recordAbandon(o: { seconds: number }): void {
    this.data = recordAbandon(this.data, o)
    this.#persist()
  }

  reset(): void {
    this.data = { ...EMPTY_STATS }
    this.#persist()
  }
}

export const stats = new StatsStore()
