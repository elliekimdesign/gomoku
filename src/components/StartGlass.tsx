import React, { Suspense, useState } from 'react';
import { Player, Gomoku3DBoard, BoardState3D } from './Gomoku3DBoard';
import './StartGlass.css';

const BOARD_SIZE = 8;

function getEmptyBoard3D(): BoardState3D {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(0)
    )
  );
}

const createSampleBoard = () => {
  const board = getEmptyBoard3D();
  board[2][2][2] = 1;
  board[1][1][1] = 2;
  board[3][2][1] = 1;
  board[4][3][2] = 2;
  board[2][4][3] = 1;
  return board;
};

interface Props {
  onPlayerSelection: (humanPlayer: Player) => void;
}

export const StartGlass: React.FC<Props> = ({ onPlayerSelection }) => {
  const [sampleBoard] = useState(createSampleBoard());
  const [previewHovered, setPreviewHovered] = useState<[number, number, number] | null>(null);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([10, 10, 18]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([1, 1, 1]);

  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCameraPos(pos);
    setCameraTarget(target);
  };

  return (
    <div className="glass-root">
      <div className="glass-bg-cube">
        <Suspense fallback={null}>
          <Gomoku3DBoard
            board={sampleBoard}
            onPlaceStone={() => {}}
            onUndo={() => {}}
            currentPlayer={1}
            winner={0}
            hovered={previewHovered}
            setHovered={setPreviewHovered}
            cameraPos={cameraPos}
            cameraTarget={cameraTarget}
            onCameraChange={handleCameraChange}
            ghostStone={null}
            isAiThinking={false}
          />
        </Suspense>
      </div>

      <div className="glass-aurora glass-aurora-1" />
      <div className="glass-aurora glass-aurora-2" />
      <div className="glass-aurora glass-aurora-3" />

      <header className="glass-header">
        <div className="glass-logo">
          <span className="glass-logo-dot" />
          GOMOKU<span className="glass-logo-accent">/3D</span>
        </div>
        <div className="glass-status">
          <span className="glass-status-dot" />
          AI online · medium
        </div>
      </header>

      <main className="glass-main">
        <div className="glass-card">
          <div className="glass-tag">NEW · 3D EDITION</div>
          <h1 className="glass-title">
            Five in a row.
            <br />
            <span className="glass-title-accent">In every dimension.</span>
          </h1>
          <p className="glass-subtitle">
            Classic strategy, rebuilt for three axes. Outthink an AI that
            reads threats across 26 directions.
          </p>

          <div className="glass-divider" />

          <div className="glass-choose-row">
            <div className="glass-choose-label">SELECT COLOR</div>
          </div>

          <div className="glass-stones">
            <button className="glass-stone-btn" onClick={() => onPlayerSelection(1)}>
              <div className="glass-stone glass-stone-black" />
              <div className="glass-stone-info">
                <div className="glass-stone-name">Black</div>
                <div className="glass-stone-meta">First move · offensive</div>
              </div>
              <div className="glass-stone-arrow">→</div>
            </button>

            <button className="glass-stone-btn" onClick={() => onPlayerSelection(2)}>
              <div className="glass-stone glass-stone-white" />
              <div className="glass-stone-info">
                <div className="glass-stone-name">White</div>
                <div className="glass-stone-meta">Second move · defensive</div>
              </div>
              <div className="glass-stone-arrow">→</div>
            </button>
          </div>

          <div className="glass-stats">
            <div className="glass-stat">
              <div className="glass-stat-num">8³</div>
              <div className="glass-stat-label">grid cells</div>
            </div>
            <div className="glass-stat">
              <div className="glass-stat-num">26</div>
              <div className="glass-stat-label">directions</div>
            </div>
            <div className="glass-stat">
              <div className="glass-stat-num">5</div>
              <div className="glass-stat-label">to win</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
