import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Billboard } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export type Player = 0 | 1 | 2; // 0: empty, 1: black, 2: white
export type BoardState3D = Player[][][];

interface Gomoku3DCubeBoardProps {
  board: BoardState3D;
  onPlaceStone: (x: number, y: number, z: number) => void;
  currentPlayer: Player;
  winner: Player;
  hovered: [number, number, number] | null;
  setHovered: (h: [number, number, number] | null) => void;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  onCameraChange: (pos: [number, number, number], target: [number, number, number]) => void;
}

const BOARD_SIZE = 10;
const CELL_SIZE = 0.5;
const BOARD_LENGTH = (BOARD_SIZE - 1) * CELL_SIZE;

// Artistic stone material properties
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

// Helper to render grid lines for a 3D cube
const GridLines3D: React.FC<{ dimmed: boolean }> = ({ dimmed }) => {
  if (BOARD_SIZE < 2) return null;
  const lines = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      // Defensive: only push lines if coordinates are finite
      if (isFinite(i) && isFinite(j)) {
        // X lines
        lines.push(
          <line key={`x-${i}-${j}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  0, i * CELL_SIZE, j * CELL_SIZE,
                  BOARD_LENGTH, i * CELL_SIZE, j * CELL_SIZE,
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={dimmed ? 0.12 : 0.5} />
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
                  i * CELL_SIZE, BOARD_LENGTH, j * CELL_SIZE,
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={dimmed ? 0.12 : 0.5} />
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
                  i * CELL_SIZE, j * CELL_SIZE, BOARD_LENGTH,
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={dimmed ? 0.12 : 0.5} />
          </line>
        );
      }
    }
  }
  return <>{lines}</>;
};

// CameraSync component for use inside <Canvas>
const CameraSync: React.FC<{ cameraPos: [number, number, number], cameraTarget: [number, number, number], onCameraChange: (pos: [number, number, number], target: [number, number, number]) => void }> = ({ cameraPos, cameraTarget, onCameraChange }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...cameraPos);
    camera.lookAt(...cameraTarget);
  }, [camera, cameraPos, cameraTarget]);
  return null;
};

export const Gomoku3DBoard: React.FC<Gomoku3DCubeBoardProps> = ({ board, onPlaceStone, currentPlayer, winner, hovered, setHovered, cameraPos, cameraTarget, onCameraChange }) => {
  // Handler for OrbitControls change
  const handleControlsChange = (e: any) => {
    const cam = e.target.object;
    const tgt = e.target.target;
    onCameraChange([cam.position.x, cam.position.y, cam.position.z], [tgt.x, tgt.y, tgt.z]);
  };

  // Memoize the bumpMap so it's only generated once
  // const bumpMap = useMemo(() => {
  //   const canvas = generateNoiseTexture(128);
  //   const texture = new THREE.Texture(canvas);
  //   texture.needsUpdate = true;
  //   return texture;
  // }, []);

  return (
    <div style={{ width: '100vw', height: '80vh', margin: '0 auto', maxWidth: '100vw', maxHeight: '100vh' }}>
      <Canvas camera={{ position: cameraPos, fov: 50 }} style={{ width: '100%', height: '100%' }}>
        <CameraSync cameraPos={cameraPos} cameraTarget={cameraTarget} onCameraChange={onCameraChange} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 20]} intensity={0.7} />
        {/* 3D Grid Lines */}
        <GridLines3D dimmed={!!(hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner)} />
        {/* Artistic Stones (no bump) */}
        {board.map((plane, z) =>
          plane.map((row, y) =>
            row.map((cell, x) =>
              cell !== 0 ? (
                <mesh
                  key={`stone-${x}-${y}-${z}`}
                  position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                  castShadow
                >
                  <sphereGeometry args={[0.18, 32, 32]} />
                  <meshPhysicalMaterial {...stoneMaterialProps(cell)} />
                </mesh>
              ) : null
            )
          )
        )}
        {/* Hover cross/dot at intersection */}
        {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <>
            {/* X axis (red) */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    (hovered[0] - 0.5) * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE,
                    (hovered[0] + 0.5) * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE,
                  ]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#ff5555" linewidth={6} />
            </line>
            {/* Y axis (green) */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    hovered[0] * CELL_SIZE, (hovered[1] - 0.5) * CELL_SIZE, hovered[2] * CELL_SIZE,
                    hovered[0] * CELL_SIZE, (hovered[1] + 0.5) * CELL_SIZE, hovered[2] * CELL_SIZE,
                  ]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#55ff55" linewidth={6} />
            </line>
            {/* Z axis (blue) */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, (hovered[2] - 0.5) * CELL_SIZE,
                    hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, (hovered[2] + 0.5) * CELL_SIZE,
                  ]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#5599ff" linewidth={6} />
            </line>
          </>
        )}
        {/* Hover crosshair at intersection (defensive) */}
        {hovered && Array.isArray(hovered) && hovered.length === 3 && hovered.every(isFinite) && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <>
            {/* Glowing disc perpendicular to camera for crosshair effect */}
            <Billboard position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}>
              <mesh>
                <circleGeometry args={[0.28, 48]} />
                <meshBasicMaterial color={'#ffe066'} transparent opacity={0.35} />
              </mesh>
            </Billboard>
            {/* X axis (red) */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    (hovered[0] - 0.5) * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE,
                    (hovered[0] + 0.5) * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE,
                  ]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#ff5555" linewidth={6} />
            </line>
            {/* Y axis (green) */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    hovered[0] * CELL_SIZE, (hovered[1] - 0.5) * CELL_SIZE, hovered[2] * CELL_SIZE,
                    hovered[0] * CELL_SIZE, (hovered[1] + 0.5) * CELL_SIZE, hovered[2] * CELL_SIZE,
                  ]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#55ff55" linewidth={6} />
            </line>
            {/* Z axis (blue) */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([
                    hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, (hovered[2] - 0.5) * CELL_SIZE,
                    hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, (hovered[2] + 0.5) * CELL_SIZE,
                  ]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#5599ff" linewidth={6} />
            </line>
          </>
        )}
        {/* Hover crosshair at intersection */}
        {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <mesh
            position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
          >
            <sphereGeometry args={[0.08, 24, 24]} />
            <meshStandardMaterial color={'#ffe066'} emissive={'#ffe066'} emissiveIntensity={1.2} transparent opacity={0.95} />
          </mesh>
        )}
        {/* Artistic preview stone (no bump) */}
        {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <mesh
            position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
          >
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshPhysicalMaterial {...stoneMaterialProps(currentPlayer)} transparent opacity={0.4} />
          </mesh>
        )}
        {/* Clickable cells with hover */}
        {board.map((plane, z) =>
          plane.map((row, y) =>
            row.map((cell, x) =>
              cell === 0 && !winner ? (
                <mesh
                  key={`cell-${x}-${y}-${z}`}
                  position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                  onPointerOver={() => setHovered([x, y, z])}
                  onPointerOut={() => setHovered(null)}
                  onClick={() => onPlaceStone(x, y, z)}
                  visible={false}
                >
                  <sphereGeometry args={[0.18, 16, 16]} />
                  <meshStandardMaterial transparent opacity={0} />
                </mesh>
              ) : null
            )
          )
        )}
        {/* Enhanced rim and fill lights for beauty */}
        <directionalLight position={[0, 20, 0]} intensity={0.7} color={'#ffe6b3'} />
        <directionalLight position={[-20, 10, 20]} intensity={0.25} color={'#b3d1ff'} />
        <ambientLight intensity={0.8} color={'#f5f6fa'} />
        <OrbitControls
          enablePan={true}
          minDistance={2}
          maxDistance={60}
          onChange={handleControlsChange}
          target={cameraTarget}
        />
        {/* Overlay for winner */}
        {winner !== 0 && (
          <Html center style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '1rem 2rem',
              borderRadius: 12,
              fontSize: 24,
              fontWeight: 700,
              marginTop: 20,
            }}>
              {winner === 1 ? 'Black' : 'White'} wins!
            </div>
          </Html>
        )}
      </Canvas>
    </div>
  );
};