// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const adapter = new JSONFile('db.json');
const defaultData = { games: {} };
const db = new Low(adapter, defaultData);
await db.read();

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling'],
});

let publicChatMessages = [];

const isPlayerInAnyGame = (socketId) => {
    for (const game of Object.values(db.data.games)) {
        if (game.players.some(p => p.id === socketId)) {
            return true;
        }
    }
    return false;
};

setInterval(() => {
  const availableGames = Object.values(db.data.games).filter(g => g.status === 'waiting');
  io.emit('games-list-update', availableGames);
}, 2000);

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  socket.emit('chat-history', publicChatMessages);

  socket.on('create-game', async (gameOptions, callback) => {
    try {
      // VALIDACIÓN CLAVE: El jugador no puede estar en otra partida
      if (isPlayerInAnyGame(socket.id)) {
          return callback({ success: false, message: 'Ya estás en una partida. No puedes crear otra.' });
      }

      const { creatorName, points, flor, gameMode, vsAI, password } = gameOptions;
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      
      const newGame = {
        roomId,
        hostId: socket.id,
        status: 'waiting',
        players: [{ id: socket.id, name: creatorName, team: 'A' }],
        teams: { A: [{ id: socket.id, name: creatorName }], B: [] },
        creatorName, points, flor, gameMode, vsAI, password,
        createdAt: Date.now(),
      };

      db.data.games[roomId] = newGame;
      await db.write();
      
      socket.join(roomId);
      
      const logMessage = { id: uuidv4(), type: 'log', text: `Partida #${roomId} creada por ${creatorName}.`, timestamp: Date.now() };
      publicChatMessages.push(logMessage);
      io.emit('new-chat-message', logMessage);

      callback({ success: true, roomId });
    } catch (e) {
      callback({ success: false, message: e.message });
    }
  });

  // El resto de los eventos del servidor...
  // ... (join-room, get-game-state, send-public-message, disconnect)
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
