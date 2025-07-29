const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // Asegúrate de que 'cors' esté instalado (npm install cors)

const app = express();
const server = http.createServer(app);

// --- Configuración de CORS para Express (middleware) ---
// Esto es para peticiones HTTP normales que puedan ocurrir antes o en paralelo a Socket.IO.
// Es buena práctica que coincida con la configuración de Socket.IO.
app.use(cors({
  origin: 'https://trucoestrella.vercel.app', // <--- Tu frontend en Vercel
  methods: ['GET', 'POST'], // Puedes añadir más si tu API las usa (PUT, DELETE, etc.)
  credentials: true
}));

// --- Configuración de CORS para Socket.IO ---
// Esta es la más crítica para las conexiones de Socket.IO.
const io = socketIo(server, {
  cors: {
    origin: 'https://trucoestrella.vercel.app', // <--- Tu frontend en Vercel
    methods: ["GET", "POST"], // Métodos que el cliente de Socket.IO puede usar
    credentials: true
  }
});

const PORT = process.env.PORT || 4000;

// Lógica de Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuevo jugador conectado: ${socket.id}`);

  // Aquí deberías ver este log en Render cuando el frontend se conecta
  // y cuando haces clic en "¡Jugar!"
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

// El servidor HTTP global escucha en el puerto de Render
server.listen(PORT, () => {
  console.log(`Servidor de Truco Estrella escuchando en el puerto ${PORT}`);
});