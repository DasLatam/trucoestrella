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

// Vercel necesita que exportes la instancia del servidor para que pueda iniciarla.
// NO uses server.listen() directamente en el archivo principal si lo despliegas como Serverless Function.
// En Vercel, si tienes una ruta como '/', es común manejarla aquí para que la función se "active".
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando!');
});

// Exporta la instancia del servidor HTTP.
// Esto es lo que Vercel usará para levantar tu servidor.
module.exports = app; // <--- CAMBIO CLAVE

// Si estás ejecutando localmente, aún puedes usar listen:
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
  });
}