import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

type WaitingForOpponentProps = {
  username: string;
  onMatchFound: () => void;
};

export function WaitingForOpponent({
  username,
  onMatchFound,
}: WaitingForOpponentProps) {
  const { matchInfo } = useWebSocket();

  // Start game when match is found
  useEffect(() => {
    if (matchInfo) {
      onMatchFound();
    }
  }, [matchInfo, onMatchFound]);

  return (
    <div className="min-h-screen bg-black text-green-500 p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-green-400">
            $ User:{' '}
            <span className="text-green-300 font-bold">{username}</span>
          </p>
          <p className="text-green-600">$ Connection established</p>
          <p className="text-green-700">$ Matchmaking initiated</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="mb-6 text-green-400">
          <p className="mb-2">TERMINAL GAMES v1.0</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-8">
            <div className="flex space-x-2">
              <span className="text-green-400 text-2xl animate-pulse">.</span>
              <span
                className="text-green-400 text-2xl animate-pulse"
                style={{ animationDelay: '0.2s' }}
              >
                .
              </span>
              <span
                className="text-green-400 text-2xl animate-pulse"
                style={{ animationDelay: '0.4s' }}
              >
                .
              </span>
            </div>
          </div>

          <p className="text-green-400 text-lg mb-2 animate-pulse">
            &gt; Waiting for opponent...
          </p>
          <p className="text-green-600 text-sm">
            Searching for another player to match with
          </p>
        </div>

        <div className="mt-8 text-green-900 text-xs">
          <p>System status | Matchmaking in progress...</p>
        </div>
      </div>
    </div>
  );
}
