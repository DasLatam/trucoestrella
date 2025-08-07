// backend/server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios'; // Importamos axios

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

const GAME_SERVER_URL = 'https://trucoestrella-game.onrender.com';
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
setInterval(async () => {
    const now = Date.now();
    let gamesChanged = false;
    for (const roomId in db.data.games) {
        const game = db.data.games[roomId];
        if (game.status === 'waiting' && now > game.expiresAt) {
            io.to(roomId).emit('room-expired', 'La sala de espera ha expirado por tiempo.');
            delete db.data.games[roomId];
            gamesChanged = true;
            const logMessage = { id: uuidv4(), type: 'log', text: `La partida #${roomId} ha expirado.`, timestamp: Date.now() };
            publicChatMessages.push(logMessage);
            io.emit('new-chat-message', logMessage);
        }
    }
    if (gamesChanged) await db.write();
    
    const availableGames = Object.values(db.data.games).filter(g => g.status === 'waiting');
    io.emit('games-list-update', availableGames);
}, 2000);

// --- MANEJO DE CONEXIONES ---
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  socket.emit('chat-history', publicChatMessages);

  socket.on('create-game', async (gameOptions, callback) => {
    try {
      if (isPlayerInAnyGame(socket.id)) {
          return callback({ success: false, message: 'Ya estás en una partida.' });
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
        expiresAt: Date.now() + 30 * 60 * 1000,
        maxPlayers: parseInt(gameMode[0], 10) * 2
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

  socket.on('join-room', async ({ roomId, playerName, team, password }, callback) => {
      const game = db.data.games[roomId];
      if (!game) return callback({ success: false, message: 'La partida no existe.' });
      if (game.password && game.password !== password) {
          return callback({ success: false, message: 'Clave de partida incorrecta.' });
      }
      const existingPlayerIndex = game.players.findIndex(p => p.id === socket.id);
      if (existingPlayerIndex > -1) {
          const player = game.players[existingPlayerIndex];
          if (player.team !== team) {
              game.teams[player.team] = game.teams[player.team].filter(p => p.id !== socket.id);
              game.teams[team].push(player);
              game.players[existingPlayerIndex].team = team;
          }
      } else {
          const newPlayer = { id: socket.id, name: playerName };
          game.players.push({ ...newPlayer, team });
          game.teams[team].push(newPlayer);
      }

      const totalSlots = game.maxPlayers;
      let gameIsReady = false;

      if (game.vsAI) {
          const humanPlayersNeeded = totalSlots / 2;
          if (game.players.filter(p => !p.isAI).length === humanPlayersNeeded) {
              addAIPlayers(game);
              game.status = 'ready';
              gameIsReady = true;
          }
      } else {
          if (game.players.length === totalSlots) {
              game.status = 'ready';
              gameIsReady = true;
          }
      }
      
      await db.write();
      socket.join(roomId);
      io.to(roomId).emit('update-game-state', game);
      const logMessage = { id: uuidv4(), type: 'log', text: `${playerName} se unió a la partida #${roomId}.`, timestamp: Date.now() };
      publicChatMessages.push(logMessage);
      io.emit('new-chat-message', logMessage);
      callback({ success: true });

      // --- LÓGICA DE HAND-OFF ---
      if (gameIsReady) {
          try {
              console.log(`Partida ${roomId} lista. Realizando hand-off a ${GAME_SERVER_URL}...`);
              await axios.post(`${GAME_SERVER_URL}/init-game`, game);
              
              io.to(roomId).emit('game-starting', { gameServerUrl: GAME_SERVER_URL, roomId });
              
              delete db.data.games[roomId];
              await db.write();

          } catch (error) {
              console.error(`Error en el hand-off para la partida ${roomId}:`, error.response ? error.response.data : error.message);
              io.to(roomId).emit('error-message', 'No se pudo iniciar la partida en el servidor de juego.');
          }
      }
  });
  
  socket.on('get-game-state', (roomId) => {
      const game = db.data.games[roomId];
      if (game) {
          socket.join(roomId);
          socket.emit('update-game-state', game);
      } else {
          socket.emit('error-message', 'La partida ya no existe o ha expirado.');
      }
  });

  socket.on('send-public-message', (messageData) => {
      const message = { id: uuidv4(), type: 'user', ...messageData, timestamp: Date.now() };
      publicChatMessages.push(message);
      if (publicChatMessages.length > 100) publicChatMessages.shift();
      io.emit('new-chat-message', message);
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

  socket.on('close-room', async ({ roomId, userId }) => {
      const game = db.data.games[roomId];
      if (game && game.hostId === userId) {
          io.to(roomId).emit('room-expired', 'La sala fue cerrada por el creador.');
          delete db.data.games[roomId];
          await db.write();
          const logMessage = { id: uuidv4(), type: 'log', text: `La partida #${roomId} fue cerrada por el creador.`, timestamp: Date.now() };
          publicChatMessages.push(logMessage);
          io.emit('new-chat-message', logMessage);
      }
  });

  socket.on('disconnect', async (reason) => {
    console.log(`Usuario desconectado: ${socket.id}. Razón: ${reason}`);
    try {
        let gameToUpdate = null;
        let roomIdToUpdate = null;
        for (const roomId in db.data.games) {
            const game = db.data.games[roomId];
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                if (game.hostId === socket.id) {
                    io.to(roomId).emit('room-expired', 'El creador de la partida se ha desconectado.');
                    delete db.data.games[roomId];
                    console.log(`Sala ${roomId} eliminada por desconexión del host.`);
                } else {
                    const disconnectedPlayer = game.players[playerIndex];
                    game.players.splice(playerIndex, 1);
                    game.teams[disconnectedPlayer.team] = game.teams[disconnectedPlayer.team].filter(p => p.id !== socket.id);
                    gameToUpdate = game;
                    roomIdToUpdate = roomId;
                    console.log(`Jugador eliminado de la sala ${roomId}.`);
                }
                await db.write();
                if (gameToUpdate) {
                    io.to(roomIdToUpdate).emit('update-game-state', gameToUpdate);
                }
                break;
            }
        }
    } catch (error) {
        console.error('Error en disconnect:', error);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor de LOBBY escuchando en el puerto ${PORT}`));