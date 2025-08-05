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

// --- FUNCIONES DE AYUDA ---
const isPlayerInAnyGame = (socketId) => {
    for (const game of Object.values(db.data.games)) {
        if (game.players.some(p => p.id === socketId)) return true;
    }
    return false;
};

const generateGameKey = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let key = '';
    for (let i = 0; i < 6; i++) key += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 3; i++) key += numbers.charAt(Math.floor(Math.random() * numbers.length));
    return key;
};

const addAIPlayers = (game) => {
    const totalSlots = parseInt(game.gameMode[0], 10) * 2;
    const playersNeeded = totalSlots - game.players.length;

    for (let i = 0; i < playersNeeded; i++) {
        const teamACount = game.teams.A.length;
        const teamBCount = game.teams.B.length;
        const team = teamACount <= teamBCount ? 'A' : 'B';
        
        const aiPlayer = { id: `ai-${uuidv4()}`, name: `IA Truco Estrella ${i + 1}`, isAI: true };
        game.players.push({ ...aiPlayer, team });
        game.teams[team].push(aiPlayer);
    }
};

// --- BUCLE PRINCIPAL ---
setInterval(() => {
  const availableGames = Object.values(db.data.games).filter(g => g.status === 'waiting' && !g.password);
  io.emit('games-list-update', availableGames);
}, 2000);


// --- MANEJO DE CONEXIONES ---
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  socket.emit('chat-history', publicChatMessages);

  socket.on('create-game', async (gameOptions, callback) => {
    try {
      if (isPlayerInAnyGame(socket.id)) {
          return callback({ success: false, message: 'Ya estás en una partida. No puedes crear otra.' });
      }

      const { creatorName, points, flor, gameMode, vsAI, isPrivate } = gameOptions;
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      
      const newGame = {
        roomId, hostId: socket.id, status: 'waiting',
        players: [{ id: socket.id, name: creatorName, team: 'A' }],
        teams: { A: [{ id: socket.id, name: creatorName }], B: [] },
        creatorName, points, flor, gameMode, vsAI,
        password: isPrivate ? generateGameKey() : null,
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

  socket.on('join-room', async ({ roomId, playerName, team }) => {
      const game = db.data.games[roomId];
      if (!game) return;
      
      // **LÓGICA MEJORADA PARA CAMBIO DE EQUIPO**
      const existingPlayerIndex = game.players.findIndex(p => p.id === socket.id);
      if (existingPlayerIndex > -1) {
          const player = game.players[existingPlayerIndex];
          // Si está cambiando de equipo
          if (player.team !== team) {
              // Quitar de equipo viejo
              game.teams[player.team] = game.teams[player.team].filter(p => p.id !== socket.id);
              // Añadir a equipo nuevo
              game.teams[team].push(player);
              game.players[existingPlayerIndex].team = team;
          }
      } else {
          // Lógica para jugador nuevo
          const newPlayer = { id: socket.id, name: playerName };
          game.players.push({ ...newPlayer, team });
          game.teams[team].push(newPlayer);
      }
      
      // Comprobar si la partida está lista para la IA o para empezar
      const totalSlots = parseInt(game.gameMode[0], 10) * 2;
      if (game.vsAI) {
          const humanPlayersNeeded = totalSlots / 2;
          if (game.players.filter(p => !p.isAI).length === humanPlayersNeeded) {
              addAIPlayers(game);
              game.status = 'ready';
          }
      } else {
          if (game.players.length === totalSlots) {
              game.status = 'ready';
          }
      }

      await db.write();
      socket.join(roomId);
      io.to(roomId).emit('update-game-state', game);

      const logMessage = { id: uuidv4(), type: 'log', text: `${playerName} se unió a la partida #${roomId}.`, timestamp: Date.now() };
      publicChatMessages.push(logMessage);
      io.emit('new-chat-message', logMessage);
  });
  
  socket.on('start-game', async ({roomId, userId}) => {
      const game = db.data.games[roomId];
      if (game && game.hostId === userId && game.status === 'ready') {
          game.status = 'playing';
          await db.write();
          io.to(roomId).emit('update-game-state', game);
          
          const logMessage = { id: uuidv4(), type: 'log', text: `¡La partida #${roomId} ha comenzado!`, timestamp: Date.now() };
          publicChatMessages.push(logMessage);
          io.emit('new-chat-message', logMessage);
      }
  });

  socket.on('get-game-state', (roomId) => {
      const game = db.data.games[roomId];
      if (game) {
          socket.join(roomId);
          socket.emit('update-game-state', game);
      } else {
          socket.emit('error-message', 'La partida ya no existe.');
      }
  });

  socket.on('send-public-message', (messageData) => {
      const message = { id: uuidv4(), type: 'user', ...messageData, timestamp: Date.now() };
      publicChatMessages.push(message);
      if (publicChatMessages.length > 100) publicChatMessages.shift();
      io.emit('new-chat-message', message);
  });

  socket.on('disconnect', async () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    // Lógica para quitar al jugador y actualizar/eliminar la partida
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
