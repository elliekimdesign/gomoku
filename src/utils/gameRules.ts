import { BoardState3D, Player } from '../components/Gomoku3DBoard';

const BOARD_SIZE = 8;

// All 3D directions (26 directions: 6 axes, 12 face diagonals, 8 space diagonals)
// Reusing the same directions array from App.tsx for consistency
export const directions = [
  [1, 0, 0], [0, 1, 0], [0, 0, 1],
  [-1, 0, 0], [0, -1, 0], [0, 0, -1],
  [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
  [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
  [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
  [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
];

/**
 * Checks if placing a stone at the given position would create a forbidden six-in-a-row
 * @param board Current board state
 * @param x X coordinate
 * @param y Y coordinate  
 * @param z Z coordinate
 * @param player Player making the move (1 or 2)
 * @returns true if the move is forbidden, false if allowed
 */
export function isForbiddenMove(board: BoardState3D, x: number, y: number, z: number, player: Player): boolean {
  // Position must be empty
  if (board[z][y][x] !== 0) {
    return true;
  }

  // Check if placing this stone would create six-in-a-row in any direction
  for (const [dx, dy, dz] of directions) {
    if (wouldCreateSixInARow(board, x, y, z, dx, dy, dz, player)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if placing a stone would create exactly six consecutive stones in a specific direction
 * @param board Current board state
 * @param x X coordinate of the move
 * @param y Y coordinate of the move
 * @param z Z coordinate of the move
 * @param dx Direction vector X component
 * @param dy Direction vector Y component
 * @param dz Direction vector Z component
 * @param player Player making the move
 * @returns true if this move would create six-in-a-row
 */
function wouldCreateSixInARow(
  board: BoardState3D, 
  x: number, 
  y: number, 
  z: number, 
  dx: number, 
  dy: number, 
  dz: number, 
  player: Player
): boolean {
  // Count stones in the positive direction
  let positiveCount = 0;
  let nx = x + dx;
  let ny = y + dy;
  let nz = z + dz;
  
  while (
    nx >= 0 && nx < BOARD_SIZE &&
    ny >= 0 && ny < BOARD_SIZE &&
    nz >= 0 && nz < BOARD_SIZE &&
    board[nz][ny][nx] === player
  ) {
    positiveCount++;
    nx += dx;
    ny += dy;
    nz += dz;
  }

  // Count stones in the negative direction
  let negativeCount = 0;
  nx = x - dx;
  ny = y - dy;
  nz = z - dz;
  
  while (
    nx >= 0 && nx < BOARD_SIZE &&
    ny >= 0 && ny < BOARD_SIZE &&
    nz >= 0 && nz < BOARD_SIZE &&
    board[nz][ny][nx] === player
  ) {
    negativeCount++;
    nx -= dx;
    ny -= dy;
    nz -= dz;
  }

  // Total count including the stone we're about to place
  const totalCount = positiveCount + negativeCount + 1;
  
  // Forbidden if it would create six or more in a row
  return totalCount >= 6;
}

/**
 * Checks if a move is legal (position is empty and doesn't violate forbidden move rules)
 * @param board Current board state
 * @param x X coordinate
 * @param y Y coordinate
 * @param z Z coordinate
 * @param player Player making the move
 * @returns true if the move is legal
 */
export function isLegalMove(board: BoardState3D, x: number, y: number, z: number, player: Player): boolean {
  // Check bounds
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE || z < 0 || z >= BOARD_SIZE) {
    return false;
  }

  // Check if position is empty and move is not forbidden
  return board[z][y][x] === 0 && !isForbiddenMove(board, x, y, z, player);
}

/**
 * Gets all legal moves for a player
 * @param board Current board state
 * @param player Player to get moves for
 * @returns Array of legal move coordinates
 */
export function getLegalMoves(board: BoardState3D, player: Player): Array<{x: number, y: number, z: number}> {
  const legalMoves: Array<{x: number, y: number, z: number}> = [];
  
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (isLegalMove(board, x, y, z, player)) {
          legalMoves.push({ x, y, z });
        }
      }
    }
  }
  
  return legalMoves;
}

/**
 * Counts consecutive stones in a line from a starting position
 * Used for pattern evaluation in AI heuristics
 * @param board Current board state
 * @param startX Starting X coordinate
 * @param startY Starting Y coordinate
 * @param startZ Starting Z coordinate
 * @param dx Direction vector X component
 * @param dy Direction vector Y component
 * @param dz Direction vector Z component
 * @param player Player to count stones for
 * @returns Number of consecutive stones in the direction
 */
export function countConsecutiveStones(
  board: BoardState3D,
  startX: number,
  startY: number,
  startZ: number,
  dx: number,
  dy: number,
  dz: number,
  player: Player
): number {
  let count = 0;
  let x = startX;
  let y = startY;
  let z = startZ;
  
  while (
    x >= 0 && x < BOARD_SIZE &&
    y >= 0 && y < BOARD_SIZE &&
    z >= 0 && z < BOARD_SIZE &&
    board[z][y][x] === player
  ) {
    count++;
    x += dx;
    y += dy;
    z += dz;
  }
  
  return count;
}
