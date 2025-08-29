import React, { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

export type Player = 0 | 1 | 2; // 0: empty, 1: black, 2: white
export type BoardState3D = Player[][][];

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
  ghostStone: { x: number; y: number; z: number; player: Player } | null;
  theme: {
    background: string;
    text: string;
    cardBackground: string;
    buttonBackground: string;
    buttonText: string;
    buttonHover: string;
    gridLines: string;
    clickableDots: string;
    hoverDots: string;
    ambientLight: string;
    directionalLight1: string;
    directionalLight2: string;
  };
}

const BOARD_SIZE = 8;
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
const GridLines3D: React.FC<{ gridColor: string }> = ({ gridColor }) => {
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
            <lineBasicMaterial color={gridColor} linewidth={1} transparent opacity={0.8} />
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
            <lineBasicMaterial color={gridColor} linewidth={1} transparent opacity={0.8} />
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
            <lineBasicMaterial color={gridColor} linewidth={1} transparent opacity={0.8} />
          </line>
        );
      }
    }
  }
  return <>{lines}</>;
};

// Quaternion-based Camera Controller with continuous 360° rotation
const CustomCameraController: React.FC<{
  target: [number, number, number];
  onCameraChange: (position: [number, number, number], target: [number, number, number]) => void;
}> = ({ target, onCameraChange }) => {
  const { camera, gl } = useThree();
  const [isRotating, setIsRotating] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Pure quaternion rotation state - never reset, only accumulate
  const accumulatedRotation = useRef(new THREE.Quaternion());
  const targetRotation = useRef(new THREE.Quaternion());
  const rotationVelocity = useRef(new THREE.Quaternion());
  const radius = useRef(15); // Camera distance
  
  const targetVector = new THREE.Vector3(...target);
  const basePosition = new THREE.Vector3(0, 0, 1); // Base camera direction

  // Smooth interpolation parameters
  const dampingFactor = 0.08;
  const velocityDamping = 0.92;
  const sensitivity = 0.01; // Keep exact same sensitivity

  const handleMouseDown = useCallback((event: MouseEvent) => {
    setIsRotating(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
    // Reset velocity when starting new drag
    rotationVelocity.current.set(0, 0, 0, 1);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isRotating) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;

    // Create rotation quaternions for X and Y axis rotations
    const rotationX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * sensitivity);
    const rotationY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * sensitivity);
    
    // Combine rotations - apply Y rotation first, then X rotation
    const deltaRotation = new THREE.Quaternion().multiplyQuaternions(rotationY, rotationX);
    
    // Accumulate rotation - never reset, only add to existing rotation
    targetRotation.current.multiplyQuaternions(deltaRotation, targetRotation.current);
    
    // Store velocity for momentum
    rotationVelocity.current.copy(deltaRotation);

    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [isRotating, lastMousePos, sensitivity]);

  const handleMouseUp = useCallback(() => {
    setIsRotating(false);
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const zoomDelta = event.deltaY * 0.01;
    radius.current += zoomDelta;
    radius.current = Math.max(2, Math.min(60, radius.current));
  }, []);

  // Set up event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl.domElement, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  // Smooth interpolation and camera update every frame
  useFrame(() => {
    // Apply velocity damping when not actively rotating
    if (!isRotating) {
      // Apply momentum with damping
      const velocityMagnitude = 2 * Math.acos(Math.abs(rotationVelocity.current.w));
      
      if (velocityMagnitude > 0.001) {
        // Continue rotation with momentum - accumulate, never reset
        targetRotation.current.multiplyQuaternions(rotationVelocity.current, targetRotation.current);
        
        // Dampen the velocity
        rotationVelocity.current.slerp(new THREE.Quaternion(0, 0, 0, 1), 1 - velocityDamping);
      }
    }

    // Smooth interpolation between current and target rotation using SLERP
    accumulatedRotation.current.slerp(targetRotation.current, dampingFactor);
    
    // Apply rotation to base position vector to get camera position
    const position = basePosition.clone().multiplyScalar(radius.current);
    position.applyQuaternion(accumulatedRotation.current);
    position.add(targetVector);
    
    // Update camera position - NO lookAt call, maintain orientation
    camera.position.copy(position);
    
    // Calculate camera orientation from rotation quaternion
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(accumulatedRotation.current);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(accumulatedRotation.current);
    
    // Set camera orientation directly without lookAt
    camera.quaternion.copy(accumulatedRotation.current);
    
    onCameraChange([position.x, position.y, position.z], target);
  });

  return null;
};

export const Gomoku3DBoard: React.FC<Gomoku3DCubeBoardProps> = ({ board, onPlaceStone, onUndo, currentPlayer, winner, hovered, setHovered, cameraPos, cameraTarget, onCameraChange, ghostStone, theme }) => {

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
        <CustomCameraController target={cameraTarget} onCameraChange={onCameraChange} />
          {/* 3D Grid Lines */}
          <GridLines3D gridColor={theme.gridLines} />
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
        
        {/* Beautiful Ghost Stone */}
        {ghostStone && (
          <mesh
            key={`ghost-stone-${ghostStone.x}-${ghostStone.y}-${ghostStone.z}`}
            position={[ghostStone.x * CELL_SIZE, ghostStone.y * CELL_SIZE, ghostStone.z * CELL_SIZE]}
            castShadow
            onClick={() => onPlaceStone(ghostStone.x, ghostStone.y, ghostStone.z)}
            onPointerOver={() => setHovered([ghostStone.x, ghostStone.y, ghostStone.z])}
            onPointerOut={() => setHovered(null)}
          >
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshPhysicalMaterial 
              {...stoneMaterialProps(ghostStone.player)} 
              transparent 
              opacity={0.6}
              emissive={ghostStone.player === 1 ? '#23242b' : '#ffffff'}
              emissiveIntensity={0.1}
            />

            {/* Pulsing center dot */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshStandardMaterial 
                color={ghostStone.player === 1 ? '#3B82F6' : '#E2E8F0'} 
                transparent 
                opacity={0.9}
                emissive={ghostStone.player === 1 ? '#3B82F6' : '#E2E8F0'}
                emissiveIntensity={0.3}
              />
            </mesh>
            
            {/* Invisible larger clickable area for easier clicking */}
            <mesh 
              position={[0, 0, 0]}
              onClick={() => onPlaceStone(ghostStone.x, ghostStone.y, ghostStone.z)}
              visible={false}
            >
              <sphereGeometry args={[0.25, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </mesh>
        )}
        
        {/* Clickable dots at every empty position */}
        {board.map((plane, z) =>
          plane.map((row, y) =>
            row.map((cell, x) =>
              cell === 0 && !winner && !(ghostStone && ghostStone.x === x && ghostStone.y === y && ghostStone.z === z) ? (
                <mesh
                  key={`dot-${x}-${y}-${z}`}
                  position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                  onClick={() => onPlaceStone(x, y, z)}
                  onPointerOver={() => setHovered([x, y, z])}
                  onPointerOut={() => setHovered(null)}
                >
                  <sphereGeometry args={[0.02, 8, 8]} />
                  <meshBasicMaterial color={hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z ? theme.hoverDots : theme.clickableDots} />
                </mesh>
              ) : null
            )
          )
        )}
        {/* Enhanced rim and fill lights for beauty */}
        <directionalLight position={[0, 20, 0]} intensity={0.7} color={theme.directionalLight1} />
        <directionalLight position={[-20, 10, 20]} intensity={0.25} color={theme.directionalLight2} />
        <ambientLight intensity={0.8} color={theme.ambientLight} />

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