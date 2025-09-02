# **Gomoku AI Player - 3D Cube Implementation**

For this 3D Gomoku game (8x8x8 board), the best way to create a challenging AI player is to use a **Minimax algorithm combined with a heuristic evaluation function and alpha-beta pruning**.

This might sound complex, but you can think of it as giving the AI three distinct abilities: a way to **judge** the board, a way to **plan** ahead, and a way to **think faster**.

## **Game Configuration**
- **Board Size**: 8x8x8 cube (512 total positions)
- **Game Mode**: Human vs AI only (no human vs human option)
- **Player Selection**: User chooses their color (black/white) at game start
- **AI Response Time**: 0.5 seconds (includes thinking animation)
- **Special Rules**: Forbidden moves implemented (no six-in-a-row, allow open 3-3)

---

### Step 1: The Heuristic Function (The AI's "Judgment")

This is the most critical part. A heuristic function is a method that looks at the current board and assigns it a **score** based on how good it is for the AI. Since checking every possible future move until the end of the game is impossible, this function gives the AI a way to quickly judge a position.

Your function would calculate a score by looking for patterns for both the AI and the player. For example:

- **\+1,000,000 points** for an AI five-in-a-row (a winning move).  
- **\+10,000 points** for an AI four-in-a-row with open ends.  
- **\+500 points** for an AI three-in-a-row with open ends.  
- **\-7,500 points** for a player four-in-a-row with open ends (a threat that must be blocked).  
- **\-400 points** for a player three-in-a-row with open ends.

The AI's goal is to make a move that leads to the highest possible score for itself.

---

### Step 2: The Minimax Algorithm (The AI's "Planner")

Minimax is an algorithm that uses your heuristic function to look a few moves into the future. It builds a tree of possible moves and counter-moves.

- The **"Max"** level is the AI's turn. It looks at all its possible moves and picks the one that leads to the **maximum** score.  
- The **"Min"** level is the player's turn. The AI assumes the player will be smart and choose the move that leads to the **minimum** score for the AI.

For the 8x8x8 board, a search depth of 3-4 moves is realistic and provides strong gameplay while maintaining the 0.5-second response time constraint.

---

### Step 3: Alpha-Beta Pruning (The AI's "Shortcut")

The main problem with Minimax is that the number of possible moves grows exponentially. Even with an 8x8x8 board (512 positions), the search space can become large. Alpha-Beta Pruning is a clever optimization that dramatically speeds up the Minimax search.

Essentially, it allows the AI to **stop analyzing a set of future moves** as soon as it realizes they can't possibly be better than a move it has already found. It's like a chess player seeing that a certain sequence of moves leads to losing their queen and immediately stopping their analysis of that line of play because they know it's bad. This lets the AI search "deeper" into the future in the same amount of time.

### A Practical Path to Build It

Implementation approach for the 3D Gomoku AI:

1. **Start with the Heuristic Function:** First, build the 3D scoring function that evaluates patterns across all 26 directions (6 axes, 12 face diagonals, 8 space diagonals). The AI will look at all possible moves and choose the one with the best immediate score. This creates a "greedy" but decent opponent.  
2. **Add Minimax:** Next, wrap the heuristic function inside the Minimax algorithm. Start with a search depth of 2-3 moves. This will make the AI much smarter, as it can now see and block immediate threats while setting up its own winning patterns.  
3. **Implement Pruning:** Finally, add alpha-beta pruning. This won't change the AI's decisions, but it will make the calculations much faster, allowing you to increase the search depth to 3-4 moves while maintaining the 0.5-second response time, resulting in a very challenging opponent.

## **3D Gomoku Rules Implementation**

**Special Rules to Implement:**
+ **Allow open 3-3**: Players can create multiple three-in-a-row patterns simultaneously  
+ **Forbidden six-in-a-row**: Do not allow placing a stone that creates six consecutive stones. A move is forbidden if it results in six stones in any of the 26 directions. For example, if there are four stones in a row, then one empty space, then another stone — like OOOO\_O — you cannot place your stone in the empty space to make OOOOOO.

**3D Pattern Evaluation Priority:**
For more interesting gameplay, the AI should weight patterns differently:
- **Highest Priority**: Straight lines along main axes (X, Y, Z directions) - these are easiest for humans to see and block
- **Medium Priority**: Face diagonals (diagonal lines on cube faces) - moderately visible
- **Strategic Priority**: Space diagonals (true 3D diagonals through cube volume) - hardest for humans to detect, giving AI an advantage

This weighting makes the game more engaging by leveraging the AI's ability to see 3D patterns that humans might miss.

---

## **Implementation Plan**

### **Phase 1: Foundation & Game Rules (Tasks 1-3)**

**Task 1: Implement Forbidden Move Rules**
- Create `isForbiddenMove(board, x, y, z, player)` function
- Check for six-in-a-row violations in all 26 directions
- Allow open 3-3 patterns (no restriction on multiple three-in-a-row)
- Integrate validation into `handlePlaceStone` function

**Task 2: Add Game Mode Selection**
- Create color selection screen at game start
- Add game state: `gameMode: 'setup' | 'playing'`
- Add player configuration: `humanPlayer: 1 | 2`, `aiPlayer: 1 | 2`
- Update UI to show "Human vs AI" instead of "Human vs Human"

**Task 3: AI Integration Points**
- Add AI state: `isAiThinking: boolean`, `aiPlayer: Player`
- Modify `handlePlaceStone` to trigger AI moves after human moves
- Add 0.5-second delay with thinking animation
- Ensure AI moves bypass ghost stone system (direct placement)

### **Phase 2: AI Core Logic (Tasks 4-6)**

**Task 4: Heuristic Evaluation Function**
- Create `src/ai/heuristic.ts` with pattern evaluation
- Implement `evaluatePosition(board, player)` function
- Score patterns in all 26 directions with weighted priorities:
  - Main axes (X,Y,Z): weight 1.0
  - Face diagonals: weight 0.8  
  - Space diagonals: weight 1.2 (AI advantage)
- Pattern scoring:
  - Five-in-a-row: +1,000,000 (win)
  - Four-in-a-row (open): +10,000
  - Three-in-a-row (open): +500
  - Two-in-a-row (open): +50
  - Opponent threats: negative values with higher magnitude

**Task 5: Move Generation & Ordering**
- Create `generateMoves(board)` function
- Return all legal moves (empty positions, non-forbidden)
- Implement move ordering for alpha-beta efficiency:
  - Center positions first (higher strategic value)
  - Positions near existing stones (local search)
  - Previously good moves (killer move heuristic)

**Task 6: Minimax with Alpha-Beta Pruning**
- Create `src/ai/minimax.ts`
- Implement `minimax(board, depth, alpha, beta, maximizingPlayer, aiPlayer)`
- Start with depth 3, optimize to depth 4 if performance allows
- Add time constraint (max 400ms to ensure 0.5s total response)
- Return best move coordinates `{x, y, z, score}`

### **Phase 3: AI Integration & Polish (Tasks 7-9)**

**Task 7: AI Move Execution**
- Create `makeAiMove()` function in App.tsx
- Add thinking state management and visual feedback
- Integrate with existing game flow (sound, history, win checking)
- Handle edge cases (no valid moves, game over)

**Task 8: UI/UX Enhancements**
- Add "AI is thinking..." indicator with animation
- Update turn indicator to show "Human vs AI" context
- Add AI difficulty selector (optional: Easy/Medium/Hard via depth)
- Ensure smooth transitions between human and AI moves

**Task 9: Testing & Optimization**
- Performance testing: ensure <0.5s response time
- Game balance testing: AI should be challenging but beatable
- Edge case testing: forbidden moves, endgame scenarios
- Code cleanup and documentation

### **File Structure**
```
src/
├── ai/
│   ├── heuristic.ts      # Pattern evaluation & scoring
│   ├── minimax.ts        # Minimax algorithm with alpha-beta
│   ├── moveGeneration.ts # Legal move generation & ordering
│   └── index.ts          # AI main interface
├── components/
│   ├── Gomoku3DBoard.tsx # (existing, minor updates)
│   └── GameSetup.tsx     # (new) Color selection screen
├── utils/
│   └── gameRules.ts      # (new) Forbidden move validation
└── App.tsx               # (updated) AI integration
```

### **Integration Points in Existing Code**
- **App.tsx line 652**: `handlePlaceStone` - add AI move trigger
- **App.tsx line 420**: `checkWinner3D` - reuse for AI evaluation  
- **App.tsx line 410**: `directions` array - reuse for pattern detection
- **App.tsx line 567-573**: Game state - add AI-related state variables
- **Components/Gomoku3DBoard.tsx**: Add thinking animation overlay

### **Performance Targets**
- AI response time: <0.5 seconds (including 0.1s thinking animation)
- Search depth: 3-4 moves depending on position complexity
- Memory usage: <50MB for game state and search tree
- Smooth 60fps during AI thinking animation

### **Success Criteria**
- ✅ AI makes legal, strategic moves within time limit
- ✅ Forbidden move rules properly enforced for both players
- ✅ Engaging gameplay: AI is challenging but not unbeatable
- ✅ Smooth user experience with clear visual feedback
- ✅ No performance degradation in 3D rendering during AI computation