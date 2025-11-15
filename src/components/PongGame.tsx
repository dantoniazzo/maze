import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

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
  const [restartInput, setRestartInput] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const restartInputRef = useRef<HTMLInputElement>(null);
  const localPaddleYRef = useRef(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);

  const keysPressed = useRef<Set<string>>(new Set());
  const isPlayer1 = matchInfo?.playerNumber === 1;
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

  // Keyboard controls
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

  // Update local paddle position
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

  // Listen for opponent paddle movement
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

  // Listen for game state updates (only player 2 receives this)
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

  // Game loop (only player 1 runs the authoritative simulation)
  useEffect(() => {
    if (!isPlayer1 || gameOver) return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        let newState = { ...prev };

        // Check if game is already over
        if (newState.player1Score >= WINNING_SCORE || newState.player2Score >= WINNING_SCORE) {
          return prev; // Stop updating if game is over
        }

        // Update ball position
        newState.ballX += newState.ballVelX;
        newState.ballY += newState.ballVelY;

        // Ball collision with top/bottom
        if (newState.ballY <= 0 || newState.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
          newState.ballVelY = -newState.ballVelY;
          newState.ballY = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, newState.ballY));
        }

        // Ball collision with paddles
        // Left paddle (player 1)
        if (
          newState.ballX <= PADDLE_WIDTH &&
          newState.ballY + BALL_SIZE >= prev.player1Y &&
          newState.ballY <= prev.player1Y + PADDLE_HEIGHT
        ) {
          newState.ballVelX = Math.abs(newState.ballVelX);
          newState.ballX = PADDLE_WIDTH;

          // Add spin based on where ball hits paddle
          const hitPos = (newState.ballY - prev.player1Y) / PADDLE_HEIGHT;
          newState.ballVelY = (hitPos - 0.5) * 10;
        }

        // Right paddle (player 2)
        if (
          newState.ballX + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH &&
          newState.ballY + BALL_SIZE >= prev.player2Y &&
          newState.ballY <= prev.player2Y + PADDLE_HEIGHT
        ) {
          newState.ballVelX = -Math.abs(newState.ballVelX);
          newState.ballX = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;

          // Add spin
          const hitPos = (newState.ballY - prev.player2Y) / PADDLE_HEIGHT;
          newState.ballVelY = (hitPos - 0.5) * 10;
        }

        // Score points
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

        // Check for winner after scoring
        if (newState.player1Score >= WINNING_SCORE || newState.player2Score >= WINNING_SCORE) {
          const winnerName = newState.player1Score >= WINNING_SCORE ? username : opponentName;

          // Emit game over to both players
          if (socket) {
            socket.emit('pong-game-over', winnerName);
          }

          // Set local game over state
          setGameOver(true);
          setWinner(winnerName);
        }

        // Update player 1's paddle in the state
        newState.player1Y = localPaddleYRef.current;

        // Broadcast state to opponent
        if (socket) {
          socket.emit('pong-update-state', newState);
        }

        return newState;
      });
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [isPlayer1, gameOver, socket, username, opponentName]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, gameState.player1Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.player2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gameState.ballX, gameState.ballY, BALL_SIZE, BALL_SIZE);

    // Draw scores
    ctx.font = '32px monospace';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(gameState.player1Score.toString(), CANVAS_WIDTH / 4, 50);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(gameState.player2Score.toString(), (3 * CANVAS_WIDTH) / 4, 50);
  }, [gameState]);

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
            <p className="text-green-600">
              $ Final Score: {gameState.player1Score} - {gameState.player2Score}
            </p>
            <p className="text-green-700">$ Match ended</p>
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
            <h2 className="text-lg font-bold text-green-500">&gt; PONG DUEL</h2>
            <p className="text-sm text-green-600">
              $ First to {WINNING_SCORE} points wins
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-green-400">{username}</p>
            <p className="text-sm text-green-700">vs {opponentName}</p>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex justify-between w-full max-w-4xl px-8">
            <div className="text-center">
              <p className="text-xs font-semibold text-green-500">
                {isPlayer1 ? `${username} (YOU)` : opponentName}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-red-500">
                {isPlayer1 ? opponentName : `${username} (YOU)`}
              </p>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-green-500"
          />
          <div className="mt-4 text-green-700 text-sm">
            <p>&gt; Use ↑↓ arrow keys to move your paddle</p>
          </div>
        </div>
      </div>
    </div>
  );
}
