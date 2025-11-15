import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

type SnakeGameProps = {
  username: string;
  onGameEnd: () => void;
};

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type SnakeState = {
  snake: Position[];
  food: Position;
  direction: Direction;
  score: number;
};

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
const GAME_DURATION = 60; // 60 seconds

export function SnakeGame({ username, onGameEnd }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opponentCanvasRef = useRef<HTMLCanvasElement>(null);
  const { matchInfo, socket, gameOverInfo, resetGame, opponentDisconnected } = useWebSocket();

  const [mySnake, setMySnake] = useState<SnakeState>({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 15 },
    direction: 'RIGHT',
    score: 0,
  });

  const [opponentSnake, setOpponentSnake] = useState<SnakeState>({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 15 },
    direction: 'RIGHT',
    score: 0,
  });

  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [restartInput, setRestartInput] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const restartInputRef = useRef<HTMLInputElement>(null);

  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const opponentName = matchInfo?.opponent.username || 'Opponent';

  // Blinking cursor for restart
  useEffect(() => {
    if (!gameOver) return;

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [gameOver]);

  // Auto-focus restart input
  useEffect(() => {
    if (gameOver) {
      restartInputRef.current?.focus();
    }
  }, [gameOver]);

  // Handle game over from WebSocket
  useEffect(() => {
    if (gameOverInfo) {
      setGameOver(true);
      setWinner(gameOverInfo.winner);
    }
  }, [gameOverInfo]);

  // Handle opponent disconnection
  useEffect(() => {
    if (opponentDisconnected) {
      setGameOver(true);
      setWinner(username);
    }
  }, [opponentDisconnected, username]);

  // Generate random food position
  const generateFood = (snake: Position[]): Position => {
    let food: Position;
    do {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
    return food;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      const currentDir = nextDirectionRef.current;
      let newDir: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
          if (currentDir !== 'DOWN') newDir = 'UP';
          break;
        case 'ArrowDown':
          if (currentDir !== 'UP') newDir = 'DOWN';
          break;
        case 'ArrowLeft':
          if (currentDir !== 'RIGHT') newDir = 'LEFT';
          break;
        case 'ArrowRight':
          if (currentDir !== 'LEFT') newDir = 'RIGHT';
          break;
      }

      if (newDir) {
        e.preventDefault();
        nextDirectionRef.current = newDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  // Game timer
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && socket) {
          // Time's up - emit game over
          socket.emit('snake-game-over', { username, score: mySnake.score });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, socket, username, mySnake.score]);

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setMySnake((prev) => {
        directionRef.current = nextDirectionRef.current;
        const head = prev.snake[0];
        let newHead: Position;

        switch (directionRef.current) {
          case 'UP':
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case 'DOWN':
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case 'LEFT':
            newHead = { x: head.x - 1, y: head.y };
            break;
          case 'RIGHT':
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        // Wrap around walls
        if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
        if (newHead.x >= GRID_SIZE) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
        if (newHead.y >= GRID_SIZE) newHead.y = 0;

        // Check self collision
        if (prev.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          // Game over - snake hit itself
          if (socket) {
            socket.emit('snake-game-over', { username, score: prev.score });
          }
          setGameOver(true);
          return prev;
        }

        const newSnake = [newHead, ...prev.snake];
        let newFood = prev.food;
        let newScore = prev.score;

        // Check if snake ate food
        if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
          newScore += 10;
          newFood = generateFood(newSnake);
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        const newState = {
          snake: newSnake,
          food: newFood,
          direction: directionRef.current,
          score: newScore,
        };

        // Broadcast state to opponent
        if (socket) {
          socket.emit('snake-update-state', newState);
        }

        return newState;
      });
    }, 150); // Snake moves every 150ms

    return () => clearInterval(gameLoop);
  }, [gameOver, socket, username]);

  // Listen for opponent snake updates
  useEffect(() => {
    if (!socket) return;

    const handleOpponentState = (state: SnakeState) => {
      setOpponentSnake(state);
    };

    socket.on('snake-opponent-state', handleOpponentState);

    return () => {
      socket.off('snake-opponent-state', handleOpponentState);
    };
  }, [socket]);

  // Draw my snake
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      mySnake.food.x * CELL_SIZE,
      mySnake.food.y * CELL_SIZE,
      CELL_SIZE - 1,
      CELL_SIZE - 1
    );

    // Draw snake
    mySnake.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#22c55e' : '#16a34a';
      ctx.fillRect(
        segment.x * CELL_SIZE,
        segment.y * CELL_SIZE,
        CELL_SIZE - 1,
        CELL_SIZE - 1
      );
    });
  }, [mySnake]);

  // Draw opponent snake
  useEffect(() => {
    const canvas = opponentCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      opponentSnake.food.x * CELL_SIZE,
      opponentSnake.food.y * CELL_SIZE,
      CELL_SIZE - 1,
      CELL_SIZE - 1
    );

    // Draw snake
    opponentSnake.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#ef4444' : '#dc2626';
      ctx.fillRect(
        segment.x * CELL_SIZE,
        segment.y * CELL_SIZE,
        CELL_SIZE - 1,
        CELL_SIZE - 1
      );
    });
  }, [opponentSnake]);

  const handleRestartKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (
        restartInput.toLowerCase() === 'restart' ||
        restartInput.toLowerCase() === 'play'
      ) {
        resetGame();
        onGameEnd();
      }
      setRestartInput('');
    }
  };

  if (gameOver && winner) {
    return (
      <div className="min-h-screen bg-black text-green-500 p-8 font-mono">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            {winner === username ? (
              <>
                <pre className="text-green-500 text-xs mb-4">
                  {`
██╗   ██╗██╗ ██████╗████████╗ ██████╗ ██████╗ ██╗   ██╗██╗
██║   ██║██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝██║
██║   ██║██║██║        ██║   ██║   ██║██████╔╝ ╚████╔╝ ██║
╚██╗ ██╔╝██║██║        ██║   ██║   ██║██╔══██╗  ╚██╔╝  ╚═╝
 ╚████╔╝ ██║╚██████╗   ██║   ╚██████╔╝██║  ██║   ██║   ██╗
  ╚═══╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝
`}
                </pre>
                <p className="text-green-400 mb-2">$ Winner: {winner}</p>
              </>
            ) : (
              <>
                <pre className="text-red-500 text-xs mb-4">
                  {`
██████╗ ███████╗███████╗███████╗ █████╗ ████████╗███████╗██████╗
██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
██║  ██║█████╗  █████╗  █████╗  ███████║   ██║   █████╗  ██║  ██║
██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██╔══██║   ██║   ██╔══╝  ██║  ██║
██████╔╝███████╗██║     ███████╗██║  ██║   ██║   ███████╗██████╔╝
╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝
`}
                </pre>
                <p className="text-red-400 mb-2">$ Winner: {winner}</p>
              </>
            )}
            <p className="text-green-600">$ Your Score: {mySnake.score}</p>
            <p className="text-green-700">$ Opponent Score: {opponentSnake.score}</p>
          </div>

          <div className="mb-2 text-green-500">
            <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className="text-green-500 mr-2">root@terminal:~$</span>
              <span className="text-green-400">{restartInput}</span>
              <span
                style={showCursor ? { opacity: 1 } : { opacity: 0 }}
                className="text-green-400"
              >
                _
              </span>
              <input
                ref={restartInputRef}
                type="text"
                value={restartInput}
                onChange={(e) => setRestartInput(e.target.value)}
                onKeyDown={handleRestartKeyDown}
                style={{ opacity: 0 }}
                onBlur={(e) => e.target.focus()}
                className="absolute"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="text-green-700 text-sm mt-8">
            <p>&gt; Type 'restart' or 'play' and press ENTER to play again</p>
          </div>

          <div className="mt-8 text-green-900 text-xs">
            <p>System ready | Awaiting command...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-black font-mono">
      {/* Header */}
      <div className="bg-black border-b-2 border-green-500 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-green-500">&gt; SNAKE BATTLE</h2>
            <p className="text-sm text-green-600">$ Time Left: {timeLeft}s</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-green-400">
              {username}: {mySnake.score}
            </p>
            <p className="text-sm text-green-700">
              {opponentName}: {opponentSnake.score}
            </p>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div className="flex flex-row gap-4 flex-wrap justify-center">
          {/* Your snake */}
          <div className="flex flex-col border-2 border-green-900 flex-shrink-0">
            <div className="bg-black px-4 py-2 border-b border-green-900">
              <p className="text-xs font-semibold text-green-500">
                &gt; YOUR SNAKE - Score: {mySnake.score}
              </p>
            </div>
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          </div>

          {/* Opponent's snake */}
          <div className="flex flex-col border-2 border-red-900 flex-shrink-0">
            <div className="bg-black px-4 py-2 border-b border-red-900">
              <p className="text-xs font-semibold text-red-500">
                &gt; {opponentName.toUpperCase()}'S SNAKE - Score: {opponentSnake.score}
              </p>
            </div>
            <canvas
              ref={opponentCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          </div>
        </div>
      </div>

      <div className="bg-black border-t-2 border-green-500 p-2">
        <p className="text-center text-sm text-green-600">
          Use arrow keys to control your snake | Longest snake wins!
        </p>
      </div>
    </div>
  );
}
