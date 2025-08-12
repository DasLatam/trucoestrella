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

const calculateEnvido = (hand) => {
    const figures = [10, 11, 12];
    let envidoPoints = 0;
    const suits = {};
    hand.forEach(card => {
        if (!suits[card.suit]) suits[card.suit] = [];
        suits[card.suit].push(figures.includes(card.number) ? 0 : card.number);
    });
    for (const suit in suits) {
        if (suits[suit].length >= 2) {
            suits[suit].sort((a, b) => b - a);
            envidoPoints = Math.max(envidoPoints, 20 + suits[suit][0] + suits[suit][1]);
        }
    }
    if (envidoPoints === 0) {
        const cardValues = hand.map(c => figures.includes(c.number) ? 0 : c.number);
        envidoPoints = Math.max(...cardValues);
    }
    return envidoPoints;
};

const startNewHand = (game) => {
    const deck = shuffleDeck(createDeck());
    game.hands = {};
    game.envidoPoints = {};
    game.players.forEach(player => {
        const hand = deck.splice(0, 3);
        game.hands[player.id] = hand;
        game.envidoPoints[player.id] = calculateEnvido(hand);
    });
    game.table = [];
    game.round = 1;
    game.roundWinners = [];
    game.truco = { level: 1, points: 1, offeredByTeam: null, responseTurn: null, lastChanter: null };
    game.envido = { phase: 'open', points: 0, wanted: false, offeredBy: null, responseTurn: null, chants: [], winner: null };
    game.handStarterIndex = (game.handStarterIndex + 1) % game.players.length;
    game.turn = game.players[game.handStarterIndex].id;
    const starterPlayer = game.players.find(p => p.id === game.turn);
    addLog(game, `--- Nueva mano. ${starterPlayer.name} es mano. ---`);
    return game;
};

const checkHandWinner = (game) => {
    const getTeam = (playerId) => game.players.find(p => p.id === playerId)?.team;
    const roundWinners = game.roundWinners;
    const teamAWins = roundWinners.filter(w => getTeam(w) === 'A').length;
    const teamBWins = roundWinners.filter(w => getTeam(w) === 'B').length;
    if (teamAWins === 2) return 'A';
    if (teamBWins === 2) return 'B';
    if (roundWinners.length >= 2) {
        if (roundWinners[0] === 'parda') {
            const winnerId = roundWinners[1];
            if (winnerId !== 'parda') return getTeam(winnerId);
        }
        if (roundWinners[0] !== 'parda' && roundWinners[1] === 'parda') {
            return getTeam(roundWinners[0]);
        }
    }
    if (roundWinners.length === 3) {
        if (teamAWins > teamBWins) return 'A';
        if (teamBWins > teamAWins) return 'B';
        const handStarterTeam = getTeam(game.players[game.handStarterIndex].id);
        return handStarterTeam;
    }
    return null;
};

const checkGameWinner = (game) => {
    if (game.scores.A >= game.points) {
        game.status = 'finished';
        game.winner = 'A';
        const teamName = game.teams.A.map(p => p.name).join(' y ');
        addLog(game, `¡El equipo de ${teamName} ha ganado la partida!`);
    } else if (game.scores.B >= game.points) {
        game.status = 'finished';
        game.winner = 'B';
        const teamName = game.teams.B.map(p => p.name).join(' y ');
        addLog(game, `¡El equipo de ${teamName} ha ganado la partida!`);
    }
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
      if (!game || game.turn !== userId || game.truco.responseTurn || game.envido.responseTurn) return;
      game.envido.phase = 'closed';
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
          const handWinnerTeam = checkHandWinner(game);
          if (handWinnerTeam) {
              const teamName = game.teams[handWinnerTeam].map(p => p.name).join(' y ');
              game.scores[handWinnerTeam] += game.truco.points;
              addLog(game, `El equipo de ${teamName} gana la mano y ${game.truco.points} punto(s).`);
              checkGameWinner(game);
              if (game.status !== 'finished') {
                  setTimeout(() => {
                      activeGames[roomId] = startNewHand(game);
                      io.to(roomId).emit('update-game-state', activeGames[roomId]);
                  }, 4000);
              }
          } else {
              game.round++;
          }
      }
      io.to(roomId).emit('update-game-state', game);
  });

  socket.on('chant', ({ roomId, userId, chant }) => {
      const game = activeGames[roomId];
      if (!game) return;
      const player = game.players.find(p => p.id === userId);
      const opponent = game.players.find(p => p.id !== userId);
      if (['envido', 'real-envido', 'falta-envido'].includes(chant)) {
          if (game.envido.phase !== 'open' || game.envido.responseTurn) return;
          game.envido.responseTurn = opponent.id;
          game.envido.offeredBy = player.id;
          game.envido.chants.push(chant);
          addLog(game, `${player.name} canta ${chant.replace('-', ' ').toUpperCase()}.`);
      } else {
          if (game.truco.responseTurn) return;
          game.truco.offeredByTeam = player.team;
          game.truco.responseTurn = opponent.id;
          game.truco.lastChanter = userId;
          const chantMap = { 'truco': 2, 'retruco': 3, 'vale-cuatro': 4 };
          if (chantMap[chant]) {
              game.truco.level = chantMap[chant];
              addLog(game, `${player.name} canta ${chant.toUpperCase()}.`);
          }
      }
      io.to(roomId).emit('update-game-state', game);
  });

  socket.on('respond-chant', ({ roomId, userId, response }) => {
      const game = activeGames[roomId];
      if (!game) return;
      const player = game.players.find(p => p.id === userId);
      if (game.envido.responseTurn === userId) {
          const chantingPlayer = game.players.find(p => p.id === game.envido.offeredBy);
          const respondingPlayer = player;
          const chantingTeam = chantingPlayer.team;
          const chantingTeamName = game.teams[chantingTeam].map(p => p.name).join(' y ');
          
          let pointsNotAccepted = 1;
          if(game.envido.chants.length > 1) {
              const previousChants = game.envido.chants.slice(0, -1);
              pointsNotAccepted = 0;
              previousChants.forEach(c => {
                  if(c === 'envido') pointsNotAccepted += 2;
                  if(c === 'real-envido') pointsNotAccepted += 3;
              });
          }

          if (response === 'no-quiero') {
              game.scores[chantingTeam] += pointsNotAccepted;
              addLog(game, `${respondingPlayer.name} NO QUIERE. El equipo de ${chantingTeamName} gana ${pointsNotAccepted} punto(s).`);
              game.envido.phase = 'closed';
              game.envido.responseTurn = null;
              checkGameWinner(game);
          } else if (response === 'quiero') {
              game.envido.phase = 'resolved';
              game.envido.responseTurn = null;
              game.envido.wanted = true;
              
              let pointsInPlay = 0;
              let isFaltaEnvido = false;
              game.envido.chants.forEach(c => {
                  if(c === 'envido') pointsInPlay += 2;
                  if(c === 'real-envido') pointsInPlay += 3;
                  if(c === 'falta-envido') isFaltaEnvido = true;
              });
              if(pointsInPlay === 0) pointsInPlay = 2;

              if (isFaltaEnvido) {
                  const opponentTeam = chantingTeam === 'A' ? 'B' : 'A';
                  pointsInPlay = game.points - game.scores[opponentTeam];
              }

              const handStarter = game.players[game.handStarterIndex];
              const opponent = game.players.find(p => p.id !== handStarter.id);
              let winner;
              if (game.envidoPoints[handStarter.id] > game.envidoPoints[opponent.id]) {
                  winner = handStarter;
              } else if (game.envidoPoints[opponent.id] > game.envidoPoints[handStarter.id]) {
                  winner = opponent;
              } else {
                  winner = handStarter;
              }
              
              game.scores[winner.team] += pointsInPlay;
              game.envido.winner = { name: winner.name, points: game.envidoPoints[winner.id] };
              addLog(game, `${respondingPlayer.name} QUIERE.`);
              const winnerTeamName = game.teams[winner.team].map(p => p.name).join(' y ');
              addLog(game, `El tanto es para ${winner.name} con ${game.envidoPoints[winner.id]}. El equipo de ${winnerTeamName} gana ${pointsInPlay} punto(s).`);
              checkGameWinner(game);
          } else {
              game.envido.chants.push(response);
              game.envido.offeredBy = userId;
              game.envido.responseTurn = chantingPlayer.id;
              addLog(game, `${respondingPlayer.name} sube la apuesta: ${response.replace('-', ' ').toUpperCase()}.`);
          }
      } else if (game.truco.responseTurn === userId) {
          const chantingTeam = game.truco.offeredByTeam;
          const chantingTeamName = game.teams[chantingTeam].map(p => p.name).join(' y ');
          if (response === 'quiero') {
              game.truco.points = game.truco.level;
              game.truco.responseTurn = null;
              game.truco.lastChanter = userId;
              addLog(game, `${player.name} QUIERE.`);
          } else if (response === 'no-quiero') {
              const pointsWon = game.truco.level - 1;
              game.scores[chantingTeam] += pointsWon;
              addLog(game, `${player.name} NO QUIERE. El equipo de ${chantingTeamName} gana ${pointsWon} punto(s).`);
              checkGameWinner(game);
              if (game.status !== 'finished') {
                  setTimeout(() => {
                      activeGames[roomId] = startNewHand(game);
                      io.to(roomId).emit('update-game-state', activeGames[roomId]);
                  }, 2000);
              }
          } else {
              const chantMap = { 'retruco': 3, 'vale-cuatro': 4 };
              if (chantMap[response]) {
                  game.truco.level = chantMap[response];
                  game.truco.offeredByTeam = player.team;
                  game.truco.responseTurn = game.players.find(p => p.team !== player.team).id;
                  game.truco.lastChanter = userId;
                  addLog(game, `${player.name} canta ${response.toUpperCase()}.`);
              }
          }
      }
      io.to(roomId).emit('update-game-state', game);
  });

  socket.on('go-to-mazo', ({ roomId, userId }) => {
      const game = activeGames[roomId];
      if (!game) return;
      const player = game.players.find(p => p.id === userId);
      const opponentTeam = player.team === 'A' ? 'B' : 'A';
      const opponentTeamName = game.teams[opponentTeam].map(p => p.name).join(' y ');
      const pointsWon = game.truco.points;
      game.scores[opponentTeam] += pointsWon;
      addLog(game, `${player.name} se fue al mazo. El equipo de ${opponentTeamName} gana ${pointsWon} punto(s).`);
      checkGameWinner(game);
      if (game.status !== 'finished') {
          setTimeout(() => {
              activeGames[roomId] = startNewHand(game);
              io.to(roomId).emit('update-game-state', activeGames[roomId]);
          }, 2000);
      }
      io.to(roomId).emit('update-game-state', game);
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