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
  isAiThinking?: boolean;
}

const BOARD_SIZE = 8;
const CELL_SIZE = 0.5;
const BOARD_LENGTH = (BOARD_SIZE - 1) * CELL_SIZE;

// Modern stone material properties with sensible colors
const stoneMaterialProps = (player: Player) => {
  if (player === 1) {
    // Deep black with subtle blue highlights - classic and elegant
    return {
      color: '#1F2937',
      roughness: 0.15,
      metalness: 0.8,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      sheen: 2.0,
      sheenColor: '#374151',
      transmission: 0.1,
      emissive: '#111827',
      emissiveIntensity: 0.3,
    };
  }
  if (player === 2) {
    // Pure white with subtle pearl finish - clean and modern
    return {
      color: '#F8FAFC',
      roughness: 0.12,
      metalness: 0.6,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      sheen: 2.5,
      sheenColor: '#E2E8F0',
      transmission: 0.15,
      emissive: '#F1F5F9',
      emissiveIntensity: 0.4,
    };
  }
  return { color: 'transparent', opacity: 0 };
};

// Helper to render grid lines for a 3D cube - 팝 스타일!
const GridLines3D: React.FC = () => {
  const gridColor = '#FF6B35'; // 밝은 오렌지 - 팝 느낌!
  const frameColor = '#FF6B35'; // 그리드와 동일한 오렌지 색상으로 통일!
  if (BOARD_SIZE < 2) return null;
  const lines = [];
  
  // Interior grid lines
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      // Defensive: only push lines if coordinates are finite
      if (isFinite(i) && isFinite(j)) {
        // X lines (interior)
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
            <lineBasicMaterial color={gridColor} linewidth={2} transparent opacity={0.6} />
          </line>
        );
        // Y lines (interior)
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
            <lineBasicMaterial color={gridColor} linewidth={2} transparent opacity={0.6} />
          </line>
        );
        // Z lines (interior)
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
            <lineBasicMaterial color={gridColor} linewidth={2} transparent opacity={0.6} />
          </line>
        );
      }
    }
  }
  
  // Cube frame edges (more prominent)
  const cubeEdges = [
    // Bottom face edges
    [[0, 0, 0], [BOARD_LENGTH, 0, 0]],
    [[0, 0, 0], [0, BOARD_LENGTH, 0]],
    [[0, 0, 0], [0, 0, BOARD_LENGTH]],
    [[BOARD_LENGTH, 0, 0], [BOARD_LENGTH, BOARD_LENGTH, 0]],
    [[BOARD_LENGTH, 0, 0], [BOARD_LENGTH, 0, BOARD_LENGTH]],
    [[0, BOARD_LENGTH, 0], [BOARD_LENGTH, BOARD_LENGTH, 0]],
    [[0, BOARD_LENGTH, 0], [0, BOARD_LENGTH, BOARD_LENGTH]],
    [[0, 0, BOARD_LENGTH], [BOARD_LENGTH, 0, BOARD_LENGTH]],
    [[0, 0, BOARD_LENGTH], [0, BOARD_LENGTH, BOARD_LENGTH]],
    // Top face edges
    [[BOARD_LENGTH, BOARD_LENGTH, 0], [BOARD_LENGTH, BOARD_LENGTH, BOARD_LENGTH]],
    [[BOARD_LENGTH, 0, BOARD_LENGTH], [BOARD_LENGTH, BOARD_LENGTH, BOARD_LENGTH]],
    [[0, BOARD_LENGTH, BOARD_LENGTH], [BOARD_LENGTH, BOARD_LENGTH, BOARD_LENGTH]],
  ];
  
  cubeEdges.forEach((edge, index) => {
    const [start, end] = edge;
    lines.push(
      <line key={`frame-${index}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              start[0], start[1], start[2],
              end[0], end[1], end[2],
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={frameColor} linewidth={3} transparent opacity={0.9} />
      </line>
    );
  });
  
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
  
  // Roll-free rotation using yaw and pitch angles only
  const yawAngle = useRef(0);
  const pitchAngle = useRef(0);
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const yawVelocity = useRef(0);
  const pitchVelocity = useRef(0);
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
    yawVelocity.current = 0;
    pitchVelocity.current = 0;
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isRotating) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;

    // Update yaw and pitch velocities
    yawVelocity.current = -deltaX * sensitivity; // Invert yaw to match mouse direction
    pitchVelocity.current = -deltaY * sensitivity; // Invert pitch to match mouse direction

    // Accumulate yaw and pitch angles - no roll component
    targetYaw.current += yawVelocity.current;
    targetPitch.current += pitchVelocity.current;
    
    // Allow over-the-top flips - no clamps on pitch

    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [isRotating, lastMousePos, sensitivity]);

  const handleMouseUp = useCallback(() => {
    setIsRotating(false);
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    
    // Normalize wheel delta for different devices (mouse wheel vs trackpad)
    let zoomDelta = event.deltaY;
    
    // Handle different wheel modes
    if (event.deltaMode === 1) {
      // Line mode (Firefox)
      zoomDelta *= 16;
    } else if (event.deltaMode === 2) {
      // Page mode
      zoomDelta *= 100;
    }
    
    // Apply zoom with better sensitivity
    const zoomSpeed = 0.002;
    const zoomAmount = zoomDelta * zoomSpeed * radius.current; // Scale with current distance
    radius.current += zoomAmount;
    
    // More generous zoom limits
    radius.current = Math.max(0.5, Math.min(100, radius.current));
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
      if (Math.abs(yawVelocity.current) > 0.001 || Math.abs(pitchVelocity.current) > 0.001) {
        // Continue rotation with momentum
        targetYaw.current += yawVelocity.current;
        targetPitch.current += pitchVelocity.current;
        
        // Dampen the velocities
        yawVelocity.current *= velocityDamping;
        pitchVelocity.current *= velocityDamping;
      }
    }

    // Smooth interpolation between current and target angles
    yawAngle.current += (targetYaw.current - yawAngle.current) * dampingFactor;
    pitchAngle.current += (targetPitch.current - pitchAngle.current) * dampingFactor;
    
    // Build quaternion from yaw and pitch only - no roll component
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle.current);
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchAngle.current);
    
    // Combine yaw and pitch - apply yaw first, then pitch
    const cameraRotation = new THREE.Quaternion().multiplyQuaternions(yawQuaternion, pitchQuaternion);
    
    // Apply rotation to base position vector to get camera position
    const position = basePosition.clone().multiplyScalar(radius.current);
    position.applyQuaternion(cameraRotation);
    position.add(targetVector);
    
    // Update camera position
    camera.position.copy(position);
    
    // Set camera orientation directly from rebuilt quaternion - no roll
    camera.quaternion.copy(cameraRotation);
    
    onCameraChange([position.x, position.y, position.z], target);
  });

  return null;
};

export const Gomoku3DBoard: React.FC<Gomoku3DCubeBoardProps> = ({ board, onPlaceStone, onUndo, currentPlayer, winner, hovered, setHovered, cameraPos, cameraTarget, onCameraChange, ghostStone, isAiThinking = false }) => {

  // Memoize the bumpMap so it's only generated once
  // const bumpMap = useMemo(() => {
  //   const canvas = generateNoiseTexture(128);
  //   const texture = new THREE.Texture(canvas);
  //   texture.needsUpdate = true;
  //   return texture;
  // }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: '0 auto', maxWidth: '100vw', maxHeight: '100vh', paddingTop: '0' }}>
      <Canvas camera={{ position: cameraPos, fov: 50 }} style={{ width: '100%', height: '100%' }}>
        <CustomCameraController target={cameraTarget} onCameraChange={onCameraChange} />
          {/* 3D Grid Lines */}
          <GridLines3D />
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
        
        {/* Enhanced clickable dots at every empty position */}
        {!isAiThinking && board.map((plane, z) =>
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
                  <sphereGeometry args={[0.025, 8, 8]} />
                  <meshStandardMaterial 
                    color={hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z ? '#64748B' : '#475569'} 
                    emissive={hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z ? '#374151' : '#1F2937'}
                    emissiveIntensity={hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z ? 0.2 : 0.05}
                    transparent 
                    opacity={hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z ? 0.8 : 0.5}
                  />
                </mesh>
              ) : null
            )
          )
        )}
        {/* 팝 스타일 컬러풀 조명! */}
        <directionalLight position={[10, 15, 10]} intensity={0.8} color="#FF69B4" castShadow />
        <directionalLight position={[-10, 10, 15]} intensity={0.6} color="#00BFFF" />
        <directionalLight position={[0, -10, 5]} intensity={0.5} color="#FFD700" />
        <ambientLight intensity={0.7} color="#E6E6FA" />
        <pointLight position={[0, 0, 0]} intensity={0.6} color="#FF1493" />
        <pointLight position={[BOARD_LENGTH, BOARD_LENGTH, BOARD_LENGTH]} intensity={0.5} color="#32FF32" />
        <pointLight position={[BOARD_LENGTH/2, BOARD_LENGTH/2, BOARD_LENGTH/2]} intensity={0.4} color="#FF6347" />

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

        {/* AI Thinking Overlay */}
        {isAiThinking && (
          <Html center style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 500,
              marginTop: -100,
              animation: 'pulse 1.5s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#4ade80',
                animation: 'pulse 1s ease-in-out infinite'
              }}></div>
              AI is analyzing...
            </div>
          </Html>
        )}
      </Canvas>
    </div>
  );
};