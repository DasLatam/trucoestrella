const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Permite conexiones desde cualquier origen por ahora (¡ajustar en producción!)
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando!');
});

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

server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});

