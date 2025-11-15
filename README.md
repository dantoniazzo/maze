# Terminal Games

A collection of multiplayer terminal-themed games built with real-time WebSocket technology.

## Available Games

- **Maze Race** - Navigate through a maze. First to the exit wins!
- **Pong Duel** - Classic pong. First to 5 points wins!
- **Snake Battle** - (Coming Soon) Grow your snake. Longest snake after 60s wins!

## Technologies

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Real-time Communication**: WebSocket (Socket.io)

## How to Run

1. Install dependencies:
```bash
npm i
```

2. Start the WebSocket server (in one terminal):
```bash
npm run server
```

3. Start the development server (in another terminal):
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Game Flow

1. Enter your username
2. Select a game from the menu (use arrow keys to navigate, Enter to select)
3. Wait for an opponent to join
4. Play the game!
5. After the game ends, select another game to play

## Features

- Terminal-themed retro UI
- Real-time multiplayer matchmaking
- Arrow key navigation
- Automatic opponent matching by game type
- Split-screen gameplay (see your opponent's progress in real-time)
