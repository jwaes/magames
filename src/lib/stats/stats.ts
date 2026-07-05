// Pure, framework-free stats model. No DOM, no runes. Fully unit-testable.
// All "today"/"day" values are local calendar-day strings 'YYYY-MM-DD',
// passed in by the caller so this stays deterministic and testable.

export interface Stats {
  gamesWon: number
  gamesLost: number // truly-stuck losses only
  totalSeconds: number
  currentWinStreak: number
  bestWinStreak: number
  currentDayStreak: number
  bestDayStreak: number
  lastPlayedDay: string | null
  bestTimeSeconds: number | null
  fewestMoves: number | null
}

export const EMPTY_STATS: Stats = {
  gamesWon: 0,
  gamesLost: 0,
  totalSeconds: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  currentDayStreak: 0,
  bestDayStreak: 0,
  lastPlayedDay: null,
  bestTimeSeconds: null,
  fewestMoves: null
}

export interface WinRecords {
  newBestTime: boolean
  newFewestMoves: boolean
  newBestStreak: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The calendar day before an ISO 'YYYY-MM-DD' (UTC math avoids DST edge cases). */
export function previousDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Record that a game was played on `today`, updating the day streak. */
export function markPlayed(stats: Stats, today: string): Stats {
  if (stats.lastPlayedDay === today) return stats
  const continues = stats.lastPlayedDay !== null && stats.lastPlayedDay === previousDay(today)
  const currentDayStreak = continues ? stats.currentDayStreak + 1 : 1
  return {
    ...stats,
    lastPlayedDay: today,
    currentDayStreak,
    bestDayStreak: Math.max(stats.bestDayStreak, currentDayStreak)
  }
}

export function recordWin(stats: Stats, o: { seconds: number; moves: number }): { stats: Stats; records: WinRecords } {
  const currentWinStreak = stats.currentWinStreak + 1
  const newBestTime = o.seconds > 0 && (stats.bestTimeSeconds === null || o.seconds < stats.bestTimeSeconds)
  const newFewestMoves = stats.fewestMoves === null || o.moves < stats.fewestMoves
  const newBestStreak = currentWinStreak > stats.bestWinStreak
  const next: Stats = {
    ...stats,
    gamesWon: stats.gamesWon + 1,
    totalSeconds: stats.totalSeconds + o.seconds,
    currentWinStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, currentWinStreak),
    bestTimeSeconds: newBestTime ? o.seconds : stats.bestTimeSeconds,
    fewestMoves: newFewestMoves ? o.moves : stats.fewestMoves
  }
  return { stats: next, records: { newBestTime, newFewestMoves, newBestStreak } }
}

export function recordLoss(stats: Stats, o: { seconds: number }): Stats {
  return {
    ...stats,
    gamesLost: stats.gamesLost + 1,
    totalSeconds: stats.totalSeconds + o.seconds,
    currentWinStreak: 0
  }
}

export function recordAbandon(stats: Stats, o: { seconds: number }): Stats {
  return { ...stats, totalSeconds: stats.totalSeconds + o.seconds }
}

/** e.g. 0 -> "0m", 90 -> "1m", 3660 -> "1u 1m" (Dutch: u = uur/hours). */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return h > 0 ? `${h}u ${m}m` : `${m}m`
}

/** e.g. 65 -> "1:05". */
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${m}:${pad(seconds % 60)}`
}
