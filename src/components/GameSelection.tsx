import { useState, useEffect, useRef } from "react";
import type { Game, GameType } from "../types/game";

type GameSelectionProps = {
  username: string;
  onGameSelect: (gameType: GameType) => void;
};

const AVAILABLE_GAMES: Game[] = [
  {
    id: "maze",
    name: "Maze Race",
    description: "Navigate through a maze. First to the exit wins!",
  },
  {
    id: "pong",
    name: "Pong Duel",
    description: "Classic pong. First to 5 points wins!",
  },
  {
    id: "snake",
    name: "Snake Battle",
    description: "Grow your snake. Longest snake after 60s wins!",
  },
];

export function GameSelection({ username, onGameSelect }: GameSelectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus on mount and delay keyboard activation
  useEffect(() => {
    containerRef.current?.focus();
    // Delay to prevent Enter key from username submission triggering selection
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : AVAILABLE_GAMES.length - 1
        );
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < AVAILABLE_GAMES.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Allow selecting all available games
        const selectedGame = AVAILABLE_GAMES[selectedIndex].id;
        if (selectedGame === "maze" || selectedGame === "pong" || selectedGame === "snake") {
          onGameSelect(selectedGame);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, onGameSelect, isReady]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="min-h-screen bg-black text-green-500 p-8 font-mono outline-none"
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-green-400">
            $ User authenticated:{" "}
            <span className="text-green-300 font-bold">{username}</span>
          </p>
          <p className="text-green-600">$ Connection established</p>
          <p className="text-green-700">$ Game protocols loaded</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="mb-6 text-green-400">
          <p className="mb-2">TERMINAL GAMES v1.0</p>
          <p className="text-green-600 text-sm mb-1">Select a game to play</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="mb-8">
          {AVAILABLE_GAMES.map((game, index) => {
            const isSelected = index === selectedIndex;
            const isAvailable = game.id === "maze" || game.id === "pong" || game.id === "snake";

            return (
              <div
                key={game.id}
                className={`mb-3 p-3 border ${
                  isSelected
                    ? "border-green-500 bg-green-950 bg-opacity-20"
                    : "border-green-900"
                } ${!isAvailable ? "opacity-50" : ""}`}
              >
                <div className="flex items-center mb-1">
                  {isSelected && (
                    <span
                      className="mr-2"
                      style={showCursor ? { opacity: 1 } : { opacity: 0 }}
                    >
                      &gt;
                    </span>
                  )}
                  {!isSelected && <span className="mr-2 opacity-0">&gt;</span>}
                  <span
                    className={`font-bold ${
                      isSelected ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {game.name}
                  </span>
                </div>
                <p
                  className={`ml-5 text-sm ${
                    isSelected ? "text-green-500" : "text-green-700"
                  }`}
                >
                  {game.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-green-700 text-sm mt-8">
          <p>&gt; Use ↑↓ arrow keys to navigate</p>
          <p>&gt; Press ENTER to select game and find opponent</p>
        </div>

        <div className="mt-8 text-green-900 text-xs">
          <p>System ready | Awaiting selection...</p>
        </div>
      </div>
    </div>
  );
}
