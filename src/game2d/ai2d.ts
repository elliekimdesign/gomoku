import { SparseBoard2D, Player, WIN_COUNT, getBounds } from './gameLogic';

type DenseBoard = Player[][];

const DIRECTIONS: [number, number][] = [
  [1, 0], [0, 1], [1, 1], [1, -1],
];

interface Move2D {
  x: number;
  y: number;
}

export interface AI2DResult {
  move: Move2D | null;
  evaluation: number;
  thinkingTime: number;
}

// Count consecutive stones + open ends on dense board
function lineInfo(
  board: DenseBoard, x: number, y: number, dx: number, dy: number, player: Player, w: number, h: number
): { count: number; openEnds: number } {
  let count = 1;
  let openEnds = 0;

  let nx = x + dx, ny = y + dy;
  while (nx >= 0 && nx < w && ny >= 0 && ny < h && board[ny][nx] === player) {
    count++;
    nx += dx;
    ny += dy;
  }
  if (nx >= 0 && nx < w && ny >= 0 && ny < h && board[ny][nx] === 0) {
    openEnds++;
  }

  nx = x - dx;
  ny = y - dy;
  while (nx >= 0 && nx < w && ny >= 0 && ny < h && board[ny][nx] === player) {
    count++;
    nx -= dx;
    ny -= dy;
  }
  if (nx >= 0 && nx < w && ny >= 0 && ny < h && board[ny][nx] === 0) {
    openEnds++;
  }

  return { count, openEnds };
}

function scoreLine(count: number, openEnds: number): number {
  if (count >= WIN_COUNT) return 1000000;
  if (openEnds === 0) return 0;
  if (count === 4) return openEnds === 2 ? 100000 : 10000;
  if (count === 3) return openEnds === 2 ? 5000 : 500;
  if (count === 2) return openEnds === 2 ? 200 : 20;
  if (count === 1) return openEnds === 2 ? 10 : 1;
  return 0;
}

function evaluateBoard(board: DenseBoard, player: Player, w: number, h: number): number {
  let score = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (board[y][x] === 0) continue;
      const isOwn = board[y][x] === player;
      for (const [dx, dy] of DIRECTIONS) {
        const info = lineInfo(board, x, y, dx, dy, board[y][x], w, h);
        const ls = scoreLine(info.count, info.openEnds);
        score += isOwn ? ls : -ls * 1.1;
      }
    }
  }
  return score;
}

function generateMoves(board: DenseBoard, player: Player, w: number, h: number, maxMoves: number = 20): Move2D[] {
  const candidates: { x: number; y: number; score: number }[] = [];
  const occupied: string[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (board[y][x] !== 0) occupied.push(`${x},${y}`);
    }
  }

  if (occupied.length === 0) {
    return [{ x: Math.floor(w / 2), y: Math.floor(h / 2) }];
  }

  const seen = new Set<string>();
  for (let oi = 0; oi < occupied.length; oi++) {
    const parts = occupied[oi].split(',');
    const ox = Number(parts[0]);
    const oy = Number(parts[1]);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = ox + dx;
        const ny = oy + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (board[ny][nx] !== 0) continue;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        seen.add(k);

        board[ny][nx] = player;
        let moveScore = 0;
        for (const [ddx, ddy] of DIRECTIONS) {
          const info = lineInfo(board, nx, ny, ddx, ddy, player, w, h);
          moveScore += scoreLine(info.count, info.openEnds);
        }
        const opp: Player = player === 1 ? 2 : 1;
        board[ny][nx] = opp;
        for (const [ddx, ddy] of DIRECTIONS) {
          const info = lineInfo(board, nx, ny, ddx, ddy, opp, w, h);
          moveScore += scoreLine(info.count, info.openEnds) * 0.9;
        }
        board[ny][nx] = 0;

        candidates.push({ x: nx, y: ny, score: moveScore });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxMoves).map(c => ({ x: c.x, y: c.y }));
}

function minimax(
  board: DenseBoard, depth: number, alpha: number, beta: number,
  isMaximizing: boolean, aiPlayer: Player, humanPlayer: Player, w: number, h: number
): number {
  if (depth === 0) return evaluateBoard(board, aiPlayer, w, h);

  const currentPlayer = isMaximizing ? aiPlayer : humanPlayer;
  const moves = generateMoves(board, currentPlayer, w, h, 15);
  if (moves.length === 0) return evaluateBoard(board, aiPlayer, w, h);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      board[move.y][move.x] = currentPlayer;
      let isWin = false;
      for (const [dx, dy] of DIRECTIONS) {
        const info = lineInfo(board, move.x, move.y, dx, dy, currentPlayer, w, h);
        if (info.count >= WIN_COUNT) { isWin = true; break; }
      }
      const eval_ = isWin ? 1000000 + depth : minimax(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer, w, h);
      board[move.y][move.x] = 0;
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      board[move.y][move.x] = currentPlayer;
      let isWin = false;
      for (const [dx, dy] of DIRECTIONS) {
        const info = lineInfo(board, move.x, move.y, dx, dy, currentPlayer, w, h);
        if (info.count >= WIN_COUNT) { isWin = true; break; }
      }
      const eval_ = isWin ? -(1000000 + depth) : minimax(board, depth - 1, alpha, beta, true, aiPlayer, humanPlayer, w, h);
      board[move.y][move.x] = 0;
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export class GomokuAI2D {
  private depth: number;

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    switch (difficulty) {
      case 'easy': this.depth = 2; break;
      case 'medium': this.depth = 4; break;
      case 'hard': this.depth = 6; break;
    }
  }

  async getBestMove(board: SparseBoard2D, aiPlayer: Player): Promise<AI2DResult> {
    const startTime = Date.now();
    const humanPlayer: Player = aiPlayer === 1 ? 2 : 1;

    // Convert sparse → dense for AI search
    const bounds = getBounds(board, 4);
    const { minX, minY, width: w, height: h } = bounds;
    const workBoard: DenseBoard = Array.from({ length: h }, () => Array(w).fill(0) as Player[]);

    const keys = Array.from(board.stones.keys());
    for (let i = 0; i < keys.length; i++) {
      const parts = keys[i].split(',');
      const gx = Number(parts[0]);
      const gy = Number(parts[1]);
      const p = board.stones.get(keys[i]) as Player;
      const lx = gx - minX;
      const ly = gy - minY;
      if (lx >= 0 && lx < w && ly >= 0 && ly < h) {
        workBoard[ly][lx] = p;
      }
    }

    // Check for immediate winning move
    const moves = generateMoves(workBoard, aiPlayer, w, h, 20);
    for (const move of moves) {
      workBoard[move.y][move.x] = aiPlayer;
      let isWin = false;
      for (const [dx, dy] of DIRECTIONS) {
        const info = lineInfo(workBoard, move.x, move.y, dx, dy, aiPlayer, w, h);
        if (info.count >= WIN_COUNT) { isWin = true; break; }
      }
      workBoard[move.y][move.x] = 0;
      if (isWin) {
        return { move: { x: move.x + minX, y: move.y + minY }, evaluation: 1000000, thinkingTime: Date.now() - startTime };
      }
    }

    // Check for immediate blocking move
    for (const move of moves) {
      workBoard[move.y][move.x] = humanPlayer;
      let isWin = false;
      for (const [dx, dy] of DIRECTIONS) {
        const info = lineInfo(workBoard, move.x, move.y, dx, dy, humanPlayer, w, h);
        if (info.count >= WIN_COUNT) { isWin = true; break; }
      }
      workBoard[move.y][move.x] = 0;
      if (isWin) {
        return { move: { x: move.x + minX, y: move.y + minY }, evaluation: -900000, thinkingTime: Date.now() - startTime };
      }
    }

    // Full minimax search
    let bestMove: Move2D | null = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      workBoard[move.y][move.x] = aiPlayer;
      const score = minimax(workBoard, this.depth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer, w, h);
      workBoard[move.y][move.x] = 0;

      if (score > bestScore) {
        bestScore = score;
        bestMove = { x: move.x + minX, y: move.y + minY };
      }
    }

    return {
      move: bestMove,
      evaluation: bestScore,
      thinkingTime: Date.now() - startTime,
    };
  }
}
