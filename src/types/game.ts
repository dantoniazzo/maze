export type Position = {
  row: number;
  col: number;
};

export type Player = {
  id: string;
  name: string;
  position: Position;
  isFinished: boolean;
  finishTime?: number;
};

export type GameState = {
  players: Player[];
  startTime: number | null;
  gameOver: boolean;
  winner: Player | null;
};

export type GameType = 'maze' | 'snake' | 'pong';

export type Game = {
  id: GameType;
  name: string;
  description: string;
};
