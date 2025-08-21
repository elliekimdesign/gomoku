import React, { useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';

export type Player = 0 | 1 | 2; // 0: empty, 1: black, 2: white
export type BoardState3D = Player[][][];

export const BOARD_SIZE = 10;
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
  // UX state
  const [previewMode, setPreviewMode] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<[number, number, number] | null>(null);
  
  // Stone placement mode state
  const [placementMode, setPlacementMode] = useState(false);
  const [placementPosition, setPlacementPosition] = useState<[number, number, number] | null>(null);
  const [placementOffset, setPlacementOffset] = useState<[number, number, number]>([0, 0, 0]);

  // New: Auto-snap and placeholder mode
  const [placeholderMode, setPlaceholderMode] = useState(false);
  const [placeholderPosition, setPlaceholderPosition] = useState<[number, number, number] | null>(null);
  const [snappedPosition, setSnappedPosition] = useState<[number, number, number] | null>(null);

  // New: Simple direction selection mode
  const [simpleDirectionMode, setSimpleDirectionMode] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number, number] | null>(null);
  const [directionOffset, setDirectionOffset] = useState<[number, number, number]>([0, 0, 0]);

  // New: Direction arrows mode for existing stones
  const [showDirectionArrows, setShowDirectionArrows] = useState(false);
  const [selectedStone, setSelectedStone] = useState<[number, number, number] | null>(null);

  // Handle direction selection
  const handleDirectionSelect = useCallback((direction: [number, number, number]) => {
    console.log('handleDirectionSelect called with direction:', direction); // 디버깅용
    if (!selectedPosition) {
      console.log('No selectedPosition, returning'); // 디버깅용
      return;
    }
    
    const [x, y, z] = selectedPosition;
    const [dx, dy, dz] = direction;
    
    // 새로운 위치 계산
    const newX = x + dx;
    const newY = y + dy;
    const newZ = z + dz;
    
    console.log('Calculated new position:', { newX, newY, newZ }); // 디버깅용
    
    // 유효한 위치인지 확인
    if (newX >= 0 && newX < BOARD_SIZE &&
        newY >= 0 && newY < BOARD_SIZE &&
        newZ >= 0 && newZ < BOARD_SIZE &&
        board[newZ][newY][newX] === 0) {
      
      console.log('Position is valid, starting placement mode'); // 디버깅용
      // 배치 모드 시작
      setSimpleDirectionMode(false);
      setPlacementMode(true);
      setPlacementPosition([x, y, z]);
      setPlacementOffset([dx, dy, dz]);
    } else {
      console.log('Position is invalid or occupied'); // 디버깅용
    }
  }, [selectedPosition, board]);

  // New: Handle existing stone click to show direction arrows
  const handleExistingStoneClick = useCallback((x: number, y: number, z: number) => {
    if (winner !== 0) return;
    
    // 이미 방향키가 표시되어 있다면 숨기기
    if (showDirectionArrows && selectedStone && 
        selectedStone[0] === x && selectedStone[1] === y && selectedStone[2] === z) {
      setShowDirectionArrows(false);
      setSelectedStone(null);
      return;
    }
    
    // 새로운 돌을 선택하고 방향키 표시
    setSelectedStone([x, y, z]);
    setShowDirectionArrows(true);
    setSimpleDirectionMode(false);
    setPlacementMode(false);
    setPlacementPosition(null);
    setPlacementOffset([0, 0, 0]);
  }, [winner, showDirectionArrows, selectedStone]);
  
  // Handle click for preview mode (unused but kept for compatibility)
  const handleIntersectionClick = useCallback((x: number, y: number, z: number) => {
    if (winner !== 0) return;
    
    if (simpleDirectionMode && selectedPosition) {
      // 간단한 방향 선택 모드에서 클릭하면 돌 배치
      const [sx, sy, sz] = selectedPosition;
      const [dx, dy, dz] = directionOffset;
      const finalX = sx + dx;
      const finalY = sy + dy;
      const finalZ = sz + dz;
      
      if (finalX >= 0 && finalX < BOARD_SIZE &&
          finalY >= 0 && finalY < BOARD_SIZE &&
          finalZ >= 0 && finalZ < BOARD_SIZE &&
          board[finalZ][finalY][finalX] === 0) {
        onPlaceStone(finalX, finalY, finalZ);
      }
      
      // 모드 종료
      setSimpleDirectionMode(false);
      setSelectedPosition(null);
      setDirectionOffset([0, 0, 0]);
      return;
    }
    
    if (placeholderMode && placeholderPosition) {
      // 플레이스홀더 모드에서 클릭하면 돌 배치
      onPlaceStone(x, y, z);
      setPlaceholderMode(false);
      setPlaceholderPosition(null);
      setSnappedPosition(null);
      return;
    }
    
    if (previewMode && previewPosition) {
      // Confirm placement - 실제로 돌을 놓고 배치 모드 시작
      console.log('Confirming placement and starting direction mode'); // 디버깅용
      onPlaceStone(x, y, z);
      setPreviewMode(false);
      setPreviewPosition(null);

      // 방향 선택 모드 시작
      console.log('Setting direction mode to true'); // 디버깅용
      setSimpleDirectionMode(true);
      setSelectedPosition([x, y, z]);
      setPlacementMode(false);
      setPlacementPosition(null);
      setPlacementOffset([0, 0, 0]);
    } else {
      // Enter preview mode
      console.log('Entering preview mode'); // 디버깅용
      setPreviewMode(true);
      setPreviewPosition([x, y, z]);
    }
  }, [winner, simpleDirectionMode, selectedPosition, directionOffset, placeholderMode, placeholderPosition, previewMode, previewPosition, onPlaceStone, board]);

  // Cube rotation state
  const [cubeRotation, setCubeRotation] = useState({ x: 0, y: 0, z: 0 });

  // Handle cube rotation with arrow keys
  const rotateCube = useCallback((axis: 'x' | 'y' | 'z', direction: number) => {
    setCubeRotation(prev => ({
      ...prev,
      [axis]: prev[axis] + (direction * Math.PI / 2) // 90도씩 회전
    }));
  }, []);



  // New: Simple direction selection system
  const handleSimpleDirectionSelect = useCallback((direction: [number, number, number]) => {
    console.log('handleSimpleDirectionSelect called with:', direction);
    console.log('selectedPosition:', selectedPosition);
    console.log('simpleDirectionMode:', simpleDirectionMode);
    
    if (!selectedPosition) {
      console.log('No selectedPosition, returning');
      return;
    }
    
    const [x, y, z] = selectedPosition;
    const [dx, dy, dz] = direction;
    
    console.log('Current position:', [x, y, z]);
    console.log('Direction offset:', [dx, dy, dz]);
    
    // 새로운 위치 계산
    const newX = x + dx;
    const newY = y + dy;
    const newZ = z + dz;
    
    console.log('New calculated position:', [newX, newY, newZ]);
    
    // 유효한 위치인지 확인
    if (newX >= 0 && newX < BOARD_SIZE &&
        newY >= 0 && newY < BOARD_SIZE &&
        newZ >= 0 && newZ < BOARD_SIZE &&
        board[newZ][newY][newX] === 0) {
      
      console.log('Position is valid, setting direction offset');
      // 방향 오프셋 설정
      setDirectionOffset([dx, dy, dz]);
    } else {
      console.log('Position is invalid or occupied');
    }
  }, [selectedPosition, board, simpleDirectionMode]);

  // New: Handle simple click to start direction mode
  const handleSimpleClick = useCallback((x: number, y: number, z: number) => {
    if (winner !== 0 || board[z][y][x] !== 0) return;
    
    // 간단한 방향 선택 모드 시작
    setSelectedPosition([x, y, z]);
    setSimpleDirectionMode(true);
    setDirectionOffset([0, 0, 0]);
    
    // 다른 모드들 비활성화
    setPreviewMode(false);
    setPlacementMode(false);
    setPlaceholderMode(false);
    setShowDirectionArrows(false);
    
    console.log('Simple direction mode started at:', [x, y, z]);
  }, [winner, board]);
  
  // Handle escape key to cancel preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key, 'Code:', e.code, 'Meta:', e.metaKey, 'Shift:', e.shiftKey, 'Ctrl:', e.ctrlKey); // 디버깅용
      
      if (e.key === 'Escape') {
        // ESC 키를 undo로 변경
        if (simpleDirectionMode) {
          // 간단한 방향 선택 모드면 취소
          setSimpleDirectionMode(false);
          setSelectedPosition(null);
          setDirectionOffset([0, 0, 0]);
        } else if (placeholderMode) {
          // 플레이스홀더 모드면 취소
          setPlaceholderMode(false);
          setPlaceholderPosition(null);
          setSnappedPosition(null);
        } else {
          // 그 외에는 undo
          onUndo();
        }
        return;
      }

      // Cube rotation with arrow keys (when not in any special mode)
      if (!simpleDirectionMode && !placementMode && !placeholderMode) {
        switch (e.key) {
          case 'ArrowUp':
            rotateCube('x', -1); // X축 위로 회전
            e.preventDefault();
            return;
          case 'ArrowDown':
            rotateCube('x', 1); // X축 아래로 회전
            e.preventDefault();
            return;
          case 'ArrowLeft':
            rotateCube('y', -1); // Y축 왼쪽으로 회전
            e.preventDefault();
            return;
          case 'ArrowRight':
            rotateCube('y', 1); // Y축 오른쪽으로 회전
            e.preventDefault();
            return;
          case 'PageUp':
          case '[':
            rotateCube('z', -1); // Z축 시계 반대방향 회전
            e.preventDefault();
            return;
          case 'PageDown':
          case ']':
            rotateCube('z', 1); // Z축 시계방향 회전
            e.preventDefault();
            return;
        }
      }

      // Simple direction selection mode controls - 더 간단하게
      if (simpleDirectionMode && selectedPosition) {
        console.log('=== DIRECTION MODE ACTIVE ===');
        console.log('Key pressed:', e.key);
        console.log('simpleDirectionMode:', simpleDirectionMode);
        console.log('selectedPosition:', selectedPosition);
        console.log('current directionOffset:', directionOffset);
        
        let direction: [number, number, number] | null = null;
        
        // 키 코드와 키 이름 둘 다 체크
        const key = e.key.toLowerCase();
        const code = e.code.toLowerCase();
        
        if (key === 'd' || code === 'keyd' || key === '6') {
          direction = [1, 0, 0]; // 오른쪽
        } else if (key === 'a' || code === 'keya' || key === '4') {
          direction = [-1, 0, 0]; // 왼쪽
        } else if (key === 'w' || code === 'keyw' || key === '8') {
          direction = [0, 1, 0]; // 위쪽
        } else if (key === 's' || code === 'keys' || key === '2') {
          direction = [0, -1, 0]; // 아래쪽
        } else if (key === 'q' || code === 'keyq' || key === '9') {
          direction = [0, 0, 1]; // 앞쪽
        } else if (key === 'e' || code === 'keye' || key === '1') {
          direction = [0, 0, -1]; // 뒤쪽
        } else if (key === ' ' || code === 'space') {
          // 스페이스바로 돌 배치
          console.log('Spacebar pressed - placing stone');
          const [x, y, z] = selectedPosition;
          const [dx, dy, dz] = directionOffset;
          const finalX = x + dx;
          const finalY = y + dy;
          const finalZ = z + dz;
          
          console.log('Final position:', [finalX, finalY, finalZ]);
          
          if (finalX >= 0 && finalX < BOARD_SIZE &&
              finalY >= 0 && finalY < BOARD_SIZE &&
              finalZ >= 0 && finalZ < BOARD_SIZE &&
              board[finalZ][finalY][finalX] === 0) {
            onPlaceStone(finalX, finalY, finalZ);
          }
          
          // 모드 종료
          setSimpleDirectionMode(false);
          setSelectedPosition(null);
          setDirectionOffset([0, 0, 0]);
          return;
        }
        
        if (direction) {
          console.log('Processing direction:', direction); // 디버깅용
          handleSimpleDirectionSelect(direction);
        }
      }

      // Stone placement mode controls
      if (placementMode && placementPosition) {
        console.log('Placement mode active, key pressed:', e.key); // 디버깅용
        const [x, y, z] = placementPosition;
        const [offsetX, offsetY, offsetZ] = placementOffset;

        switch (e.key.toLowerCase()) {
          case 'd':
          case '6':
            console.log('Moving right (X+)'); // 디버깅용
            const newXRight = Math.min(BOARD_SIZE - 1, x + offsetX + 1);
            if (newXRight < BOARD_SIZE) {
              setPlacementOffset([offsetX + 1, offsetY, offsetZ]);
            }
            break;
          case 'w':
          case '8':
            console.log('Moving up (Y+)'); // 디버깅용
            const newYUp = Math.min(BOARD_SIZE - 1, y + offsetY + 1);
            if (newYUp < BOARD_SIZE) {
              setPlacementOffset([offsetX, offsetY + 1, offsetZ]);
            }
            break;
          case 's':
          case '2':
            console.log('Moving down (Y-)'); // 디버깅용
            const newYDown = Math.max(0, y + offsetY - 1);
            if (newYDown >= 0) {
              setPlacementOffset([offsetX, offsetY - 1, offsetZ]);
            }
            break;
          case 'a':
          case '4':
            console.log('Moving left (X-)'); // 디버깅용
            const newXLeft = Math.max(0, x + offsetX - 1);
            if (newXLeft >= 0) {
              setPlacementOffset([offsetX - 1, offsetY, offsetZ]);
            }
            break;
          case 'q':
          case '9':
            console.log('Moving forward (Z+)'); // 디버깅용
            const newZUp = Math.min(BOARD_SIZE - 1, z + offsetZ + 1);
            if (newZUp < BOARD_SIZE) {
              setPlacementOffset([offsetX, offsetY, offsetZ + 1]);
            }
            break;
          case 'e':
          case '1':
            console.log('Moving backward (Z-)'); // 디버깅용
            const newZDown = Math.max(0, z + offsetZ - 1);
            if (newZDown >= 0) {
              setPlacementOffset([offsetX, offsetY, offsetZ - 1]);
            }
            break;
          case ' ':
            console.log('Confirming placement'); // 디버깅용
            // 스페이스로 확정
            const finalX = x + offsetX;
            const finalY = y + offsetY;
            const finalZ = z + offsetZ;

            // 유효한 위치인지 확인
            if (finalX >= 0 && finalX < BOARD_SIZE &&
                finalY >= 0 && finalY < BOARD_SIZE &&
                finalZ >= 0 && finalZ < BOARD_SIZE &&
                board[finalZ][finalY][finalX] === 0) {
              onPlaceStone(finalX, finalY, finalZ);
            }

            // 배치 모드 종료
            setPlacementMode(false);
            setPlacementPosition(null);
            setPlacementOffset([0, 0, 0]);
            break;
        }
      }

      // New: Placeholder mode controls
      if (placeholderMode && placeholderPosition) {
        const [x, y, z] = placeholderPosition;
        
        switch (e.key.toLowerCase()) {
          case 'd':
          case '6':
            const newXRight = Math.min(BOARD_SIZE - 1, x + 1);
            if (newXRight < BOARD_SIZE && board[z][y][newXRight] === 0) {
              setPlaceholderPosition([newXRight, y, z]);
            }
            break;
          case 'w':
          case '8':
            const newYUp = Math.min(BOARD_SIZE - 1, y + 1);
            if (newYUp < BOARD_SIZE && board[z][newYUp][x] === 0) {
              setPlaceholderPosition([x, newYUp, z]);
            }
            break;
          case 's':
          case '2':
            const newYDown = Math.max(0, y - 1);
            if (newYDown >= 0 && board[z][newYDown][x] === 0) {
              setPlaceholderPosition([x, newYDown, z]);
            }
            break;
          case 'a':
          case '4':
            const newXLeft = Math.max(0, x - 1);
            if (newXLeft >= 0 && board[z][y][newXLeft] === 0) {
              setPlaceholderPosition([newXLeft, y, z]);
            }
            break;
          case 'q':
          case '9':
            const newZUp = Math.min(BOARD_SIZE - 1, z + 1);
            if (newZUp < BOARD_SIZE && board[newZUp][y][x] === 0) {
              setPlaceholderPosition([x, y, newZUp]);
            }
            break;
          case 'e':
          case '1':
            const newZDown = Math.max(0, z - 1);
            if (newZDown >= 0 && board[newZDown][y][x] === 0) {
              setPlaceholderPosition([x, y, newZDown]);
            }
            break;
          case ' ':
            // 스페이스로 확정
            onPlaceStone(x, y, z);
            setPlaceholderMode(false);
            setPlaceholderPosition(null);
            setSnappedPosition(null);
            break;
        }
      }

      // New: Start placeholder mode with spacebar
      if (e.key === ' ' && !placeholderMode && !placementMode && !previewMode && !simpleDirectionMode) {
        if (snappedPosition && board[snappedPosition[2]][snappedPosition[1]][snappedPosition[0]] === 0) {
          setPlaceholderMode(true);
          setPlaceholderPosition(snappedPosition);
          console.log('Placeholder mode started at:', snappedPosition);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // 마우스 휠 이벤트 핸들러
    const handleWheel = (e: WheelEvent) => {
      if (placementMode && placementPosition) {
        e.preventDefault();
        const [x, y, z] = placementPosition;
        const [offsetX, offsetY, offsetZ] = placementOffset;

        if (e.deltaY < 0) {
          // 휠을 위로 (앞으로 이동)
          console.log('Wheel up - Moving forward (Z+)');
          const newZUp = Math.min(BOARD_SIZE - 1, z + offsetZ + 1);
          if (newZUp < BOARD_SIZE) {
            setPlacementOffset([offsetX, offsetY, offsetZ + 1]);
          }
        } else {
          // 휠을 아래로 (뒤로 이동)
          console.log('Wheel down - Moving backward (Z-)');
          const newZDown = Math.max(0, z + offsetZ - 1);
          if (newZDown >= 0) {
            setPlacementOffset([offsetX, offsetY, offsetZ - 1]);
          }
        }
      }
    };
    
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [previewMode, placementMode, placementPosition, placementOffset, board, onPlaceStone, simpleDirectionMode, selectedPosition, directionOffset, handleSimpleDirectionSelect, onUndo, placeholderMode, placeholderPosition, snappedPosition]);



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

      {/* Cube Rotation Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ marginBottom: '8px', color: '#60A5FA' }}>🎲 CUBE ROTATION</div>
        <div style={{ fontSize: '11px', lineHeight: '1.4', opacity: 0.9 }}>
          <div>↑↓ X-Axis Rotation</div>
          <div>←→ Y-Axis Rotation</div>
          <div>[ ] Z-Axis Rotation</div>
          <div style={{ marginTop: '4px', opacity: 0.7 }}>90° steps</div>
        </div>
      </div>

      <Canvas camera={{ position: cameraPos, fov: 75 }} style={{ width: '100%', height: '100%', background: '#000000' }}>
        <CameraSync cameraPos={cameraPos} cameraTarget={cameraTarget} onCameraChange={onCameraChange} angleLocked={false} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 20]} intensity={0.7} />
        
        {/* Rotatable Cube Group - 모든 게임 요소를 포함 */}
        <group 
          rotation={[cubeRotation.x, cubeRotation.y, cubeRotation.z]}
          position={[0, 0, 0]}
        >
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
                    receiveShadow
                    onClick={() => handleExistingStoneClick(x, y, z)}
                  >
                    <sphereGeometry args={[0.18, 32, 32]} />
                    <meshPhysicalMaterial {...stoneMaterialProps(cell)} />
                  </mesh>
                ) : null
              )
            )
          )}

        {/* Elegant hover indicator - 세련되고 예쁜 호버 효과 */}
        {hovered && board[hovered[2]][hovered[1]][hovered[0]] === 0 && !winner && (
          <>
            {/* 부드러운 글로우 링 */}
            <mesh
              position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
            >
              <ringGeometry args={[0.15, 0.25, 32]} />
              <meshBasicMaterial 
                color={currentPlayer === 1 ? '#60A5FA' : '#F1F5F9'} 
                transparent 
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            
            {/* 중심 작은 도트 */}
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
            
            {/* 섬세한 십자가 가이드 라인 - 더 얇고 우아하게 */}
            {/* X축 라인 */}
            <mesh
              position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
            >
              <boxGeometry args={[CELL_SIZE * 0.6, 0.008, 0.008]} />
              <meshBasicMaterial 
                color={currentPlayer === 1 ? '#93C5FD' : '#CBD5E1'} 
                transparent 
                opacity={0.4} 
              />
            </mesh>
            
            {/* Y축 라인 */}
            <mesh
              position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
            >
              <boxGeometry args={[0.008, CELL_SIZE * 0.6, 0.008]} />
              <meshBasicMaterial 
                color={currentPlayer === 1 ? '#93C5FD' : '#CBD5E1'} 
                transparent 
                opacity={0.4} 
              />
            </mesh>
            
            {/* Z축 라인 */}
            <mesh
              position={[hovered[0] * CELL_SIZE, hovered[1] * CELL_SIZE, hovered[2] * CELL_SIZE]}
            >
              <boxGeometry args={[0.008, 0.008, CELL_SIZE * 0.6]} />
              <meshBasicMaterial 
                color={currentPlayer === 1 ? '#93C5FD' : '#CBD5E1'} 
                transparent 
                opacity={0.4} 
              />
            </mesh>
          </>
        )}
        {/* Elegant preview stone - 세련된 미리보기 돌 */}
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
        {/* Small visible dots at intersections - 원래 작은 점으로 복구 */}
        {board.map((plane, z) =>
          plane.map((row, y) =>
            row.map((cell, x) =>
              cell === 0 && !winner ? (
                <>
                  {/* Small visible dot - 원래 크기 */}
                  <mesh
                    key={`dot-${x}-{y}-${z}`}
                    position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                  >
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshBasicMaterial 
                      color="#666666" 
                      transparent 
                      opacity={0.3} 
                    />
                  </mesh>
                  
                  {/* Invisible hover detection sphere - 호버 감지용 */}
                  <mesh
                    key={`intersection-${x}-${y}-${z}`}
                    position={[x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE]}
                    onPointerOver={(e) => {
                      e.stopPropagation(); // 이벤트 전파 방지
                      console.log('Hover detected at:', [x, y, z], 'Distance:', e.distance);
                      // 기존 호버가 있으면 더 가까운 것만 선택
                      if (!hovered || e.distance < 0.3) {
                        setHovered([x, y, z]);
                      }
                    }}
                    onPointerOut={(e) => {
                      e.stopPropagation(); // 이벤트 전파 방지
                      console.log('Hover out at:', [x, y, z]);
                      // 현재 호버된 것과 같을 때만 제거
                      if (hovered && hovered[0] === x && hovered[1] === y && hovered[2] === z) {
                        setHovered(null);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // 이벤트 전파 방지
                      handleSimpleClick(x, y, z);
                    }}
                    visible={false}
                    raycast={() => null} // 레이캐스팅 최적화
                  >
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshStandardMaterial transparent opacity={0.0} />
                  </mesh>
                </>
              ) : null
            )
          )
        )}
        {/* Enhanced rim and fill lights for beauty on black background */}
        <directionalLight position={[0, 20, 0]} intensity={0.8} color={'#ffffff'} />
        <directionalLight position={[-20, 10, 20]} intensity={0.3} color={'#ffffff'} />
        <ambientLight intensity={0.7} color={'#ffffff'} />
        {/* Natural lighting for sky blue stones */}
        <pointLight position={[0, 0, 0]} intensity={0.2} color={'#93C5FD'} distance={12} />
        <pointLight position={[5, 5, 5]} intensity={0.15} color={'#60A5FA'} distance={10} />
        <pointLight position={[-5, -5, -5]} intensity={0.15} color={'#3B82F6'} distance={10} />
        </group>
        
        <OrbitControls
          enablePan={true} // 팬 기능 활성화 - 마우스 드래그로 그리드 이동 가능
          minDistance={1.0} // 최소 거리 - 너무 가까이 가서 교차점이 겹치지 않도록
          maxDistance={50} // 최대 거리 - 적당한 범위로 제한
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={1.5} // 줌 속도
          panSpeed={1.5} // 팬 속도
          rotateSpeed={0.8} // 회전 속도 - 적당히 조절
          // 축 고정으로 직관적인 회전
          enableDamping={true} // 부드러운 움직임 활성화
          dampingFactor={0.05} // 적당한 댐핑으로 부드럽게
          // 수직축(Y축) 고정 - 전통적인 3D 뷰어 방식
          // 이렇게 하면 그리드가 뒤집어지지 않고 직관적으로 회전됨
          target={[
            (BOARD_SIZE - 1) * CELL_SIZE / 2,
            (BOARD_SIZE - 1) * CELL_SIZE / 2,
            (BOARD_SIZE - 1) * CELL_SIZE / 2
          ]} // 보드 중심을 타겟으로 고정
          // 기본 마우스 조작 (표준)
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE, // 왼쪽 버튼으로 회전 (표준)
            MIDDLE: THREE.MOUSE.DOLLY, // 중간 버튼으로 줌
            RIGHT: THREE.MOUSE.PAN // 오른쪽 버튼으로 팬(이동)
          }}
          touches={{
            ONE: THREE.TOUCH.ROTATE, // 한 손가락으로 회전
            TWO: THREE.TOUCH.DOLLY_PAN // 두 손가락으로 줌+팬
          }}
          onChange={(e: any) => {
            if (e && e.target) {
              const cam = e.target.object;
              const tgt = e.target.target;
              onCameraChange([cam.position.x, cam.position.y, cam.position.z], [tgt.x, tgt.y, tgt.z]);
            }
          }}
        />
        
        {/* Simple direction mode visual feedback */}
        {simpleDirectionMode && selectedPosition && (
          <>
            {/* Selected position indicator */}
            <mesh
              position={[
                selectedPosition[0] * CELL_SIZE,
                selectedPosition[1] * CELL_SIZE,
                selectedPosition[2] * CELL_SIZE
              ]}
            >
              <sphereGeometry args={[0.25, 32, 32]} />
              <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
            </mesh>
            
            {/* Direction offset preview */}
            {directionOffset[0] !== 0 || directionOffset[1] !== 0 || directionOffset[2] !== 0 ? (
              <mesh
                position={[
                  (selectedPosition[0] + directionOffset[0]) * CELL_SIZE,
                  (selectedPosition[1] + directionOffset[1]) * CELL_SIZE,
                  (selectedPosition[2] + directionOffset[2]) * CELL_SIZE
                ]}
              >
                <sphereGeometry args={[0.22, 32, 32]} />
                <meshPhysicalMaterial
                  {...stoneMaterialProps(currentPlayer)}
                  transparent
                  opacity={0.8}
                  color="#FF6B6B" // 방향 선택된 위치는 빨간색으로 표시
                />
              </mesh>
            ) : null}
          </>
        )}

        {/* Simple direction mode instructions */}
        {simpleDirectionMode && (
          <Html position={[20, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              <div>QWEASD: Select Direction • SPACE: Place Stone • ESC: Cancel</div>
            </div>
          </Html>
        )}

        {/* Preview mode instructions - Right Side */}
        {previewMode && (
          <Html position={[20, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              <div>Click to confirm • ESC to cancel</div>
            </div>
          </Html>
        )}

        {/* Placement mode instructions - Right Side */}
        {placementMode && (
          <Html position={[20, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              <div>WASD: Move • Q/E: Forward/Back • Mouse Wheel: Forward/Back • SPACE: Confirm • ESC: Cancel</div>
            </div>
          </Html>
        )}

        {/* Placement mode status display */}
        {placementMode && placementPosition && (
          <Html position={[20, 20, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'monospace',
            }}>
              <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>🎯 Placement Mode Active</div>
              <div>Original: ({placementPosition[0]}, {placementPosition[1]}, {placementPosition[2]})</div>
              <div>Offset: ({placementOffset[0]}, {placementOffset[1]}, {placementOffset[2]})</div>
              <div style={{ fontWeight: 'bold', color: '#FFD700' }}>Final: ({placementPosition[0] + placementOffset[0]}, {placementPosition[1] + placementOffset[1]}, {placementPosition[2] + placementOffset[2]})</div>
              <div style={{ fontSize: 12, color: '#ccc', marginTop: '0.5rem' }}>
                Board Range: 0 to {BOARD_SIZE - 1}
              </div>
            </div>
          </Html>
        )}

        {/* Placement mode stone preview */}
        {placementMode && placementPosition && (
          <>
            {/* 원래 돌 위치 표시 */}
            <mesh
              position={[
                placementPosition[0] * CELL_SIZE,
                placementPosition[1] * CELL_SIZE,
                placementPosition[2] * CELL_SIZE
              ]}
            >
              <sphereGeometry args={[0.18, 32, 32]} />
              <meshPhysicalMaterial
                {...stoneMaterialProps(currentPlayer)}
                transparent
                opacity={0.6}
              />
            </mesh>

            {/* 이동한 위치에 새로운 돌 미리보기 */}
            {placementOffset[0] !== 0 || placementOffset[1] !== 0 || placementOffset[2] !== 0 ? (
              <mesh
                position={[
                  (placementPosition[0] + placementOffset[0]) * CELL_SIZE,
                  (placementPosition[1] + placementOffset[1]) * CELL_SIZE,
                  (placementPosition[2] + placementOffset[2]) * CELL_SIZE
                ]}
              >
                <sphereGeometry args={[0.18, 32, 32]} />
                <meshPhysicalMaterial
                  {...stoneMaterialProps(currentPlayer)}
                  transparent
                  opacity={0.9}
                  color="#ff6b6b" // 이동한 위치는 빨간색으로 표시
                />
              </mesh>
            ) : null}
          </>
        )}

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

        {/* Enhanced snap point dot - 더 크고 선명하게 */}
        {(hovered || snappedPosition) && board[(hovered || snappedPosition)![2]][(hovered || snappedPosition)![1]][(hovered || snappedPosition)![0]] === 0 && !winner && !placementMode && (
          <mesh position={[(hovered || snappedPosition)![0] * CELL_SIZE, (hovered || snappedPosition)![1] * CELL_SIZE, (hovered || snappedPosition)![2] * CELL_SIZE]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        )}

        {/* Placeholder stone - 플레이스홀더 모드에서 표시 */}
        {placeholderMode && placeholderPosition && (
          <mesh
            position={[
              placeholderPosition[0] * CELL_SIZE,
              placeholderPosition[1] * CELL_SIZE,
              placeholderPosition[2] * CELL_SIZE
            ]}
          >
            <sphereGeometry args={[0.22, 32, 32]} />
            <meshPhysicalMaterial
              {...stoneMaterialProps(currentPlayer)}
              transparent
              opacity={0.8}
              color="#FF6B6B" // 플레이스홀더는 빨간색으로 표시
            />
          </mesh>
        )}

        {/* Placeholder mode instructions */}
        {placeholderMode && (
          <Html position={[20, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              <div>WASD: Move • Q/E: Forward/Back • SPACE: Confirm • ESC: Undo</div>
            </div>
          </Html>
        )}

        {/* Direction Control Panel - Bottom Left */}
        <Html position={[-20, -20, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            zIndex: 1000,
            background: 'rgba(0,0,0,0.8)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'auto',
          }}>
            {/* Title */}
            <div style={{
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '8px',
              opacity: 0.8,
            }}>
              DIRECTION
            </div>
            
            {/* Up Row */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '24px', height: '24px' }}></div>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('W button clicked');
                  if (simpleDirectionMode && selectedPosition) {
                    console.log('Processing W direction');
                    handleSimpleDirectionSelect([0, 1, 0]);
                  }
                }}
              >
                W
              </button>
              <div style={{ width: '24px', height: '24px' }}></div>
            </div>
            
            {/* Middle Row */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('A button clicked');
                  if (simpleDirectionMode && selectedPosition) {
                    console.log('Processing A direction');
                    handleSimpleDirectionSelect([-1, 0, 0]);
                  }
                }}
              >
                A
              </button>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('S button clicked');
                  if (simpleDirectionMode && selectedPosition) {
                    console.log('Processing S direction');
                    handleSimpleDirectionSelect([0, -1, 0]);
                  }
                }}
              >
                S
              </button>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('D button clicked');
                  if (simpleDirectionMode && selectedPosition) {
                    console.log('Processing D direction');
                    handleSimpleDirectionSelect([1, 0, 0]);
                  }
                }}
              >
                D
              </button>
            </div>
            
            {/* Bottom Row */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Q button clicked');
                  if (simpleDirectionMode && selectedPosition) {
                    console.log('Processing Q direction');
                    handleSimpleDirectionSelect([0, 0, -1]);
                  }
                }}
              >
                Q
              </button>
              <div style={{ width: '24px', height: '24px' }}></div>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('E button clicked');
                  if (simpleDirectionMode && selectedPosition) {
                    console.log('Processing E direction');
                    handleSimpleDirectionSelect([0, 0, 1]);
                  }
                }}
              >
                E
              </button>
            </div>
            
            {/* Spacebar button */}
            <button
              style={{
                marginTop: '8px',
                width: '60px',
                height: '24px',
                background: simpleDirectionMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = simpleDirectionMode ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255,255,255,0.2)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = simpleDirectionMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('Spacebar button clicked');
                if (simpleDirectionMode && selectedPosition) {
                  console.log('Processing spacebar - placing stone');
                  const [x, y, z] = selectedPosition;
                  const [dx, dy, dz] = directionOffset;
                  const finalX = x + dx;
                  const finalY = y + dy;
                  const finalZ = z + dz;
                  
                  if (finalX >= 0 && finalX < BOARD_SIZE &&
                      finalY >= 0 && finalY < BOARD_SIZE &&
                      finalZ >= 0 && finalZ < BOARD_SIZE &&
                      board[finalZ][finalY][finalX] === 0) {
                    onPlaceStone(finalX, finalY, finalZ);
                  }
                  
                  // 모드 종료
                  setSimpleDirectionMode(false);
                  setSelectedPosition(null);
                  setDirectionOffset([0, 0, 0]);
                }
              }}
            >
              SPACE
            </button>
            
            {/* Status Indicator */}
            <div style={{
              marginTop: '4px',
              padding: '2px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '3px',
              fontSize: '8px',
              color: simpleDirectionMode ? '#4CAF50' : '#fff',
              fontWeight: '600',
              opacity: 0.8,
            }}>
              {simpleDirectionMode ? 'ACTIVE' : 'READY'}
            </div>
          </div>
        </Html>
        {/* Direction arrows around selected existing stone */}
        {showDirectionArrows && selectedStone && (
          <>
            {/* Up arrow */}
            <mesh
              position={[
                selectedStone[0] * CELL_SIZE,
                selectedStone[1] * CELL_SIZE + 0.4,
                selectedStone[2] * CELL_SIZE
              ]}
              onClick={() => {
                const [x, y, z] = selectedStone;
                const newY = y + 1;
                if (newY < BOARD_SIZE && board[z][newY][x] === 0) {
                  onPlaceStone(x, newY, z);
                  setShowDirectionArrows(false);
                  setSelectedStone(null);
                }
              }}
            >
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
            
            {/* Down arrow */}
            <mesh
              position={[
                selectedStone[0] * CELL_SIZE,
                selectedStone[1] * CELL_SIZE - 0.4,
                selectedStone[2] * CELL_SIZE
              ]}
              onClick={() => {
                const [x, y, z] = selectedStone;
                const newY = y - 1;
                if (newY >= 0 && board[z][newY][x] === 0) {
                  onPlaceStone(x, newY, z);
                  setShowDirectionArrows(false);
                  setSelectedStone(null);
                }
              }}
            >
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
            
            {/* Left arrow */}
            <mesh
              position={[
                selectedStone[0] * CELL_SIZE - 0.4,
                selectedStone[1] * CELL_SIZE,
                selectedStone[2] * CELL_SIZE
              ]}
              onClick={() => {
                const [x, y, z] = selectedStone;
                const newX = x - 1;
                if (newX >= 0 && board[z][y][newX] === 0) {
                  onPlaceStone(newX, y, z);
                  setShowDirectionArrows(false);
                  setSelectedStone(null);
                }
              }}
            >
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
            
            {/* Right arrow */}
            <mesh
              position={[
                selectedStone[0] * CELL_SIZE + 0.4,
                selectedStone[1] * CELL_SIZE,
                selectedStone[2] * CELL_SIZE
              ]}
              onClick={() => {
                const [x, y, z] = selectedStone;
                const newX = x + 1;
                if (newX < BOARD_SIZE && board[z][y][newX] === 0) {
                  onPlaceStone(newX, y, z);
                  setShowDirectionArrows(false);
                  setSelectedStone(null);
                }
              }}
            >
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
            
            {/* Forward arrow */}
            <mesh
              position={[
                selectedStone[0] * CELL_SIZE,
                selectedStone[1] * CELL_SIZE,
                selectedStone[2] * CELL_SIZE + 0.4
              ]}
              onClick={() => {
                const [x, y, z] = selectedStone;
                const newZ = z + 1;
                if (newZ < BOARD_SIZE && board[newZ][y][x] === 0) {
                  onPlaceStone(x, y, newZ);
                  setShowDirectionArrows(false);
                  setSelectedStone(null);
                }
              }}
            >
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
            
            {/* Backward arrow */}
            <mesh
              position={[
                selectedStone[0] * CELL_SIZE,
                selectedStone[1] * CELL_SIZE,
                selectedStone[2] * CELL_SIZE - 0.4
              ]}
              onClick={() => {
                const [x, y, z] = selectedStone;
                const newZ = z - 1;
                if (newZ >= 0 && board[newZ][y][x] === 0) {
                  onPlaceStone(x, y, newZ);
                  setShowDirectionArrows(false);
                  setSelectedStone(null);
                }
              }}
            >
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
          </>
        )}
      </Canvas>
    </div>
  );
};