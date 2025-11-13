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

// Matchmaking queue
const waitingPlayers = [];
const activeGames = new Map();

// Generate a random seed for maze generation
function generateMazeSeed() {
  return Math.floor(Math.random() * 1000000);
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("find-match", (username) => {
    console.log(`${username} (${socket.id}) is looking for a match`);

    socket.username = username;

    // Check if there's a waiting player
    if (waitingPlayers.length > 0) {
      // Match found! Pair with waiting player
      const opponent = waitingPlayers.shift();

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
        opponent: { id: opponent.id, username: opponent.username },
        playerNumber: 1,
      });

      opponent.emit("match-found", {
        roomId,
        mazeSeed,
        opponent: { id: socket.id, username: socket.username },
        playerNumber: 2,
      });

      console.log(`Match created: ${socket.username} vs ${opponent.username}`);
    } else {
      // No match yet, add to waiting queue
      waitingPlayers.push(socket);
      socket.emit("waiting-for-match");
      console.log(`${username} added to waiting queue`);
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

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from waiting queue if present
    const waitingIndex = waitingPlayers.findIndex((p) => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
      console.log(`Removed ${socket.username} from waiting queue`);
    }

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
