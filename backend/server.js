const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

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

// --- Nueva Estructura para almacenar Salas ---
// Utilizaremos un objeto para almacenar las salas por su ID.
// Cada sala tendrá sus propiedades y una lista de sockets conectados.
const gameRooms = {}; // Ejemplo: { 'roomId123': { id: 'roomId123', creatorId: 'socketIdABC', ...players: [], maxPlayers: 2, ... } }
const MAX_WAITING_TIME_MS = 30 * 60 * 1000; // 30 minutos en milisegundos

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
  socket.on('joinGame', (data) => {
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
        // Más adelante: aquí agregaríamos la lógica de la IA
      };
      gameRooms[roomId] = room;
      socket.join(roomId); // Unir al socket a la sala
      console.log(`[Sala IA] ${playerName} creó y se unió a la sala ${roomId} contra IA.`);
      io.to(socket.id).emit('gameStarted', { roomId: roomId, players: room.players, message: '¡Partida contra la IA iniciada!' });
      return; // No necesita esperar
    }

    // Lógica para partidas multijugador (contra usuarios)
    if (roomId && gameRooms[roomId]) { // Intentar unirse a una sala existente por ID/clave
      room = gameRooms[roomId];
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

      // Notificar a todos en la sala sobre el cambio de jugadores
      io.to(roomId).emit('roomUpdate', {
        roomId: room.id,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        status: room.status,
        players: room.players,
        message: `${playerName} se ha unido.`,
      });

      // Si la sala está llena, iniciar la partida
      if (room.currentPlayers === room.maxPlayers) {
        room.status = 'playing';
        console.log(`[Sala ${roomId}] Partida iniciada.`);
        io.to(roomId).emit('gameStarted', { roomId: room.id, players: room.players, message: '¡Todos los jugadores están listos!' });
      }

    } else { // Crear una nueva sala
      roomId = generateRoomId();
      while (gameRooms[roomId]) { // Asegurarse de que el ID sea único
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
      gameRooms[roomId] = room;
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
      });

      // Iniciar el temporizador de eliminación de sala
      room.timeout = setTimeout(() => {
        if (room.status === 'waiting' && room.currentPlayers < room.maxPlayers) {
          console.log(`[Sala ${roomId}] Eliminada por inactividad. No se completó.`);
          io.to(roomId).emit('roomAbandoned', { message: 'La sala ha sido eliminada por inactividad.' });
          delete gameRooms[roomId];
        }
      }, MAX_WAITING_TIME_MS);
    }
    // Después de cada acción de join/create, enviar la lista actualizada de salas a *todos* los clientes
    io.emit('availableRooms', getAvailableRooms());
  });

  // Evento para abandonar una sala
  socket.on('leaveRoom', () => {
    const roomId = socket.currentRoomId;
    if (roomId && gameRooms[roomId]) {
      const room = gameRooms[roomId];
      // Eliminar al jugador de la sala
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      socket.leave(roomId);
      delete socket.currentRoomId; // Eliminar referencia a la sala del socket

      console.log(`[Sala ${roomId}] Jugador ${socket.id} abandonó. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) {
        console.log(`[Sala ${roomId}] Sala vacía. Eliminando.`);
        clearTimeout(room.timeout); // Limpiar el temporizador si la sala se vacía
        delete gameRooms[roomId];
      } else {
        // Notificar a los restantes en la sala
        io.to(roomId).emit('roomUpdate', {
          roomId: room.id,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          status: room.status,
          players: room.players,
          message: `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} ha abandonado.`,
        });
        if (room.status === 'playing' && room.currentPlayers < room.maxPlayers) {
          room.status = 'waiting'; // Si la partida se interrumpe, vuelve a 'waiting'
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó, esperando más jugadores.' });
        }
      }
    }
    // Siempre enviar la lista actualizada de salas
    io.emit('availableRooms', getAvailableRooms());
  });


  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    const roomId = socket.currentRoomId; // Obtener la sala antes de que el socket se pierda
    if (roomId && gameRooms[roomId]) {
      const room = gameRooms[roomId];
      // Eliminar al jugador de la sala
      room.players = room.players.filter(p => p.id !== socket.id);
      room.currentPlayers--;
      delete socket.currentRoomId; // Limpiar referencia

      console.log(`[Sala ${roomId}] Jugador ${socket.id} desconectado. Restantes: ${room.currentPlayers}`);

      if (room.currentPlayers === 0) {
        console.log(`[Sala ${roomId}] Sala vacía por desconexión. Eliminando.`);
        clearTimeout(room.timeout);
        delete gameRooms[roomId];
      } else {
        // Notificar a los restantes en la sala
        io.to(roomId).emit('roomUpdate', {
          roomId: room.id,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          status: room.status,
          players: room.players,
          message: `${room.players.find(p => p.id === socket.id)?.name || 'Un jugador'} se ha desconectado.`,
        });
        if (room.status === 'playing' && room.currentPlayers < room.maxPlayers) {
          room.status = 'waiting'; // Si la partida se interrumpe, vuelve a 'waiting'
          io.to(roomId).emit('gamePaused', { message: 'La partida se pausó por desconexión.' });
        }
      }
    }
    // Después de cada desconexión, enviar la lista actualizada de salas a *todos* los clientes
    io.emit('availableRooms', getAvailableRooms());
  });

  // Función para obtener salas disponibles (no llenas y no en juego)
  function getAvailableRooms() {
    return Object.values(gameRooms).filter(room =>
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
  socket.emit('availableRooms', getAvailableRooms());
});

// Ruta simple para verificar que el servidor Express funciona
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});