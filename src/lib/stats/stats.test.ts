import { describe, it, expect } from 'vitest'
import {
  EMPTY_STATS,
  previousDay,
  markPlayed,
  recordWin,
  recordLoss,
  recordAbandon,
  formatDuration,
  formatClock
} from './stats'

describe('previousDay', () => {
  it('returns the calendar day before, across month boundaries', () => {
    expect(previousDay('2026-07-05')).toBe('2026-07-04')
    expect(previousDay('2026-07-01')).toBe('2026-06-30')
    expect(previousDay('2026-01-01')).toBe('2025-12-31')
  })
})

describe('markPlayed (day streak)', () => {
  it('starts a streak at 1 on first play', () => {
    const s = markPlayed(EMPTY_STATS, '2026-07-05')
    expect(s.currentDayStreak).toBe(1)
    expect(s.bestDayStreak).toBe(1)
    expect(s.lastPlayedDay).toBe('2026-07-05')
  })

  it('does not double-count the same day', () => {
    let s = markPlayed(EMPTY_STATS, '2026-07-05')
    s = markPlayed(s, '2026-07-05')
    expect(s.currentDayStreak).toBe(1)
  })

  it('increments on consecutive days and updates best', () => {
    let s = markPlayed(EMPTY_STATS, '2026-07-04')
    s = markPlayed(s, '2026-07-05')
    expect(s.currentDayStreak).toBe(2)
    expect(s.bestDayStreak).toBe(2)
  })

  it('resets to 1 after a missed day', () => {
    let s = markPlayed(EMPTY_STATS, '2026-07-03')
    s = markPlayed(s, '2026-07-04') // consecutive day, streak reaches 2
    s = markPlayed(s, '2026-07-06') // skipped the 5th
    expect(s.currentDayStreak).toBe(1)
    expect(s.bestDayStreak).toBe(2)
  })
})

describe('recordWin', () => {
  it('counts the win, adds time, extends the win streak, sets records', () => {
    const { stats, records } = recordWin(EMPTY_STATS, { seconds: 120, moves: 90 })
    expect(stats.gamesWon).toBe(1)
    expect(stats.totalSeconds).toBe(120)
    expect(stats.currentWinStreak).toBe(1)
    expect(stats.bestWinStreak).toBe(1)
    expect(stats.bestTimeSeconds).toBe(120)
    expect(stats.fewestMoves).toBe(90)
    expect(records).toEqual({ newBestTime: true, newFewestMoves: true, newBestStreak: true })
  })

  it('only flags records that actually improve', () => {
    let { stats } = recordWin(EMPTY_STATS, { seconds: 100, moves: 80 })
    const r2 = recordWin(stats, { seconds: 200, moves: 120 })
    expect(r2.records).toEqual({ newBestTime: false, newFewestMoves: false, newBestStreak: true })
    expect(r2.stats.bestTimeSeconds).toBe(100)
    expect(r2.stats.fewestMoves).toBe(80)
    expect(r2.stats.currentWinStreak).toBe(2)
  })
})

describe('recordLoss', () => {
  it('counts a loss, adds time, and resets the win streak', () => {
    const won = recordWin(EMPTY_STATS, { seconds: 100, moves: 80 }).stats
    const s = recordLoss(won, { seconds: 60 })
    expect(s.gamesLost).toBe(1)
    expect(s.totalSeconds).toBe(160)
    expect(s.currentWinStreak).toBe(0)
    expect(s.gamesWon).toBe(1)
  })
})

describe('recordAbandon', () => {
  it('adds time only and leaves the win streak intact', () => {
    const won = recordWin(EMPTY_STATS, { seconds: 100, moves: 80 }).stats
    const s = recordAbandon(won, { seconds: 30 })
    expect(s.totalSeconds).toBe(130)
    expect(s.currentWinStreak).toBe(1)
    expect(s.gamesWon).toBe(1)
    expect(s.gamesLost).toBe(0)
  })
})

describe('formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(90)).toBe('1m')
    expect(formatDuration(3660)).toBe('1u 1m')
  })
  it('formats a clock', () => {
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(65)).toBe('1:05')
  })
})
