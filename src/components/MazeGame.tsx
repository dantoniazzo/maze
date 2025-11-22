import { useState, useEffect, useMemo, useCallback } from "react";
import { Maze } from "./Maze";
import { generateMaze } from "../utils/mazeGenerator";
import type { Position } from "../types/game";
import { useWebSocket } from "../context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, Users } from "lucide-react";

type MazeGameProps = {
  username: string;
  onGameEnd: () => void;
};

export function MazeGame({ username, onGameEnd }: MazeGameProps) {
  const {
    matchInfo,
    sendMove,
    sendFinish,
    onOpponentMove,
    gameOverInfo,
    opponentDisconnected,
    resetGame,
  } = useWebSocket();

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

  const mazeRows = maze.length;
  const mazeCols = maze[0].length;
  const goalPosition = { row: mazeRows - 1, col: mazeCols - 1 };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [gameOver]);

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

  const handlePlayerMove = useCallback(
    (newPosition: Position) => {
      setPlayerPosition(newPosition);
      sendMove(newPosition);
    },
    [sendMove]
  );

  useEffect(() => {
    onOpponentMove((position: Position) => {
      setOpponentPosition(position);
    });
  }, [onOpponentMove]);

  const elapsedTime = ((currentTime - startTime) / 1000).toFixed(1);
  const cellSize = isMobile ? 14 : 18;
  const opponentName = matchInfo?.opponent.username || "Opponent";

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
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Completion time: {elapsedTime}s</span>
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
              <h2 className="text-lg font-bold">Maze Race</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{elapsedTime}s</span>
              </div>
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

      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div className="flex flex-row gap-4 flex-wrap justify-center">
          <Card className="flex flex-col border-2 border-primary/20 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold">Your Maze</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Maze
                maze={maze}
                playerPosition={playerPosition}
                cellSize={cellSize}
                onMove={handlePlayerMove}
                isActive={true}
              />
            </CardContent>
          </Card>

          <Card className="flex flex-col border-2 border-red-200 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold text-red-600">
                {opponentName}'s Maze
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Maze
                maze={maze}
                playerPosition={opponentPosition}
                cellSize={cellSize}
                onMove={() => {}}
                isActive={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
