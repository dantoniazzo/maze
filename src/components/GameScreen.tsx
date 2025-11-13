import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Maze } from "./Maze";
import { generateMaze } from "../utils/mazeGenerator";
import type { Position } from "../types/game";
import { useWebSocket } from "../context/WebSocketContext";

type GameScreenProps = {
  username: string;
  onGameEnd: () => void;
};

export function GameScreen({ username, onGameEnd }: GameScreenProps) {
  const {
    matchInfo,
    sendMove,
    sendFinish,
    onOpponentMove,
    gameOverInfo,
    opponentDisconnected,
    resetGame,
  } = useWebSocket();

  // Generate maze using seed from matchmaking
  const maze = useMemo(() => {
    return matchInfo
      ? generateMaze(20, 25, matchInfo.mazeSeed)
      : generateMaze(20, 25);
  }, [matchInfo]);

  const [playerPosition, setPlayerPosition] = useState<Position>({
    row: 0,
    col: 0,
  });
  const [opponentPosition, setOpponentPosition] = useState<Position>({
    row: 0,
    col: 0,
  });
  const [startTime] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [restartInput, setRestartInput] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const restartInputRef = useRef<HTMLInputElement>(null);

  const mazeRows = maze.length;
  const mazeCols = maze[0].length;
  const goalPosition = { row: mazeRows - 1, col: mazeCols - 1 };

  // Check screen size for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update timer
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [gameOver]);

  // Check if player reached the goal
  useEffect(() => {
    if (gameOver) return;

    const playerWon =
      playerPosition.row === goalPosition.row &&
      playerPosition.col === goalPosition.col;

    if (playerWon) {
      sendFinish();
      setGameOver(true);
    }
  }, [playerPosition, goalPosition, gameOver, sendFinish]);

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

  const handlePlayerMove = useCallback(
    (newPosition: Position) => {
      setPlayerPosition(newPosition);
      sendMove(newPosition);
    },
    [sendMove]
  );

  // Listen for opponent moves
  useEffect(() => {
    onOpponentMove((position: Position) => {
      setOpponentPosition(position);
    });
  }, [onOpponentMove]);

  const elapsedTime = ((currentTime - startTime) / 1000).toFixed(1);

  // Calculate cell size based on screen
  const cellSize = isMobile ? 14 : 18;

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

  const handleRestartKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (
        restartInput.toLowerCase() === "restart" ||
        restartInput.toLowerCase() === "play"
      ) {
        resetGame();
        onGameEnd();
      }
      setRestartInput("");
    }
  };

  const opponentName = matchInfo?.opponent.username || "Opponent";

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
            <p className="text-green-600">$ Completion time: {elapsedTime}s</p>
            <p className="text-green-700">$ Match ended</p>
          </div>

          <div className="mb-2 text-green-500">
            <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className="text-green-500 mr-2">root@maze:~$</span>
              <span className="text-green-400">{restartInput}</span>
              <span
                style={showCursor ? { opacity: 1 } : { opacity: 0 }}
                className={`text-green-400`}
              >
                _
              </span>
              <input
                ref={restartInputRef}
                type="text"
                value={restartInput}
                onChange={(e) => setRestartInput(e.target.value)}
                onKeyDown={handleRestartKeyDown}
                style={{
                  opacity: 0,
                }}
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
            <h2 className="text-lg font-bold text-green-500">
              &gt; MAZE TERMINAL
            </h2>
            <p className="text-sm text-green-600">$ Runtime: {elapsedTime}s</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-green-400">{username}</p>
            <p className="text-sm text-green-700">vs {opponentName}</p>
          </div>
        </div>
      </div>

      {/* Split screen - horizontal on desktop, vertical on mobile */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div className="flex flex-row gap-4 flex-wrap justify-center">
          {/* Your maze */}
          <div className="flex flex-col border-2 border-green-900 flex-shrink-0">
            <div className="bg-black px-4 py-2 border-b border-green-900">
              <p className="text-xs font-semibold text-green-500">
                &gt; YOUR MAZE
              </p>
            </div>
            <Maze
              maze={maze}
              playerPosition={playerPosition}
              cellSize={cellSize}
              onMove={handlePlayerMove}
              isActive={true}
            />
          </div>

          {/* Opponent's maze */}
          <div className="flex flex-col border-2 border-red-900 flex-shrink-0">
            <div className="bg-black px-4 py-2 border-b border-red-900">
              <p className="text-xs font-semibold text-red-500">
                &gt; {opponentName.toUpperCase()}'S MAZE
              </p>
            </div>
            <Maze
              maze={maze}
              playerPosition={opponentPosition}
              cellSize={cellSize}
              onMove={() => {}}
              isActive={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
