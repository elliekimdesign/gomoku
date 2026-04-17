import React, { Suspense, useState } from 'react';
import { Player, Gomoku3DBoard, BoardState3D } from './Gomoku3DBoard';
import './StartZen.css';

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
  return board;
};

interface Props {
  onPlayerSelection: (humanPlayer: Player) => void;
}

export const StartZen: React.FC<Props> = ({ onPlayerSelection }) => {
  const [sampleBoard] = useState(createSampleBoard());
  const [previewHovered, setPreviewHovered] = useState<[number, number, number] | null>(null);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([10, 10, 18]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([1, 1, 1]);

  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCameraPos(pos);
    setCameraTarget(target);
  };

  return (
    <div className="zen-root">
      <div className="zen-grain" />
      <div className="zen-sun" />

      <header className="zen-header">
        <div className="zen-brand">
          <div className="zen-brand-mark">○</div>
          <div className="zen-brand-text">GOMOKU · 三次元</div>
        </div>
        <nav className="zen-nav">
          <a href="#zen">About</a>
          <a href="#zen">Rules</a>
          <a href="#zen">Credits</a>
        </nav>
      </header>

      <main className="zen-main">
        <section className="zen-left">
          <div className="zen-kicker">三 · dimensional · strategy</div>
          <h1 className="zen-title">
            Five in a row,<br />
            in every <em>direction</em>.
          </h1>
          <p className="zen-subtitle">
            An ancient game, reimagined in three dimensions.
            Place your stones with intention. Breathe. Win with grace.
          </p>

          <div className="zen-choose">
            <div className="zen-choose-label">Choose your stone</div>
            <div className="zen-stones">
              <button className="zen-stone-btn" onClick={() => onPlayerSelection(1)}>
                <div className="zen-stone zen-stone-black" />
                <div className="zen-stone-name">Black</div>
                <div className="zen-stone-sub">moves first</div>
              </button>
              <button className="zen-stone-btn" onClick={() => onPlayerSelection(2)}>
                <div className="zen-stone zen-stone-white" />
                <div className="zen-stone-name">White</div>
                <div className="zen-stone-sub">moves second</div>
              </button>
            </div>
          </div>

          <div className="zen-footer-note">
            press a stone to begin · 静かに
          </div>
        </section>

        <section className="zen-right">
          <div className="zen-cube-frame">
            <Suspense fallback={<div className="zen-loading">loading…</div>}>
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
        </section>
      </main>
    </div>
  );
};
