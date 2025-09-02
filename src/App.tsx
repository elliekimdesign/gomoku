import React, { useState, useCallback, useEffect } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { Gomoku3DBoard, BoardState3D, Player } from './components/Gomoku3DBoard';
import { GameSetup } from './components/GameSetup';
import { isForbiddenMove, isLegalMove } from './utils/gameRules';
import { GomokuAI } from './ai';

// Extend styled-components DefaultTheme
declare module 'styled-components' {
  export interface DefaultTheme {
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
  }
}


const BOARD_SIZE = 8;
const WIN_COUNT = 5;

// Theme definitions
export type Theme = 'light' | 'dark';

export const themes = {
  light: {
    background: '#f5f6fa',
    text: '#23242b',
    cardBackground: 'rgba(255, 255, 255, 0.95)',
    buttonBackground: '#222',
    buttonText: '#fff',
    buttonHover: '#444',
    gridLines: '#888',
    clickableDots: '#888888',
    hoverDots: '#ff0000',
    ambientLight: '#f5f6fa',
    directionalLight1: '#ffe6b3',
    directionalLight2: '#b3d1ff',
  },
  dark: {
    background: '#2c2c2c',
    text: '#e2e8f0',
    cardBackground: 'rgba(55, 65, 81, 0.95)',
    buttonBackground: '#4a5568',
    buttonText: '#e2e8f0',
    buttonHover: '#718096',
    gridLines: '#666',
    clickableDots: '#aaaaaa',
    hoverDots: '#ff4444',
    ambientLight: '#f5f6fa',
    directionalLight1: '#ffe6b3',
    directionalLight2: '#b3d1ff',
  },
};

// Preload audio files for better performance
const audioCache = new Map<string, HTMLAudioElement>();

const preloadAudio = (url: string): HTMLAudioElement => {
  if (audioCache.has(url)) {
    return audioCache.get(url)!;
  }
  
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = 0.6; // Adjust volume as needed (0.0 to 1.0)
  audioCache.set(url, audio);
  return audio;
};

// Initialize preloaded audio on module load
const stoneAudio = preloadAudio('/sounds/stone.mp3');
const winAudio = preloadAudio('/sounds/win.mp3');

// Audio utility function for stone placement sounds using preloaded audio
const playStoneSound = (player: Player, isMuted: boolean) => {
  if (isMuted) return; // Skip audio if muted
  
  try {
    // Using the same preloaded sound for both players
    const audio = stoneAudio;
    
    // Alternative: different sounds for each player (would need separate preloading)
    // const audio = player === 1 ? preloadAudio('/sounds/black-stone.mp3') : preloadAudio('/sounds/white-stone.mp3');
    
    // Reset to beginning and play
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.warn('Audio playback failed:', error);
    });
  } catch (error) {
    console.warn('Audio setup failed:', error);
  }
};

// Audio utility function for win sound
const playWinSound = (isMuted: boolean) => {
  if (isMuted) return; // Skip audio if muted
  
  try {
    const audio = winAudio;
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.warn('Win audio playback failed:', error);
    });
  } catch (error) {
    console.warn('Win audio setup failed:', error);
  }
};


const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    font-family: 'Inter', 'Roboto', Arial, sans-serif;
    background: ${props => props.theme.background};
    color: ${props => props.theme.text};
    transition: background-color 0.3s ease, color 0.3s ease;
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
  color: ${props => props.theme.text};
  margin-bottom: 0.5rem;
  letter-spacing: 0.01em;
  transition: color 0.3s ease;
`;



const Button = styled.button`
  background: ${props => props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  cursor: pointer;
  transition: background 0.3s ease, color 0.3s ease;
  &:hover {
    background: ${props => props.theme.buttonHover};
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
  background: ${props => props.theme.cardBackground};
  border-radius: 50px;
  padding: 12px 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  min-width: 180px;
  height: 70px;
  transition: all 0.3s ease;
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
  color: ${props => props.theme.text};
  transition: color 0.3s ease;
  
  &.thinking {
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;



const RotationControls = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: ${props => props.theme.cardBackground};
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s ease;
`;

const ZoomControls = styled.div`
  position: fixed;
  bottom: 170px;
  right: 88px;
  transform: translateX(50%);
  background: ${props => props.theme.cardBackground};
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  display: flex;
  gap: 4px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s ease;
`;


const RotationButton = styled.button`
  width: 40px;
  height: 40px;
  background: ${props => props.theme.cardBackground};
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.text};
  transition: all 0.15s ease;
  
  &:hover {
    background: ${props => props.theme.buttonBackground};
    color: ${props => props.theme.buttonText};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &.center {
    background: ${props => props.theme.buttonBackground};
    color: ${props => props.theme.buttonText};
    border-color: ${props => props.theme.buttonBackground};
    
    &:hover {
      background: ${props => props.theme.buttonHover};
    }
  }
`;

const ZoomButton = styled.button`
  width: 40px;
  height: 40px;
  background: ${props => props.theme.cardBackground};
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.text};
  transition: all 0.15s ease;
  
  &:hover {
    background: ${props => props.theme.buttonBackground};
    color: ${props => props.theme.buttonText};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const MuteControls = styled.div`
  position: fixed;
  bottom: 250px;
  right: 88px;
  transform: translateX(50%);
  background: ${props => props.theme.cardBackground};
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  display: flex;
  gap: 4px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s ease;
`;

const MuteButton = styled.button`
  width: 40px;
  height: 40px;
  background: ${props => props.theme.cardBackground};
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: ${props => props.theme.text};
  transition: all 0.15s ease;
  
  &:hover {
    background: ${props => props.theme.buttonBackground};
    color: ${props => props.theme.buttonText};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &.muted {
    color: #e74c3c;
    border-color: #e74c3c;
    
    &:hover {
      background: rgba(231, 76, 60, 0.1);
    }
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
  const ROTATION_STEP = Math.PI / 4; // 45 degrees - more responsive rotation

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

// Theme Toggle Button Component
const ThemeToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${props => props.theme.cardBackground};
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50px;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.text};
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
  z-index: 1000;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ThemeToggleComponent: React.FC<{ theme: Theme; onToggle: () => void }> = ({ theme, onToggle }) => {
  return (
    <ThemeToggle onClick={onToggle}>
      {theme === 'light' ? '🌙' : '☀️'}
      {theme === 'light' ? 'Dark' : 'Light'}
    </ThemeToggle>
  );
};

// Visual turn indicator component
const TurnIndicatorComponent: React.FC<{ 
  currentPlayer: Player, 
  winner: Player, 
  isAiThinking: boolean, 
  humanPlayer: Player, 
  aiPlayer: Player 
}> = ({ currentPlayer, winner, isAiThinking, humanPlayer, aiPlayer }) => {
  if (winner !== 0) {
    const isHumanWinner = winner === humanPlayer;
    return (
      <TurnIndicator>
        <StonePreview className={winner === 1 ? 'black' : 'white'} />
        <TurnText>
          {isHumanWinner ? 'You Win! 🎉' : 'AI Wins! 🤖'}
        </TurnText>
      </TurnIndicator>
    );
  }

  if (isAiThinking) {
    return (
      <TurnIndicator>
        <StonePreview className={aiPlayer === 1 ? 'black' : 'white'} />
        <TurnText className="thinking">
          AI is thinking... 🤔
        </TurnText>
      </TurnIndicator>
    );
  }

  const isHumanTurn = currentPlayer === humanPlayer;
  return (
    <TurnIndicator>
      <StonePreview className={currentPlayer === 1 ? 'black' : 'white'} />
      <TurnText>
        {isHumanTurn ? 'Your Turn' : 'AI Turn'}
      </TurnText>
    </TurnIndicator>
  );
};




// Move history type for tracking stone placement order
type Move = {
  x: number;
  y: number;
  z: number;
  player: Player;
};

// Game mode type
type GameMode = 'setup' | 'playing';

const App: React.FC = () => {
  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('gomoku-theme') as Theme;
    return savedTheme && (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
  });

  // Game mode and player configuration
  const [gameMode, setGameMode] = useState<GameMode>('setup');
  const [humanPlayer, setHumanPlayer] = useState<Player>(1);
  const [aiPlayer, setAiPlayer] = useState<Player>(2);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  
  // AI instance
  const [ai] = useState(() => new GomokuAI('medium'));

  const [board, setBoard] = useState<BoardState3D>(getEmptyBoard3D());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player>(0);
  const [hovered, setHovered] = useState<[number, number, number] | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [ghostStone, setGhostStone] = useState<{ x: number; y: number; z: number; player: Player } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  // Camera sync state
  const boardCenter = (BOARD_SIZE - 1) * 0.5 / 2; // Board center coordinate
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([10 + boardCenter, 10 + boardCenter, 18 + boardCenter]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([boardCenter, boardCenter, boardCenter]);
  // Theme toggle function
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('gomoku-theme', newTheme);
  }, [theme]);

  // Handler to update camera state from main board
  const handleCameraChange = useCallback((pos: [number, number, number], target: [number, number, number]) => {
    setCameraPos(pos);
    setCameraTarget(target);
  }, []);

  // Camera rotation utilities with smooth transitions and no constraints
  const rotateCameraAroundTarget = useCallback((azimuthDelta: number, polarDelta: number) => {
    const target = cameraTarget;
    const currentPos = cameraPos;
    
    // Calculate current spherical coordinates relative to target
    const dx = currentPos[0] - target[0];
    const dy = currentPos[1] - target[1];
    const dz = currentPos[2] - target[2];
    
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let azimuth = Math.atan2(dx, dz);
    let polar = Math.acos(Math.max(-1, Math.min(1, dy / radius))); // Clamp to prevent NaN
    
    // Apply rotation deltas with full freedom - no constraints
    azimuth += azimuthDelta;
    polar += polarDelta;
    
    // Allow full 360° rotation - no clamping of polar angle
    // This enables the cube to be viewed from any angle including upside down
    
    // Convert back to cartesian coordinates
    const newX = target[0] + radius * Math.sin(polar) * Math.sin(azimuth);
    const newY = target[1] + radius * Math.cos(polar);
    const newZ = target[2] + radius * Math.sin(polar) * Math.cos(azimuth);
    
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      setCameraPos([newX, newY, newZ]);
    });
  }, [cameraPos, cameraTarget]);

  const zoomCamera = useCallback((zoomFactor: number) => {
    const target = cameraTarget;
    const currentPos = cameraPos;
    
    // Calculate direction vector from target to camera
    const dx = currentPos[0] - target[0];
    const dy = currentPos[1] - target[1];
    const dz = currentPos[2] - target[2];
    
    // Apply zoom factor with bounds checking
    const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const newDistance = currentDistance * zoomFactor;
    
    // Clamp zoom distance to reasonable bounds
    const clampedDistance = Math.max(2, Math.min(60, newDistance));
    const actualZoomFactor = clampedDistance / currentDistance;
    
    // Apply smooth zoom
    const newX = target[0] + dx * actualZoomFactor;
    const newY = target[1] + dy * actualZoomFactor;
    const newZ = target[2] + dz * actualZoomFactor;
    
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      setCameraPos([newX, newY, newZ]);
    });
  }, [cameraPos, cameraTarget]);


  const handlePlaceStone = (x: number, y: number, z: number) => {
    if (board[z][y][x] !== 0 || winner || isAiThinking) return;
    
    // Only allow human player to make moves via UI
    if (currentPlayer !== humanPlayer) {
      console.log('Not human player turn');
      return;
    }
    
    // Check if this move is forbidden (six-in-a-row rule)
    if (isForbiddenMove(board, x, y, z, currentPlayer)) {
      console.log('Forbidden move: would create six-in-a-row');
      return;
    }
    
    // Check if there's already a ghost stone at this position
    if (ghostStone && ghostStone.x === x && ghostStone.y === y && ghostStone.z === z) {
      // Second click - place the stone permanently
      placeStoneOnBoard(x, y, z, currentPlayer);
    } else {
      // First click - place ghost stone (only if move is legal)
      if (isLegalMove(board, x, y, z, currentPlayer)) {
        setGhostStone({ x, y, z, player: currentPlayer });
      } else {
        console.log('Illegal move: position occupied or forbidden');
      }
    }
  };

  // Centralized stone placement logic (used by both human and AI)
  const placeStoneOnBoard = (x: number, y: number, z: number, player: Player) => {
    // Play sound for stone placement
    playStoneSound(player, isMuted);
    
    const newBoard = board.map(plane => plane.map(row => [...row]));
    newBoard[z][y][x] = player;
    setBoard(newBoard);
    
    // Add move to history
    const newMove: Move = { x, y, z, player };
    setMoveHistory(prev => [...prev, newMove]);
    
    // Clear ghost stone if it was a human move
    if (player === humanPlayer) {
      setGhostStone(null);
    }
    
    // Check for winner
    const win = checkWinner3D(newBoard);
    if (win) {
      setWinner(win);
      // Play win sound when someone wins
      setTimeout(() => playWinSound(isMuted), 200); // Small delay after stone placement sound
    } else {
      // Switch to next player
      const nextPlayer = player === 1 ? 2 : 1;
      setCurrentPlayer(nextPlayer);
      
      // If next player is AI, trigger AI move after a short delay
      if (nextPlayer === aiPlayer) {
        setTimeout(() => {
          makeAiMove(newBoard);
        }, 100); // Small delay for smooth transition
      }
    }
  };

  // AI move execution using minimax algorithm
  const makeAiMove = async (currentBoard: BoardState3D) => {
    if (winner !== 0) return;
    
    setIsAiThinking(true);
    
    try {
      // Get the best move from AI
      const aiResult = await ai.getBestMove(currentBoard, aiPlayer);
      
      if (aiResult.move) {
        console.log(`AI move: (${aiResult.move.x}, ${aiResult.move.y}, ${aiResult.move.z})`);
        console.log(`Evaluation: ${aiResult.evaluation}, Confidence: ${aiResult.confidence}%`);
        console.log(`Search depth: ${aiResult.searchDepth}, Nodes: ${aiResult.nodesEvaluated}`);
        console.log(`Thinking time: ${aiResult.thinkingTime}ms`);
        
        // Ensure minimum 0.5 second thinking time for better UX
        const minThinkingTime = 500;
        const remainingTime = Math.max(0, minThinkingTime - aiResult.thinkingTime);
        
        setTimeout(() => {
          placeStoneOnBoard(aiResult.move!.x, aiResult.move!.y, aiResult.move!.z, aiPlayer);
          setIsAiThinking(false);
        }, remainingTime);
      } else {
        // Fallback: no move found (shouldn't happen)
        console.warn('AI could not find a move');
        setIsAiThinking(false);
      }
    } catch (error) {
      console.error('AI move error:', error);
      setIsAiThinking(false);
    }
  };

  // Undo functionality - removes ghost stone or chronologically latest stone
  const handleUndo = useCallback(() => {
    // If there's a ghost stone, remove it first
    if (ghostStone) {
      setGhostStone(null);
      console.log('Ghost stone cancelled');
      return;
    }
    
    // Otherwise, undo the last placed stone
    if (winner !== 0 || moveHistory.length === 0) return; // Can't undo if game is over or no moves
    
    // Get the last move from history
    const lastMove = moveHistory[moveHistory.length - 1];
    
    // Remove the stone from the board
    const newBoard = board.map(plane => plane.map(row => [...row]));
    newBoard[lastMove.z][lastMove.y][lastMove.x] = 0;
    setBoard(newBoard);
    
    // Remove the move from history
    setMoveHistory(prev => prev.slice(0, -1));
    
    // Revert to the player who placed that stone (so they can play again)
    setCurrentPlayer(lastMove.player);
    
    // Reset winner state (since we removed a stone)
    setWinner(0);
    
    console.log('Undo completed: removed stone at', [lastMove.x, lastMove.y, lastMove.z], 'player', lastMove.player);
  }, [board, winner, moveHistory, ghostStone]);


  const handlePlayerSelection = (selectedHumanPlayer: Player) => {
    setHumanPlayer(selectedHumanPlayer);
    const selectedAiPlayer = selectedHumanPlayer === 1 ? 2 : 1;
    setAiPlayer(selectedAiPlayer);
    setCurrentPlayer(1); // Black always starts
    setGameMode('playing');
    
    // If AI is black (goes first), make the first move
    if (selectedAiPlayer === 1) {
      setTimeout(() => {
        makeAiMove(getEmptyBoard3D());
      }, 500); // Small delay to let the UI settle
    }
  };

  const handleRestart = () => {
    setBoard(getEmptyBoard3D());
    setCurrentPlayer(1);
    setWinner(0);
    setMoveHistory([]); // Clear move history
    setGhostStone(null); // Clear ghost stone
    setIsAiThinking(false);
    setGameMode('setup'); // Go back to setup
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
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
    <ThemeProvider theme={themes[theme]}>
      <GlobalStyle />
      <Container>
        <ThemeToggleComponent theme={theme} onToggle={toggleTheme} />
        
        {gameMode === 'setup' ? (
          <GameSetup 
            onPlayerSelection={handlePlayerSelection}
            theme={themes[theme]}
          />
        ) : (
          <>
            <Title>3D Gomoku vs AI</Title>
            <TurnIndicatorComponent 
              currentPlayer={currentPlayer} 
              winner={winner} 
              isAiThinking={isAiThinking}
              humanPlayer={humanPlayer}
              aiPlayer={aiPlayer}
            />
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
                  ghostStone={ghostStone}
                  isAiThinking={isAiThinking}
                  theme={themes[theme]}
                />
              </BoardWrapper>
            </Layout>
            <Button onClick={handleRestart} style={{ marginTop: 24 }}>
              New Game
            </Button>
            <CameraRotationControls 
              onRotate={rotateCameraAroundTarget}
            />
            <CameraZoomControls 
              onZoom={zoomCamera}
            />
            <MuteControls>
              <MuteButton 
                onClick={toggleMute}
                className={isMuted ? 'muted' : ''}
                title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {isMuted ? '🔇' : '🔊'}
              </MuteButton>
            </MuteControls>
          </>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default App;
