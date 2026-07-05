import { type Board, type Cell, type Kind, type Pos } from './types'
import { cloneBoard, spawnKind } from './board'
import { findMatches, hasAnyMove } from './match'

/** One cascade, broken out for animation: which tiles burst, then the board after they fall. */
export interface CascadeStep {
  /** Positions that matched this cascade (to explode in place). */
  cleared: Pos[]
  /** Longest straight run in this cascade (3, 4, 5, ...) — drives bigger effects. */
  runMax: number
  /** The board after this cascade's gravity + refill. */
  boardAfter: Board
}

/** Longest horizontal or vertical run of same-kind tiles currently on the board. */
function longestRun(board: Board): number {
  let max = 0
  const { rows, cols, cells } = board
  for (let r = 0; r < rows; r++) {
    let run = 1
    for (let c = 1; c < cols; c++) {
      const a = cells[r][c]
      const b = cells[r][c - 1]
      run = a && b && a.kind === b.kind ? run + 1 : 1
      if (run > max) max = run
    }
  }
  for (let c = 0; c < cols; c++) {
    let run = 1
    for (let r = 1; r < rows; r++) {
      const a = cells[r][c]
      const b = cells[r - 1][c]
      run = a && b && a.kind === b.kind ? run + 1 : 1
      if (run > max) max = run
    }
  }
  return max
}

/**
 * Like resolveAll, but returns each cascade as a step so the UI can animate
 * explode-then-fall. Same final board and score as resolveAll for a given rng.
 */
export function resolveSteps(board: Board, rng: () => number): { steps: CascadeStep[]; board: Board; score: number } {
  const steps: CascadeStep[] = []
  let current = board
  let score = 0
  let cascade = 0
  const MAX_CASCADES = 100
  while (cascade < MAX_CASCADES) {
    const cleared = findMatches(current)
    if (cleared.length === 0) break
    const runMax = longestRun(current)
    const { board: after } = resolveOnce(current, rng)
    cascade++
    score += cleared.length * 10 * cascade
    steps.push({ cleared, runMax, boardAfter: after })
    current = after
  }
  return { steps, board: current, score }
}

/** Clear current matches, drop tiles into gaps, refill from the top. One pass. */
export function resolveOnce(board: Board, rng: () => number): { board: Board; cleared: number } {
  const matches = findMatches(board)
  if (matches.length === 0) return { board, cleared: 0 }

  const next = cloneBoard(board)
  for (const p of matches) next.cells[p.r][p.c] = null

  // Gravity + refill, column by column.
  for (let c = 0; c < next.cols; c++) {
    const survivors: Cell[] = []
    for (let r = next.rows - 1; r >= 0; r--) {
      if (next.cells[r][c] !== null) survivors.push(next.cells[r][c])
    }
    // Refill bottom→top: reuse survivors in order (index pointer, not shift()).
    let si = 0
    for (let r = next.rows - 1; r >= 0; r--) {
      next.cells[r][c] = si < survivors.length ? survivors[si++] : { id: next.nextId++, kind: spawnKind(rng) }
    }
  }
  return { board: next, cleared: matches.length }
}

export function resolveAll(board: Board, rng: () => number): { board: Board; score: number } {
  let current = board
  let score = 0
  let cascade = 0
  // Hard cap: refills are random so cascades could in principle chain forever
  // (probability → 0, never seen). Cap guarantees termination.
  const MAX_CASCADES = 100
  while (cascade < MAX_CASCADES) {
    const { board: next, cleared } = resolveOnce(current, rng)
    if (cleared === 0) break
    cascade++
    score += cleared * 10 * cascade
    current = next
  }
  return { board: current, score }
}

/** Full board guaranteed match-free with at least one legal move. */
export function fillBoard(rows: number, cols: number, rng: () => number): Board {
  for (;;) {
    const board: Board = { rows, cols, nextId: 0, cells: [] }
    board.cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null as Cell))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        board.cells[r][c] = { id: board.nextId++, kind: pickNonMatching(board, r, c, rng) }
      }
    }
    if (findMatches(board).length === 0 && hasAnyMove(board)) return board
    // else loop and rebuild (extremely rare to retry with the guard below)
  }
}

/** Pick a kind for (r,c) that does not complete a run of 3 with already-filled left/up neighbours. */
function pickNonMatching(board: Board, r: number, c: number, rng: () => number): Kind {
  const bad = new Set<Kind>()
  if (c >= 2 && sameKind(board, r, c - 1, r, c - 2)) bad.add(board.cells[r][c - 1]!.kind)
  if (r >= 2 && sameKind(board, r - 1, c, r - 2, c)) bad.add(board.cells[r - 1][c]!.kind)
  let k = spawnKind(rng)
  let guard = 0
  while (bad.has(k) && guard++ < 20) k = spawnKind(rng)
  return k
}

function sameKind(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  const a = board.cells[r1][c1]
  const b = board.cells[r2][c2]
  return a !== null && b !== null && a.kind === b.kind
}

/** Rearrange the existing tiles (same kinds) into a match-free, movable board. */
export function reshuffle(board: Board, rng: () => number): Board {
  const tiles = board.cells.flat().filter((c): c is NonNullable<Cell> => c !== null)
  for (let attempt = 0; attempt < 200; attempt++) {
    // Fisher–Yates on a copy.
    const pool = tiles.slice()
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const next = cloneBoard(board)
    let idx = 0
    for (let r = 0; r < next.rows; r++) for (let c = 0; c < next.cols; c++) next.cells[r][c] = pool[idx++]
    if (findMatches(next).length === 0 && hasAnyMove(next)) return next
  }
  return board // fallback (practically never reached)
}
