// Match-3 core types. Pure data — no DOM, no framework.
export const KIND_COUNT = 6
export type Kind = 0 | 1 | 2 | 3 | 4 | 5

/** A tile has a stable id (for animation) and one of the 6 kinds. */
export interface Tile {
  id: number
  kind: Kind
}

/** A cell is a tile, or null while empty mid-resolution. */
export type Cell = Tile | null

/** Row-major board. `nextId` hands out unique tile ids as tiles spawn. */
export interface Board {
  rows: number
  cols: number
  cells: Cell[][]
  nextId: number
}

export interface Pos {
  r: number
  c: number
}
