const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // ¡Asegúrate de que esto esté instalado! (npm install cors)

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Express (middleware)
app.use(cors({
  origin: 'https://trucoestrella.vercel.app', // Tu frontend en Vercel
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Añadimos más métodos por si acaso
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: 'https://trucoestrella.vercel.app', // Tu frontend en Vercel
    methods: ["GET", "POST"],
    credentials: true
  }
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

// Esta ruta simple es para que Render sepa que el servidor está respondiendo
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando en Render!');
});

// ¡Aquí volvemos a usar server.listen para que Render lo inicie!
server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});

// Eliminamos 'module.exports = app;' ya que no es necesario para Render en este caso.