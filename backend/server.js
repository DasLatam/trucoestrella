const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para permitir la conexión desde tu frontend en Vercel
app.use(cors({
  origin: 'https://trucoestrella.vercel.app', // Asegúrate de que esta sea la URL de tu frontend
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: 'https://trucoestrella.vercel.app', // Asegúrate de que esta sea la URL de tu frontend
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io/', // Ruta para la conexión de Socket.IO
  transports: ['websocket', 'polling'] // Métodos de transporte
});

const PORT = process.env.PORT || 4000; // Puerto donde escuchará el servidor

// --- Configuración de LowDB ---
// Define el archivo de la base de datos
const file = new JSONFile('db.json');
// Inicializa LowDB con un valor por defecto explícito si el archivo está vacío o no existe
const db = new Low(file, { rooms: {} });

// Función para inicializar la base de datos
async function initializeDb() {
  await db.read(); // Lee el contenido del archivo db.json
  // Si db.json está vacío o no existe, db.data ya tendrá { rooms: {} } gracias al constructor de Low
  console.log('LowDB inicializado.');
  cleanupOldRooms(); // Llama a la función de limpieza al iniciar el servidor
}

initializeDb(); // Ejecuta la inicialización de la DB

// Tiempo máximo que una sala puede estar en estado 'waiting' antes de ser eliminada (30 minutos)
const MAX_WAITING_TIME_MS = 30 * 60 * 1000;

// Función para limpiar salas antiguas/inactivas
async function cleanupOldRooms() {
  await db.read(); // Asegúrate de tener la última versión de la DB
  const now = Date.now();
  for (const roomId in db.data.rooms) {
    const room = db.data.rooms[roomId];
    // Elimina salas en estado 'waiting' que han excedido el tiempo máximo
    if (room.status === 'waiting' && (now - room.createdAt > MAX_WAITING_TIME_MS)) {
      console.log(`[Sala ${roomId}] Eliminada por inactividad al iniciar servidor.`);
      delete db.data.rooms[roomId];
    }
  }
  await db.write(); // Persiste los cambios en el archivo db.json
}

// Función para generar un ID de sala aleatorio
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let id = '';
  for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 3; i++) id += nums.charAt(Math.floor(Math.random() * nums.length));
  return id;
}

// Eventos de Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuevo jugador conectado: ${socket.id}`);

  // Maneja la creación o unión a una partida
  socket.on('joinGame', async (data) => {
    await db.read(); // Lee la DB antes de modificarla
    const { playerName, pointsToWin, gameMode, opponentType, privateKey } = data;
    let roomId = privateKey; // Si se proporciona una clave, se intenta unir a esa sala
    let room;

    let maxPlayers = 0;
    switch (gameMode) {
      case '1v1': maxPlayers = 2; break;
      case '2v2': maxPlayers = 4; break;
      case '3v3': maxPlayers = 6; break; // Aunque no se usa en el frontend, se mantiene la lógica
      default: maxPlayers = 2;
    }

    // Lógica para partidas contra IA
    if (opponentType === 'ai') {
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) { roomId = generateRoomId(); } // Genera un ID único
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        maxPlayers: maxPlayers,
        currentPlayers: 1,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: null, // Las partidas con IA no tienen clave privada
        status: 'playing', // Las partidas con IA inician inmediatamente
        createdAt: Date.now(),
      };
      db.data.rooms[roomId] = room;
      await db.write(); // Guarda los cambios
      socket.join(roomId); // Une al socket a la sala
      socket.currentRoomId = roomId; // Guarda el ID de la sala en el socket
      console.log(`[Sala IA] ${playerName} creó y se unió a la sala ${roomId} contra IA.`);
      // Emite el evento 'gameStarted' solo al jugador que creó la sala IA
      io.to(socket.id).emit('gameStarted', {
        roomId: room.id,
        players: room.players,
        message: '¡Partida contra la IA iniciada!',
        pointsToWin: room.pointsToWin,
        gameMode: room.gameMode,
        opponentType: room.opponentType,
      });
      return; // Termina la función aquí para partidas IA
    }

    // Lógica para unirse a una sala existente (si se proporcionó un roomId/privateKey)
    if (roomId && db.data.rooms[roomId]) {
      room = db.data.rooms[roomId];
      // Verifica si la sala está llena
      if (room.currentPlayers >= room.maxPlayers) {
        io.to(socket.id).emit('joinError', { message: 'La sala está llena.' });
        console.log(`[Sala ${roomId}] Intento de unión fallido: sala llena.`);
        return;
      }
      // Verifica la clave privada si la sala es privada
      if (room.privateKey && room.privateKey !== privateKey) {
        io.to(socket.id).emit('joinError', { message: 'Clave de sala incorrecta.' });
        console.log(`[Sala ${roomId}] Intento de unión fallido: clave incorrecta.`);
        return;
      }

      // Añade el jugador a la sala
      room.players.push({ id: socket.id, name: playerName });
      room.currentPlayers++;
      socket.join(roomId);
      socket.currentRoomId = roomId;
      console.log(`[Sala ${roomId}] ${playerName} se unió. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);
      await db.write(); // Guarda los cambios

      // Emite una actualización de la sala a todos los jugadores en ella
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

      // Si la sala está llena, inicia la partida
      if (room.currentPlayers === room.maxPlayers) {
        room.status = 'playing';
        clearTimeout(room.timeout); // Cancela el temporizador de inactividad
        console.log(`[Sala ${roomId}] Partida iniciada.`);
        await db.write(); // Guarda los cambios
        io.to(roomId).emit('gameStarted', {
          roomId: room.id,
          players: room.players,
          message: '¡Todos los jugadores están listos!',
          pointsToWin: room.pointsToWin,
          gameMode: room.gameMode,
          opponentType: room.opponentType,
        });
      }

    } else { // Lógica para crear una nueva sala
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) {
        roomId = generateRoomId(); // Asegura un ID único
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
        privateKey: privateKey || null, // Guarda la clave privada si se proporcionó
        status: 'waiting', // La sala está esperando jugadores
        createdAt: Date.now(), // Marca de tiempo de creación
      };
      db.data.rooms[roomId] = room;
      await db.write(); // Guarda los cambios
      socket.join(roomId);
      socket.currentRoomId = roomId;
      console.log(`[Sala ${roomId}] ${playerName} creó la sala. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);

      // Emite una actualización de la sala solo al creador
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

      // Establece un temporizador para eliminar la sala si no se llena a tiempo
      room.timeout = setTimeout(async () => {
        await db.read(); // Lee la DB antes de verificar
        if (db.data.rooms[roomId] && db.data.rooms[roomId].status === 'waiting' && db.data.rooms[roomId].currentPlayers < db.data.rooms[roomId].maxPlayers) {
          console.log(`[Sala ${roomId}] Eliminada por inactividad. No se completó.`);
          io.to(roomId).emit('roomAbandoned', { message: 'La sala ha sido eliminada por inactividad.' });
          delete db.data.rooms[roomId];
          await db.write(); // Guarda los cambios
        }
      }, MAX_WAITING_TIME_MS);
    }
    // Emite la lista actualizada de salas disponibles a todos los clientes
    io.emit('availableRooms', getAvailableRooms());
  });

  // Maneja cuando un jugador abandona una sala
  socket.on('leaveRoom', async () => {
    await db.read();
    const roomId = socket.currentRoomId;
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id); // Remueve al jugador de la lista
      room.currentPlayers--;
      socket.leave(roomId); // Saca al socket de la sala
      delete socket.currentRoomId; // Limpia el ID de la sala del socket

      console.log(`[Sala ${roomId}] Jugador ${socket.id} abandonó. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) { // Si la sala queda vacía, la elimina
        console.log(`[Sala ${roomId}] Sala vacía. Eliminando.`);
        clearTimeout(room.timeout); // Cancela el temporizador de inactividad
        delete db.data.rooms[roomId];
      } else {
        // Emite una actualización de la sala a los jugadores restantes
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
        // Si la partida estaba en curso y un jugador se va, la pone en estado de espera
        if (room.status === 'playing' && room.currentPlayers < room.maxPlayers) {
          room.status = 'waiting';
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó, esperando más jugadores.' });
        }
      }
      await db.write(); // Guarda los cambios
    }
    io.emit('availableRooms', getAvailableRooms()); // Actualiza la lista de salas para todos
  });

  // Maneja la desconexión de un jugador
  socket.on('disconnect', async () => {
    await db.read();
    console.log(`Jugador desconectado: ${socket.id}`);
    const roomId = socket.currentRoomId;
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      delete socket.currentRoomId;

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

  // Maneja la solicitud de salas disponibles
  socket.on('requestAvailableRooms', () => {
    // No necesitamos await db.read() aquí porque getAvailableRooms ya lo hace o el db.read() global ya cargó los datos
    socket.emit('availableRooms', getAvailableRooms());
  });

  // Función para obtener las salas disponibles (públicas y en espera)
  function getAvailableRooms() {
    db.read(); // Asegúrate de leer la última versión de la DB aquí también
    return Object.values(db.data.rooms).filter(room =>
      room.status === 'waiting' && room.currentPlayers < room.maxPlayers && room.opponentType === 'users'
    ).map(room => ({
      id: room.id,
      creatorName: room.players[0] ? room.players[0].name : 'N/A',
      pointsToWin: room.pointsToWin,
      gameMode: room.gameMode,
      currentPlayers: room.currentPlayers,
      maxPlayers: room.maxPlayers,
      privateKey: room.privateKey ? true : false, // Indica si tiene clave privada
      timeRemaining: Math.max(0, MAX_WAITING_TIME_MS - (Date.now() - room.createdAt)), // Tiempo restante para que la sala expire
    }));
  }

  // Enviar la lista de salas disponibles al nuevo jugador al conectarse
  // Asegúrate de que LowDB se haya cargado antes de enviar las salas.
  db.read().then(() => {
    socket.emit('availableRooms', getAvailableRooms());
  });
});

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

// Inicia el servidor
server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});