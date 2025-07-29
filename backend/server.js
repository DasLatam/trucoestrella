const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'https://trucoestrella.vercel.app',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: 'https://trucoestrella.vercel.app',
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 4000;

const file = new JSONFile('db.json');
const db = new Low(file, { rooms: {} });

async function initializeDb() {
  await db.read();
  console.log('LowDB inicializado.');
  cleanupOldRooms();
}

initializeDb();

const MAX_WAITING_TIME_MS = 30 * 60 * 1000;

async function cleanupOldRooms() {
  await db.read();
  const now = Date.now();
  for (const roomId in db.data.rooms) {
    const room = db.data.rooms[roomId];
    if (room.status === 'waiting' && (now - room.createdAt > MAX_WAITING_TIME_MS)) {
      console.log(`[Sala ${roomId}] Eliminada por inactividad al iniciar servidor.`);
      delete db.data.rooms[roomId];
    }
  }
  await db.write();
}

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let id = '';
  for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 3; i++) id += nums.charAt(Math.floor(Math.random() * nums.length));
  return id;
}

io.on('connection', (socket) => {
  console.log(`Nuevo jugador conectado: ${socket.id}`);

  // CAMBIO CLAVE: Manejar si el jugador ya está en una sala
  if (socket.currentRoomId) {
    // Si se reconecta y ya estaba en una sala, re-unirlo o informarle
    const existingRoom = db.data.rooms[socket.currentRoomId];
    if (existingRoom && existingRoom.players.some(p => p.id === socket.id)) {
      socket.join(socket.currentRoomId);
      console.log(`Jugador ${socket.id} reconectado a sala ${socket.currentRoomId}.`);
      io.to(socket.id).emit('roomUpdate', existingRoom); // Envía el estado actual de la sala
    } else {
      delete socket.currentRoomId; // Si la sala ya no existe, limpiar la referencia
    }
  }


  socket.on('joinGame', async (data) => {
    await db.read();
    const { playerName, pointsToWin, gameMode, opponentType, privateKey } = data;

    // AHORA: Verificar si el socket ya está en una sala
    if (socket.currentRoomId && db.data.rooms[socket.currentRoomId]) {
        io.to(socket.id).emit('joinError', { message: 'Ya estás en una partida. ¡Abandona la actual para unirte a otra!' });
        console.log(`Jugador ${playerName} (${socket.id}) intentó unirse/crear, pero ya está en ${socket.currentRoomId}`);
        return;
    }

    let roomId = privateKey;
    let room;

    let maxPlayers = 0;
    switch (gameMode) {
      case '1v1': maxPlayers = 2; break;
      case '2v2': maxPlayers = 4; break;
      case '3v3': maxPlayers = 6; break;
      default: maxPlayers = 2;
    }

    if (opponentType === 'ai') {
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) { roomId = generateRoomId(); }
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        maxPlayers: maxPlayers,
        currentPlayers: 1,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: null,
        status: 'playing',
        createdAt: Date.now(),
      };
      db.data.rooms[roomId] = room;
      await db.write();
      socket.join(roomId);
      socket.currentRoomId = roomId; // Asignar la sala al socket
      console.log(`[Sala IA] ${playerName} creó y se unió a la sala ${roomId} contra IA.`);
      io.to(socket.id).emit('gameStarted', {
        roomId: room.id,
        players: room.players,
        message: '¡Partida contra la IA iniciada!',
        pointsToWin: room.pointsToWin,
        gameMode: room.gameMode,
        opponentType: room.opponentType,
      });
      return;
    }

    if (roomId && db.data.rooms[roomId]) {
      room = db.data.rooms[roomId];
      if (room.currentPlayers >= room.maxPlayers) {
        io.to(socket.id).emit('joinError', { message: 'La sala está llena.' });
        console.log(`[Sala ${roomId}] Intento de unión fallido: sala llena.`);
        return;
      }
      if (room.privateKey && room.privateKey !== privateKey) {
        io.to(socket.id).emit('joinError', { message: 'Clave de sala incorrecta.' });
        console.log(`[Sala ${roomId}] Intento de unión fallido: clave incorrecta.`);
        return;
      }

      room.players.push({ id: socket.id, name: playerName });
      room.currentPlayers++;
      socket.join(roomId);
      socket.currentRoomId = roomId; // Asignar la sala al socket
      console.log(`[Sala ${roomId}] ${playerName} se unió. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);
      await db.write();

      io.to(roomId).emit('roomUpdate', {
        roomId: room.id,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        status: room.status,
        players: room.players,
        message: `${playerName} se ha unido.`,
        pointsToWin: room.pointsToWin,
        gameMode: room.gameMode,
        opponentType: room.opponentType,
        privateKey: room.privateKey,
      });

      if (room.currentPlayers === room.maxPlayers) {
        room.status = 'playing';
        clearTimeout(room.timeout);
        console.log(`[Sala ${roomId}] Partida iniciada.`);
        await db.write();
        io.to(roomId).emit('gameStarted', {
          roomId: room.id,
          players: room.players,
          message: '¡Todos los jugadores están listos!',
          pointsToWin: room.pointsToWin,
          gameMode: room.gameMode,
          opponentType: room.opponentType,
        });
      }

    } else {
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) {
        roomId = generateRoomId();
      }
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        maxPlayers: maxPlayers,
        currentPlayers: 1,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: privateKey || null,
        status: 'waiting',
        createdAt: Date.now(),
      };
      db.data.rooms[roomId] = room;
      await db.write();
      socket.join(roomId);
      socket.currentRoomId = roomId; // Asignar la sala al socket
      console.log(`[Sala ${roomId}] ${playerName} creó la sala. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);

      io.to(socket.id).emit('roomUpdate', {
        roomId: room.id,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        status: room.status,
        players: room.players,
        message: `Has creado la sala ${roomId}. Esperando jugadores...`,
        pointsToWin: room.pointsToWin,
        gameMode: room.gameMode,
        opponentType: room.opponentType,
        privateKey: room.privateKey,
      });

      room.timeout = setTimeout(async () => {
        await db.read();
        if (db.data.rooms[roomId] && db.data.rooms[roomId].status === 'waiting' && db.data.rooms[roomId].currentPlayers < db.data.rooms[roomId].maxPlayers) {
          console.log(`[Sala ${roomId}] Eliminada por inactividad. No se completó.`);
          io.to(roomId).emit('roomAbandoned', { message: 'La sala ha sido eliminada por inactividad.' });
          delete db.data.rooms[roomId];
          await db.write();
        }
      }, MAX_WAITING_TIME_MS);
    }
    io.emit('availableRooms', getAvailableRooms());
  });

  socket.on('leaveRoom', async () => {
    await db.read();
    const roomId = socket.currentRoomId;
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      socket.leave(roomId);
      delete socket.currentRoomId; // Limpiar la sala del socket al abandonarla

      console.log(`[Sala ${roomId}] Jugador ${socket.id} abandonó. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) {
        console.log(`[Sala ${roomId}] Sala vacía. Eliminando.`);
        clearTimeout(room.timeout);
        delete db.data.rooms[roomId];
      } else {
        io.to(roomId).emit('roomUpdate', {
          roomId: room.id,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          status: room.status,
          players: room.players,
          message: `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} ha abandonado.`,
          pointsToWin: room.pointsToWin,
          gameMode: room.gameMode,
          opponentType: room.opponentType,
          privateKey: room.privateKey,
        });
        if (room.status === 'playing' && room.currentPlayers < room.maxPlayers) {
          room.status = 'waiting';
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó, esperando más jugadores.' });
        }
      }
      await db.write();
    }
    io.emit('availableRooms', getAvailableRooms());
  });


  socket.on('disconnect', async () => {
    await db.read();
    console.log(`Jugador desconectado: ${socket.id}`);
    const roomId = socket.currentRoomId;
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      delete socket.currentRoomId; // Limpiar la sala del socket al desconectarse

      console.log(`[Sala ${roomId}] Jugador ${socket.id} desconectado. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) {
        console.log(`[Sala ${roomId}] Sala vacía por desconexión. Eliminando.`);
        clearTimeout(room.timeout);
        delete db.data.rooms[roomId];
      } else {
        io.to(roomId).emit('roomUpdate', {
          roomId: room.id,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          status: room.status,
          players: room.players,
          message: `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} se ha desconectado.`,
          pointsToWin: room.pointsToWin,
          gameMode: room.gameMode,
          opponentType: room.opponentType,
          privateKey: room.privateKey,
        });
        if (room.status === 'playing' && room.currentPlayers < room.maxPlayers) {
          room.status = 'waiting';
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó por desconexión.' });
        }
      }
      await db.write();
    }
    io.emit('availableRooms', getAvailableRooms());
  });

  socket.on('requestAvailableRooms', () => {
    socket.emit('availableRooms', getAvailableRooms());
  });

  // --- Implementación de chat ---
  // Evento para enviar un mensaje de chat
  socket.on('sendMessage', async (message) => {
    const roomId = socket.currentRoomId;
    const senderName = message.senderName;
    const text = message.text;

    const chatMessage = {
      senderId: socket.id,
      senderName: senderName,
      text: text,
      timestamp: Date.now()
    };

    if (roomId && db.data.rooms[roomId]) {
      // Chat privado de la sala
      io.to(roomId).emit('chatMessage', chatMessage);
      console.log(`[Chat Sala ${roomId}] ${senderName}: ${text}`);
    } else {
      // Chat público del lobby
      io.emit('chatMessage', chatMessage);
      console.log(`[Chat Público] ${senderName}: ${text}`);
    }
  });


  function getAvailableRooms() {
    db.read();
    return Object.values(db.data.rooms).filter(room =>
      room.status === 'waiting' && room.currentPlayers < room.maxPlayers && room.opponentType === 'users'
    ).map(room => ({
      id: room.id,
      creatorName: room.players[0] ? room.players[0].name : 'N/A',
      pointsToWin: room.pointsToWin,
      gameMode: room.gameMode,
      currentPlayers: room.currentPlayers,
      maxPlayers: room.maxPlayers,
      privateKey: room.privateKey ? true : false,
      timeRemaining: Math.max(0, MAX_WAITING_TIME_MS - (Date.now() - room.createdAt)),
    }));
  }

  db.read().then(() => {
    socket.emit('availableRooms', getAvailableRooms());
  });
});

app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});