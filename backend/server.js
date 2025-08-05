// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURACIÓN INICIAL ---
const app = express();
const server = http.createServer(app);
const adapter = new JSONFile('db.json');
const defaultData = { games: {}, users: {} }; // Añadimos 'users'
const db = new Low(adapter, defaultData);
await db.read();

const io = new Server(server, {
  cors: {
    origin: "*", // Cambiar a la URL de Vercel en producción
    methods: ["GET", "POST"],
  },
  transports: ['websocket', 'polling'],
});

// --- GESTIÓN DE CHAT Y PARTIDAS ---
let publicChatMessages = [];

// Transmitir la lista de partidas disponibles periódicamente
setInterval(() => {
  const availableGames = Object.values(db.data.games).filter(g => g.status === 'waiting');
  io.emit('games-list-update', availableGames);
}, 2000);


// --- MANEJO DE CONEXIONES ---
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Enviar historial de chat al nuevo usuario
  socket.emit('chat-history', publicChatMessages);

  // --- LÓGICA DE PARTIDAS ---
  socket.on('create-game', async (gameOptions, callback) => {
    try {
      const { creatorName, points, flor, gameMode, vsAI, password } = gameOptions;
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      
      const newGame = {
        roomId,
        hostId: socket.id,
        status: 'waiting',
        players: [{ id: socket.id, name: creatorName, team: 'A' }],
        teams: { A: [{ id: socket.id, name: creatorName }], B: [] },
        // Opciones de la partida
        creatorName, points, flor, gameMode, vsAI, password,
        createdAt: Date.now(),
      };

      db.data.games[roomId] = newGame;
      await db.write();
      
      socket.join(roomId);
      
      // Notificar a todos sobre la nueva partida (log en el chat)
      const logMessage = {
          id: uuidv4(),
          type: 'log',
          text: `Partida #${roomId} creada por ${creatorName}.`,
          timestamp: Date.now(),
      };
      publicChatMessages.push(logMessage);
      io.emit('new-chat-message', logMessage);

      callback({ success: true, roomId });
    } catch (e) {
      callback({ success: false, message: e.message });
    }
  });

  socket.on('join-room', async ({ roomId, playerName, team }) => {
      const game = db.data.games[roomId];
      if (!game) return;

      // Lógica de validación (no duplicados, sala llena, etc.)
      if (game.players.some(p => p.id === socket.id)) return; // Ya está en la sala

      const newPlayer = { id: socket.id, name: playerName };
      game.players.push({ ...newPlayer, team });
      game.teams[team].push(newPlayer);

      await db.write();
      socket.join(roomId);

      // Notificar a todos en la sala sobre el nuevo jugador
      io.to(roomId).emit('update-game-state', game);

      // Log en el chat público
      const logMessage = {
          id: uuidv4(),
          type: 'log',
          text: `${playerName} se unió a la partida #${roomId}.`,
          timestamp: Date.now(),
      };
      publicChatMessages.push(logMessage);
      io.emit('new-chat-message', logMessage);
  });
  
  socket.on('get-game-state', (roomId) => {
      const game = db.data.games[roomId];
      if (game) {
          socket.join(roomId);
          socket.emit('update-game-state', game);
      }
  });

  // --- LÓGICA DE CHAT ---
  socket.on('send-public-message', (messageData) => {
      const message = {
          id: uuidv4(),
          type: 'user',
          ...messageData,
          timestamp: Date.now(),
      };
      publicChatMessages.push(message);
      // Mantener solo los últimos 50 mensajes
      if (publicChatMessages.length > 50) {
          publicChatMessages.shift();
      }
      io.emit('new-chat-message', message);
  });

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    // Aquí iría la lógica para quitar al jugador de la partida si se desconecta
  });
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
