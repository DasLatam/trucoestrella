// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

// --- Configuración Inicial ---
const app = express();

// --- CONFIGURACIÓN DE CORS PARA EXPRESS ---
// Esto es crucial. Le decimos a Express que acepte peticiones
// explícitamente desde la URL de tu juego en Vercel.
const corsOptions = {
  origin: "*", // Cambiar a "https://trucoestrella.vercel.app" para producción final
  credentials: true
};
app.use(cors(corsOptions));

const server = http.createServer(app);

// Configura LowDB
const adapter = new JSONFile('db.json');
const defaultData = { games: {} };
const db = new Low(adapter, defaultData);
await db.read();

// --- CONFIGURACIÓN DE SOCKET.IO ---
const io = new Server(server, {
  cors: corsOptions, // Reutilizamos la misma configuración de CORS
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// --- Lógica de Ayuda ---
const isPlayerInAnyGame = (socketId) => {
  const games = db.data.games;
  for (const roomId in games) {
    if (games[roomId].players.some(p => p.id === socketId)) return true;
  }
  return false;
};
const addAIPlayers = (game) => {
    const humanPlayers = game.players.length;
    const totalPlayers = parseInt(game.gameMode[0], 10) * 2;
    const aiNeeded = totalPlayers - humanPlayers;
    for (let i = 0; i < aiNeeded; i++) {
        const team = (i % 2 === 0) ? 'B' : 'A';
        game.players.push({ id: `ai-${uuidv4()}`, name: `IA ${i + 1}`, team, isAI: true });
    }
};

// --- Manejo de Conexiones de Socket.IO ---
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  socket.on('create-game', async (data) => {
    try {
      const { playerName, gameMode, vsAI } = data;
      if (!playerName) return socket.emit('error-message', 'Debes ingresar un nombre para jugar.');
      if (isPlayerInAnyGame(socket.id)) return socket.emit('error-message', 'Ya estás en otra partida.');

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
      socket.emit('error-message', 'Error del servidor al crear partida.');
    }
  });

  socket.on('join-room', async (data) => {
    try {
      const { roomId, playerName } = data;
      if (!playerName) return socket.emit('error-message', 'Falta el nombre del jugador.');
      
      const game = db.data.games[roomId];
      if (!game) return socket.emit('error-message', 'La sala no existe.');
      if (game.players.some(p => p.id === socket.id)) return; // El jugador ya está, no hacer nada.
      if (game.players.length >= game.maxPlayers) return socket.emit('error-message', 'La sala ya está llena.');
      if (isPlayerInAnyGame(socket.id)) return socket.emit('error-message', 'Ya estás en otra partida.');
      if (game.players.some(p => p.name === playerName)) return socket.emit('error-message', `El nombre "${playerName}" ya está en uso.`);

      const teamACount = game.players.filter(p => p.team === 'A').length;
      const teamBCount = game.players.filter(p => p.team === 'B').length;
      const newPlayerTeam = teamACount <= teamBCount ? 'A' : 'B';
      const newPlayer = { id: socket.id, name: playerName, team: newPlayerTeam, isAI: false };
      game.players.push(newPlayer);

      const humanPlayersCount = game.players.filter(p => !p.isAI).length;
      const requiredHumanPlayers = game.vsAI ? (game.maxPlayers / 2) : game.maxPlayers;
      if (humanPlayersCount === requiredHumanPlayers) {
          if (game.vsAI) addAIPlayers(game);
          game.status = 'ready';
      }

      await db.write();
      socket.join(roomId);

      console.log(`${playerName} se unió a la sala ${roomId}.`);
      io.to(roomId).emit('update-room', game);
    } catch (error) {
      console.error('Error en join-room:', error);
      socket.emit('error-message', 'Error del servidor al unirse a la sala.');
    }
  });

  socket.on('disconnect', async (reason) => {
    console.log(`Usuario desconectado: ${socket.id}. Razón: ${reason}`);
    try {
        let roomIdToUpdate = null;
        let gameToUpdate = null;
        for (const roomId in db.data.games) {
            const game = db.data.games[roomId];
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                if (game.hostId === socket.id) {
                    delete db.data.games[roomId];
                    io.to(roomId).emit('error-message', 'El host ha abandonado la partida. La sala se ha cerrado.');
                    console.log(`Sala ${roomId} eliminada por desconexión del host.`);
                    gameToUpdate = null; // No hay nada que actualizar
                } else {
                    game.players.splice(playerIndex, 1);
                    roomIdToUpdate = roomId;
                    gameToUpdate = game;
                    console.log(`Jugador eliminado de la sala ${roomId}.`);
                }
                break;
            }
        }
        await db.write();
        if (gameToUpdate && roomIdToUpdate) {
            io.to(roomIdToUpdate).emit('update-room', gameToUpdate);
        }
    } catch (error) {
        console.error('Error en disconnect:', error);
    }
  });
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
