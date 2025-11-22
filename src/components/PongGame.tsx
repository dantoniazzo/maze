import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users } from "lucide-react";

type PongGameProps = {
  username: string;
  onGameEnd: () => void;
};

type PongState = {
  ballX: number;
  ballY: number;
  ballVelX: number;
  ballVelY: number;
  player1Y: number;
  player2Y: number;
  player1Score: number;
  player2Score: number;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 10;
const PADDLE_SPEED = 8;
const BALL_SPEED = 8;
const WINNING_SCORE = 5;

export function PongGame({ username, onGameEnd }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { matchInfo, socket, gameOverInfo, resetGame, opponentDisconnected } = useWebSocket();

  const [gameState, setGameState] = useState<PongState>({
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballVelX: BALL_SPEED,
    ballVelY: BALL_SPEED * 0.6,
    player1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player1Score: 0,
    player2Score: 0,
  });

  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const localPaddleYRef = useRef(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);

  const keysPressed = useRef<Set<string>>(new Set());
  const isPlayer1 = matchInfo?.playerNumber === 1;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      let newY = localPaddleYRef.current;

      if (keysPressed.current.has('ArrowUp')) {
        newY = Math.max(0, newY - PADDLE_SPEED);
      }
      if (keysPressed.current.has('ArrowDown')) {
        newY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY + PADDLE_SPEED);
      }

      if (newY !== localPaddleYRef.current) {
        localPaddleYRef.current = newY;
        if (socket) {
          socket.emit('pong-paddle-move', newY);
        }
      }
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [gameOver, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleOpponentPaddle = (y: number) => {
      setGameState((prev) => ({
        ...prev,
        [isPlayer1 ? 'player2Y' : 'player1Y']: y,
      }));
    };

    socket.on('pong-opponent-paddle', handleOpponentPaddle);

    return () => {
      socket.off('pong-opponent-paddle', handleOpponentPaddle);
    };
  }, [socket, isPlayer1]);

  useEffect(() => {
    if (!socket || isPlayer1) return;

    const handleGameStateUpdate = (state: PongState) => {
      setGameState(state);
    };

    socket.on('pong-game-state', handleGameStateUpdate);

    return () => {
      socket.off('pong-game-state', handleGameStateUpdate);
    };
  }, [socket, isPlayer1]);

  useEffect(() => {
    if (!isPlayer1 || gameOver) return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        let newState = { ...prev };

        if (newState.player1Score >= WINNING_SCORE || newState.player2Score >= WINNING_SCORE) {
          return prev;
        }

        newState.ballX += newState.ballVelX;
        newState.ballY += newState.ballVelY;

        if (newState.ballY <= 0 || newState.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
          newState.ballVelY = -newState.ballVelY;
          newState.ballY = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, newState.ballY));
        }

        if (
          newState.ballX <= PADDLE_WIDTH &&
          newState.ballY + BALL_SIZE >= prev.player1Y &&
          newState.ballY <= prev.player1Y + PADDLE_HEIGHT
        ) {
          newState.ballVelX = Math.abs(newState.ballVelX);
          newState.ballX = PADDLE_WIDTH;

          const hitPos = (newState.ballY - prev.player1Y) / PADDLE_HEIGHT;
          newState.ballVelY = (hitPos - 0.5) * 10;
        }

        if (
          newState.ballX + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH &&
          newState.ballY + BALL_SIZE >= prev.player2Y &&
          newState.ballY <= prev.player2Y + PADDLE_HEIGHT
        ) {
          newState.ballVelX = -Math.abs(newState.ballVelX);
          newState.ballX = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;

          const hitPos = (newState.ballY - prev.player2Y) / PADDLE_HEIGHT;
          newState.ballVelY = (hitPos - 0.5) * 10;
        }

        if (newState.ballX < 0) {
          newState.player2Score += 1;
          newState.ballX = CANVAS_WIDTH / 2;
          newState.ballY = CANVAS_HEIGHT / 2;
          newState.ballVelX = -BALL_SPEED;
          newState.ballVelY = BALL_SPEED * 0.6;
        } else if (newState.ballX > CANVAS_WIDTH) {
          newState.player1Score += 1;
          newState.ballX = CANVAS_WIDTH / 2;
          newState.ballY = CANVAS_HEIGHT / 2;
          newState.ballVelX = BALL_SPEED;
          newState.ballVelY = BALL_SPEED * 0.6;
        }

        if (newState.player1Score >= WINNING_SCORE || newState.player2Score >= WINNING_SCORE) {
          const winnerName = newState.player1Score >= WINNING_SCORE ? username : opponentName;

          if (socket) {
            socket.emit('pong-game-over', winnerName);
          }

          setGameOver(true);
          setWinner(winnerName);
        }

        newState.player1Y = localPaddleYRef.current;

        if (socket) {
          socket.emit('pong-update-state', newState);
        }

        return newState;
      });
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [isPlayer1, gameOver, socket, username, opponentName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, gameState.player1Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.player2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gameState.ballX, gameState.ballY, BALL_SIZE, BALL_SIZE);

    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(gameState.player1Score.toString(), CANVAS_WIDTH / 4, 50);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(gameState.player2Score.toString(), (3 * CANVAS_WIDTH) / 4, 50);
  }, [gameState]);

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
            <div className="text-center text-2xl font-bold">
              {gameState.player1Score} - {gameState.player2Score}
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
              <h2 className="text-lg font-bold">Pong Duel</h2>
              <p className="text-sm text-muted-foreground">
                First to {WINNING_SCORE} points wins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{username}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="font-semibold">{opponentName}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex justify-between w-full max-w-4xl px-8">
            <div className="text-center">
              <p className="text-xs font-semibold text-blue-600">
                {isPlayer1 ? `${username} (YOU)` : opponentName}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-red-600">
                {isPlayer1 ? opponentName : `${username} (YOU)`}
              </p>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-slate-300 rounded-lg shadow-lg"
          />
          <div className="mt-4 text-muted-foreground text-sm">
            <p>Use ↑↓ arrow keys to move your paddle</p>
          </div>
        </div>
      </div>
    </div>
  );
}
