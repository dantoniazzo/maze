import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, Users } from "lucide-react";

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
const GAME_DURATION = 60;

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

  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const opponentName = matchInfo?.opponent.username || 'Opponent';

  useEffect(() => {
    if (gameOverInfo) {
      setGameOver(true);
      setWinner(gameOverInfo.winner);
    }
  }, [gameOverInfo]);

  useEffect(() => {
    if (opponentDisconnected) {
      setGameOver(true);
      setWinner(username);
    }
  }, [opponentDisconnected, username]);

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

  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && socket) {
          socket.emit('snake-game-over', { username, score: mySnake.score });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, socket, username, mySnake.score]);

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

        if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
        if (newHead.x >= GRID_SIZE) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
        if (newHead.y >= GRID_SIZE) newHead.y = 0;

        if (prev.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          if (socket) {
            socket.emit('snake-game-over', { username, score: prev.score });
          }
          setGameOver(true);
          return prev;
        }

        const newSnake = [newHead, ...prev.snake];
        let newFood = prev.food;
        let newScore = prev.score;

        if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
          newScore += 10;
          newFood = generateFood(newSnake);
        } else {
          newSnake.pop();
        }

        const newState = {
          snake: newSnake,
          food: newFood,
          direction: directionRef.current,
          score: newScore,
        };

        if (socket) {
          socket.emit('snake-update-state', newState);
        }

        return newState;
      });
    }, 150);

    return () => clearInterval(gameLoop);
  }, [gameOver, socket, username]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#334155';
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

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      mySnake.food.x * CELL_SIZE,
      mySnake.food.y * CELL_SIZE,
      CELL_SIZE - 1,
      CELL_SIZE - 1
    );

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

  useEffect(() => {
    const canvas = opponentCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#334155';
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

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      opponentSnake.food.x * CELL_SIZE,
      opponentSnake.food.y * CELL_SIZE,
      CELL_SIZE - 1,
      CELL_SIZE - 1
    );

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

  const handlePlayAgain = () => {
    resetGame();
    onGameEnd();
  };

  if (gameOver && winner) {
    const isWinner = winner === username;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isWinner ? 'bg-green-100' : 'bg-red-100'}`}>
                <Trophy className={`h-8 w-8 ${isWinner ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              {isWinner ? "Victory!" : "Defeated"}
            </CardTitle>
            <p className="text-muted-foreground">
              Winner: <span className="font-semibold text-foreground">{winner}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-sm text-muted-foreground">Your Score</p>
                <p className="text-2xl font-bold">{mySnake.score}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opponent Score</p>
                <p className="text-2xl font-bold">{opponentSnake.score}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button
                onClick={handlePlayAgain}
                className="w-full text-base py-5"
              >
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Snake Battle</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Time Left: {timeLeft}s</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{username}</span>
              <span className="text-muted-foreground">vs</span>
              <span className="font-semibold">{opponentName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div className="flex flex-row gap-4 flex-wrap justify-center">
          <Card className="flex flex-col border-2 border-primary/20 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold">
                Your Snake - Score: {mySnake.score}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="rounded-b-lg"
              />
            </CardContent>
          </Card>

          <Card className="flex flex-col border-2 border-red-200 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold text-red-600">
                {opponentName}'s Snake - Score: {opponentSnake.score}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <canvas
                ref={opponentCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="rounded-b-lg"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-white border-t shadow-sm p-2">
        <p className="text-center text-sm text-muted-foreground">
          Use arrow keys to control your snake - Longest snake wins!
        </p>
      </div>
    </div>
  );
}
