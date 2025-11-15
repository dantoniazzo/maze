import { useState } from "react";
import { UsernameEntry } from "./components/UsernameEntry";
import { GameSelection } from "./components/GameSelection";
import { WaitingForOpponent } from "./components/WaitingForOpponent";
import { GameScreen } from "./components/GameScreen";
import { useWebSocket } from "./context/WebSocketContext";
import type { GameType } from "./types/game";

type GameState = "username" | "game-selection" | "waiting" | "playing";

function App() {
  const [gameState, setGameState] = useState<GameState>("username");
  const [username, setUsername] = useState<string>("");
  const { findMatch } = useWebSocket();

  const handleUsernameSubmit = (name: string) => {
    setUsername(name);
    setGameState("game-selection");
  };

  const handleGameSelect = (gameType: GameType) => {
    findMatch(username, gameType);
    console.log("Here");
    setGameState("waiting");
  };

  const handleMatchFound = () => {
    setGameState("playing");
  };

  const handleGameEnd = () => {
    setGameState("game-selection");
  };

  return (
    <>
      {gameState === "username" && (
        <UsernameEntry onSubmit={handleUsernameSubmit} />
      )}
      {gameState === "game-selection" && (
        <GameSelection username={username} onGameSelect={handleGameSelect} />
      )}
      {gameState === "waiting" && (
        <WaitingForOpponent
          username={username}
          onMatchFound={handleMatchFound}
        />
      )}
      {gameState === "playing" && (
        <GameScreen username={username} onGameEnd={handleGameEnd} />
      )}
    </>
  );
}

export default App;
