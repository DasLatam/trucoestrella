// Archivo: backend-game/serverGame.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// --- CONFIGURACIÓN INICIAL ---
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let activeGames = {};

// --- LÓGICA DE BARAJAR Y REPARTIR ---
const createDeck = () => {
    const suits = ['espada', 'basto', 'oro', 'copa'];
    const numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    const deck = [];
    for (const suit of suits) {
        for (const number of numbers) {
            deck.push({ number, suit });
        }
    }
    return deck;
};

const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

// --- ENDPOINT DE HAND-OFF ---
app.post('/init-game', (req, res) => {
  const gameData = req.body;
  if (!gameData || !gameData.roomId) {
    return res.status(400).json({ message: "Faltan datos de la partida." });
  }

  // Barajar y repartir cartas
  const deck = shuffleDeck(createDeck());
  const hands = {};
  gameData.players.forEach(player => {
      if (!player.isAI) {
          hands[player.id] = deck.splice(0, 3);
      }
  });

  activeGames[gameData.roomId] = {
    ...gameData,
    status: 'playing',
    hands, // Manos de los jugadores
    turn: gameData.players[0].id, // El primer jugador empieza
    table: [], // Cartas en la mesa
    scores: { A: 0, B: 0 }
  };

  console.log(`Partida ${gameData.roomId} inicializada y lista para recibir jugadores.`);
  res.status(200).json({ message: "Partida inicializada con éxito." });
});

// --- MANEJO DE CONEXIONES DE JUGADORES ---
io.on('connection', (socket) => {
  socket.on('join-game-room', (roomId) => {
    const game = activeGames[roomId];
    if (game) {
      socket.join(roomId);
      console.log(`Jugador ${socket.id} se unió a la sala de juego ${roomId}`);
      
      // **LA CORRECCIÓN CLAVE: Enviar el estado completo del juego al jugador que se une.**
      // En una versión final, se enviaría a cada jugador solo su propia mano.
      io.to(roomId).emit('update-game-state', game);

    } else {
      socket.emit('error', { message: 'La partida no fue encontrada en este servidor.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
  });
});

// --- INICIAR SERVIDOR DE JUEGO ---
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Servidor de JUEGO escuchando en el puerto ${PORT}`);
});