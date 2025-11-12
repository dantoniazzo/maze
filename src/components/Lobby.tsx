import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "../context/WebSocketContext";

type LobbyProps = {
  username: string;
  onStartGame: () => void;
};

export function Lobby({ username, onStartGame }: LobbyProps) {
  const [input, setInput] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { findMatch, isWaitingForMatch, matchInfo } = useWebSocket();

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Start game when match is found
  useEffect(() => {
    if (matchInfo) {
      onStartGame();
    }
  }, [matchInfo, onStartGame]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (input.toLowerCase() === "start" || input.toLowerCase() === "play") {
        findMatch(username);
      }
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-500 p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-green-400">
            $ User authenticated:{" "}
            <span className="text-green-300 font-bold">{username}</span>
          </p>
          <p className="text-green-600">$ Connection established</p>
          <p className="text-green-700">$ Maze protocol loaded</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="mb-6 text-green-400">
          <p className="mb-2">MAZE TERMINAL v1.0</p>
          <p className="text-green-600 text-sm mb-1">
            Race against opponent to escape first
          </p>
          <p className="text-green-700 text-sm">Controls: Arrow keys to move</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center mb-2">
            <span className="text-green-500 mr-2">root@maze:~$</span>
            <span className="text-green-400">{input}</span>
            <span
              style={showCursor ? { opacity: 1 } : { opacity: 0 }}
              className={`text-green-400`}
            >
              _
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute"
              onBlur={(e) => e.target.focus()}
              style={{
                opacity: 0,
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="text-green-700 text-sm mt-8">
          {isWaitingForMatch ? (
            <p className="text-green-400 animate-pulse">&gt; Searching for opponent...</p>
          ) : (
            <p>&gt; Type 'start' or 'play' and press ENTER to begin</p>
          )}
        </div>

        <div className="mt-8 text-green-900 text-xs">
          <p>System ready | Awaiting command...</p>
        </div>
      </div>
    </div>
  );
}
