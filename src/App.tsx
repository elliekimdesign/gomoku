import React, { useState, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Gomoku3DBoard, BoardState3D, Player, BOARD_SIZE, CELL_SIZE } from './components/Gomoku3DBoard';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';


const WIN_COUNT = 5;

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background: #000000; // 배경색 검정으로 변경
  }
  * {
    box-sizing: border-box;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: #000000; // 배경색 검정으로 변경
  color: white;
  font-family: 'Arial', sans-serif;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 800;
  color: #222;
  margin-bottom: 0.5rem;
`;

const Info = styled.div`
  font-size: 1.1rem;
  color: #444;
  margin-bottom: 1.5rem;
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

// Enhanced stone materials with more aesthetic colors (matching the main board)
const stoneMaterialProps = (player: Player) => {
  if (player === 1) {
    // Beautiful deep blue stone with premium finish
    return {
      color: '#1E40AF', // Rich royal blue
      roughness: 0.08, // Very smooth, premium finish
      metalness: 0.15, // Subtle metallic quality
      clearcoat: 1.0, // Maximum clearcoat for glossy finish
      clearcoatRoughness: 0.02, // Ultra smooth clearcoat
      sheen: 0.9, // Strong sheen for luxury appearance
      sheenColor: '#60A5FA', // Bright blue sheen
      transmission: 0.08, // Subtle transparency for depth
      ior: 1.5, // Glass-like refraction
      thickness: 0.4, // Good thickness for light interaction
      attenuationColor: '#1D4ED8', // Deep blue light absorption
      attenuationDistance: 1.2, // Controlled light penetration
    } as const;
  }
  if (player === 2) {
    // Pure white stone with pearl-like finish
    return {
      color: '#FFFFFF', // Pure white
      roughness: 0.05, // Extremely smooth
      metalness: 0.08, // Minimal metallic quality
      clearcoat: 1.0, // Maximum clearcoat
      clearcoatRoughness: 0.01, // Ultra smooth clearcoat
      sheen: 0.8, // Strong pearl-like sheen
      sheenColor: '#F0F9FF', // Subtle blue-white sheen
      transmission: 0.05, // Slight transparency for elegance
      ior: 1.45, // Pearl-like refraction
      thickness: 0.35, // Good thickness
      attenuationColor: '#E0E7FF', // Very light blue tint
      attenuationDistance: 1.8, // Gentle light interaction
    } as const;
  }
  return { color: 'transparent', opacity: 0 } as const;
};

// Helper: Render a mini 3D grid and preview stone for the zoom-in preview
const MiniGridPreview: React.FC<{ hovered: [number, number, number]; player: Player }> = ({ hovered, player }) => {
  const size = 10; // Grid size for preview
  const offset = 4; // Offset from center
  const lines = [];
  
  // Generate grid lines
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
  return (
    <Canvas camera={{ position: [0, 0, 2.5], fov: 30 }} style={{ width: 160, height: 160 }}>
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
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={true} minDistance={2} maxDistance={2.5} />
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
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([boardCenter, boardCenter, boardCenter]); // 보드 한가운데에서 시작하여 자유롭게 헤엄칠 수 있도록
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([boardCenter, boardCenter, boardCenter]);
  
  // Handler to update camera state from main board
  const handleCameraChange = useCallback((pos: [number, number, number], target: [number, number, number]) => {
    setCameraPos(pos);
    setCameraTarget(target);
  }, []);

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

  // New: Undo functionality
  const handleUndo = useCallback(() => {
    if (winner !== 0) return; // 게임이 끝났으면 undo 불가
    
    // 마지막에 놓은 돌 찾기
    let lastStone: [number, number, number] | null = null;
    let lastPlayer: Player = 0;
    
    // 보드를 뒤에서부터 검사하여 마지막 돌 찾기
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
      // 마지막 돌 제거
      const newBoard = board.map(plane => plane.map(row => [...row]));
      newBoard[lastStone[2]][lastStone[1]][lastStone[0]] = 0;
      setBoard(newBoard);
      
      // 플레이어 턴 되돌리기
      setCurrentPlayer(lastPlayer);
      
      // 승자 상태 초기화 (돌을 제거했으므로)
      setWinner(0);
      
      console.log('Undo completed: removed stone at', lastStone, 'player', lastPlayer);
    }
  }, [board, winner]);

  const handleRestart = () => {
    setBoard(getEmptyBoard3D());
    setCurrentPlayer(1);
    setWinner(0);
    // 카메라를 보드 밖으로 리셋
    const boardCenter = (BOARD_SIZE - 1) * 0.5 / 2;
    setCameraPos([boardCenter, boardCenter, boardCenter]);
    setCameraTarget([boardCenter, boardCenter, boardCenter]);
  };

  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>3D Gomoku Cube</Title>
        <Info>
          {winner
            ? `${winner === 1 ? 'Blue' : 'White'} wins!`
            : `Current turn: ${currentPlayer === 1 ? 'Blue' : 'White'}`}
        </Info>
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
          {/* Small zoom-in preview */}
          <PreviewWrapper>
            {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
              <MiniGridPreview hovered={hovered} player={currentPlayer} />
            )}
          </PreviewWrapper>
        </Layout>
        <Button onClick={handleRestart} style={{ marginTop: 24 }}>
          Restart Game
        </Button>
      </Container>
    </>
  );
};

export default App;
