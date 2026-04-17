export type Player = 0 | 1 | 2;

export const WIN_COUNT = 5;
const MIN_BOARD = 19;

// 4 directions for 2D: horizontal, vertical, diagonal (\), anti-diagonal (/)
export const DIRECTIONS: [number, number][] = [
  [1, 0],  // horizontal
  [0, 1],  // vertical
  [1, 1],  // diagonal \
  [1, -1], // anti-diagonal /
];

// Sparse board — stones stored in a Map keyed by "x,y"
export interface SparseBoard2D {
  stones: Map<string, Player>;
}

export function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function getStone(board: SparseBoard2D, x: number, y: number): Player {
  return (board.stones.get(coordKey(x, y)) as Player) || 0;
}

export function setStone(board: SparseBoard2D, x: number, y: number, player: Player): SparseBoard2D {
  const newStones = new Map(board.stones);
  if (player === 0) {
    newStones.delete(coordKey(x, y));
  } else {
    newStones.set(coordKey(x, y), player);
  }
  return { stones: newStones };
}

export interface BoardBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export function getBounds(board: SparseBoard2D, padding: number = 2): BoardBounds {
  // Always start from fixed origin (0,0) so the board never shifts
  let minX = 0;
  let minY = 0;
  let maxX = MIN_BOARD - 1;
  let maxY = MIN_BOARD - 1;

  if (board.stones.size > 0) {
    const keys = Array.from(board.stones.keys());
    for (let i = 0; i < keys.length; i++) {
      const parts = keys[i].split(',');
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      // Expand bounds if stones are near or beyond current edges
      if (x - padding < minX) minX = x - padding;
      if (x + padding > maxX) maxX = x + padding;
      if (y - padding < minY) minY = y - padding;
      if (y + padding > maxY) maxY = y + padding;
    }
  }

  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function getEmptyBoard2D(): SparseBoard2D {
  return { stones: new Map() };
}

export function checkWinner2D(board: SparseBoard2D): Player {
  const keys = Array.from(board.stones.keys());
  for (let i = 0; i < keys.length; i++) {
    const parts = keys[i].split(',');
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const player = board.stones.get(keys[i]) as Player;
    if (player === 0) continue;

    for (const [dx, dy] of DIRECTIONS) {
      let count = 1;
      let nx = x + dx;
      let ny = y + dy;
      while (getStone(board, nx, ny) === player) {
        count++;
        if (count === WIN_COUNT) return player;
        nx += dx;
        ny += dy;
      }
    }
  }
  return 0;
}

export function isForbiddenMove2D(board: SparseBoard2D, x: number, y: number, player: Player): boolean {
  if (getStone(board, x, y) !== 0) return true;

  // Check if placing here would create 6+ in a row (overline)
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    let nx = x + dx, ny = y + dy;
    while (getStone(board, nx, ny) === player) {
      count++;
      nx += dx;
      ny += dy;
    }
    nx = x - dx;
    ny = y - dy;
    while (getStone(board, nx, ny) === player) {
      count++;
      nx -= dx;
      ny -= dy;
    }
    if (count >= 6) return true;
  }
  return false;
}

export function isLegalMove2D(board: SparseBoard2D, x: number, y: number, player: Player): boolean {
  if (getStone(board, x, y) !== 0) return false;
  if (isForbiddenMove2D(board, x, y, player)) return false;
  return true;
}
