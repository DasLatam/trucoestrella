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
app.use(cors());
const server = http.createServer(app);

// Configura LowDB
const adapter = new JSONFile('db.json');
const defaultData = { games: {} };
const db = new Low(adapter, defaultData);
await db.read(); // Carga la base de datos al iniciar

const io = new Server(server, {
  cors: {
    origin: "*", // En producción, deberías restringir esto a la URL de Vercel
    methods: ["GET", "POST"]
  }
});

// --- Lógica de Ayuda ---
/**
 * Verifica si un jugador (por su socket.id) ya está en alguna partida activa.
 * @param {string} socketId - El ID del socket del jugador.
 * @returns {boolean} - True si el jugador ya está en una partida.
 */
const isPlayerInAnyGame = (socketId) => {
  const games = db.data.games;
  for (const roomId in games) {
    if (games[roomId].players.some(p => p.id === socketId)) {
      return true;
    }
  }
  return false;
};

/**
 * Añade los jugadores de IA necesarios a una partida.
 * @param {object} game - El objeto de la partida.
 */
const addAIPlayers = (game) => {
    const humanPlayers = game.players.length;
    const totalPlayers = parseInt(game.gameMode[0], 10) * 2;
    const aiNeeded = totalPlayers - humanPlayers;

    for (let i = 0; i < aiNeeded; i++) {
        const team = (i % 2 === 0) ? 'B' : 'A'; // Alterna equipos para la IA
        game.players.push({
            id: `ai-${uuidv4()}`,
            name: `IA ${i + 1}`,
            team: team,
            isAI: true
        });
    }
};


// --- Manejo de Conexiones de Socket.IO ---
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // **Crear una nueva partida**
  socket.on('create-game', async ({ playerName, gameMode, vsAI }) => {
    if (!playerName) {
      return socket.emit('error-message', 'Debes ingresar un nombre para jugar.');
    }
    if (isPlayerInAnyGame(socket.id)) {
      return socket.emit('error-message', 'Ya estás en otra partida.');
    }

    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const newGame = {
      roomId,
      hostId: socket.id,
      gameMode, // "1v1", "2v2", "3v3"
      vsAI,
      status: 'waiting',
      players: [{
        id: socket.id,
        name: playerName,
        team: 'A',
        isAI: false
      }],
      maxPlayers: parseInt(gameMode[0], 10) * 2
    };

    db.data.games[roomId] = newGame;
    await db.write();

    socket.join(roomId);
    socket.emit('game-created', newGame);
    console.log(`Partida creada: ${roomId} por ${playerName}`);
  });

  // **Unirse a una partida existente**
  socket.on('join-room', async ({ roomId, playerName }) => {
    if (!playerName) {
        return socket.emit('error-message', 'Falta el nombre del jugador.');
    }
    const game = db.data.games[roomId];

    if (!game) {
      return socket.emit('error-message', 'La sala no existe.');
    }
    if (game.players.length >= game.maxPlayers) {
      return socket.emit('error-message', 'La sala ya está llena.');
    }
    if (isPlayerInAnyGame(socket.id)) {
        return socket.emit('error-message', 'Ya estás en otra partida.');
    }
    if (game.players.some(p => p.name === playerName)) {
        return socket.emit('error-message', `El nombre "${playerName}" ya está en uso en esta sala.`);
    }

    // Lógica para asignar equipos
    const teamACount = game.players.filter(p => p.team === 'A').length;
    const teamBCount = game.players.filter(p => p.team === 'B').length;
    const newPlayerTeam = teamACount <= teamBCount ? 'A' : 'B';

    const newPlayer = {
      id: socket.id,
      name: playerName,
      team: newPlayerTeam,
      isAI: false
    };

    game.players.push(newPlayer);
    socket.join(roomId);

    // Comprobar si la sala está llena de jugadores humanos
    const humanPlayersCount = game.players.filter(p => !p.isAI).length;
    const requiredHumanPlayers = game.vsAI ? (game.maxPlayers / 2) : game.maxPlayers;

    if (humanPlayersCount === requiredHumanPlayers) {
        if (game.vsAI) {
            addAIPlayers(game);
        }
        game.status = 'ready'; // O 'playing' si quieres que inicie de inmediato
    }

    await db.write();

    console.log(`${playerName} se unió a la sala ${roomId}`);
    io.to(roomId).emit('update-room', game);
  });
  
  // **Obtener datos de una sala (para reconexiones o al cargar la URL directamente)**
  socket.on('get-room-data', (roomId) => {
    const game = db.data.games[roomId];
    if (game) {
      socket.join(roomId); // Asegurarse de que el socket esté en el canal de la sala
      socket.emit('update-room', game);
    } else {
      socket.emit('error-message', 'No se encontró la información de la sala.');
    }
  });


  // **Manejo de desconexión**
  socket.on('disconnect', async () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    let roomIdToRemove = null;
    let gameToUpdate = null;

    for (const roomId in db.data.games) {
      const game = db.data.games[roomId];
      const playerIndex = game.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        // Si el que se va es el host, eliminar la partida
        if (game.hostId === socket.id) {
          roomIdToRemove = roomId;
          io.to(roomId).emit('error-message', 'El host ha abandonado la partida. La sala se ha cerrado.');
          break;
        } else {
          // Si es otro jugador, simplemente lo eliminamos
          game.players.splice(playerIndex, 1);
          gameToUpdate = game;
          break;
        }
      }
    }

    if (roomIdToRemove) {
      delete db.data.games[roomIdToRemove];
      console.log(`Sala ${roomIdToRemove} eliminada.`);
    } else if (gameToUpdate) {
      io.to(gameToUpdate.roomId).emit('update-room', gameToUpdate);
      console.log(`Jugador eliminado de la sala ${gameToUpdate.roomId}.`);
    }

    await db.write();
  });
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
