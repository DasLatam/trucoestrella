const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // <--- ¡Importa el paquete CORS para Express!

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Express (Middleware)
// Esto es útil para cualquier petición HTTP que no sea de Socket.IO directamente,
// pero puede complementar la configuración de Socket.IO.
// Solo permitimos el origen de tu frontend
app.use(cors({
  origin: 'https://trucoestrella.vercel.app', // <--- ¡Cambia esto por la URL EXACTA de tu frontend en Vercel!
  methods: ['GET', 'POST']
}));

const io = socketIo(server, {
  cors: {
    origin: 'https://trucoestrella.vercel.app', // <--- ¡Cambia esto también por la URL EXACTA de tu frontend!
    methods: ["GET", "POST"],
    credentials: true // Necesario si manejas cookies o headers de autorización
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
// La ruta raíz para Vercel Serverless Functions
app.get('/', (req, res) => {
  res.send('Servidor de Truco Estrella funcionando!');
});

// Exporta la instancia de la aplicación Express para Vercel
module.exports = app; // <--- Sigue siendo CLAVE

// Si estás ejecutando localmente, aún puedes usar listen:
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
  });
}