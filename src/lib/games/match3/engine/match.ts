import { type Board, type Pos } from './types'
import { areAdjacent, cloneBoard } from './board'

/** All positions that are part of a horizontal or vertical run of >= 3. */
export function findMatches(board: Board): Pos[] {
  const marked: boolean[][] = board.cells.map((row) => row.map(() => false))
  const { rows, cols, cells } = board

  // Horizontal runs.
  for (let r = 0; r < rows; r++) {
    let runStart = 0
    for (let c = 1; c <= cols; c++) {
      const same =
        c < cols &&
        cells[r][c] !== null &&
        cells[r][runStart] !== null &&
        cells[r][c]!.kind === cells[r][runStart]!.kind
      if (!same) {
        if (c - runStart >= 3) for (let k = runStart; k < c; k++) marked[r][k] = true
        runStart = c
      }
    }
  }
  // Vertical runs.
  for (let c = 0; c < cols; c++) {
    let runStart = 0
    for (let r = 1; r <= rows; r++) {
      const same =
        r < rows &&
        cells[r][c] !== null &&
        cells[runStart][c] !== null &&
        cells[r][c]!.kind === cells[runStart][c]!.kind
      if (!same) {
        if (r - runStart >= 3) for (let k = runStart; k < r; k++) marked[k][c] = true
        runStart = r
      }
    }
  }

  const out: Pos[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (marked[r][c]) out.push({ r, c })
  return out
}

export function swappedBoard(board: Board, a: Pos, b: Pos): Board {
  const next = cloneBoard(board)
  const tmp = next.cells[a.r][a.c]
  next.cells[a.r][a.c] = next.cells[b.r][b.c]
  next.cells[b.r][b.c] = tmp
  return next
}

export function isLegalSwap(board: Board, a: Pos, b: Pos): boolean {
  if (!areAdjacent(a, b)) return false
  if (board.cells[a.r][a.c] === null || board.cells[b.r][b.c] === null) return false
  return findMatches(swappedBoard(board, a, b)).length > 0
}

export function hasAnyMove(board: Board): boolean {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (c + 1 < board.cols && isLegalSwap(board, { r, c }, { r, c: c + 1 })) return true
      if (r + 1 < board.rows && isLegalSwap(board, { r, c }, { r: r + 1, c })) return true
    }
  }
  return false
}

/** The first legal swap (a hint), scanning row-major, or null if none. */
export function findHint(board: Board): { a: Pos; b: Pos } | null {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (c + 1 < board.cols && isLegalSwap(board, { r, c }, { r, c: c + 1 })) {
        return { a: { r, c }, b: { r, c: c + 1 } }
      }
      if (r + 1 < board.rows && isLegalSwap(board, { r, c }, { r: r + 1, c })) {
        return { a: { r, c }, b: { r: r + 1, c } }
      }
    }
  }
  return null
}
