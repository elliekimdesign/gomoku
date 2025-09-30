import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import { Gomoku3DBoard, BoardState3D, Player } from './components/Gomoku3DBoard';
import { GameSetup } from './components/GameSetup';
import { isForbiddenMove, isLegalMove } from './utils/gameRules';
import { GomokuAI } from './ai';


const BOARD_SIZE = 8;

// 위협 분석 함수 (디버깅용)
function analyzeCurrentThreats(board: BoardState3D, humanPlayer: Player): any {
  const threats = [];
  
  // 모든 빈 위치에서 humanPlayer가 연결되는 경우 찾기
  for (let z = 0; z < BOARD_SIZE; z++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[z][y][x] === 0) {
          // 26방향 검사
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                
                const consecutiveCount = countConsecutiveInDirection(board, x, y, z, dx, dy, dz, humanPlayer);
                if (consecutiveCount >= 2) {
                  threats.push({
                    position: `(${x},${y},${z})`,
                    direction: `(${dx},${dy},${dz})`,
                    consecutiveCount,
                    threat: consecutiveCount >= 3 ? '🚨 CRITICAL' : '⚠️ WARNING'
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  
  return threats.sort((a, b) => b.consecutiveCount - a.consecutiveCount);
}

// 방향별 연속 카운트 함수
function countConsecutiveInDirection(board: BoardState3D, x: number, y: number, z: number, dx: number, dy: number, dz: number, player: Player): number {
  let count = 0;
  
  // 한쪽 방향
  let checkX = x + dx, checkY = y + dy, checkZ = z + dz;
  while (checkX >= 0 && checkX < BOARD_SIZE &&
         checkY >= 0 && checkY < BOARD_SIZE &&
         checkZ >= 0 && checkZ < BOARD_SIZE &&
         board[checkZ][checkY][checkX] === player) {
    count++;
    checkX += dx;
    checkY += dy;
    checkZ += dz;
  }
  
  // 반대 방향
  checkX = x - dx;
  checkY = y - dy;
  checkZ = z - dz;
  while (checkX >= 0 && checkX < BOARD_SIZE &&
         checkY >= 0 && checkY < BOARD_SIZE &&
         checkZ >= 0 && checkZ < BOARD_SIZE &&
         board[checkZ][checkY][checkX] === player) {
    count++;
    checkX -= dx;
    checkY -= dy;
    checkZ -= dz;
  }
  
  return count;
}
const WIN_COUNT = 5;

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
    <div className="rotation-controls">
      {/* Row 1: Up-left, Up, Up-right */}
      <button className="rotation-button" onClick={() => onRotate(-ROTATION_STEP, -ROTATION_STEP)}>↖</button>
      <button className="rotation-button" onClick={() => onRotate(0, -ROTATION_STEP)}>↑</button>
      <button className="rotation-button" onClick={() => onRotate(ROTATION_STEP, -ROTATION_STEP)}>↗</button>
      
      {/* Row 2: Left, Empty, Right */}
      <button className="rotation-button" onClick={() => onRotate(-ROTATION_STEP, 0)}>←</button>
      <div /> {/* Empty center space */}
      <button className="rotation-button" onClick={() => onRotate(ROTATION_STEP, 0)}>→</button>
      
      {/* Row 3: Down-left, Down, Down-right */}
      <button className="rotation-button" onClick={() => onRotate(-ROTATION_STEP, ROTATION_STEP)}>↙</button>
      <button className="rotation-button" onClick={() => onRotate(0, ROTATION_STEP)}>↓</button>
      <button className="rotation-button" onClick={() => onRotate(ROTATION_STEP, ROTATION_STEP)}>↘</button>
    </div>
  );
};

// Camera zoom controls component
const CameraZoomControls: React.FC<{ onZoom: (factor: number) => void }> = ({ onZoom }) => {
  return (
    <div className="zoom-controls">
      <button className="zoom-button" onClick={() => onZoom(1.2)}>−</button>
      <button className="zoom-button" onClick={() => onZoom(0.8)}>+</button>
    </div>
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
      <div className="simple-title">
        {isHumanWinner ? 'You Win! 🎉' : 'AI Wins! 🤖'}
      </div>
    );
  }

  if (isAiThinking) {
    return (
      <div className="simple-title thinking">
        AI is thinking... 🤔
      </div>
    );
  }

  return (
    <div className="simple-title">
      3D Gomoku
    </div>
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
    console.log(`=== HUMAN MOVE ATTEMPT ===`);
    console.log(`Position: (${x}, ${y}, ${z})`);
    console.log(`Current turn: ${currentPlayer} (${currentPlayer === 1 ? 'Black' : 'White'})`);
    console.log(`Human plays: ${humanPlayer} (${humanPlayer === 1 ? 'Black' : 'White'})`);
    console.log(`AI plays: ${aiPlayer} (${aiPlayer === 1 ? 'Black' : 'White'})`);
    console.log(`AI thinking: ${isAiThinking}`);
    
    // Block if position is occupied, game is over, or AI is thinking
    if (board[z][y][x] !== 0 || winner || isAiThinking) {
      console.log('❌ Move blocked:');
      console.log('- Position occupied:', board[z][y][x] !== 0);
      console.log('- Game has winner:', winner !== 0);
      console.log('- AI thinking:', isAiThinking);
      return;
    }
    
    // Only allow human player to make moves via UI during their turn
    if (currentPlayer !== humanPlayer) {
      console.log(`❌ Not human's turn! Current: ${currentPlayer}, Human: ${humanPlayer}`);
      return;
    }
    
    // Check if this move is forbidden (six-in-a-row rule)
    if (isForbiddenMove(board, x, y, z, currentPlayer)) {
      console.log('❌ Forbidden move: would create six-in-a-row');
      return;
    }
    
    // Check if there's already a ghost stone at this position
    if (ghostStone && ghostStone.x === x && ghostStone.y === y && ghostStone.z === z) {
      // Second click - place the stone permanently
      console.log('✅ Second click - confirming stone placement');
      placeStoneOnBoard(x, y, z, currentPlayer);
    } else {
      // First click - place ghost stone (only if move is legal)
      if (isLegalMove(board, x, y, z, currentPlayer)) {
        console.log('👻 First click - placing ghost stone');
        setGhostStone({ x, y, z, player: currentPlayer });
      } else {
        console.log('❌ Illegal move: position occupied or forbidden');
      }
    }
  };

  // Centralized stone placement logic (used by both human and AI)
  const placeStoneOnBoard = (x: number, y: number, z: number, player: Player) => {
    console.log(`=== PLACING STONE ===`);
    console.log(`Player ${player} (${player === 1 ? 'Black' : 'White'}) placing at (${x}, ${y}, ${z})`);
    console.log(`Current game state - Human: ${humanPlayer}, AI: ${aiPlayer}, Turn: ${currentPlayer}`);
    
    // Validate the move is for the correct player
    if (player !== currentPlayer) {
      console.error(`ERROR: Trying to place stone for player ${player} but current turn is ${currentPlayer}`);
      return;
    }
    
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
      console.log(`Game Over! Winner: Player ${win} (${win === 1 ? 'Black' : 'White'})`);
      // Play win sound when someone wins
      setTimeout(() => playWinSound(isMuted), 200);
    } else {
      // Switch to next player (alternate between 1 and 2)
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      console.log(`⏭️ Switching turn from ${currentPlayer} to ${nextPlayer}`);
      setCurrentPlayer(nextPlayer);
      
      // Note: AI move will be triggered by useEffect when currentPlayer changes
      if (nextPlayer === aiPlayer) {
        console.log(`Next turn is AI (${nextPlayer}) - useEffect will trigger AI move`);
      } else {
        console.log(`Next turn is Human (${nextPlayer}) - waiting for human input`);
      }
    }
  };

  // AI move execution using minimax algorithm
  const makeAiMove = useCallback(async (currentBoard: BoardState3D) => {
    console.log('=== MAKE AI MOVE ===');
    console.log('AI player:', aiPlayer, 'Current player:', currentPlayer);
    console.log('Winner:', winner, 'AI thinking:', isAiThinking);
    
    if (winner !== 0) {
      console.log('Game already has winner, canceling AI move');
      return;
    }
    
    if (isAiThinking) {
      console.log('AI already thinking, skipping duplicate call');
      return;
    }

    if (currentPlayer !== aiPlayer) {
      console.log('Not AI turn, skipping');
      return;
    }
    
    console.log('🤖 AI starting to think...');
    setIsAiThinking(true);
    
    // 위협 분석 추가
    const threats = analyzeCurrentThreats(currentBoard, humanPlayer);
    console.log(`🎯 Detected ${threats.length} threats:`, threats.slice(0, 5)); // 상위 5개만 표시
    
    try {
      // Get the best move from AI
      const aiResult = await ai.getBestMove(currentBoard, aiPlayer);
      
      if (aiResult.move) {
        console.log(`🎯 AI chose move: (${aiResult.move.x}, ${aiResult.move.y}, ${aiResult.move.z})`);
        console.log(`📊 Evaluation: ${aiResult.evaluation}, Confidence: ${aiResult.confidence}%`);
        console.log(`🔍 Search depth: ${aiResult.searchDepth}, Nodes: ${aiResult.nodesEvaluated}`);
        console.log(`⏱️ Thinking time: ${aiResult.thinkingTime}ms`);
        
        // Ensure minimum 0.5 second thinking time for better UX
        const minThinkingTime = 500;
        const remainingTime = Math.max(0, minThinkingTime - aiResult.thinkingTime);
        
        setTimeout(() => {
          console.log('🤖 AI placing stone after thinking delay');
          // Double check the AI is still supposed to move
          if (currentPlayer === aiPlayer && !winner) {
            placeStoneOnBoard(aiResult.move!.x, aiResult.move!.y, aiResult.move!.z, aiPlayer);
          } else {
            console.error(`❌ State changed during AI thinking! Current: ${currentPlayer}, AI: ${aiPlayer}, Winner: ${winner}`);
          }
          setIsAiThinking(false);
        }, remainingTime);
      } else {
        // Fallback: no move found (shouldn't happen)
        console.warn('❌ AI could not find a move');
        setIsAiThinking(false);
      }
    } catch (error) {
      console.error('❌ AI move error:', error);
      setIsAiThinking(false);
    }
  }, [aiPlayer, currentPlayer, winner, isAiThinking, ai]);

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
    console.log('=== GAME SETUP ===');
    console.log('Human selected:', selectedHumanPlayer === 1 ? 'Black (goes first)' : 'White (goes second)');
    
    const selectedAiPlayer = selectedHumanPlayer === 1 ? 2 : 1;
    
    // Clear all game state first
    setBoard(getEmptyBoard3D());
    setWinner(0);
    setMoveHistory([]);
    setGhostStone(null);
    setIsAiThinking(false);
    
    // Set up players
    setHumanPlayer(selectedHumanPlayer);
    setAiPlayer(selectedAiPlayer);
    setCurrentPlayer(1); // Black (1) always starts in gomoku
    setGameMode('playing');
    
    console.log('Setup complete:');
    console.log('- Human plays as:', selectedHumanPlayer === 1 ? 'Black (1)' : 'White (2)');
    console.log('- AI plays as:', selectedAiPlayer === 1 ? 'Black (1)' : 'White (2)');
    console.log('- First turn: Black (1)');
    
    // Note: If AI plays Black (1), useEffect will trigger the first move
    if (selectedAiPlayer === 1) {
      console.log('AI plays Black (goes first) - useEffect will trigger opening move');
    } else {
      console.log('Human plays Black (goes first) - waiting for human move');
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

  // AI turn detection - trigger AI move when it's AI's turn
  useEffect(() => {
    console.log(`=== TURN CHANGE EFFECT ===`);
    console.log(`Current player: ${currentPlayer}, AI player: ${aiPlayer}, Human player: ${humanPlayer}`);
    console.log(`Game mode: ${gameMode}, Winner: ${winner}, AI thinking: ${isAiThinking}`);
    
    // Only trigger AI move if:
    // 1. Game is in playing mode
    // 2. No winner yet  
    // 3. It's AI's turn
    // 4. AI is not already thinking
    if (gameMode === 'playing' && winner === 0 && currentPlayer === aiPlayer && !isAiThinking) {
      console.log(`🤖 AI turn detected! Triggering AI move for player ${aiPlayer}`);
      
      setTimeout(() => {
      console.log(`🤖 Executing AI move with current board state`);
      console.log(`🎯 Board analysis for threats:`, analyzeCurrentThreats(board, humanPlayer));
      makeAiMove(board);
      }, 200); // Small delay to ensure state is stable
    }
  }, [currentPlayer, aiPlayer, gameMode, winner, isAiThinking, board, makeAiMove]);

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
    <div className="app-container">
      {gameMode === 'setup' ? (
        <GameSetup onPlayerSelection={handlePlayerSelection} />
      ) : (
        <>
          <div className="title-header">
            <TurnIndicatorComponent 
              currentPlayer={currentPlayer} 
              winner={winner} 
              isAiThinking={isAiThinking}
              humanPlayer={humanPlayer}
              aiPlayer={aiPlayer}
            />
            <div className="controls-vertical">
              <button className="new-game-button" onClick={handleRestart}>
                <span className="new-game-icon">⟲</span>
                <span className="new-game-text">New Game</span>
              </button>
              
              <div className="mute-controls-vertical">
                <button 
                  className={`control-button ${isMuted ? 'muted' : ''}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                >
                  <span className="control-icon">{isMuted ? '🔇' : '🔊'}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="app-layout">
            <div className="board-wrapper">
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
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
