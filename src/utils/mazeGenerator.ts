export type Cell = {
  row: number;
  col: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
};

export type Maze = Cell[][];

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }
}

export function generateMaze(rows: number, cols: number, seed?: number): Maze {
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  // Initialize maze grid
  const maze: Maze = [];
  for (let row = 0; row < rows; row++) {
    maze[row] = [];
    for (let col = 0; col < cols; col++) {
      maze[row][col] = {
        row,
        col,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      };
    }
  }

  // Recursive backtracking algorithm
  const stack: Cell[] = [];
  const startCell = maze[0][0];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(maze, current, rows, cols);

    if (neighbors.length > 0) {
      const randomIndex = rng ? rng.randomInt(neighbors.length) : Math.floor(Math.random() * neighbors.length);
      const next = neighbors[randomIndex];
      removeWallBetween(current, next);
      next.visited = true;
      stack.push(next);
    } else {
      stack.pop();
    }
  }

  return maze;
}

function getUnvisitedNeighbors(
  maze: Maze,
  cell: Cell,
  rows: number,
  cols: number
): Cell[] {
  const neighbors: Cell[] = [];
  const { row, col } = cell;

  // Top
  if (row > 0 && !maze[row - 1][col].visited) {
    neighbors.push(maze[row - 1][col]);
  }
  // Right
  if (col < cols - 1 && !maze[row][col + 1].visited) {
    neighbors.push(maze[row][col + 1]);
  }
  // Bottom
  if (row < rows - 1 && !maze[row + 1][col].visited) {
    neighbors.push(maze[row + 1][col]);
  }
  // Left
  if (col > 0 && !maze[row][col - 1].visited) {
    neighbors.push(maze[row][col - 1]);
  }

  return neighbors;
}

function removeWallBetween(current: Cell, next: Cell): void {
  const rowDiff = current.row - next.row;
  const colDiff = current.col - next.col;

  if (rowDiff === 1) {
    // Next is above current
    current.walls.top = false;
    next.walls.bottom = false;
  } else if (rowDiff === -1) {
    // Next is below current
    current.walls.bottom = false;
    next.walls.top = false;
  } else if (colDiff === 1) {
    // Next is left of current
    current.walls.left = false;
    next.walls.right = false;
  } else if (colDiff === -1) {
    // Next is right of current
    current.walls.right = false;
    next.walls.left = false;
  }
}
