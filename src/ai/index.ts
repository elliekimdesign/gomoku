import { BoardState3D, Player } from '../components/Gomoku3DBoard';
import { MinimaxAI, MinimaxResult } from './minimax';
import { evaluatePosition } from './heuristic';
import { generateOrderedMoves } from './moveGeneration';

export interface AIMove {
  x: number;
  y: number;
  z: number;
}

export interface AIResult {
  move: AIMove | null;
  confidence: number; // 0-100, how confident the AI is in this move
  evaluation: number; // Position evaluation score
  searchDepth: number;
  nodesEvaluated: number;
  thinkingTime: number;
}

/**
 * Main AI class for 3D Gomoku
 * Provides a clean interface for the game to interact with AI
 */
export class GomokuAI {
  private minimax: MinimaxAI;
  private difficulty: 'easy' | 'medium' | 'hard';

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.minimax = new MinimaxAI();
    this.difficulty = difficulty;
  }

  /**
   * Get the best move for the AI player
   * @param board Current board state
   * @param aiPlayer AI player (1 or 2)
   * @returns AI move result with metadata
   */
  async getBestMove(board: BoardState3D, aiPlayer: Player): Promise<AIResult> {
    const startTime = Date.now();

    // Determine search parameters based on difficulty
    const { maxDepth, timeLimit } = this.getDifficultySettings();

    // Use minimax to find the best move
    const result: MinimaxResult = this.minimax.findBestMove(
      board,
      aiPlayer,
      maxDepth,
      timeLimit
    );

    const thinkingTime = Date.now() - startTime;

    // Calculate confidence based on evaluation and search depth
    const confidence = this.calculateConfidence(result);

    return {
      move: result.move ? {
        x: result.move.x,
        y: result.move.y,
        z: result.move.z
      } : null,
      confidence,
      evaluation: result.score,
      searchDepth: result.depthReached,
      nodesEvaluated: result.nodesEvaluated,
      thinkingTime
    };
  }

  /**
   * Get a quick evaluation of the current position
   * @param board Current board state
   * @param player Player to evaluate for
   * @returns Position evaluation score
   */
  evaluatePosition(board: BoardState3D, player: Player): number {
    return evaluatePosition(board, player);
  }

  /**
   * Get suggested moves (for hints or analysis)
   * @param board Current board state
   * @param player Player to get suggestions for
   * @param count Number of suggestions to return
   * @returns Array of suggested moves with scores
   */
  getSuggestedMoves(
    board: BoardState3D, 
    player: Player, 
    count: number = 5
  ): Array<{ move: AIMove; score: number }> {
    const moves = generateOrderedMoves(board, player, count * 2);
    const suggestions: Array<{ move: AIMove; score: number }> = [];

    for (const move of moves.slice(0, count)) {
      // Make the move temporarily to evaluate it
      const newBoard = board.map(plane => plane.map(row => [...row]));
      newBoard[move.z][move.y][move.x] = player;
      
      const score = evaluatePosition(newBoard, player);
      suggestions.push({
        move: { x: move.x, y: move.y, z: move.z },
        score
      });
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Set AI difficulty level
   * @param difficulty New difficulty level
   */
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = difficulty;
  }

  /**
   * Get current difficulty level
   * @returns Current difficulty
   */
  getDifficulty(): 'easy' | 'medium' | 'hard' {
    return this.difficulty;
  }

  /**
   * Get difficulty-specific search parameters
   */
  private getDifficultySettings(): { maxDepth: number; timeLimit: number } {
    switch (this.difficulty) {
      case 'easy':
        return { maxDepth: 2, timeLimit: 200 }; // Shallow search, quick moves
      case 'medium':
        return { maxDepth: 4, timeLimit: 400 }; // Balanced search
      case 'hard':
        return { maxDepth: 6, timeLimit: 600 }; // Deep search, longer thinking
      default:
        return { maxDepth: 4, timeLimit: 400 };
    }
  }

  /**
   * Calculate confidence level based on search results
   */
  private calculateConfidence(result: MinimaxResult): number {
    let confidence = 50; // Base confidence

    // Higher confidence for deeper searches
    confidence += result.depthReached * 8;

    // Higher confidence for more nodes evaluated
    confidence += Math.min(result.nodesEvaluated / 1000, 20);

    // Adjust based on evaluation score
    const absScore = Math.abs(result.score);
    if (absScore > 100000) {
      confidence += 30; // Very confident about winning/losing moves
    } else if (absScore > 10000) {
      confidence += 20; // Confident about strong tactical moves
    } else if (absScore > 1000) {
      confidence += 10; // Somewhat confident
    }

    // Cap confidence at 100
    return Math.min(confidence, 100);
  }

  /**
   * Check if a position is likely winning for the AI
   * @param board Current board state
   * @param aiPlayer AI player
   * @returns True if position looks winning for AI
   */
  isWinningPosition(board: BoardState3D, aiPlayer: Player): boolean {
    const evaluation = evaluatePosition(board, aiPlayer);
    return evaluation > 50000; // Strong advantage threshold
  }

  /**
   * Check if AI is in danger (opponent about to win)
   * @param board Current board state
   * @param aiPlayer AI player
   * @returns True if AI is in immediate danger
   */
  isInDanger(board: BoardState3D, aiPlayer: Player): boolean {
    const evaluation = evaluatePosition(board, aiPlayer);
    return evaluation < -50000; // Strong disadvantage threshold
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): { averageNodesPerSecond: number } {
    const stats = this.minimax.getStats();
    return {
      averageNodesPerSecond: stats.nodesEvaluated // Simplified for now
    };
  }
}

// Export a default AI instance
export const defaultAI = new GomokuAI('medium');
