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
const getCardRank = (card) => {
    if (card.number === 1 && card.suit === 'espada') return 14;
    if (card.number === 1 && card.suit === 'basto') return 13;
    if (card.number === 7 && card.suit === 'espada') return 12;
    if (card.number === 7 && card.suit === 'oro') return 11;
    if (card.number === 3) return 10;
    if (card.number === 2) return 9;
    if (card.number === 1) return 8; // Anchos falsos
    if (card.number === 12) return 7;
    if (card.number === 11) return 6;
    if (card.number === 10) return 5;
    if (card.number === 7) return 4; // Sietes falsos
    if (card.number === 6) return 3;
    if (card.number === 5) return 2;
    if (card.number === 4) return 1;
    return 0;
};

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

const addLog = (game, text) => {
    const logMessage = { id: uuidv4(), type: 'log', text, timestamp: Date.now() };
    game.chat.push(logMessage);
    io.to(game.roomId).emit('new-game-message', logMessage);
};

const startNewHand = (game) => {
    const deck = shuffleDeck(createDeck());
    game.hands = {};
    game.players.forEach(player => {
        game.hands[player.id] = deck.splice(0, 3);
    });
    game.table = [];
    game.round = 1;
    game.roundWinners = [];
    game.truco = { level: 1, points: 1, offeredBy: null, turn: null };

    game.handStarterIndex = (game.handStarterIndex + 1) % game.players.length;
    game.turn = game.players[game.handStarterIndex].id;
    
    const starterPlayer = game.players.find(p => p.id === game.turn);
    addLog(game, `Nueva mano. ${starterPlayer.name} es mano.`);

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
    handStarterIndex: -1,
  };

  game = startNewHand(game);
  activeGames[gameData.roomId] = game;

  console.log(`Partida ${gameData.roomId} inicializada y lista.`);
  res.status(200).json({ message: "Partida inicializada con éxito." });
});

// --- MANEJO DE CONEXIONES ---
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
    }
  });

  socket.on('play-card', ({ roomId, userId, cardId }) => {
      const game = activeGames[roomId];
      if (!game || game.turn !== userId) return;

      const playerHand = game.hands[userId];
      const cardIndex = playerHand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const cardToPlay = playerHand.splice(cardIndex, 1)[0];
      game.table.push({ ...cardToPlay, playedBy: userId, round: game.round });

      const player = game.players.find(p => p.id === userId);
      addLog(game, `${player.name} juega el ${cardToPlay.number} de ${cardToPlay.suit}.`);

      const currentPlayerIndex = game.players.findIndex(p => p.id === userId);
      const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
      game.turn = game.players[nextPlayerIndex].id;

      // Lógica de fin de ronda
      if (game.table.filter(c => c.round === game.round).length === game.players.length) {
          const roundCards = game.table.filter(c => c.round === game.round);
          let winningCard = roundCards[0];
          let winnerId = winningCard.playedBy;
          let isParda = false;

          for (let i = 1; i < roundCards.length; i++) {
              const currentCard = roundCards[i];
              if (getCardRank(currentCard) > getCardRank(winningCard)) {
                  winningCard = currentCard;
                  winnerId = winningCard.playedBy;
                  isParda = false;
              } else if (getCardRank(currentCard) === getCardRank(winningCard)) {
                  isParda = true;
              }
          }

          if (isParda) {
              winnerId = 'parda';
              game.turn = game.players[game.handStarterIndex].id;
              addLog(game, `Ronda ${game.round} es parda.`);
          } else {
              game.turn = winnerId;
              const winnerPlayer = game.players.find(p => p.id === winnerId);
              addLog(game, `${winnerPlayer.name} gana la ${game.round}ª ronda.`);
          }
          
          game.roundWinners.push(winnerId);
          game.round++;
          io.to(roomId).emit('update-game-state', game);

          // Lógica de fin de mano
          const teamAWins = game.roundWinners.filter(w => game.teams.A.some(p => p.id === w)).length;
          const teamBWins = game.roundWinners.filter(w => game.teams.B.some(p => p.id === w)).length;
          let handWinnerTeam = null;

          if (teamAWins >= 2) handWinnerTeam = 'A';
          if (teamBWins >= 2) handWinnerTeam = 'B';
          
          // Lógica de parda en primera
          if (!handWinnerTeam && game.roundWinners[0] === 'parda') {
              const secondRoundWinnerId = game.roundWinners[1];
              if (secondRoundWinnerId && secondRoundWinnerId !== 'parda') {
                  handWinnerTeam = game.players.find(p => p.id === secondRoundWinnerId).team;
              }
          }

          if (handWinnerTeam) {
              game.scores[handWinnerTeam] += game.truco.points;
              addLog(game, `Equipo ${handWinnerTeam} gana la mano y ${game.truco.points} punto(s).`);
              setTimeout(() => {
                  const newHandGame = startNewHand(game);
                  activeGames[roomId] = newHandGame;
                  io.to(roomId).emit('update-game-state', newHandGame);
              }, 4000);
          }
      } else {
        io.to(roomId).emit('update-game-state', game);
      }
  });

  socket.on('send-game-message', ({ roomId, message }) => { /* ... (código sin cambios) ... */ });
  socket.on('disconnect', () => { /* ... (código sin cambios) ... */ });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Servidor de JUEGO escuchando en el puerto ${PORT}`);
});