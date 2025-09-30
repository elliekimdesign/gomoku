import { BoardState3D, Player } from '../components/Gomoku3DBoard';
import { directions, countConsecutiveStones } from '../utils/gameRules';

const BOARD_SIZE = 8;
const WIN_COUNT = 5;

// Direction type classification for weighted evaluation
enum DirectionType {
  MAIN_AXIS = 'main_axis',      // X, Y, Z directions (6 directions)
  FACE_DIAGONAL = 'face_diagonal', // Diagonals on cube faces (12 directions)  
  SPACE_DIAGONAL = 'space_diagonal' // True 3D diagonals (8 directions)
}

// Weights for different direction types (AI strategic advantage)
const DIRECTION_WEIGHTS = {
  [DirectionType.MAIN_AXIS]: 1.0,      // Easy for humans to see
  [DirectionType.FACE_DIAGONAL]: 0.8,  // Moderately visible
  [DirectionType.SPACE_DIAGONAL]: 1.2  // Hard for humans to detect - AI advantage
};

// Pattern scoring values - 오목 룰에 맞게 조정
const PATTERN_SCORES = {
  WIN: 1000000,           // Five in a row (game over)
  FOUR_OPEN: 50000,       // Four in a row with open ends - 매우 위험!
  FOUR_BLOCKED: 5000,     // Four in a row with one blocked end
  THREE_OPEN: 2000,       // Three in a row with open ends - 위험!
  THREE_BLOCKED: 200,     // Three in a row with one blocked end
  TWO_OPEN: 100,          // Two in a row with open ends - 주의!
  TWO_BLOCKED: 10,        // Two in a row with one blocked end
  ONE: 1                  // Single stone
};

// Classify direction type based on direction vector
function classifyDirection(dx: number, dy: number, dz: number): DirectionType {
  const nonZeroCount = [dx, dy, dz].filter(d => d !== 0).length;
  
  if (nonZeroCount === 1) {
    return DirectionType.MAIN_AXIS;
  } else if (nonZeroCount === 2) {
    return DirectionType.FACE_DIAGONAL;
  } else {
    return DirectionType.SPACE_DIAGONAL;
  }
}

// Check if a position is within board bounds
function isInBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && z >= 0 && z < BOARD_SIZE;
}

// Analyze a line pattern and return its score
function analyzePattern(
  board: BoardState3D,
  startX: number,
  startY: number,
  startZ: number,
  dx: number,
  dy: number,
  dz: number,
  player: Player
): number {
  let consecutiveCount = 0;
  let openEnds = 0;
  let x = startX;
  let y = startY;
  let z = startZ;
  
  // Count consecutive stones in positive direction
  while (isInBounds(x, y, z) && board[z][y][x] === player) {
    consecutiveCount++;
    x += dx;
    y += dy;
    z += dz;
  }
  
  // Check if positive end is open (empty space)
  if (isInBounds(x, y, z) && board[z][y][x] === 0) {
    openEnds++;
  }
  
  // Count consecutive stones in negative direction
  x = startX - dx;
  y = startY - dy;
  z = startZ - dz;
  
  while (isInBounds(x, y, z) && board[z][y][x] === player) {
    consecutiveCount++;
    x -= dx;
    y -= dy;
    z -= dz;
  }
  
  // Check if negative end is open (empty space)
  if (isInBounds(x, y, z) && board[z][y][x] === 0) {
    openEnds++;
  }
  
  // Return score based on pattern
  if (consecutiveCount >= WIN_COUNT) {
    return PATTERN_SCORES.WIN;
  } else if (consecutiveCount === 4) {
    return openEnds >= 1 ? PATTERN_SCORES.FOUR_OPEN : PATTERN_SCORES.FOUR_BLOCKED;
  } else if (consecutiveCount === 3) {
    return openEnds >= 1 ? PATTERN_SCORES.THREE_OPEN : PATTERN_SCORES.THREE_BLOCKED;
  } else if (consecutiveCount === 2) {
    return openEnds >= 1 ? PATTERN_SCORES.TWO_OPEN : PATTERN_SCORES.TWO_BLOCKED;
  } else if (consecutiveCount === 1) {
    return PATTERN_SCORES.ONE;
  }
  
  return 0;
}

// Evaluate all patterns for a specific player
function evaluatePlayerPatterns(board: BoardState3D, player: Player): number {
  let totalScore = 0;
  const analyzedPositions = new Set<string>();
  
  // Check all positions on the board
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === player) {
          // Check all directions from this stone
          for (const [dx, dy, dz] of directions) {
            const positionKey = `${x},${y},${z},${dx},${dy},${dz}`;
            
            // Avoid double-counting the same line
            if (!analyzedPositions.has(positionKey)) {
              const oppositeKey = `${x},${y},${z},${-dx},${-dy},${-dz}`;
              analyzedPositions.add(positionKey);
              analyzedPositions.add(oppositeKey);
              
              const patternScore = analyzePattern(board, x, y, z, dx, dy, dz, player);
              const directionType = classifyDirection(dx, dy, dz);
              const weightedScore = patternScore * DIRECTION_WEIGHTS[directionType];
              
              totalScore += weightedScore;
            }
          }
        }
      }
    }
  }
  
  return totalScore;
}

// 직접적인 위협 감지 - 상대방의 연속된 돌을 차단해야 하는 위치 찾기
function findCriticalBlockingMoves(board: BoardState3D, opponent: Player): Array<{x: number, y: number, z: number, threat: number}> {
  const criticalMoves: Array<{x: number, y: number, z: number, threat: number}> = [];
  
  // 모든 빈 위치 검사
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === 0) {
          let maxThreat = 0;
          
          // 모든 방향에서 이 위치를 막지 않으면 상대방이 얼마나 연결되는지 확인
          for (const [dx, dy, dz] of directions) {
            const consecutiveCount = countConsecutiveInDirection(board, x, y, z, dx, dy, dz, opponent);
            
            if (consecutiveCount >= 2) { // 2개 이상 연결되면 위험
              const directionType = classifyDirection(dx, dy, dz);
              const weight = DIRECTION_WEIGHTS[directionType];
              const threat = consecutiveCount * 1000 * weight; // 연결 수에 비례한 위험도
              maxThreat = Math.max(maxThreat, threat);
            }
          }
          
          if (maxThreat > 0) {
            criticalMoves.push({x, y, z, threat: maxThreat});
          }
        }
      }
    }
  }
  
  return criticalMoves.sort((a, b) => b.threat - a.threat); // 위험도 높은 순 정렬
}

// 특정 방향에서 연속된 돌 개수 세기 (양방향)
function countConsecutiveInDirection(board: BoardState3D, x: number, y: number, z: number, dx: number, dy: number, dz: number, player: Player): number {
  let count = 0;
  
  // 한쪽 방향
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
  
  // 반대 방향
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

// 개선된 위협 평가 함수
function evaluateThreats(board: BoardState3D, player: Player, opponent: Player): number {
  let threatScore = 0;
  
  // 1. 즉시 차단해야 하는 중요한 위치들 찾기
  const criticalMoves = findCriticalBlockingMoves(board, opponent);
  
  for (const move of criticalMoves) {
    if (move.threat >= 4000) { // 4연속 이상 - 즉시 패배!
      threatScore -= PATTERN_SCORES.WIN; // 최대 페널티
    } else if (move.threat >= 3000) { // 3연속 - 매우 위험
      threatScore -= PATTERN_SCORES.FOUR_OPEN; // 4목 수준의 위험
    } else if (move.threat >= 2000) { // 2연속 - 주의
      threatScore -= PATTERN_SCORES.THREE_OPEN;
    }
  }
  
  // 2. 기존 위협 평가도 유지 (추가 체크)
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === 0) {
          // 상대방 돌을 임시로 놓았을 때 승리하는지 확인
          board[z][y][x] = opponent;
          
          for (const [dx, dy, dz] of directions) {
            const consecutiveCount = countConsecutiveInDirection(board, x, y, z, dx, dy, dz, opponent) + 1; // +1은 현재 놓은 돌
            
            if (consecutiveCount >= 5) {
              threatScore -= PATTERN_SCORES.WIN; // 즉시 패배 방지
            } else if (consecutiveCount >= 4) {
              threatScore -= PATTERN_SCORES.FOUR_OPEN * 1.5; // 4목 방지
            }
          }
          
          board[z][y][x] = 0; // 원복
        }
      }
    }
  }
  
  return threatScore;
}

// Positional bonus for center positions (more strategic value)
function evaluatePositionalBonus(board: BoardState3D, player: Player): number {
  let positionScore = 0;
  const center = (BOARD_SIZE - 1) / 2;
  
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === player) {
          // Distance from center (lower is better)
          const distanceFromCenter = Math.sqrt(
            Math.pow(x - center, 2) + 
            Math.pow(y - center, 2) + 
            Math.pow(z - center, 2)
          );
          
          // Bonus decreases with distance from center
          const centerBonus = Math.max(0, 10 - distanceFromCenter * 2);
          positionScore += centerBonus;
        }
      }
    }
  }
  
  return positionScore;
}

/**
 * 상대방 연결 차단 보너스 - 오목에서 중요한 방어 요소
 */
function evaluateBlockingBonus(board: BoardState3D, player: Player): number {
  const opponent = player === 1 ? 2 : 1;
  let blockingScore = 0;
  
  // 상대방의 연결된 돌 찾기
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === opponent) {
          // 이 돌 주변의 빈 자리가 얼마나 중요한지 평가
          for (const [dx, dy, dz] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const nz = z + dz;
            
            if (isInBounds(nx, ny, nz) && board[nz][ny][nx] === 0) {
              // 빈 자리에 AI가 돌을 놓으면 상대방의 연결을 얼마나 차단하는지 계산
              board[nz][ny][nx] = player;
              
              // 상대방의 이 방향 연결이 차단되는 정도
              const consecutiveOpponent = countConsecutiveStones(board, x, y, z, dx, dy, dz, opponent) +
                                        countConsecutiveStones(board, x - dx, y - dy, z - dz, -dx, -dy, -dz, opponent) - 1;
              
              if (consecutiveOpponent >= 2) {
                const directionType = classifyDirection(dx, dy, dz);
                blockingScore += (consecutiveOpponent * 50) * DIRECTION_WEIGHTS[directionType];
              }
              
              board[nz][ny][nx] = 0; // 원래대로 복구
            }
          }
        }
      }
    }
  }
  
  return blockingScore;
}

/**
 * Main heuristic evaluation function - 오목 룰에 최적화
 * Returns a score indicating how good the position is for the given player
 * Positive scores favor the player, negative scores favor the opponent
 */
export function evaluatePosition(board: BoardState3D, player: Player): number {
  const opponent = player === 1 ? 2 : 1;
  
  // 1. 자신의 패턴 점수
  const playerScore = evaluatePlayerPatterns(board, player);
  
  // 2. 상대방의 패턴 점수 (차감)
  const opponentScore = evaluatePlayerPatterns(board, opponent);
  
  // 3. 위협 평가 (상대방이 이기기 직전인지)
  const threatScore = evaluateThreats(board, player, opponent);
  
  // 4. 방어 보너스 (상대방 연결 차단)
  const blockingBonus = evaluateBlockingBonus(board, player);
  
  // 5. 위치 보너스 (중앙 선호)
  const playerPositionBonus = evaluatePositionalBonus(board, player);
  const opponentPositionBonus = evaluatePositionalBonus(board, opponent);
  
  // 점수 조합 - 위협 차단을 최우선으로
  const totalScore = playerScore - opponentScore * 1.1 + // 상대방 점수를 더 중요하게
                    threatScore * 2.0 +                   // 위협은 매우 중요
                    blockingBonus * 1.5 +                 // 방어도 중요
                    (playerPositionBonus - opponentPositionBonus) * 0.1;
  
  return Math.round(totalScore);
}

/**
 * Quick evaluation for move ordering (faster, less accurate)
 * Used to order moves for alpha-beta pruning efficiency
 */
export function quickEvaluateMove(
  board: BoardState3D, 
  x: number, 
  y: number, 
  z: number, 
  player: Player
): number {
  let score = 0;
  const center = (BOARD_SIZE - 1) / 2;
  
  // Center position bonus
  const distanceFromCenter = Math.sqrt(
    Math.pow(x - center, 2) + 
    Math.pow(y - center, 2) + 
    Math.pow(z - center, 2)
  );
  score += Math.max(0, 20 - distanceFromCenter * 3);
  
  // Proximity to existing stones bonus
  let proximityBonus = 0;
  for (const [dx, dy, dz] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    const nz = z + dz;
    
    if (isInBounds(nx, ny, nz) && board[nz][ny][nx] !== 0) {
      proximityBonus += 5;
    }
  }
  score += Math.min(proximityBonus, 30); // Cap proximity bonus
  
  return score;
}
