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

// ¡CORRECCIÓN CRÍTICA! process.env.PORT en lugar de process.env.env.PORT
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
      io.to(roomId).emit('roomAbandoned', { message: 'La sala ha sido eliminada por inactividad.' });
      
      const socketsInRoom = await io.in(roomId).allSockets();
      socketsInRoom.forEach(sId => {
          const s = io.sockets.sockets.get(sId);
          if (s) {
            delete s.currentRoomId;
            s.leave(roomId);
          }
      });
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

function getHumanPlayersNeeded(gameMode) {
  switch (gameMode) {
    case '1v1': return 1;
    case '2v2': return 2;
    case '3v3': return 3;
    default: return 1;
  }
}

io.on('connection', (socket) => {
  console.log(`Nuevo jugador conectado: ${socket.id}`);

  if (socket.currentRoomId) {
    const existingRoom = db.data.rooms[socket.currentRoomId];
    if (existingRoom && existingRoom.players.some(p => p.id === socket.id)) {
      socket.join(socket.currentRoomId);
      console.log(`Jugador ${socket.id} reconectado a sala ${socket.currentRoomId}.`);
      io.to(socket.id).emit('roomUpdate', { ...existingRoom, message: 'Te has reconectado a tu sala.' });
    } else {
      delete socket.currentRoomId;
      io.to(socket.id).emit('roomAbandoned', { message: 'Tu sala anterior ya no existe o fue eliminada.' });
    }
  } 

  db.read().then(() => {
    socket.emit('availableRooms', getAvailableRooms());
  });

  socket.on('joinGame', async (data) => {
    await db.read();
    const { playerName, pointsToWin, gameMode, opponentType, privateKey, playWithFlor } = data;

    const isPlayerNameTaken = Object.values(db.data.rooms).some(room => 
      room.players.some(player => player.name === playerName)
    );
    if (isPlayerNameTaken) {
      io.to(socket.id).emit('joinError', { message: `El nombre "${playerName}" ya está en uso en otra partida.` });
      console.log(`Intento de unión/creación fallido: Nombre "${playerName}" ya en uso.`);
      return;
    }

    if (socket.currentRoomId && db.data.rooms[socket.currentRoomId]) {
      io.to(socket.id).emit('joinError', { message: 'Ya estás en una partida. ¡Abandona la actual para unirte a otra!' });
      console.log(`Jugador ${playerName} (${socket.id}) intentó unirse/crear, pero ya está en ${socket.currentRoomId}.`);
      return;
    }

    let roomId = privateKey;
    let room;

    const humanPlayersNeeded = getHumanPlayersNeeded(gameMode);
    const maxPlayersPvP = humanPlayersNeeded * 2; 

    if (opponentType === 'ai') {
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) { roomId = generateRoomId(); }
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        humanPlayersNeeded: humanPlayersNeeded,
        currentHumanPlayers: 1,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: null,
        status: (gameMode === '1v1') ? 'playing' : 'waiting',
        createdAt: Date.now(),
        playWithFlor: playWithFlor,
      };
      db.data.rooms[roomId] = room;
      await db.write();
      socket.join(roomId);
      socket.currentRoomId = roomId;

      console.log(`[Sala IA] ${playerName} creó la sala ${roomId} contra IA. Esperando humanos: ${room.humanPlayersNeeded - room.currentHumanPlayers}`);
      
      if (room.status === 'playing') {
        io.to(socket.id).emit('roomUpdate', room);
      } else {
        io.to(socket.id).emit('roomUpdate', room);
      }
      return;
    }

    if (roomId && db.data.rooms[roomId]) {
      room = db.data.rooms[roomId];
      if (room.status === 'playing') {
          io.to(socket.id).emit('joinError', { message: 'La partida ya está en curso.' });
          console.log(`[Sala ${roomId}] Intento de unión fallido: partida en curso.`);
          return;
      }
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
      if (room.gameMode !== gameMode || room.pointsToWin !== pointsToWin || room.playWithFlor !== playWithFlor) {
        io.to(socket.id).emit('joinError', { message: 'Los ajustes de la sala no coinciden (modo de juego, puntos o flor).' });
        console.log(`[Sala ${roomId}] Intento de unión fallido: ajustes de sala no coinciden.`);
        return;
      }

      room.players.push({ id: socket.id, name: playerName });
      room.currentPlayers++;
      socket.join(roomId);
      socket.currentRoomId = roomId;
      console.log(`[Sala ${roomId}] ${playerName} se unió. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);
      await db.write();

      io.to(roomId).emit('roomUpdate', room);

      if (room.currentPlayers === room.maxPlayers) {
        room.status = 'playing';
        clearTimeout(room.timeout);
        console.log(`[Sala ${roomId}] Partida iniciada.`);
        await db.write();
        io.to(roomId).emit('gameStarted', room);
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
        maxPlayers: maxPlayersPvP,
        currentPlayers: 1,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: privateKey || null,
        status: 'waiting',
        createdAt: Date.now(),
        playWithFlor: playWithFlor,
      };
      db.data.rooms[roomId] = room;
      await db.write();
      socket.join(roomId);
      socket.currentRoomId = roomId;
      console.log(`[Sala ${roomId}] ${playerName} creó la sala. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);

      io.to(socket.id).emit('roomUpdate', room);

      room.timeout = setTimeout(async () => {
        await db.read();
        if (db.data.rooms[roomId] && db.data.rooms[roomId].status === 'waiting' && db.data.rooms[roomId].currentPlayers < db.data.rooms[roomId].maxPlayers) {
          console.log(`[Sala ${roomId}] Eliminada por inactividad. No se completó.`);
          io.to(roomId).emit('roomAbandoned', { message: 'La sala ha sido eliminada por inactividad.' });
          const socketsInRoom = await io.in(roomId).allSockets();
          socketsInRoom.forEach(sId => {
              const s = io.sockets.sockets.get(sId);
              if (s) {
                delete s.currentRoomId;
                s.leave(roomId);
              }
          });
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
      if (room.players.some(p => p.id === socket.id)) {
        room.players = room.players.filter(p => p.id !== socket.id);
        
        socket.leave(roomId);
        delete socket.currentRoomId;

        if (room.opponentType === 'users') {
          room.currentPlayers--;
        } else {
          room.currentHumanPlayers--;
        }

        const remainingPlayersCount = room.opponentType === 'users' ? room.currentPlayers : room.currentHumanPlayers;
        console.log(`[Sala ${roomId}] Jugador ${socket.id} abandonó. Restantes: ${remainingPlayersCount}`);

        if (remainingPlayersCount === 0) {
          console.log(`[Sala ${roomId}] Sala vacía. Eliminando.`);
          clearTimeout(room.timeout);
          delete db.data.rooms[roomId];
        } else {
          const message = `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} ha abandonado.`;
          io.to(roomId).emit('chatMessage', { senderName: 'Sistema', text: message });
          io.to(roomId).emit('roomUpdate', {
            roomId: room.id,
            currentPlayers: remainingPlayersCount,
            maxPlayers: room.opponentType === 'users' ? room.maxPlayers : room.humanPlayersNeeded,
            status: room.status,
            players: room.players,
            message: message,
            pointsToWin: room.pointsToWin,
            gameMode: room.gameMode,
            opponentType: room.opponentType,
            privateKey: room.privateKey,
            playWithFlor: room.playWithFlor,
          });
          if (room.status === 'playing' && remainingPlayersCount < (room.opponentType === 'users' ? room.maxPlayers : room.humanPlayersNeeded)) {
            room.status = 'waiting';
            io.to(roomId).emit('gamePaused', { message: 'La partida se pausó, esperando más jugadores.' });
          }
        }
        await db.write();
      } else {
        console.log(`Advertencia: Socket ${socket.id} intentó abandonar sala ${roomId} pero no estaba en ella.`);
        delete socket.currentRoomId;
      }
    } else {
      console.log(`Advertencia: Socket ${socket.id} intentó abandonar una sala inexistente o sin currentRoomId.`);
      delete socket.currentRoomId;
    }
    io.emit('availableRooms', getAvailableRooms());
  });


  socket.on('disconnect', async () => {
    await db.read();
    console.log(`Jugador desconectado: ${socket.id}`);
    const roomId = socket.currentRoomId;
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      if (room.players.some(p => p.id === socket.id)) {
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (room.opponentType === 'users') {
          room.currentPlayers--;
        } else {
          room.currentHumanPlayers--;
        }
        
        delete socket.currentRoomId;

        const remainingPlayersCount = room.opponentType === 'users' ? room.currentPlayers : room.currentHumanPlayers;
        console.log(`[Sala ${roomId}] Jugador ${socket.id} desconectado. Restantes: ${remainingPlayersCount}`);

        if (remainingPlayersCount === 0) {
          console.log(`[Sala ${roomId}] Sala vacía por desconexión. Eliminando.`);
          clearTimeout(room.timeout);
          delete db.data.rooms[roomId];
        } else {
          const message = `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} se ha desconectado.`;
          io.to(roomId).emit('chatMessage', { senderName: 'Sistema', text: message });
          io.to(roomId).emit('roomUpdate', {
            roomId: room.id,
            currentPlayers: remainingPlayersCount,
            maxPlayers: room.opponentType === 'users' ? room.maxPlayers : room.humanPlayersNeeded,
            status: room.status,
            players: room.players,
            message: message,
            pointsToWin: room.pointsToWin,
            gameMode: room.gameMode,
            opponentType: room.opponentType,
            privateKey: room.privateKey,
            playWithFlor: room.playWithFlor,
          });
          if (room.status === 'playing' && remainingPlayersCount < (room.opponentType === 'users' ? room.maxPlayers : room.humanPlayersNeeded)) {
            room.status = 'waiting';
            io.to(roomId).emit('gamePaused', { message: 'La partida se pausó, esperando más jugadores.' });
          }
        }
        await db.write();
      } else {
        console.log(`Advertencia: Socket ${socket.id} se desconectó pero no estaba en la sala ${roomId} listado.`);
        delete socket.currentRoomId;
      }
    } else {
        console.log(`Advertencia: Socket ${socket.id} se desconectó sin currentRoomId o sala inexistente.`);
        delete socket.currentRoomId;
    }
    io.emit('availableRooms', getAvailableRooms());
  });

  socket.on('requestAvailableRooms', () => {
    socket.emit('availableRooms', getAvailableRooms());
  });

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
      io.to(roomId).emit('chatMessage', chatMessage);
      console.log(`[Chat Sala ${roomId}] ${senderName}: ${text}`);
    } else {
      io.emit('publicChatMessage', chatMessage);
      console.log(`[Chat Público] ${senderName}: ${text}`);
    }
  });

  socket.on('joinRoomWithId', async ({ roomId, playerName, privateKey }) => {
    await db.read();
    const room = db.data.rooms[roomId];

    if (!room) {
        socket.emit('joinError', { message: 'La sala no existe.' });
        return;
    }

    if (room.players.some(player => player.name === playerName)) {
        socket.emit('joinError', { message: `El nombre "${playerName}" ya está en uso en esta sala.` });
        return;
    }

    if (room.currentPlayers >= room.maxPlayers) {
        socket.emit('joinError', { message: 'La sala está llena.' });
        return;
    }
    
    if (room.privateKey && room.privateKey !== privateKey) {
        socket.emit('joinError', { message: 'Clave de sala incorrecta.' });
        return;
    }

    room.players.push({ id: socket.id, name: playerName });
    room.currentPlayers++;
    socket.join(roomId);
    socket.currentRoomId = roomId;

    await db.write();

    io.to(roomId).emit('roomUpdate', room);
    io.emit('availableRooms', getAvailableRooms());
  });

  function getAvailableRooms() {
    db.read();
    return Object.values(db.data.rooms).filter(room =>
      room.status === 'waiting' && room.opponentType === 'users'
    ).map(room => ({
      id: room.id,
      creatorName: room.players[0] ? room.players[0].name : 'N/A',
      pointsToWin: room.pointsToWin,
      gameMode: room.gameMode,
      currentPlayers: room.currentPlayers,
      maxPlayers: room.maxPlayers,
      privateKey: room.privateKey ? true : false,
      timeRemaining: Math.max(0, MAX_WAITING_TIME_MS - (Date.now() - room.createdAt)),
      playWithFlor: room.playWithFlor,
    }));
  }
});

app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});