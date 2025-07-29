const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Low } = require('lowdb'); // Importa Low
const { JSONFile } = require('lowdb/node'); // Para adaptar a Node.js

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Express (middleware)
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

// --- Configuración de LowDB ---
// Usaremos un archivo JSON llamado 'db.json' en el mismo directorio del servidor.
// LowDB creará este archivo si no existe.
const file = new JSONFile('db.json');
const db = new Low(file);

// Función para inicializar la base de datos
async function initializeDb() {
  await db.read();
  db.data = db.data || { rooms: {} }; // Si el archivo está vacío o no existe, inicializa con un objeto de salas vacío
  await db.write();
  console.log('LowDB inicializado.');
  // Limpiar salas antiguas al iniciar el servidor (opcional, para desarrollo)
  cleanupOldRooms();
}

// Llama a la inicialización al inicio
initializeDb();

// Función para limpiar salas que excedieron el tiempo de espera
function cleanupOldRooms() {
  const now = Date.now();
  for (const roomId in db.data.rooms) {
    const room = db.data.rooms[roomId];
    if (room.status === 'waiting' && (now - room.createdAt > MAX_WAITING_TIME_MS)) {
      console.log(`[Sala ${roomId}] Eliminada por inactividad al iniciar servidor.`);
      delete db.data.rooms[roomId];
    }
  }
  db.write(); // Persistir los cambios
}


const MAX_WAITING_TIME_MS = 30 * 60 * 1000; // 30 minutos

// Función para generar un ID de sala único y legible (3 letras, 3 números)
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let id = '';
  for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 3; i++) id += nums.charAt(Math.floor(Math.random() * nums.length));
  return id;
}

// --- Lógica de Socket.IO ---
io.on('connection', (socket) => {
  console.log(`Nuevo jugador conectado: ${socket.id}`);

  // Cuando un jugador intenta unirse o crear una partida
  socket.on('joinGame', async (data) => { // Agrega 'async' aquí
    await db.read(); // Leer los datos más recientes antes de modificar
    const { playerName, pointsToWin, gameMode, opponentType, privateKey } = data;
    let roomId = privateKey; // Si se proporciona una clave, la usamos como ID de sala
    let room;

    // Determinar el número máximo de jugadores
    let maxPlayers = 0;
    switch (gameMode) {
      case '1v1': maxPlayers = 2; break; // 1 jugador humano + 1 oponente (humano/IA)
      case '2v2': maxPlayers = 4; break;
      case '3v3': maxPlayers = 6; break;
      default: maxPlayers = 2; // Valor por defecto
    }

    // Si es contra la IA, la sala se "llena" inmediatamente
    if (opponentType === 'ai') {
      roomId = generateRoomId(); // La IA siempre crea una nueva sala privada
      while (db.data.rooms[roomId]) { roomId = generateRoomId(); } // Asegurarse de que el ID sea único
      room = {
        id: roomId,
        creatorId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        maxPlayers: maxPlayers, // Incluye la IA
        currentPlayers: 1,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey: null, // No hay clave para la IA
        status: 'playing', // Inicia directamente
        createdAt: Date.now(),
      };
      db.data.rooms[roomId] = room; // Guardar en LowDB
      await db.write(); // Persistir
      socket.join(roomId); // Unir al socket a la sala
      socket.currentRoomId = roomId; // Guardar el ID de la sala en el socket
      console.log(`[Sala IA] ${playerName} creó y se unió a la sala ${roomId} contra IA.`);
      io.to(socket.id).emit('gameStarted', {
        roomId: room.id,
        players: room.players,
        message: '¡Partida contra la IA iniciada!',
        pointsToWin: room.pointsToWin, // Pasa estos datos también
        gameMode: room.gameMode,
        opponentType: room.opponentType,
      });
      // No necesitamos emitir availableRooms aquí, ya que no es una sala "listable" para unirse
      return;
    }

    // Lógica para partidas multijugador (contra usuarios)
    if (roomId && db.data.rooms[roomId]) { // Intentar unirse a una sala existente por ID/clave
      room = db.data.rooms[roomId];
      // Validar si la sala está llena o si la clave es incorrecta
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

      // Unir al jugador a la sala existente
      room.players.push({ id: socket.id, name: playerName });
      room.currentPlayers++;
      socket.join(roomId);
      socket.currentRoomId = roomId; // Guardar el ID de la sala en el socket
      console.log(`[Sala ${roomId}] ${playerName} se unió. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);
      await db.write(); // Persistir cambios en la sala

      // Notificar a todos en la sala sobre el cambio de jugadores
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

      // Si la sala está llena, iniciar la partida
      if (room.currentPlayers === room.maxPlayers) {
        room.status = 'playing';
        clearTimeout(room.timeout); // Limpiar el temporizador de inactividad
        console.log(`[Sala ${roomId}] Partida iniciada.`);
        await db.write(); // Persistir el cambio de estado
        io.to(roomId).emit('gameStarted', {
          roomId: room.id,
          players: room.players,
          message: '¡Todos los jugadores están listos!',
          pointsToWin: room.pointsToWin,
          gameMode: room.gameMode,
          opponentType: room.opponentType,
        });
      }

    } else { // Crear una nueva sala
      roomId = generateRoomId();
      while (db.data.rooms[roomId]) { // Asegurarse de que el ID sea único
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
        opponentType, // Debería ser 'users' aquí
        privateKey: privateKey || null, // Guardar la clave si se dio
        status: 'waiting',
        createdAt: Date.now(),
      };
      db.data.rooms[roomId] = room; // Guardar en LowDB
      await db.write(); // Persistir
      socket.join(roomId); // Unir al socket a la sala
      socket.currentRoomId = roomId; // Guardar el ID de la sala en el socket
      console.log(`[Sala ${roomId}] ${playerName} creó la sala. Participantes: ${room.currentPlayers}/${room.maxPlayers}`);

      // Enviar la información de la sala al creador
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

      // Iniciar el temporizador de eliminación de sala
      room.timeout = setTimeout(async () => { // Agrega 'async' para await db.write()
        await db.read(); // Leer la última versión antes de decidir
        if (db.data.rooms[roomId] && db.data.rooms[roomId].status === 'waiting' && db.data.rooms[roomId].currentPlayers < db.data.rooms[roomId].maxPlayers) {
          console.log(`[Sala ${roomId}] Eliminada por inactividad. No se completó.`);
          io.to(roomId).emit('roomAbandoned', { message: 'La sala ha sido eliminada por inactividad.' });
          delete db.data.rooms[roomId];
          await db.write(); // Persistir
        }
      }, MAX_WAITING_TIME_MS);
    }
    // Después de cada acción de join/create, enviar la lista actualizada de salas a *todos* los clientes
    io.emit('availableRooms', getAvailableRooms());
  });

  // Evento para abandonar una sala
  socket.on('leaveRoom', async () => { // Agrega 'async'
    await db.read(); // Leer antes de modificar
    const roomId = socket.currentRoomId;
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      // Eliminar al jugador de la sala
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      socket.leave(roomId);
      delete socket.currentRoomId; // Eliminar referencia a la sala del socket

      console.log(`[Sala ${roomId}] Jugador ${socket.id} abandonó. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) {
        console.log(`[Sala ${roomId}] Sala vacía. Eliminando.`);
        clearTimeout(room.timeout); // Limpiar el temporizador si la sala se vacía
        delete db.data.rooms[roomId];
      } else {
        // Notificar a los restantes en la sala
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
          room.status = 'waiting'; // Si la partida se interrumpe, vuelve a 'waiting'
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó, esperando más jugadores.' });
        }
      }
      await db.write(); // Persistir cambios en la sala
    }
    // Siempre enviar la lista actualizada de salas
    io.emit('availableRooms', getAvailableRooms());
  });


  socket.on('disconnect', async () => { // Agrega 'async'
    await db.read(); // Leer antes de modificar
    console.log(`Jugador desconectado: ${socket.id}`);
    const roomId = socket.currentRoomId; // Obtener la sala antes de que el socket se pierda
    if (roomId && db.data.rooms[roomId]) {
      const room = db.data.rooms[roomId];
      // Eliminar al jugador de la sala
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      delete socket.currentRoomId; // Limpiar referencia

      console.log(`[Sala ${roomId}] Jugador ${socket.id} desconectado. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) {
        console.log(`[Sala ${roomId}] Sala vacía por desconexión. Eliminando.`);
        clearTimeout(room.timeout);
        delete db.data.rooms[roomId];
      } else {
        // Notificar a los restantes en la sala
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
          room.status = 'waiting'; // Si la partida se interrumpe, vuelve a 'waiting'
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó por desconexión.' });
        }
      }
      await db.write(); // Persistir cambios en la sala
    }
    // Después de cada desconexión, enviar la lista actualizada de salas a *todos* los clientes
    io.emit('availableRooms', getAvailableRooms());
  });

  // Evento para solicitar la lista de salas disponibles
  socket.on('requestAvailableRooms', () => {
    socket.emit('availableRooms', getAvailableRooms());
  });

  // Función para obtener salas disponibles (no llenas y no en juego)
  function getAvailableRooms() {
    // Asegurarse de leer la última versión de la DB antes de obtener las salas
    // Esto es crucial para que la lista esté siempre actualizada.
    // Aunque db.read() es async, aquí se ejecutará de forma síncrona dentro del flujo del socket.
    db.read();
    return Object.values(db.data.rooms).filter(room =>
      room.status === 'waiting' && room.currentPlayers < room.maxPlayers && room.opponentType === 'users'
    ).map(room => ({
      id: room.id,
      creatorName: room.players[0] ? room.players[0].name : 'N/A', // Nombre del creador
      pointsToWin: room.pointsToWin,
      gameMode: room.gameMode,
      currentPlayers: room.currentPlayers,
      maxPlayers: room.maxPlayers,
      privateKey: room.privateKey ? true : false, // Indicar si tiene clave sin mostrarla
      timeRemaining: Math.max(0, MAX_WAITING_TIME_MS - (Date.now() - room.createdAt)), // Tiempo restante de espera
    }));
  }

  // Enviar la lista de salas disponibles al nuevo jugador al conectarse
  // Esto asegura que LowDB se haya cargado antes de enviar las salas.
  db.read().then(() => {
    socket.emit('availableRooms', getAvailableRooms());
  });
});

// Ruta simple para verificar que el servidor Express funciona
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});