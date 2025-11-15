import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "https://maze-web.onrender.com"],
    methods: ["GET", "POST"],
  },
});

// Matchmaking queues - one per game type
const waitingPlayers = {
  maze: [],
  snake: [],
  pong: [],
};
const activeGames = new Map();

// Generate a random seed for maze generation
function generateMazeSeed() {
  return Math.floor(Math.random() * 1000000);
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("find-match", ({ username, gameType }) => {
    console.log(`${username} (${socket.id}) is looking for a ${gameType} match`);

    socket.username = username;
    socket.gameType = gameType;

    // Check if there's a waiting player for this game type
    const queue = waitingPlayers[gameType];
    if (queue && queue.length > 0) {
      // Match found! Pair with waiting player
      const opponent = queue.shift();

      // Create game room
      const roomId = `game-${socket.id}-${opponent.id}`;
      const mazeSeed = generateMazeSeed();

      // Both players join the room
      socket.join(roomId);
      opponent.join(roomId);

      // Store game info
      const gameInfo = {
        roomId,
        mazeSeed,
        gameType,
        players: [
          { id: socket.id, username: socket.username },
          { id: opponent.id, username: opponent.username },
        ],
        startTime: Date.now(),
      };

      activeGames.set(socket.id, gameInfo);
      activeGames.set(opponent.id, gameInfo);

      // Notify both players
      socket.emit("match-found", {
        roomId,
        mazeSeed,
        gameType,
        opponent: { id: opponent.id, username: opponent.username },
        playerNumber: 1,
      });

      opponent.emit("match-found", {
        roomId,
        mazeSeed,
        gameType,
        opponent: { id: socket.id, username: socket.username },
        playerNumber: 2,
      });

      console.log(`${gameType} match created: ${socket.username} vs ${opponent.username}`);
    } else {
      // No match yet, add to waiting queue for this game type
      if (queue) {
        queue.push(socket);
      }
      socket.emit("waiting-for-match");
      console.log(`${username} added to ${gameType} waiting queue`);
    }
  });

  socket.on("player-move", (position) => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo) {
      // Broadcast position to opponent
      socket.to(gameInfo.roomId).emit("opponent-move", position);
    }
  });

  socket.on("player-finished", () => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo) {
      const finishTime = Date.now() - gameInfo.startTime;

      // Notify both players
      io.to(gameInfo.roomId).emit("game-over", {
        winner: socket.username,
        time: finishTime / 1000,
      });

      console.log(`${socket.username} won the game in ${finishTime / 1000}s`);
    }
  });

  // Pong-specific events
  socket.on("pong-paddle-move", (y) => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo && gameInfo.gameType === "pong") {
      socket.to(gameInfo.roomId).emit("pong-opponent-paddle", y);
    }
  });

  socket.on("pong-update-state", (state) => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo && gameInfo.gameType === "pong") {
      socket.to(gameInfo.roomId).emit("pong-game-state", state);
    }
  });

  socket.on("pong-game-over", (winner) => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo && gameInfo.gameType === "pong") {
      io.to(gameInfo.roomId).emit("game-over", {
        winner: winner,
        time: 0,
      });
      console.log(`${winner} won the pong game`);
    }
  });

  // Snake-specific events
  socket.on("snake-update-state", (state) => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo && gameInfo.gameType === "snake") {
      socket.to(gameInfo.roomId).emit("snake-opponent-state", state);
    }
  });

  socket.on("snake-game-over", ({ username, score }) => {
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo && gameInfo.gameType === "snake") {
      // Store this player's score
      if (!gameInfo.scores) {
        gameInfo.scores = {};
      }
      gameInfo.scores[socket.id] = { username, score };

      // If both players have finished, determine winner
      if (Object.keys(gameInfo.scores).length === 2) {
        const scores = Object.values(gameInfo.scores);
        const winner = scores[0].score > scores[1].score ? scores[0].username : scores[1].username;

        io.to(gameInfo.roomId).emit("game-over", {
          winner: winner,
          time: 0,
        });
        console.log(`${winner} won the snake game`);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from waiting queues if present
    Object.keys(waitingPlayers).forEach((gameType) => {
      const queue = waitingPlayers[gameType];
      const waitingIndex = queue.findIndex((p) => p.id === socket.id);
      if (waitingIndex !== -1) {
        queue.splice(waitingIndex, 1);
        console.log(`Removed ${socket.username} from ${gameType} waiting queue`);
      }
    });

    // Handle active game disconnect
    const gameInfo = activeGames.get(socket.id);
    if (gameInfo) {
      // Notify opponent
      socket.to(gameInfo.roomId).emit("opponent-disconnected");

      // Clean up game
      gameInfo.players.forEach((player) => {
        activeGames.delete(player.id);
      });

      console.log(`Game ${gameInfo.roomId} ended due to disconnect`);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
