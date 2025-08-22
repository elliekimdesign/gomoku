import React, { useState, useCallback, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Gomoku3DBoard, BoardState3D, Player } from './components/Gomoku3DBoard';


const BOARD_SIZE = 8;
const WIN_COUNT = 5;

// Audio utility function for stone placement sounds using custom audio files
const playStoneSound = (player: Player) => {
  try {
    // You can place your audio files in the public folder and reference them here
    // For example: put "black-stone.mp3" and "white-stone.mp3" in public/sounds/
    const soundFile = player === 1 ? '/sounds/black-stone.mp3' : '/sounds/white-stone.mp3';
    
    // Alternative: use the same sound for both players
    // const soundFile = '/sounds/stone-place.mp3';
    
    const audio = new Audio(soundFile);
    audio.volume = 0.5; // Adjust volume (0.0 to 1.0)
    audio.currentTime = 0; // Reset to beginning in case it was played recently
    
    // Play the sound
    audio.play().catch(error => {
      console.warn('Audio playback failed:', error);
    });
  } catch (error) {
    console.warn('Audio setup failed:', error);
  }
};


const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    font-family: 'Inter', 'Roboto', Arial, sans-serif;
    background: #f5f6fa;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem 0 1rem 0;
  box-sizing: border-box;
`;

const Title = styled.h1`
  font-family: 'Inter', Arial, sans-serif;
  font-size: 2.1rem;
  font-weight: 600;
  color: #23242b;
  margin-bottom: 0.5rem;
  letter-spacing: 0.01em;
`;



const Button = styled.button`
  background: #222;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #444;
  }
`;

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100vw;
  max-width: 100vw;
`;

const BoardWrapper = styled.div`
  flex: 1 1 0;
  min-width: 0;
`;

const TurnIndicator = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50px;
  padding: 12px 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0,0,0,0.1);
  min-width: 180px;
  height: 70px;
`;

const StonePreview = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  
  &.black {
    background: linear-gradient(135deg, #23242b 0%, #3a3a5a 100%);
    box-shadow: 
      0 4px 12px rgba(35, 36, 43, 0.5),
      inset 0 2px 4px rgba(255, 255, 255, 0.15),
      inset 0 -2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &.white {
    background: linear-gradient(135deg, #ffffff 0%, #f7f6f2 100%);
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 2px 4px rgba(255, 255, 255, 0.8),
      inset 0 -2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 15%;
    left: 25%;
    width: 35%;
    height: 35%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    filter: blur(3px);
  }
`;

const TurnText = styled.div`
  font-family: 'Inter', Arial, sans-serif;
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0.02em;
  line-height: 1.2;
  
  &.black {
    color: #23242b;
  }
  
  &.white {
    color: #444;
  }
`;



const RotationControls = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const ZoomControls = styled.div`
  position: fixed;
  bottom: 170px;
  right: 88px;
  transform: translateX(50%);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  display: flex;
  gap: 4px;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;


const RotationButton = styled.button`
  width: 40px;
  height: 40px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: #444;
  transition: all 0.15s ease;
  
  &:hover {
    background: #f0f0f0;
    border-color: #bbb;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
    background: #e8e8e8;
  }
  
  &.center {
    background: #23242b;
    color: #fff;
    border-color: #23242b;
    
    &:hover {
      background: #444;
    }
  }
`;

const ZoomButton = styled.button`
  width: 40px;
  height: 40px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  color: #444;
  transition: all 0.15s ease;
  
  &:hover {
    background: #f0f0f0;
    border-color: #bbb;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
    background: #e8e8e8;
  }
`;

function getEmptyBoard3D(): BoardState3D {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(0)
    )
  );
}

// All 3D directions (26 directions: 6 axes, 12 face diagonals, 8 space diagonals)
const directions = [
  [1, 0, 0], [0, 1, 0], [0, 0, 1],
  [-1, 0, 0], [0, -1, 0], [0, 0, -1],
  [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
  [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
  [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
  [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
];

function checkWinner3D(board: BoardState3D): Player {
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



// Camera rotation controls component
const CameraRotationControls: React.FC<{ onRotate: (azimuth: number, polar: number) => void }> = ({ onRotate }) => {
  const ROTATION_STEP = Math.PI / 6; // 30 degrees

  return (
    <RotationControls>
      {/* Row 1: Up-left, Up, Up-right */}
      <RotationButton onClick={() => onRotate(-ROTATION_STEP, -ROTATION_STEP)}>↖</RotationButton>
      <RotationButton onClick={() => onRotate(0, -ROTATION_STEP)}>↑</RotationButton>
      <RotationButton onClick={() => onRotate(ROTATION_STEP, -ROTATION_STEP)}>↗</RotationButton>
      
      {/* Row 2: Left, Empty, Right */}
      <RotationButton onClick={() => onRotate(-ROTATION_STEP, 0)}>←</RotationButton>
      <div /> {/* Empty center space */}
      <RotationButton onClick={() => onRotate(ROTATION_STEP, 0)}>→</RotationButton>
      
      {/* Row 3: Down-left, Down, Down-right */}
      <RotationButton onClick={() => onRotate(-ROTATION_STEP, ROTATION_STEP)}>↙</RotationButton>
      <RotationButton onClick={() => onRotate(0, ROTATION_STEP)}>↓</RotationButton>
      <RotationButton onClick={() => onRotate(ROTATION_STEP, ROTATION_STEP)}>↘</RotationButton>
    </RotationControls>
  );
};

// Camera zoom controls component
const CameraZoomControls: React.FC<{ onZoom: (factor: number) => void }> = ({ onZoom }) => {
  return (
    <ZoomControls>
      <ZoomButton onClick={() => onZoom(1.2)}>−</ZoomButton>
      <ZoomButton onClick={() => onZoom(0.8)}>+</ZoomButton>
    </ZoomControls>
  );
};

// Visual turn indicator component
const TurnIndicatorComponent: React.FC<{ currentPlayer: Player, winner: Player }> = ({ currentPlayer, winner }) => {
  if (winner !== 0) {
    return (
      <TurnIndicator>
        <StonePreview className={winner === 1 ? 'black' : 'white'} />
        <TurnText className={winner === 1 ? 'black' : 'white'}>
          {winner === 1 ? 'Black' : 'White'} Wins! 🎉
        </TurnText>
      </TurnIndicator>
    );
  }

  return (
    <TurnIndicator>
      <StonePreview className={currentPlayer === 1 ? 'black' : 'white'} />
      <TurnText className={currentPlayer === 1 ? 'black' : 'white'}>
        {currentPlayer === 1 ? 'Black' : 'White'}'s Turn
      </TurnText>
    </TurnIndicator>
  );
};




const App: React.FC = () => {
  const [board, setBoard] = useState<BoardState3D>(getEmptyBoard3D());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player>(0);
  const [hovered, setHovered] = useState<[number, number, number] | null>(null);
  // Camera sync state
  const boardCenter = (BOARD_SIZE - 1) * 0.5 / 2; // Board center coordinate
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([10 + boardCenter, 10 + boardCenter, 18 + boardCenter]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([boardCenter, boardCenter, boardCenter]);
  // Handler to update camera state from main board
  const handleCameraChange = useCallback((pos: [number, number, number], target: [number, number, number]) => {
    setCameraPos(pos);
    setCameraTarget(target);
  }, []);

  // Camera rotation utilities
  const rotateCameraAroundTarget = useCallback((azimuthDelta: number, polarDelta: number) => {
    const target = cameraTarget;
    const currentPos = cameraPos;
    
    // Calculate current spherical coordinates relative to target
    const dx = currentPos[0] - target[0];
    const dy = currentPos[1] - target[1];
    const dz = currentPos[2] - target[2];
    
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let azimuth = Math.atan2(dx, dz);
    let polar = Math.acos(dy / radius);
    
    // Apply rotation deltas
    azimuth += azimuthDelta;
    polar = Math.max(0.1, Math.min(Math.PI - 0.1, polar + polarDelta)); // Clamp polar angle
    
    // Convert back to cartesian coordinates
    const newX = target[0] + radius * Math.sin(polar) * Math.sin(azimuth);
    const newY = target[1] + radius * Math.cos(polar);
    const newZ = target[2] + radius * Math.sin(polar) * Math.cos(azimuth);
    
    setCameraPos([newX, newY, newZ]);
  }, [cameraPos, cameraTarget]);

  const zoomCamera = useCallback((zoomFactor: number) => {
    const target = cameraTarget;
    const currentPos = cameraPos;
    
    // Calculate direction vector from target to camera
    const dx = currentPos[0] - target[0];
    const dy = currentPos[1] - target[1];
    const dz = currentPos[2] - target[2];
    
    // Apply zoom factor (> 1 zooms out, < 1 zooms in)
    const newX = target[0] + dx * zoomFactor;
    const newY = target[1] + dy * zoomFactor;
    const newZ = target[2] + dz * zoomFactor;
    
    setCameraPos([newX, newY, newZ]);
  }, [cameraPos, cameraTarget]);


  const handlePlaceStone = (x: number, y: number, z: number) => {
    if (board[z][y][x] !== 0 || winner) return;
    
    // Play sound for stone placement
    playStoneSound(currentPlayer);
    
    const newBoard = board.map(plane => plane.map(row => [...row]));
    newBoard[z][y][x] = currentPlayer;
    setBoard(newBoard);
    const win = checkWinner3D(newBoard);
    if (win) {
      setWinner(win);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  // Undo functionality - removes the last placed stone
  const handleUndo = useCallback(() => {
    if (winner !== 0) return; // Can't undo if game is over
    
    // Find the last placed stone by scanning the board
    let lastStone: [number, number, number] | null = null;
    let lastPlayer: Player = 0;
    
    // Scan board from end to find the most recently placed stone
    for (let z = BOARD_SIZE - 1; z >= 0; z--) {
      for (let y = BOARD_SIZE - 1; y >= 0; y--) {
        for (let x = BOARD_SIZE - 1; x >= 0; x--) {
          if (board[z][y][x] !== 0) {
            lastStone = [x, y, z];
            lastPlayer = board[z][y][x];
            break;
          }
        }
        if (lastStone) break;
      }
      if (lastStone) break;
    }
    
    if (lastStone) {
      // Remove the last stone
      const newBoard = board.map(plane => plane.map(row => [...row]));
      newBoard[lastStone[2]][lastStone[1]][lastStone[0]] = 0;
      setBoard(newBoard);
      
      // Revert to the player who placed that stone
      setCurrentPlayer(lastPlayer);
      
      // Reset winner state (since we removed a stone)
      setWinner(0);
      
      console.log('Undo completed: removed stone at', lastStone, 'player', lastPlayer);
    }
  }, [board, winner]);


  const handleRestart = () => {
    setBoard(getEmptyBoard3D());
    setCurrentPlayer(1);
    setWinner(0);
  };

  // ESC key event listener for undo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo]);


  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>3D Gomoku Cube</Title>
        <TurnIndicatorComponent currentPlayer={currentPlayer} winner={winner} />
        <Layout>
          <BoardWrapper>
            <Gomoku3DBoard
              board={board}
              onPlaceStone={handlePlaceStone}
              onUndo={handleUndo}
              currentPlayer={currentPlayer}
              winner={winner}
              hovered={hovered}
              setHovered={setHovered}
              cameraPos={cameraPos}
              cameraTarget={cameraTarget}
              onCameraChange={handleCameraChange}
            />
          </BoardWrapper>
        </Layout>
        <Button onClick={handleRestart} style={{ marginTop: 24 }}>
          Restart Game
        </Button>
        <CameraRotationControls 
          onRotate={rotateCameraAroundTarget}
        />
        <CameraZoomControls 
          onZoom={zoomCamera}
        />
      </Container>
    </>
  );
};

export default App;
