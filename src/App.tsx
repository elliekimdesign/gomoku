import React, { useState, useCallback, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Gomoku3DBoard, BoardState3D, Player } from './components/Gomoku3DBoard';
import { Canvas } from '@react-three/fiber';

const BOARD_SIZE = 5;
const WIN_COUNT = 5;
const CELL_SIZE = 1; // Assuming a unit cell size for the preview

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

const Info = styled.div`
  font-family: 'Inter', Arial, sans-serif;
  font-size: 1rem;
  color: #444;
  margin-bottom: 1.5rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  padding: 0;
  background: none;
  border-radius: 0;
  box-shadow: none;
  display: block;
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
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  width: 100vw;
  max-width: 100vw;
  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
  }
`;

const BoardWrapper = styled.div`
  flex: 1 1 0;
  min-width: 0;
`;

const PreviewWrapper = styled.div`
  width: 180px;
  height: 180px;
  margin-left: 2vw;
  background: #f5f6fa;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 900px) {
    margin-left: 0;
    margin-top: 2vw;
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

// Artistic stone material for preview (same as Gomoku3DBoard)
const stoneMaterialProps = (player: Player) => {
  if (player === 1) {
    return {
      color: '#23242b',
      roughness: 0.22,
      metalness: 0.55,
      clearcoat: 0.8,
      clearcoatRoughness: 0.13,
      sheen: 1,
      sheenColor: '#3a3a5a',
      transmission: 0.07,
    };
  }
  if (player === 2) {
    return {
      color: '#f7f6f2',
      roughness: 0.15,
      metalness: 0.38,
      clearcoat: 0.85,
      clearcoatRoughness: 0.09,
      sheen: 1,
      sheenColor: '#fffbe6',
      transmission: 0.09,
    };
  }
  return { color: 'transparent', opacity: 0 };
};

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


// Helper: Render a mini 3D grid and preview stone for the zoom-in preview
const MiniGridPreview: React.FC<{ hovered: [number, number, number], player: Player, cameraPos: [number, number, number], cameraTarget: [number, number, number] }> = ({ hovered, player, cameraPos, cameraTarget }) => {
  // Only render a 3x3x3 grid centered on hovered
  const size = 3;
  const offset = 1;
  const lines = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      // X lines
      lines.push(
        <line key={`x-${i}-${j}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                0, i * CELL_SIZE, j * CELL_SIZE,
                (size - 1) * CELL_SIZE, i * CELL_SIZE, j * CELL_SIZE,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={0.5} />
        </line>
      );
      // Y lines
      lines.push(
        <line key={`y-${i}-${j}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                i * CELL_SIZE, 0, j * CELL_SIZE,
                i * CELL_SIZE, (size - 1) * CELL_SIZE, j * CELL_SIZE,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={0.5} />
        </line>
      );
      // Z lines
      lines.push(
        <line key={`z-${i}-${j}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                i * CELL_SIZE, j * CELL_SIZE, 0,
                i * CELL_SIZE, j * CELL_SIZE, (size - 1) * CELL_SIZE,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={0.5} />
        </line>
      );
    }
  }
  // Center the grid so hovered cell is at (0,0,0)
  const center = (size - 1) * CELL_SIZE / 2;
  // Calculate camera position relative to hovered cell
  const relCam = [
    cameraPos[0] - hovered[0] * CELL_SIZE,
    cameraPos[1] - hovered[1] * CELL_SIZE,
    cameraPos[2] - hovered[2] * CELL_SIZE,
  ];
  const relTarget = [
    cameraTarget[0] - hovered[0] * CELL_SIZE,
    cameraTarget[1] - hovered[1] * CELL_SIZE,
    cameraTarget[2] - hovered[2] * CELL_SIZE,
  ];
  // Zoom in by scaling the camera distance
  const zoom = 0.25;
  const zoomedCam = relCam.map((v) => v * zoom) as [number, number, number];
  return (
    <Canvas camera={{ position: zoomedCam, fov: 50 }} style={{ width: 160, height: 160 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 2, 2]} intensity={0.7} />
      <group position={[-center, -center, -center]}>
        {lines}
        {/* Cross dot at center */}
        <mesh position={[offset * CELL_SIZE, offset * CELL_SIZE, offset * CELL_SIZE]}>
          <sphereGeometry args={[0.08, 24, 24]} />
          <meshStandardMaterial color={'#ffe066'} emissive={'#ffe066'} emissiveIntensity={1.2} transparent opacity={0.95} />
        </mesh>
        {/* Preview stone at center */}
        <mesh position={[offset * CELL_SIZE, offset * CELL_SIZE, offset * CELL_SIZE]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshPhysicalMaterial {...stoneMaterialProps(player)} transparent opacity={0.7} />
        </mesh>
      </group>
      {/* No controls for preview */}
    </Canvas>
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


  const handleRestart = () => {
    setBoard(getEmptyBoard3D());
    setCurrentPlayer(1);
    setWinner(0);
  };


  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>3D Gomoku Cube</Title>
        <Info>
          {winner
            ? `${winner === 1 ? 'Black' : 'White'} wins!`
            : `Current turn: ${currentPlayer === 1 ? 'Black' : 'White'}`}
        </Info>
        <Layout>
          <BoardWrapper>
            <Gomoku3DBoard
              board={board}
              onPlaceStone={handlePlaceStone}
              currentPlayer={currentPlayer}
              winner={winner}
              hovered={hovered}
              setHovered={setHovered}
              cameraPos={cameraPos}
              cameraTarget={cameraTarget}
              onCameraChange={handleCameraChange}
            />
          </BoardWrapper>
          {/* Small zoom-in preview */}
          <PreviewWrapper>
            {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
              <MiniGridPreview hovered={hovered} player={currentPlayer} cameraPos={cameraPos} cameraTarget={cameraTarget} />
            )}
          </PreviewWrapper>
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
