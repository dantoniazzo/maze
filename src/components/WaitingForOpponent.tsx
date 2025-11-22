import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

type WaitingForOpponentProps = {
  username: string;
  onMatchFound: () => void;
};

export function WaitingForOpponent({
  username,
  onMatchFound,
}: WaitingForOpponentProps) {
  const { matchInfo } = useWebSocket();

  useEffect(() => {
    if (matchInfo) {
      onMatchFound();
    }
  }, [matchInfo, onMatchFound]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Finding Opponent</CardTitle>
          <CardDescription className="text-base">
            Searching for another player to match with
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 py-8">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Player: <span className="font-semibold text-foreground">{username}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              This usually takes just a few seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
