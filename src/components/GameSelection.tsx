import type { Game, GameType } from "../types/game";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Gamepad2, User, Grid3x3, Zap, Apple } from "lucide-react";

type GameSelectionProps = {
  username: string;
  onGameSelect: (gameType: GameType) => void;
};

const AVAILABLE_GAMES: (Game & { icon: typeof Grid3x3 })[] = [
  {
    id: "maze",
    name: "Maze Race",
    description: "Navigate through a maze. First to the exit wins!",
    icon: Grid3x3,
  },
  {
    id: "pong",
    name: "Pong Duel",
    description: "Classic pong. First to 5 points wins!",
    icon: Zap,
  },
  {
    id: "snake",
    name: "Snake Battle",
    description: "Grow your snake. Longest snake after 60s wins!",
    icon: Apple,
  },
];

export function GameSelection({ username, onGameSelect }: GameSelectionProps) {
  const handleGameSelect = (gameType: GameType) => {
    onGameSelect(gameType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Gamepad2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Classic Games</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="font-medium">{username}</span>
          </div>
        </div>

        <Separator className="mb-8" />

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2 text-center">Choose Your Game</h2>
          <p className="text-center text-muted-foreground">
            Select a game to find an opponent and start playing
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {AVAILABLE_GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <Card
                key={game.id}
                className="relative hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => handleGameSelect(game.id as GameType)}
              >
                <CardHeader>
                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-center">{game.name}</CardTitle>
                  <CardDescription className="text-center">
                    {game.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="default">
                    Play Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
