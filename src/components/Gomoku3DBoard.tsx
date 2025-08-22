import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Billboard } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export type Player = 0 | 1 | 2; // 0: empty, 1: black, 2: white
export type BoardState3D = Player[][][];

export const BOARD_SIZE = 5;
export const CELL_SIZE = 0.5;
const BOARD_LENGTH = (BOARD_SIZE - 1) * CELL_SIZE;

interface Gomoku3DCubeBoardProps {
  board: BoardState3D;
  onPlaceStone: (x: number, y: number, z: number) => void;
  onUndo: () => void;
  currentPlayer: Player;
  winner: Player;
  hovered: [number, number, number] | null;
  setHovered: (h: [number, number, number] | null) => void;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  onCameraChange: (pos: [number, number, number], target: [number, number, number]) => void;
}

// Enhanced stone materials with more aesthetic colors
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

// Helper to render grid lines for a 3D cube
const GridLines3D: React.FC = () => {
  const lines = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
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
                i * CELL_SIZE, BOARD_LENGTH, j * CELL_SIZE,
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
                i * CELL_SIZE, j * CELL_SIZE, BOARD_LENGTH,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#bbb" linewidth={1} transparent opacity={0.5} />
        </line>
      );
    }
  }
  return <>{lines}</>;
};

// CameraSync component for use inside <Canvas>
const CameraSync: React.FC<{
  cameraPos: [number, number, number],
  cameraTarget: [number, number, number],
  onCameraChange: (pos: [number, number, number], target: [number, number, number]) => void;
  angleLocked: boolean;
}> = ({ cameraPos, cameraTarget, onCameraChange, angleLocked }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...cameraPos);
    camera.lookAt(...cameraTarget);
  }, [camera, cameraPos, cameraTarget]);
  return null;
};

export const Gomoku3DBoard: React.FC<Gomoku3DCubeBoardProps> = ({ 
  board, 
  onPlaceStone, 
  onUndo,
  currentPlayer, 
  winner, 
  hovered, 
  setHovered,
  cameraPos,
  cameraTarget,
  onCameraChange
}) => {
  // Handler for OrbitControls change
  const handleControlsChange = (e: any) => {
    if (e && e.target) {
      const cam = e.target.object;
      const tgt = e.target.target;
      onCameraChange([cam.position.x, cam.position.y, cam.position.z], [tgt.x, tgt.y, tgt.z]);
    }
  };

  return (
    <div style={{ width: '100vw', height: '80vh', margin: '0 auto', maxWidth: '100vw', maxHeight: '100vh' }}>
      {/* Center Camera Button */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        background: '#2196F3',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }} onClick={() => {
        // Reset camera to first-person view inside the board
        const centerPos: [number, number, number] = [(BOARD_SIZE - 1) * CELL_SIZE / 2, (BOARD_SIZE - 1) * CELL_SIZE / 2, (BOARD_SIZE - 1) * CELL_SIZE / 2];
        onCameraChange(centerPos, centerPos);
      }}>
        🎯 Center
      </div>

      <Canvas camera={{ position: cameraPos, fov: 75 }} style={{ width: '100%', height: '100%', background: '#000000' }}>
        <CameraSync cameraPos={cameraPos} cameraTarget={cameraTarget} onCameraChange={onCameraChange} angleLocked={false} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 20]} intensity={0.7} />
        
        {/* 3D Grid Lines */}
        <GridLines3D />
        
        {/* Artistic Stones */}
        {board.map((plane, z) =>
          plane.map((row, y) =>
            row.map((cell, x) =>
              cell !== 0 ? (
                <mesh
                  key={`stone-${x}-${y}-${z}`}
                  position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                  castShadow
                  receiveShadow
                >
                  <sphereGeometry args={[0.18, 32, 32]} />
                  <meshPhysicalMaterial {...stoneMaterialProps(cell)} />
                </mesh>
              ) : null
            )
          )
        )}

        {/* Elegant hover indicator */}
        {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <>
            {/* Glowing ring */}
            <mesh
              position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
            >
              <ringGeometry args={[0.15, 0.25, 32]} />
              <meshBasicMaterial 
                color={currentPlayer === 1 ? '#60A5FA' : '#F1F5F9'} 
                transparent 
                opacity={0.6}
              />
            </mesh>
            
            {/* Center dot */}
            <mesh
              position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
            >
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial 
                color={currentPlayer === 1 ? '#3B82F6' : '#E2E8F0'} 
                transparent 
                opacity={0.8} 
              />
            </mesh>
          </>
        )}

        {/* Preview stone */}
        {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <mesh
            position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
          >
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshPhysicalMaterial 
              {...stoneMaterialProps(currentPlayer)} 
              transparent 
              opacity={0.25}
              emissive={currentPlayer === 1 ? '#1E40AF' : '#FFFFFF'}
              emissiveIntensity={0.1}
            />
          </mesh>
        )}

        {/* Clickable dots at every empty position */}
        {board.map((plane, z) =>
          plane.map((row, y) =>
            row.map((cell, x) =>
              cell === 0 && !winner ? (
                <>
                  {/* Small visible dot */}
                  <mesh
                    key={`dot-${x}-${y}-${z}`}
                    position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                  >
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshBasicMaterial 
                      color={hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z ? "#ff0000" : "#888888"} 
                      transparent 
                      opacity={0.6} 
                    />
                  </mesh>
                  
                  {/* Invisible hover detection sphere */}
                  <mesh
                    key={`intersection-${x}-${y}-${z}`}
                    position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHovered([x, y, z]);
                    }}
                    onPointerOut={(e) => {
                      e.stopPropagation();
                      if (hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z) {
                        setHovered(null);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaceStone(x, y, z);
                    }}
                    visible={false}
                  >
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshStandardMaterial transparent opacity={0.0} />
                  </mesh>
                </>
              ) : null
            )
          )
        )}

        {/* Enhanced lighting */}
        <directionalLight position={[0, 20, 0]} intensity={0.8} color={'#ffffff'} />
        <directionalLight position={[-20, 10, 20]} intensity={0.3} color={'#ffffff'} />
        <ambientLight intensity={0.7} color={'#ffffff'} />
        
        <OrbitControls
          enablePan={true}
          minDistance={1.0}
          maxDistance={50}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={1.5}
          panSpeed={1.5}
          rotateSpeed={0.8}
          enableDamping={true}
          dampingFactor={0.05}
          target={[
            (BOARD_SIZE - 1) * CELL_SIZE / 2,
            (BOARD_SIZE - 1) * CELL_SIZE / 2,
            (BOARD_SIZE - 1) * CELL_SIZE / 2
          ]}
          onChange={handleControlsChange}
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
              {winner === 1 ? 'Blue' : 'White'} wins!
            </div>
          </Html>
        )}
      </Canvas>
    </div>
  );
};