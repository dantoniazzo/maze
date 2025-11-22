import { useEffect, useRef, memo } from "react";
import type { Maze as MazeType } from "../utils/mazeGenerator";
import type { Position } from "../types/game";

type MazeProps = {
  maze: MazeType;
  playerPosition: Position;
  opponentPosition?: Position;
  cellSize: number;
  onMove: (newPosition: Position) => void;
  isActive: boolean;
};

function MazeComponent({
  maze,
  playerPosition,
  opponentPosition,
  cellSize,
  onMove,
  isActive,
}: MazeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mazeRows = maze.length;
  const mazeCols = maze[0].length;

  // Track visited positions for trail
  const visitedPositions = useRef<Set<string>>(new Set());

  // Add current position to visited set
  useEffect(() => {
    const posKey = `${playerPosition.row},${playerPosition.col}`;
    visitedPositions.current.add(posKey);
  }, [playerPosition]);

  // Handle keyboard input with continuous movement
  const pressedKeys = useRef<Set<string>>(new Set());
  const playerPositionRef = useRef(playerPosition);

  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        pressedKeys.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        pressedKeys.current.delete(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Continuous movement loop
    const moveInterval = setInterval(() => {
      if (pressedKeys.current.size === 0) return;

      const currentPos = playerPositionRef.current;
      const { row, col } = currentPos;
      const currentCell = maze[row][col];
      let newPosition = { ...currentPos };

      // Check all pressed keys and move in the first available direction
      // Priority: most recently pressed key gets checked first
      const directions = [
        { key: "ArrowUp", canMove: !currentCell.walls.top && row > 0, newPos: { row: row - 1, col } },
        { key: "ArrowDown", canMove: !currentCell.walls.bottom && row < mazeRows - 1, newPos: { row: row + 1, col } },
        { key: "ArrowLeft", canMove: !currentCell.walls.left && col > 0, newPos: { row, col: col - 1 } },
        { key: "ArrowRight", canMove: !currentCell.walls.right && col < mazeCols - 1, newPos: { row, col: col + 1 } },
      ];

      // Try to move in any pressed direction that's available
      for (const direction of directions) {
        if (pressedKeys.current.has(direction.key) && direction.canMove) {
          newPosition = direction.newPos;
          break;
        }
      }

      if (newPosition.row !== row || newPosition.col !== col) {
        onMove(newPosition);
      }
    }, 100); // Move every 100ms for smooth continuous movement

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      clearInterval(moveInterval);
      pressedKeys.current.clear();
    };
  }, [maze, mazeRows, mazeCols, onMove, isActive]);

  // Draw maze and players
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with modern slate background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw maze with blue walls
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;

    for (let row = 0; row < mazeRows; row++) {
      for (let col = 0; col < mazeCols; col++) {
        const cell = maze[row][col];
        const x = col * cellSize;
        const y = row * cellSize;

        // Draw walls
        ctx.beginPath();
        if (cell.walls.top) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellSize, y);
        }
        if (cell.walls.right) {
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (cell.walls.bottom) {
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (cell.walls.left) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellSize);
        }
        ctx.stroke();
      }
    }

    // Draw trail (visited positions) with purple/indigo tint
    ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
    visitedPositions.current.forEach((posKey) => {
      const [row, col] = posKey.split(",").map(Number);
      const x = col * cellSize;
      const y = row * cellSize;
      ctx.fillRect(x, y, cellSize, cellSize);
    });

    // Draw exit marker (bottom-right corner) with yellow/amber
    ctx.fillStyle = "#fbbf24";
    const exitX = (mazeCols - 1) * cellSize;
    const exitY = (mazeRows - 1) * cellSize;
    ctx.fillRect(
      exitX + cellSize * 0.2,
      exitY + cellSize * 0.2,
      cellSize * 0.6,
      cellSize * 0.6
    );

    // Draw opponent player (red dot)
    if (opponentPosition) {
      ctx.fillStyle = "#ef4444";
      const opponentX = opponentPosition.col * cellSize + cellSize / 2;
      const opponentY = opponentPosition.row * cellSize + cellSize / 2;
      ctx.beginPath();
      ctx.arc(opponentX, opponentY, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player (blue dot) - drawn last so it's on top
    ctx.fillStyle = "#3b82f6";
    const playerX = playerPosition.col * cellSize + cellSize / 2;
    const playerY = playerPosition.row * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(playerX, playerY, cellSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }, [maze, playerPosition, opponentPosition, cellSize, mazeRows, mazeCols]);

  return (
    <div className="flex items-center justify-center bg-slate-800">
      <canvas
        ref={canvasRef}
        width={mazeCols * cellSize}
        height={mazeRows * cellSize}
      />
    </div>
  );
}

export const Maze = memo(MazeComponent);
