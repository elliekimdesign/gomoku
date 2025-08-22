import React, { useState, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Gomoku3DBoard, BoardState3D, Player, BOARD_SIZE } from './components/Gomoku3DBoard';

const WIN_COUNT = 5;

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background: #000000;
    font-family: 'Inter', 'Roboto', Arial, sans-serif;
  }
  * {
    box-sizing: border-box;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: white;
  font-family: 'Arial', sans-serif;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.5rem;
`;

const Info = styled.div`
  font-size: 1.1rem;
  color: #ccc;
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
  background: #111;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
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

const App: React.FC = () => {
  const [board, setBoard] = useState<BoardState3D>(getEmptyBoard3D());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player>(0);
  const [hovered, setHovered] = useState<[number, number, number] | null>(null);
  
  // Camera sync state
  const boardCenter = (BOARD_SIZE - 1) * 0.5 / 2;
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([boardCenter, boardCenter, boardCenter]);
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

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (winner !== 0) return;
    
    // Find the last placed stone
    let lastStone: [number, number, number] | null = null;
    let lastPlayer: Player = 0;
    
    // Search from the end to find the last stone
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
      
      // Revert player turn
      setCurrentPlayer(lastPlayer);
      
      // Reset winner status
      setWinner(0);
    }
  }, [board, winner]);

  const handleRestart = () => {
    setBoard(getEmptyBoard3D());
    setCurrentPlayer(1);
    setWinner(0);
    // Reset camera to board center
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
          <PreviewWrapper>
            {/* Preview can be implemented later if needed */}
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