import { useWebSocket } from '../context/WebSocketContext';
import { MazeGame } from './MazeGame';
import { PongGame } from './PongGame';
import { SnakeGame } from './SnakeGame';

type GameScreenProps = {
  username: string;
  onGameEnd: () => void;
};

export function GameScreen({ username, onGameEnd }: GameScreenProps) {
  const { matchInfo } = useWebSocket();

  if (!matchInfo) {
    return (
      <div className="min-h-screen bg-black text-green-500 p-8 font-mono flex items-center justify-center">
        <p className="text-green-400">Loading game...</p>
      </div>
    );
  }

  switch (matchInfo.gameType) {
    case 'maze':
      return <MazeGame username={username} onGameEnd={onGameEnd} />;
    case 'pong':
      return <PongGame username={username} onGameEnd={onGameEnd} />;
    case 'snake':
      return <SnakeGame username={username} onGameEnd={onGameEnd} />;
    default:
      return (
        <div className="min-h-screen bg-black text-green-500 p-8 font-mono flex items-center justify-center">
          <p className="text-red-400">Unknown game type: {matchInfo.gameType}</p>
        </div>
      );
  }
}
