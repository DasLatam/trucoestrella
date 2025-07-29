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
const db = new Low(file, { rooms: {} }); // Inicializa con estructura por defecto

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
      
      // Limpiar currentRoomId de los sockets en la sala eliminada
      const socketsInRoom = await io.in(roomId).allSockets();
      socketsInRoom.forEach(sId => {
          const s = io.sockets.sockets.get(sId);
          if (s) {
            delete s.currentRoomId;
            s.leave(roomId); // Asegurarse de que el socket deja la sala en Socket.IO
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

// Función auxiliar para calcular jugadores necesarios para el equipo humano
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

  // Manejo de reconexión: verificar si el socket ya estaba en una sala
  if (socket.currentRoomId) {
    const existingRoom = db.data.rooms[socket.currentRoomId];
    // Solo reconectar si la sala existe Y el jugador todavía está listado en ella
    if (existingRoom && existingRoom.players.some(p => p.id === socket.id)) {
      socket.join(socket.currentRoomId);
      console.log(`Jugador ${socket.id} reconectado a sala ${socket.currentRoomId}.`);
      io.to(socket.id).emit('roomUpdate', { ...existingRoom, message: 'Te has reconectado a tu sala.' });
    } else {
      delete socket.currentRoomId; // La sala ya no existe o el jugador no estaba en ella
      io.to(socket.id).emit('roomAbandoned', { message: 'Tu sala anterior ya no existe o fue eliminada.' });
    }
  } 
  // Siempre enviar la lista de salas disponibles al conectar (después de posible reconexión)
  db.read().then(() => {
    socket.emit('availableRooms', getAvailableRooms());
  });


  socket.on('joinGame', async (data) => {
    await db.read();
    const { playerName, pointsToWin, gameMode, opponentType, privateKey } = data;

    // VALIDACIÓN CRÍTICA: Impedir que un jugador se una a múltiples salas
    if (socket.currentRoomId && db.data.rooms[socket.currentRoomId]) {
        io.to(socket.id).emit('joinError', { message: 'Ya estás en una partida. ¡Abandona la actual para unirte a otra!' });
        console.log(`Jugador ${playerName} (${socket.id}) intentó unirse/crear, pero ya está en ${socket.currentRoomId}.`);
        return;
    }

    let roomId = privateKey;
    let room;

    const humanPlayersNeeded = getHumanPlayersNeeded(gameMode);
    const totalSlots = (opponentType === 'ai' && gameMode === '1v1') ? 2 : (humanPlayersNeeded * 2); // Slots totales para mostrar en UI

    // Lógica para partidas contra IA
    if (opponentType === 'ai') {
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) { roomId = generateRoomId(); }
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }], // Jugadores humanos en el equipo
        humanPlayersNeeded: humanPlayersNeeded, // Cantidad de jugadores humanos necesarios en el equipo
        currentHumanPlayers: 1, // El jugador actual
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: null,
        status: (gameMode === '1v1') ? 'playing' : 'waiting', // 1v1 IA inicia inmediatamente, otros modos esperan compañeros
        createdAt: Date.now(),
      };
      db.data.rooms[roomId] = room;
      await db.write();
      socket.join(roomId);
      socket.currentRoomId = roomId; // Asignar la sala al socket
      console.log(`[Sala IA] ${playerName} creó la sala ${roomId} contra IA. Esperando humanos: ${room.humanPlayersNeeded - room.currentHumanPlayers}`);
      
      // Emitir el evento correcto según el estado de la sala
      if (room.status === 'playing') {
        io.to(socket.id).emit('gameStarted', {
          roomId: room.id,
          players: room.players, // Lista de jugadores humanos
          message: '¡Partida contra la IA iniciada!',
          pointsToWin: room.pointsToWin,
          gameMode: room.gameMode,
          opponentType: room.opponentType,
          totalSlots: totalSlots, // Slots totales (humanos + IA) para la UI
        });
      } else { // Si la IA 2v2 o 3v3 espera compañeros
        io.to(socket.id).emit('roomUpdate', {
            roomId: room.id,
            currentPlayers: room.currentHumanPlayers, // Muestra jugadores humanos actuales
            maxPlayers: room.humanPlayersNeeded, // Muestra jugadores humanos necesarios
            status: room.status,
            players: room.players, // Lista de jugadores humanos
            message: `Has creado la sala ${roomId} contra la IA. Esperando ${room.humanPlayersNeeded - room.currentHumanPlayers} compañeros...`,
            pointsToWin: room.pointsToWin,
            gameMode: room.gameMode,
            opponentType: room.opponentType,
            privateKey: room.privateKey,
            totalSlots: totalSlots, // Slots totales para la UI
        });
      }
      return;
    }

    // Lógica para partidas multijugador (contra usuarios)
    if (roomId && db.data.rooms[roomId]) { // Intentar unirse a una sala existente por ID/clave
      room = db.data.rooms[roomId];
      // Si la sala ya está en juego, no permitir unirse (solo si no es reconexión)
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

    } else { // Lógica para crear una nueva sala (PvP)
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) {
        roomId = generateRoomId();
      }
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        maxPlayers: totalSlots, // Total de slots para PvP
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
      // Solo si el jugador realmente está en la lista de players de la sala
      if (room.players.some(p => p.id === socket.id)) {
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
          const message = `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} ha abandonado.`;
          io.to(roomId).emit('chatMessage', { senderName: 'Sistema', text: message });
          io.to(roomId).emit('roomUpdate', {
            roomId: room.id,
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
            status: room.status,
            players: room.players,
            message: message,
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
        io.emit('availableRooms', getAvailableRooms()); // Solo emitir después de db.write
      } else {
        console.log(`Advertencia: Socket ${socket.id} intentó abandonar sala ${roomId} pero no estaba en ella.`);
        delete socket.currentRoomId; // Si por alguna razón la referencia estaba mal, la limpiamos.
        io.emit('availableRooms', getAvailableRooms()); // Actualizar la lista por si acaso
      }
    } else {
      console.log(`Advertencia: Socket ${socket.id} intentó abandonar una sala inexistente o sin currentRoomId.`);
      delete socket.currentRoomId; // Limpiar cualquier currentRoomId erróneo
      io.emit('availableRooms', getAvailableRooms()); // Actualizar la lista por si acaso
    }
  });


  socket.on('disconnect', async () => {
    await db.read();
    console.log(`Jugador desconectado: ${socket.id}`);
    const roomId = socket.currentRoomId; // Obtener la sala antes de que el socket se pierda
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      // Solo si el jugador realmente está en la lista de players de la sala
      if (room.players.some(p => p.id === socket.id)) {
        room.players = room.players.filter(p => p.id !== socket.id);
        room.currentPlayers--;
        
        // No llamamos socket.leave() aquí porque el socket ya se está desconectando.
        delete socket.currentRoomId; // Limpiar la sala del socket al desconectarse

        console.log(`[Sala ${roomId}] Jugador ${socket.id} desconectado. Restantes: ${room.currentPlayers}`);

        if (room.currentPlayers === 0) {
          console.log(`[Sala ${roomId}] Sala vacía por desconexión. Eliminando.`);
          clearTimeout(room.timeout);
          delete db.data.rooms[roomId];
        } else {
          const message = `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} se ha desconectado.`;
          io.to(roomId).emit('chatMessage', { senderName: 'Sistema', text: message });
          io.to(roomId).emit('roomUpdate', {
            roomId: room.id,
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
            status: room.status,
            players: room.players,
            message: message,
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
        io.emit('availableRooms', getAvailableRooms()); // Solo emitir después de db.write
      } else {
        console.log(`Advertencia: Socket ${socket.id} se desconectó pero no estaba en la sala ${roomId} listado.`);
        delete socket.currentRoomId;
        io.emit('availableRooms', getAvailableRooms());
      }
    } else {
        console.log(`Advertencia: Socket ${socket.id} se desconectó sin currentRoomId o sala inexistente.`);
        delete socket.currentRoomId; // Limpiar cualquier currentRoomId erróneo
        io.emit('availableRooms', getAvailableRooms());
    }
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
      io.to(roomId).emit('chatMessage', chatMessage); // Chat privado de la sala
      console.log(`[Chat Sala ${roomId}] ${senderName}: ${text}`);
    } else {
      io.emit('publicChatMessage', chatMessage); // Chat público del lobby
      console.log(`[Chat Público] ${senderName}: ${text}`);
    }
  });


  function getAvailableRooms() {
    db.read();
    return Object.values(db.data.rooms).filter(room =>
      room.status === 'waiting' && room.opponentType === 'users' // Solo PvP listadas y en espera
    ).map(room => ({
      id: room.id,
      creatorName: room.players[0] ? room.players[0].name : 'N/A',
      pointsToWin: room.pointsToWin,
      gameMode: room.gameMode,
      currentPlayers: room.currentPlayers,
      maxPlayers: room.maxPlayers, // maxPlayers para PvP
      privateKey: room.privateKey ? true : false,
      timeRemaining: Math.max(0, MAX_WAITING_TIME_MS - (Date.now() - room.createdAt)),
    }));
  }
});

app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});