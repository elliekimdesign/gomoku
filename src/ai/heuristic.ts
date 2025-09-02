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

// Pattern scoring values
const PATTERN_SCORES = {
  WIN: 1000000,           // Five in a row (game over)
  FOUR_OPEN: 10000,       // Four in a row with open ends
  FOUR_BLOCKED: 1000,     // Four in a row with one blocked end
  THREE_OPEN: 500,        // Three in a row with open ends
  THREE_BLOCKED: 50,      // Three in a row with one blocked end
  TWO_OPEN: 50,           // Two in a row with open ends
  TWO_BLOCKED: 5,         // Two in a row with one blocked end
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

// Check for immediate threats (opponent about to win)
function evaluateThreats(board: BoardState3D, player: Player, opponent: Player): number {
  let threatScore = 0;
  
  // Check all empty positions for potential opponent wins
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === 0) {
          // Temporarily place opponent stone
          board[z][y][x] = opponent;
          
          // Check if this creates a winning pattern
          for (const [dx, dy, dz] of directions) {
            const consecutiveCount = countConsecutiveStones(board, x, y, z, dx, dy, dz, opponent) +
                                   countConsecutiveStones(board, x - dx, y - dy, z - dz, -dx, -dy, -dz, opponent) - 1;
            
            if (consecutiveCount >= WIN_COUNT) {
              const directionType = classifyDirection(dx, dy, dz);
              threatScore -= PATTERN_SCORES.WIN * DIRECTION_WEIGHTS[directionType] * 0.9; // Slightly less than winning
              break; // One threat per position is enough
            } else if (consecutiveCount === 4) {
              const directionType = classifyDirection(dx, dy, dz);
              threatScore -= PATTERN_SCORES.FOUR_OPEN * DIRECTION_WEIGHTS[directionType] * 0.8;
            }
          }
          
          // Remove temporary stone
          board[z][y][x] = 0;
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
 * Main heuristic evaluation function
 * Returns a score indicating how good the position is for the given player
 * Positive scores favor the player, negative scores favor the opponent
 */
export function evaluatePosition(board: BoardState3D, player: Player): number {
  const opponent = player === 1 ? 2 : 1;
  
  // Evaluate patterns for both players
  const playerScore = evaluatePlayerPatterns(board, player);
  const opponentScore = evaluatePlayerPatterns(board, opponent);
  
  // Evaluate threats (opponent about to win)
  const threatScore = evaluateThreats(board, player, opponent);
  
  // Positional bonuses
  const playerPositionBonus = evaluatePositionalBonus(board, player);
  const opponentPositionBonus = evaluatePositionalBonus(board, opponent);
  
  // Combine all factors
  const totalScore = playerScore - opponentScore + threatScore + 
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
