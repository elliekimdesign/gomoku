import { BoardState3D, Player } from '../components/Gomoku3DBoard';
import { isLegalMove } from '../utils/gameRules';
import { quickEvaluateMove } from './heuristic';

const BOARD_SIZE = 8;

export interface Move {
  x: number;
  y: number;
  z: number;
  score?: number;
}

/**
 * Generate all legal moves for a player
 * @param board Current board state
 * @param player Player to generate moves for
 * @returns Array of legal move coordinates
 */
export function generateAllMoves(board: BoardState3D, player: Player): Move[] {
  const moves: Move[] = [];
  
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (isLegalMove(board, x, y, z, player)) {
          moves.push({ x, y, z });
        }
      }
    }
  }
  
  return moves;
}

/**
 * Generate moves with intelligent ordering for alpha-beta pruning efficiency
 * 오목 룰에 맞게 방어적 움직임을 우선적으로 고려
 * @param board Current board state
 * @param player Player to generate moves for
 * @param maxMoves Maximum number of moves to return (for pruning in deep searches)
 * @returns Array of ordered moves with scores
 */
export function generateOrderedMoves(
  board: BoardState3D, 
  player: Player, 
  maxMoves: number = 64
): Move[] {
  const allMoves = generateAllMoves(board, player);
  const opponent = player === 1 ? 2 : 1;
  
  // If early game (few stones), consider all moves but still prioritize defensive
  const stoneCount = countStones(board);
  if (stoneCount <= 4) {
    return orderMovesByGomokuStrategy(board, allMoves, player);
  }
  
  // For mid/late game, use sophisticated ordering with defensive priority
  const scoredMoves = allMoves.map(move => {
    let score = quickEvaluateMove(board, move.x, move.y, move.z, player);
    
    // 1. 즉시 차단 보너스: 상대방의 연결을 차단하는 위치
    const blockingScore = getCriticalBlockingScore(board, move.x, move.y, move.z, opponent);
    score += blockingScore;
    
    // 2. 방어 보너스: 상대방 돌 근처에 두는 것을 높게 평가
    const defenseBonus = getDefenseBonus(board, move.x, move.y, move.z, opponent);
    score += defenseBonus;
    
    return {
      ...move,
      score
    };
  });
  
  // Sort by score (highest first)
  scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Return top moves
  return scoredMoves.slice(0, maxMoves);
}

/**
 * 즉시 차단 점수 계산 - 상대방의 연결을 직접 차단하는 위치 최우선
 */
function getCriticalBlockingScore(board: BoardState3D, x: number, y: number, z: number, opponent: Player): number {
  let blockingScore = 0;
  
  // 26방향에서 이 위치가 상대방의 연결을 얼마나 차단하는지 확인
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        
        // 이 방향으로 상대방 돌이 연결되어 있는지 확인
        const consecutiveCount = countConsecutiveInLine(board, x, y, z, dx, dy, dz, opponent);
        
        if (consecutiveCount >= 4) {
          blockingScore += 1000000; // 4연속 차단은 게임 승부! 
        } else if (consecutiveCount >= 3) {
          blockingScore += 100000; // 3연속 차단은 최우선
        } else if (consecutiveCount >= 2) {
          blockingScore += 10000; // 2연속 차단도 매우 중요
        } else if (consecutiveCount >= 1) {
          blockingScore += 1000; // 1개라도 차단하면 좋음
        }
      }
    }
  }
  
  return blockingScore;
}

/**
 * 특정 방향에서 연결된 상대방 돌 개수 세기 (양쪽 방향)
 */
function countConsecutiveInLine(board: BoardState3D, x: number, y: number, z: number, dx: number, dy: number, dz: number, player: Player): number {
  let count = 0;
  
  // 한쪽 방향으로 세기
  let checkX = x + dx, checkY = y + dy, checkZ = z + dz;
  while (checkX >= 0 && checkX < BOARD_SIZE &&
         checkY >= 0 && checkY < BOARD_SIZE &&
         checkZ >= 0 && checkZ < BOARD_SIZE &&
         board[checkZ][checkY][checkX] === player) {
    count++;
    checkX += dx;
    checkY += dy;
    checkZ += dz;
  }
  
  // 반대 방향으로 세기
  checkX = x - dx;
  checkY = y - dy;
  checkZ = z - dz;
  while (checkX >= 0 && checkX < BOARD_SIZE &&
         checkY >= 0 && checkY < BOARD_SIZE &&
         checkZ >= 0 && checkZ < BOARD_SIZE &&
         board[checkZ][checkY][checkX] === player) {
    count++;
    checkX -= dx;
    checkY -= dy;
    checkZ -= dz;
  }
  
  return count;
}

/**
 * 방어 보너스 계산 - 상대방 돌 근처에 두는 것을 우선시
 */
function getDefenseBonus(board: BoardState3D, x: number, y: number, z: number, opponent: Player): number {
  let bonus = 0;
  
  // 주변 8방향(3D에서는 26방향) 검사
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        
        if (nx >= 0 && nx < BOARD_SIZE && 
            ny >= 0 && ny < BOARD_SIZE && 
            nz >= 0 && nz < BOARD_SIZE && 
            board[nz][ny][nx] === opponent) {
          
          // 상대방 돌이 연결되어 있는지 확인
          let consecutiveCount = 1;
          let checkX = nx + dx;
          let checkY = ny + dy;
          let checkZ = nz + dz;
          
          while (checkX >= 0 && checkX < BOARD_SIZE &&
                 checkY >= 0 && checkY < BOARD_SIZE &&
                 checkZ >= 0 && checkZ < BOARD_SIZE &&
                 board[checkZ][checkY][checkX] === opponent) {
            consecutiveCount++;
            checkX += dx;
            checkY += dy;
            checkZ += dz;
          }
          
          // 연결된 돌이 많을수록 더 높은 방어 보너스
          bonus += consecutiveCount * 20;
        }
      }
    }
  }
  
  return bonus;
}

/**
 * 오목 전략에 맞는 move ordering
 * @param board Current board state
 * @param moves Array of moves to order
 * @param player Player making the moves
 * @returns Ordered array of moves
 */
function orderMovesByGomokuStrategy(board: BoardState3D, moves: Move[], player: Player): Move[] {
  const opponent = player === 1 ? 2 : 1;
  
  return moves.sort((a, b) => {
    // 1순위: 방어 보너스 (상대방 돌 근처)
    const aDefense = getDefenseBonus(board, a.x, a.y, a.z, opponent);
    const bDefense = getDefenseBonus(board, b.x, b.y, b.z, opponent);
    
    if (Math.abs(aDefense - bDefense) > 10) {
      return bDefense - aDefense;
    }
    
    // 2순위: 기존 전략 (중앙, 근접성)
    return orderMovesByStrategy(board, [a, b], player).indexOf(a) === 0 ? -1 : 1;
  });
}

/**
 * Order moves by strategic priority
 * @param board Current board state
 * @param moves Array of moves to order
 * @param player Player making the moves
 * @returns Ordered array of moves
 */
function orderMovesByStrategy(board: BoardState3D, moves: Move[], player: Player): Move[] {
  const center = (BOARD_SIZE - 1) / 2;
  
  return moves.sort((a, b) => {
    // Priority 1: Center positions (early game strategy)
    const aDistanceFromCenter = Math.sqrt(
      Math.pow(a.x - center, 2) + 
      Math.pow(a.y - center, 2) + 
      Math.pow(a.z - center, 2)
    );
    const bDistanceFromCenter = Math.sqrt(
      Math.pow(b.x - center, 2) + 
      Math.pow(b.y - center, 2) + 
      Math.pow(b.z - center, 2)
    );
    
    const centerDiff = aDistanceFromCenter - bDistanceFromCenter;
    if (Math.abs(centerDiff) > 0.5) {
      return centerDiff;
    }
    
    // Priority 2: Proximity to existing stones
    const aProximity = getProximityScore(board, a.x, a.y, a.z);
    const bProximity = getProximityScore(board, b.x, b.y, b.z);
    
    return bProximity - aProximity;
  });
}

/**
 * Calculate proximity score based on nearby stones
 * @param board Current board state
 * @param x X coordinate
 * @param y Y coordinate
 * @param z Z coordinate
 * @returns Proximity score (higher = more stones nearby)
 */
function getProximityScore(board: BoardState3D, x: number, y: number, z: number): number {
  let score = 0;
  
  // Check all 26 directions for nearby stones
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        
        if (nx >= 0 && nx < BOARD_SIZE && 
            ny >= 0 && ny < BOARD_SIZE && 
            nz >= 0 && nz < BOARD_SIZE && 
            board[nz][ny][nx] !== 0) {
          score += 1;
        }
      }
    }
  }
  
  return score;
}

/**
 * Count total number of stones on the board
 * @param board Current board state
 * @returns Number of stones placed
 */
function countStones(board: BoardState3D): number {
  let count = 0;
  
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] !== 0) {
          count++;
        }
      }
    }
  }
  
  return count;
}

/**
 * Generate moves in a local area around existing stones
 * Useful for focused search in mid/late game
 * @param board Current board state
 * @param player Player to generate moves for
 * @param radius Search radius around existing stones
 * @returns Array of moves in local area
 */
export function generateLocalMoves(
  board: BoardState3D, 
  player: Player, 
  radius: number = 2
): Move[] {
  const localPositions = new Set<string>();
  const moves: Move[] = [];
  
  // Find all stones on the board
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] !== 0) {
          // Add positions within radius
          for (let dz = -radius; dz <= radius; dz++) {
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const nz = z + dz;
                
                if (nx >= 0 && nx < BOARD_SIZE && 
                    ny >= 0 && ny < BOARD_SIZE && 
                    nz >= 0 && nz < BOARD_SIZE) {
                  localPositions.add(`${nx},${ny},${nz}`);
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Convert positions to moves if they're legal
  for (const posStr of Array.from(localPositions)) {
    const [x, y, z] = posStr.split(',').map(Number);
    if (isLegalMove(board, x, y, z, player)) {
      moves.push({ x, y, z });
    }
  }
  
  return moves;
}

/**
 * Killer move heuristic - tracks moves that caused alpha-beta cutoffs
 * These moves are likely to be good in similar positions
 */
export class KillerMoveTable {
  private killerMoves: Map<number, Move[]> = new Map();
  
  /**
   * Store a killer move for a specific depth
   * @param depth Search depth
   * @param move Move that caused cutoff
   */
  storeKillerMove(depth: number, move: Move): void {
    if (!this.killerMoves.has(depth)) {
      this.killerMoves.set(depth, []);
    }
    
    const killers = this.killerMoves.get(depth)!;
    
    // Avoid duplicates
    const exists = killers.some(k => k.x === move.x && k.y === move.y && k.z === move.z);
    if (!exists) {
      killers.unshift(move); // Add to front
      
      // Keep only top 2 killer moves per depth
      if (killers.length > 2) {
        killers.pop();
      }
    }
  }
  
  /**
   * Get killer moves for a specific depth
   * @param depth Search depth
   * @returns Array of killer moves
   */
  getKillerMoves(depth: number): Move[] {
    return this.killerMoves.get(depth) || [];
  }
  
  /**
   * Clear all killer moves (call at start of new search)
   */
  clear(): void {
    this.killerMoves.clear();
  }
}

/**
 * Apply killer move ordering to a list of moves
 * @param moves Array of moves to order
 * @param killerMoves Array of killer moves to prioritize
 * @returns Reordered array with killer moves first
 */
export function applyKillerMoveOrdering(moves: Move[], killerMoves: Move[]): Move[] {
  const killerSet = new Set(killerMoves.map(k => `${k.x},${k.y},${k.z}`));
  const killers: Move[] = [];
  const others: Move[] = [];
  
  for (const move of moves) {
    const moveKey = `${move.x},${move.y},${move.z}`;
    if (killerSet.has(moveKey)) {
      killers.push(move);
    } else {
      others.push(move);
    }
  }
  
  return [...killers, ...others];
}
