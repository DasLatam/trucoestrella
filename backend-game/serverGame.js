// Archivo: backend-game/serverGame.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// --- CONFIGURACIÓN INICIAL ---
const app = express();
app.use(cors());
app.use(express.json()); // Middleware para poder leer JSON en las peticiones HTTP
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // En producción, debería ser la URL de Vercel
    methods: ["GET", "POST"],
  },
});

// --- "Base de Datos" en Memoria ---
// Para empezar, guardaremos las partidas activas en un objeto en memoria.
// La clave será el roomId.
let activeGames = {};

// --- COMUNICACIÓN SERVIDOR A SERVIDOR (Hand-off) ---
// Este es el endpoint que el Servidor de Lobby llamará.
app.post('/init-game', (req, res) => {
  const gameData = req.body;

  if (!gameData || !gameData.roomId) {
    return res.status(400).json({ message: "Faltan datos de la partida." });
  }

  // Guardamos la información de la partida, lista para que se conecten los jugadores.
  activeGames[gameData.roomId] = {
    ...gameData,
    status: 'starting', // Un estado intermedio
    hands: {},
    turn: null,
    table: [],
  };

  console.log(`Partida ${gameData.roomId} inicializada y lista para recibir jugadores.`);
  res.status(200).json({ message: "Partida inicializada con éxito." });
});

// --- MANEJO DE CONEXIONES DE JUGADORES ---
io.on('connection', (socket) => {
  // Cuando un jugador se conecta, debe decirnos a qué partida quiere unirse.
  socket.on('join-game-room', (roomId) => {
    const game = activeGames[roomId];
    if (game) {
      socket.join(roomId);
      console.log(`Jugador ${socket.id} se unió a la sala de juego ${roomId}`);
      
      // Por ahora, solo le enviamos un mensaje de bienvenida.
      // Más adelante, aquí le enviaremos sus cartas.
      socket.emit('welcome-to-game', { message: `Bienvenido a la partida ${roomId}!` });

    } else {
      socket.emit('error', { message: 'La partida no fue encontrada en este servidor.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    // Aquí irá la lógica para manejar la desconexión de un jugador en plena partida.
  });
});

// --- INICIAR SERVIDOR DE JUEGO ---
// Usaremos un puerto diferente al del lobby para evitar conflictos.
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Servidor de JUEGO escuchando en el puerto ${PORT}`);
});