// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
const server = http.createServer(app);
const adapter = new JSONFile('db.json');
const defaultData = { games: {} };
const db = new Low(adapter, defaultData);
await db.read();

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const isPlayerInAnyGame = (socketId) => {
  const games = db.data.games;
  for (const roomId in games) {
    if (games[roomId].players.some(p => p.id === socketId)) return true;
  }
  return false;
};

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  socket.on('create-game', async (data, callback) => {
    // 1. Acuse de recibo inmediato para depuración.
    if (typeof callback === 'function') {
      console.log(`Recibido 'create-game' de ${socket.id}. Enviando ack.`);
      callback({ status: 'ok', message: `Servidor recibió 'create-game'` });
    }

    // 2. Lógica de la partida.
    try {
      const { playerName, gameMode, vsAI } = data;
      if (!playerName) return;
      if (isPlayerInAnyGame(socket.id)) return;

      const roomId = uuidv4().substring(0, 6).toUpperCase();
      const newGame = {
        roomId, hostId: socket.id, gameMode, vsAI, status: 'waiting',
        players: [{ id: socket.id, name: playerName, team: 'A', isAI: false }],
        maxPlayers: parseInt(gameMode[0], 10) * 2
      };

      db.data.games[roomId] = newGame;
      await db.write();

      socket.join(roomId);
      console.log(`Partida creada: ${roomId} por ${playerName}`);
      socket.emit('game-created', newGame);
    } catch (error) {
      console.error('Error en create-game:', error);
    }
  });

  // ... (el resto de tus eventos como 'join-room' y 'disconnect' permanecen igual)
  socket.on('join-room', async (data) => { /* ... tu lógica existente ... */ });
  socket.on('disconnect', async (reason) => { /* ... tu lógica existente ... */ });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
