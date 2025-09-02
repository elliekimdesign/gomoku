import { BoardState3D, Player } from '../components/Gomoku3DBoard';
import { evaluatePosition } from './heuristic';
import { generateOrderedMoves, generateLocalMoves, KillerMoveTable, applyKillerMoveOrdering, Move } from './moveGeneration';

const BOARD_SIZE = 8;
const WIN_COUNT = 5;

// Check if the game is over (someone won)
function checkGameOver(board: BoardState3D): Player {
  // Reuse the existing win checking logic
  const directions = [
    [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [-1, 0, 0], [0, -1, 0], [0, 0, -1],
    [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
    [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
    [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
  ];

  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const player = board[z][y][x];
        if (player === 0) continue;
        
        for (const [dx, dy, dz] of directions) {
          let count = 1;
          let nx = x + dx;
          let ny = y + dy;
          let nz = z + dz;
          
          while (
            nx >= 0 && nx < BOARD_SIZE &&
            ny >= 0 && ny < BOARD_SIZE &&
            nz >= 0 && nz < BOARD_SIZE &&
            board[nz][ny][nx] === player
          ) {
            count++;
            if (count === WIN_COUNT) return player;
            nx += dx;
            ny += dy;
            nz += dz;
          }
        }
      }
    }
  }
  
  return 0;
}

// Make a move on the board (returns new board)
function makeMove(board: BoardState3D, x: number, y: number, z: number, player: Player): BoardState3D {
  const newBoard = board.map(plane => plane.map(row => [...row]));
  newBoard[z][y][x] = player;
  return newBoard;
}

// Count stones on board for game phase detection
function countStones(board: BoardState3D): number {
  let count = 0;
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] !== 0) count++;
      }
    }
  }
  return count;
}

export interface MinimaxResult {
  move: Move | null;
  score: number;
  nodesEvaluated: number;
  timeElapsed: number;
  depthReached: number;
}

export class MinimaxAI {
  private killerTable: KillerMoveTable;
  private nodesEvaluated: number = 0;
  private startTime: number = 0;
  private maxTime: number = 400; // 400ms max thinking time
  private timeUp: boolean = false;

  constructor() {
    this.killerTable = new KillerMoveTable();
  }

  /**
   * Find the best move using minimax with alpha-beta pruning
   * @param board Current board state
   * @param aiPlayer AI player (1 or 2)
   * @param maxDepth Maximum search depth
   * @param timeLimit Time limit in milliseconds
   * @returns Best move and evaluation details
   */
  findBestMove(
    board: BoardState3D, 
    aiPlayer: Player, 
    maxDepth: number = 4, 
    timeLimit: number = 400
  ): MinimaxResult {
    this.startTime = Date.now();
    this.maxTime = timeLimit;
    this.timeUp = false;
    this.nodesEvaluated = 0;
    this.killerTable.clear();

    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    let depthReached = 0;

    // Iterative deepening - start shallow and go deeper
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (this.timeUp) break;

      const result = this.minimax(
        board,
        depth,
        -Infinity,
        Infinity,
        true, // AI is maximizing player
        aiPlayer,
        0
      );

      if (!this.timeUp && result.move) {
        bestMove = result.move;
        bestScore = result.score;
        depthReached = depth;
      }

      // If we found a winning move, no need to search deeper
      if (result.score >= 900000) break;
    }

    // Fallback: if no move found, pick first legal move
    if (!bestMove) {
      const moves = generateOrderedMoves(board, aiPlayer, 10);
      if (moves.length > 0) {
        bestMove = moves[0];
      }
    }

    return {
      move: bestMove,
      score: bestScore,
      nodesEvaluated: this.nodesEvaluated,
      timeElapsed: Date.now() - this.startTime,
      depthReached
    };
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(
    board: BoardState3D,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    aiPlayer: Player,
    currentDepth: number
  ): { move: Move | null; score: number } {
    // Check time limit
    if (Date.now() - this.startTime > this.maxTime) {
      this.timeUp = true;
      return { move: null, score: 0 };
    }

    this.nodesEvaluated++;

    // Check for terminal states
    const winner = checkGameOver(board);
    if (winner !== 0) {
      if (winner === aiPlayer) {
        return { move: null, score: 1000000 - currentDepth }; // Prefer faster wins
      } else {
        return { move: null, score: -1000000 + currentDepth }; // Delay losses
      }
    }

    // Depth limit reached - evaluate position
    if (depth === 0) {
      const score = evaluatePosition(board, aiPlayer);
      return { move: null, score };
    }

    const currentPlayer = maximizingPlayer ? aiPlayer : (aiPlayer === 1 ? 2 : 1);
    let moves = this.generateMovesForDepth(board, currentPlayer, depth, currentDepth);

    // Apply killer move ordering
    const killerMoves = this.killerTable.getKillerMoves(currentDepth);
    moves = applyKillerMoveOrdering(moves, killerMoves);

    let bestMove: Move | null = null;

    if (maximizingPlayer) {
      let maxScore = -Infinity;

      for (const move of moves) {
        if (this.timeUp) break;

        const newBoard = makeMove(board, move.x, move.y, move.z, currentPlayer);
        const result = this.minimax(
          newBoard,
          depth - 1,
          alpha,
          beta,
          false,
          aiPlayer,
          currentDepth + 1
        );

        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, result.score);

        // Alpha-beta cutoff
        if (beta <= alpha) {
          this.killerTable.storeKillerMove(currentDepth, move);
          break;
        }
      }

      return { move: bestMove, score: maxScore };
    } else {
      let minScore = Infinity;

      for (const move of moves) {
        if (this.timeUp) break;

        const newBoard = makeMove(board, move.x, move.y, move.z, currentPlayer);
        const result = this.minimax(
          newBoard,
          depth - 1,
          alpha,
          beta,
          true,
          aiPlayer,
          currentDepth + 1
        );

        if (result.score < minScore) {
          minScore = result.score;
          bestMove = move;
        }

        beta = Math.min(beta, result.score);

        // Alpha-beta cutoff
        if (beta <= alpha) {
          this.killerTable.storeKillerMove(currentDepth, move);
          break;
        }
      }

      return { move: bestMove, score: minScore };
    }
  }

  /**
   * Generate moves based on game phase and search depth
   */
  private generateMovesForDepth(
    board: BoardState3D, 
    player: Player, 
    depth: number, 
    currentDepth: number
  ): Move[] {
    const stoneCount = countStones(board);

    // Early game: consider more moves
    if (stoneCount <= 6) {
      return generateOrderedMoves(board, player, 40);
    }

    // Mid game: focus on local area with some global moves
    if (stoneCount <= 20) {
      const localMoves = generateLocalMoves(board, player, 2);
      const globalMoves = generateOrderedMoves(board, player, 20);
      
      // Combine and deduplicate
      const moveSet = new Set<string>();
      const combinedMoves: Move[] = [];
      
      for (const move of [...localMoves, ...globalMoves]) {
        const key = `${move.x},${move.y},${move.z}`;
        if (!moveSet.has(key)) {
          moveSet.add(key);
          combinedMoves.push(move);
        }
      }
      
      return combinedMoves.slice(0, 30);
    }

    // Late game: focus on local area only
    const localMoves = generateLocalMoves(board, player, 1);
    return localMoves.length > 0 ? localMoves : generateOrderedMoves(board, player, 15);
  }

  /**
   * Set maximum thinking time
   */
  setTimeLimit(timeMs: number): void {
    this.maxTime = timeMs;
  }

  /**
   * Get search statistics
   */
  getStats(): { nodesEvaluated: number } {
    return { nodesEvaluated: this.nodesEvaluated };
  }
}
