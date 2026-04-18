import React, { useState, useCallback, useMemo } from 'react';
import { SparseBoard2D, isLegalMove2D, getStone, getBounds, getWinningLine } from '../game2d/gameLogic';
import { Player } from './Gomoku3DBoard';
import './Gomoku2DBoard.css';

interface Props {
  board: SparseBoard2D;
  onPlaceStone: (x: number, y: number) => void;
  currentPlayer: Player;
  winner: Player;
  isAiThinking: boolean;
  lastMove: { x: number; y: number } | null;
  humanPlayer: Player;
  aiPlayer: Player;
}

const HumanAvatar: React.FC<{ active: boolean; stoneColor: Player }> = ({ active, stoneColor }) => (
  <div className={`avatar-wrap ${active ? 'avatar-active' : 'avatar-inactive'}`}>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Head */}
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Eyes */}
      <circle cx="19" cy="21" r="2" fill="currentColor" opacity="0.4"/>
      <circle cx="29" cy="21" r="2" fill="currentColor" opacity="0.4"/>
      {/* Smile */}
      <path d="M18 28 Q24 33 30 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
    </svg>
    <div className="avatar-stone">
      <div className={`avatar-stone-dot ${stoneColor === 1 ? 'stone-black' : 'stone-white'}`} />
    </div>
    <div className="avatar-label">You</div>
  </div>
);

const AiAvatar: React.FC<{ active: boolean; stoneColor: Player }> = ({ active, stoneColor }) => (
  <div className={`avatar-wrap ${active ? 'avatar-active' : 'avatar-inactive'}`}>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Head — rounded rect */}
      <rect x="12" y="6" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Eyes — small squares */}
      <rect x="18" y="12" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <rect x="26" y="12" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      {/* Mouth — line */}
      <line x1="20" y1="21" x2="28" y2="21" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      {/* Antenna */}
      <line x1="24" y1="6" x2="24" y2="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <circle cx="24" cy="2" r="1.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
      {/* Body */}
      <rect x="16" y="28" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Body detail lines */}
      <line x1="16" y1="33" x2="32" y2="33" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      {/* Arms */}
      <line x1="12" y1="32" x2="16" y2="32" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      <line x1="32" y1="32" x2="36" y2="32" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      {/* Legs */}
      <line x1="20" y1="40" x2="20" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      <line x1="28" y1="40" x2="28" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
    </svg>
    <div className="avatar-stone">
      <div className={`avatar-stone-dot ${stoneColor === 1 ? 'stone-black' : 'stone-white'}`} />
    </div>
    <div className="avatar-label">AI</div>
  </div>
);

export const Gomoku2DBoard: React.FC<Props> = ({
  board,
  onPlaceStone,
  currentPlayer,
  winner,
  isAiThinking,
  lastMove,
  humanPlayer,
  aiPlayer,
}) => {
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

  const CELL = 38;
  const PADDING = 28;
  const STONE_R = 16;

  const bounds = useMemo(() => getBounds(board), [board]);
  const { minX, maxX, minY, maxY, width, height } = bounds;

  const boardPxW = (width - 1) * CELL;
  const boardPxH = (height - 1) * CELL;
  const totalPxW = boardPxW + PADDING * 2;
  const totalPxH = boardPxH + PADDING * 2;

  const handleClick = useCallback(
    (x: number, y: number) => {
      if (winner || isAiThinking) return;
      if (!isLegalMove2D(board, x, y, currentPlayer)) return;
      onPlaceStone(x, y);
    },
    [board, currentPlayer, winner, isAiThinking, onPlaceStone]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left - PADDING;
      const my = e.clientY - rect.top - PADDING;
      const gx = Math.round(mx / CELL) + minX;
      const gy = Math.round(my / CELL) + minY;
      if (gx >= minX && gx <= maxX && gy >= minY && gy <= maxY && getStone(board, gx, gy) === 0) {
        setHovered({ x: gx, y: gy });
      } else {
        setHovered(null);
      }
    },
    [board, minX, minY, maxX, maxY]
  );

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  // Grid lines
  const gridLines = [];
  for (let i = 0; i < width; i++) {
    gridLines.push(
      <line
        key={`h${i}`}
        x1={PADDING}
        y1={PADDING + i * CELL}
        x2={PADDING + boardPxW}
        y2={PADDING + i * CELL}
        stroke="#1a1a1a"
        strokeWidth={1}
      />
    );
  }
  for (let i = 0; i < width; i++) {
    gridLines.push(
      <line
        key={`v${i}`}
        x1={PADDING + i * CELL}
        y1={PADDING}
        x2={PADDING + i * CELL}
        y2={PADDING + boardPxH}
        stroke="#1a1a1a"
        strokeWidth={1}
      />
    );
  }


  // Stones
  const stones: React.ReactNode[] = [];
  const stoneKeys = Array.from(board.stones.keys());
  for (let i = 0; i < stoneKeys.length; i++) {
    const key = stoneKeys[i];
    const parts = key.split(',');
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const p = board.stones.get(key) as Player;
    if (p === 0) continue;

    const cx = PADDING + (x - minX) * CELL;
    const cy = PADDING + (y - minY) * CELL;
    const isLast = lastMove && lastMove.x === x && lastMove.y === y;

    stones.push(
      <g key={`s${x}-${y}`}>
        {/* Offset shadow — pop art style */}
        <circle cx={cx + 2} cy={cy + 2} r={STONE_R} fill="#1a1a1a" />
        {/* Stone body */}
        <circle
          cx={cx} cy={cy} r={STONE_R}
          fill={p === 1 ? '#1a1a1a' : '#fffef5'}
          stroke="#1a1a1a" strokeWidth={2}
        />
        {/* Highlight dot — Lichtenstein style */}
        <circle cx={cx - 4} cy={cy - 4} r={3.5}
          fill={p === 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)'}
        />
        {/* Last move marker */}
        {isLast && <circle cx={cx} cy={cy} r={4} fill="#ff3b5c" />}
      </g>
    );
  }

  // Ghost stone
  const ghost =
    hovered && !winner && !isAiThinking && getStone(board, hovered.x, hovered.y) === 0 ? (
      <circle
        cx={PADDING + (hovered.x - minX) * CELL}
        cy={PADDING + (hovered.y - minY) * CELL}
        r={STONE_R}
        fill={currentPlayer === 1 ? 'rgba(26,26,26,0.2)' : 'rgba(255,254,245,0.5)'}
        stroke="#1a1a1a" strokeWidth={1.5} strokeDasharray="4 3"
        pointerEvents="none"
      />
    ) : null;

  // Click targets
  const clickTargets: React.ReactNode[] = [];
  for (let gy = minY; gy <= maxY; gy++) {
    for (let gx = minX; gx <= maxX; gx++) {
      const px = PADDING + (gx - minX) * CELL;
      const py = PADDING + (gy - minY) * CELL;
      clickTargets.push(
        <rect
          key={`t${gx}-${gy}`}
          x={px - CELL / 2} y={py - CELL / 2}
          width={CELL} height={CELL}
          fill="transparent"
          style={{ cursor: getStone(board, gx, gy) === 0 && !winner && !isAiThinking ? 'pointer' : 'default' }}
          onClick={() => handleClick(gx, gy)}
        />
      );
    }
  }

  const isHumanTurn = currentPlayer === humanPlayer && !winner;
  const isAiTurn = currentPlayer === aiPlayer && !winner;

  return (
    <div className="board-2d-container">
      <svg
        width={totalPxW}
        height={totalPxH}
        viewBox={`0 0 ${totalPxW} ${totalPxH}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="board-2d-svg"
      >
        {/* Board surface */}
        <rect x="0" y="0" width={totalPxW} height={totalPxH} rx="0" fill="#f0f0f0" />

        {/* Wavy border — clipped to board bounds */}
        <defs>
          <clipPath id="boardClip">
            <rect x="0" y="0" width={totalPxW} height={totalPxH} />
          </clipPath>
        </defs>
        {(() => {
          const a = 8;
          const w = 30;
          let topPath = `M 0 ${a}`;
          for (let x = 0; x < totalPxW; x += w) {
            topPath += ` Q ${x + w/4} ${-a}, ${x + w/2} ${a} Q ${x + w*3/4} ${a*3}, ${x + w} ${a}`;
          }
          let bottomPath = `M 0 ${totalPxH - a}`;
          for (let x = 0; x < totalPxW; x += w) {
            bottomPath += ` Q ${x + w/4} ${totalPxH + a}, ${x + w/2} ${totalPxH - a} Q ${x + w*3/4} ${totalPxH - a*3}, ${x + w} ${totalPxH - a}`;
          }
          let leftPath = `M ${a} 0`;
          for (let y = 0; y < totalPxH; y += w) {
            leftPath += ` Q ${-a} ${y + w/4}, ${a} ${y + w/2} Q ${a*3} ${y + w*3/4}, ${a} ${y + w}`;
          }
          let rightPath = `M ${totalPxW - a} 0`;
          for (let y = 0; y < totalPxH; y += w) {
            rightPath += ` Q ${totalPxW + a} ${y + w/4}, ${totalPxW - a} ${y + w/2} Q ${totalPxW - a*3} ${y + w*3/4}, ${totalPxW - a} ${y + w}`;
          }
          return (
            <g clipPath="url(#boardClip)">
              <path d={topPath} fill="none" stroke="#1a1a1a" strokeWidth="3" />
              <path d={bottomPath} fill="none" stroke="#1a1a1a" strokeWidth="3" />
              <path d={leftPath} fill="none" stroke="#1a1a1a" strokeWidth="3" />
              <path d={rightPath} fill="none" stroke="#1a1a1a" strokeWidth="3" />
            </g>
          );
        })()}

        {/* Grid */}
        {gridLines}


        {/* Ghost */}
        {ghost}

        {/* Stones */}
        {stones}

        {/* Winning line highlight */}
        {winner !== 0 && (() => {
          const line = getWinningLine(board);
          if (!line) return null;
          return (
            <g>
              {/* Line connecting winning stones */}
              <line
                x1={PADDING + (line[0].x - minX) * CELL}
                y1={PADDING + (line[0].y - minY) * CELL}
                x2={PADDING + (line[line.length - 1].x - minX) * CELL}
                y2={PADDING + (line[line.length - 1].y - minY) * CELL}
                stroke="#ff3b5c"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.8}
              />
              {/* Rings around winning stones */}
              {line.map((pos, idx) => (
                <circle
                  key={`win${idx}`}
                  cx={PADDING + (pos.x - minX) * CELL}
                  cy={PADDING + (pos.y - minY) * CELL}
                  r={STONE_R + 4}
                  fill="none"
                  stroke="#ff3b5c"
                  strokeWidth={3}
                  opacity={0.9}
                />
              ))}
            </g>
          );
        })()}

        {/* Click targets */}
        {clickTargets}
      </svg>
    </div>
  );
};
