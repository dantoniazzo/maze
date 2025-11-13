import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import type { Position } from "../types/game";

type MatchInfo = {
  roomId: string;
  mazeSeed: number;
  opponent: { id: string; username: string };
  playerNumber: number;
};

type GameOverInfo = {
  winner: string;
  time: number;
};

type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  matchInfo: MatchInfo | null;
  gameOverInfo: GameOverInfo | null;
  isWaitingForMatch: boolean;
  opponentDisconnected: boolean;
  findMatch: (username: string) => void;
  sendMove: (position: Position) => void;
  sendFinish: () => void;
  resetGame: () => void;
  onOpponentMove: (callback: (position: Position) => void) => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

type WebSocketProviderProps = {
  children: ReactNode;
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [isWaitingForMatch, setIsWaitingForMatch] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  useEffect(() => {
    const newSocket = io("https://maze-arpa.onrender.com");

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("waiting-for-match", () => {
      console.log("Waiting for opponent...");
      setIsWaitingForMatch(true);
    });

    newSocket.on("match-found", (info: MatchInfo) => {
      console.log("Match found!", info);
      setMatchInfo(info);
      setIsWaitingForMatch(false);
    });

    newSocket.on("game-over", (info: GameOverInfo) => {
      console.log("Game over", info);
      setGameOverInfo(info);
    });

    newSocket.on("opponent-disconnected", () => {
      console.log("Opponent disconnected");
      setOpponentDisconnected(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const findMatch = (username: string) => {
    if (socket) {
      socket.emit("find-match", username);
    }
  };

  const sendMove = (position: Position) => {
    if (socket) {
      socket.emit("player-move", position);
    }
  };

  const sendFinish = () => {
    if (socket) {
      socket.emit("player-finished");
    }
  };

  const resetGame = () => {
    setMatchInfo(null);
    setGameOverInfo(null);
    setIsWaitingForMatch(false);
    setOpponentDisconnected(false);
  };

  const onOpponentMove = (callback: (position: Position) => void) => {
    if (socket) {
      socket.on("opponent-move", callback);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        matchInfo,
        gameOverInfo,
        isWaitingForMatch,
        opponentDisconnected,
        findMatch,
        sendMove,
        sendFinish,
        resetGame,
        onOpponentMove,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
