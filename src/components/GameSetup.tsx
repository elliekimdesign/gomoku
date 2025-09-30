import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import './GameSetup.css';
import { Player, Gomoku3DBoard, BoardState3D } from './Gomoku3DBoard';

const BOARD_SIZE = 8;

// Create empty 3D board
function getEmptyBoard3D(): BoardState3D {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(0)
    )
  );
}

interface GameSetupProps {
  onPlayerSelection: (humanPlayer: Player) => void;
}

// Preview with sample game state
const createSampleBoard = () => {
  const board = getEmptyBoard3D();
  // Add some sample stones for preview
  board[2][2][2] = 1; // White stone in center
  board[1][1][1] = 2; // Orange stone
  board[3][2][1] = 1; // Another white stone
  return board;
};

export const GameSetup: React.FC<GameSetupProps> = ({ onPlayerSelection }) => {
  const [sampleBoard] = useState(createSampleBoard());
  const [previewHovered, setPreviewHovered] = useState<[number, number, number] | null>(null);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([10, 10, 18]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([1, 1, 1]);

  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCameraPos(pos);
    setCameraTarget(target);
  };

  return (
    <div className="setup-container-split">
      <div className="setup-left">
        <div className="setup-card">
          <h1 className="setup-title">3D Gomoku vs AI</h1>
          <p className="setup-subtitle">
            Choose your color to begin the battle of minds in three dimensions
          </p>
          
          <div className="color-options">
            <button 
              className="color-button"
              onClick={() => onPlayerSelection(1)}
              title="Play as Black - You go first!"
            >
              <div className="stone-preview black" />
              <div className="color-label">Black</div>
              <div className="color-description">
                You move first<br/>
                Strategic advantage
              </div>
            </button>
            
            <button 
              className="color-button"
              onClick={() => onPlayerSelection(2)}
              title="Play as White - AI goes first!"
            >
              <div className="stone-preview white" />
              <div className="color-label">White</div>
              <div className="color-description">
                AI moves first<br/>
                Reactive play
              </div>
            </button>
          </div>
          
          <div className="game-info">
            <h3 className="info-title">Game Rules</h3>
            <ul className="info-list">
              <li className="info-item">Get 5 stones in a row to win (any direction in 3D)</li>
              <li className="info-item">No six-in-a-row allowed (forbidden move)</li>
              <li className="info-item">Open 3-3 patterns are permitted</li>
              <li className="info-item">AI uses strategic 3D thinking</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="setup-right">
        <div className="cube-preview-container">
          <Suspense fallback={<div className="loading">Loading 3D Preview...</div>}>
            <Gomoku3DBoard
              board={sampleBoard}
              onPlaceStone={() => {}} // No interaction in preview
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
      </div>
    </div>
  );
};
