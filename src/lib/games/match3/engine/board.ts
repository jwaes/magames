import { type Board, type Cell, type Kind, type Pos, KIND_COUNT } from './types'

export function emptyBoard(rows: number, cols: number): Board {
  const cells: Cell[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))
  return { rows, cols, cells, nextId: 0 }
}

export function inBounds(board: Board, p: Pos): boolean {
  return p.r >= 0 && p.r < board.rows && p.c >= 0 && p.c < board.cols
}

export function at(board: Board, p: Pos): Cell {
  return inBounds(board, p) ? board.cells[p.r][p.c] : null
}

export function areAdjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.r - b.r)
  const dc = Math.abs(a.c - b.c)
  return dr + dc === 1
}

export function spawnKind(rng: () => number): Kind {
  return Math.floor(rng() * KIND_COUNT) as Kind
}

export function cloneBoard(board: Board): Board {
  return {
    rows: board.rows,
    cols: board.cols,
    nextId: board.nextId,
    cells: board.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
  }
}
