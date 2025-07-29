const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// --- Configuración de CORS para Express ---
app.use(cors({
  origin: 'https://trucoestrella.vercel.app', // Tu frontend en Vercel
  methods: ['GET', 'POST'],
  credentials: true
}));

// --- Configuración de CORS para Socket.IO ---
const io = socketIo(server, {
  cors: {
    origin: 'https://trucoestrella.vercel.app', // Tu frontend en Vercel
    methods: ["GET", "POST"],
    credentials: true
  },
  // Esto es crucial para Render y otros proxies:
  // Le dice a Socket.IO que su path base es /socket.io/
  path: '/socket.io/', // <--- ¡Asegúrate de que este path esté aquí!
  transports: ['websocket', 'polling'] // Preferir websocket, luego polling
});

const PORT = process.env.PORT || 4000;

// Lógica de Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuevo jugador conectado: ${socket.id}`);

  socket.on('joinGame', (data) => {
    console.log(`Jugador ${data.playerName} quiere unirse a un juego:`, data);
    socket.emit('gameJoined', { message: `Bienvenido, ${data.playerName}!`, room: 'some-room-id' });
  });

  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
  });
});

// Ruta simple para verificar que el servidor Express funciona
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});