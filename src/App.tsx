import { useState } from 'react';
import { UsernameEntry } from './components/UsernameEntry';
import { Lobby } from './components/Lobby';
import { GameScreen } from './components/GameScreen';

type GameState = 'username' | 'lobby' | 'playing';

function App() {
  const [gameState, setGameState] = useState<GameState>('username');
  const [username, setUsername] = useState<string>('');

  const handleUsernameSubmit = (name: string) => {
    setUsername(name);
    setGameState('lobby');
  };

  const handleStartGame = () => {
    setGameState('playing');
  };

  const handleGameEnd = () => {
    setGameState('lobby');
  };

  return (
    <>
      {gameState === 'username' && (
        <UsernameEntry onSubmit={handleUsernameSubmit} />
      )}
      {gameState === 'lobby' && (
        <Lobby username={username} onStartGame={handleStartGame} />
      )}
      {gameState === 'playing' && (
        <GameScreen username={username} onGameEnd={handleGameEnd} />
      )}
    </>
  );
}

export default App;
