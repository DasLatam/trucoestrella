// backend-game/serverGame.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let activeGames = {};

// --- LÓGICA DE JUEGO ---
const createDeck = () => {
    const suits = ['espada', 'basto', 'oro', 'copa'];
    const numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    let deck = [];
    for (const suit of suits) {
        for (const number of numbers) {
            deck.push({ number, suit, id: `${number}-${suit}` });
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

const startNewHand = (game) => {
    const deck = shuffleDeck(createDeck());
    game.hands = {};
    game.players.forEach(player => {
        game.hands[player.id] = deck.splice(0, 3);
    });
    game.table = [];
    game.round = 1;
    // Lógica para rotar quién empieza la mano (a implementar)
    game.turn = game.players[0].id; 
    return game;
};

// --- ENDPOINT DE HAND-OFF ---
app.post('/init-game', (req, res) => {
  const gameData = req.body;
  if (!gameData || !gameData.roomId) {
    return res.status(400).json({ message: "Faltan datos de la partida." });
  }

  let game = {
    ...gameData,
    status: 'playing',
    scores: { A: 0, B: 0 },
    chat: [],
  };

  game = startNewHand(game); // Reparte la primera mano
  activeGames[gameData.roomId] = game;

  console.log(`Partida ${gameData.roomId} inicializada y lista.`);
  res.status(200).json({ message: "Partida inicializada con éxito." });
});

// --- MANEJO DE CONEXIONES DE JUGADORES ---
io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUserId = null;

  socket.on('join-game-room', ({ roomId, userId }) => {
    const game = activeGames[roomId];
    if (game && game.players.some(p => p.id === userId)) {
      currentRoomId = roomId;
      currentUserId = userId;
      socket.join(roomId);
      console.log(`Jugador ${userId} se unió a la sala de juego ${roomId}`);
      io.to(roomId).emit('update-game-state', game);
    } else {
      socket.emit('error', { message: 'No tienes permiso para unirte a esta partida.' });
    }
  });

  socket.on('play-card', ({ roomId, userId, cardId }) => {
      const game = activeGames[roomId];
      if (!game || game.turn !== userId) return;

      const playerHand = game.hands[userId];
      const cardIndex = playerHand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const cardToPlay = playerHand.splice(cardIndex, 1)[0];
      game.table.push({ ...cardToPlay, playedBy: userId });

      const currentPlayerIndex = game.players.findIndex(p => p.id === userId);
      const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
      game.turn = game.players[nextPlayerIndex].id;

      io.to(roomId).emit('update-game-state', game);

      // Lógica de fin de mano (cuando se juegan todas las cartas)
      if (game.table.length === game.players.length * 3) {
          // Placeholder: sumar puntos al ganador
          // game.scores.A += 1; 
          
          const logMessage = { id: uuidv4(), type: 'log', text: `Mano terminada.`, timestamp: Date.now() };
          game.chat.push(logMessage);
          io.to(roomId).emit('new-game-message', logMessage);

          setTimeout(() => {
              const newHandGame = startNewHand(game);
              activeGames[roomId] = newHandGame;
              io.to(roomId).emit('update-game-state', newHandGame);
          }, 3000); // Pausa de 3 segundos
      }
  });

  socket.on('send-game-message', ({ roomId, message }) => {
      const game = activeGames[roomId];
      if (game) {
          const chatMessage = { id: uuidv4(), type: 'user', ...message, timestamp: Date.now() };
          game.chat.push(chatMessage);
          io.to(roomId).emit('new-game-message', chatMessage);
      }
  });

  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Servidor de JUEGO escuchando en el puerto ${PORT}`);
});