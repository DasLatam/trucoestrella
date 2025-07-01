import * as CONFIG from './config.js';
import * as UI from './ui.js';
import { TrucoEstrella as IA } from './ia.js';

// --- Estado del Juego ---
let gameState = {};

function createInitialGameState() {
    return {
        player: { id: CONFIG.PLAYERS.PLAYER, name: "Jugador", score: 0, hand: [], hasFlor: false },
        ia: { id: CONFIG.PLAYERS.IA, name: "TrucoEstrella", score: 0, hand: [], hasFlor: false },
        deck: [],
        table: { player: [], ia: [] },
        turn: null,          // A quién le toca jugar la carta
        mano: null,          // Quién es mano en la ronda
        roundNumber: 1,      // 1, 2, or 3
        roundHistory: [],    // { winner: 'player'/'ia'/'parda' }
        maxPoints: 15,
        withFlor: false,
        gameIsOver: false,
        isLocked: false,     // Bloquea acciones del jugador
        cantoState: {
            active: false,      // Hay un canto activo esperando respuesta?
            turn: null,         // A quién le toca responder
            truco: { level: null, singer: null, points: 1 },
            envido: { sequence: [], singer: null, points: 0, closed: false },
            flor: { level: null, singer: null, points: 0, closed: false, active: false }
        }
    };
}


// --- Lógica Principal del Juego ---
function startGame(settings) {
    gameState = createInitialGameState();
    gameState.player.name = settings.playerName || "Jugador";
    gameState.maxPoints = settings.maxPoints;
    gameState.withFlor = settings.withFlor;
    gameState.mano = [CONFIG.PLAYERS.PLAYER, CONFIG.PLAYERS.IA][Math.floor(Math.random() * 2)];

    UI.updatePlayerName(gameState.player.name);
    UI.updateScoreboard(0, 0, gameState.maxPoints);
    document.getElementById('history-log').innerHTML = '';
    UI.hideEndGameModal();

    UI.logToHistory(`La partida comienza a ${gameState.maxPoints} puntos.`, 'game');
    if (gameState.withFlor) UI.logToHistory('Se juega con flor.', 'game');

    UI.showScreen('game-screen');
    newRound();
}

function newRound() {
    // Resetear estado de la ronda
    gameState.isLocked = true;
    gameState.cantoState = createInitialGameState().cantoState;
    gameState.table = { player: [], ia: [] };
    gameState.roundNumber = 1;
    gameState.roundHistory = [];
    gameState.gameIsOver = false;

    // Cambiar de mano
    gameState.mano = (gameState.mano === CONFIG.PLAYERS.PLAYER) ? CONFIG.PLAYERS.IA : CONFIG.PLAYERS.PLAYER;
    gameState.turn = gameState.mano;

    // Crear y barajar mazo
    gameState.deck = createDeck();
    shuffleDeck(gameState.deck);

    // Repartir cartas
    gameState.player.hand = gameState.deck.splice(0, 3);
    gameState.ia.hand = gameState.deck.splice(0, 3);

    IA.newHand(gameState.ia.hand);
    const playerEnvido = IA.getEnvidoPoints.call({_hand: gameState.player.hand});
    const iaEnvido = IA.getEnvidoPoints();
    gameState.player.hasFlor = playerEnvido.isFlor;
    gameState.ia.hasFlor = iaEnvido.isFlor;

    // Actualizar UI
    UI.clearTable();
    UI.drawHands(gameState.player.hand, gameState.ia.hand);
    UI.logToHistory('----- Nueva Ronda -----', 'game');
    UI.logToHistory(`${gameState.mano === 'player' ? gameState.player.name : 'TrucoEstrella'} es mano.`, 'game');
    
    // Gestión de flor al inicio
    if (gameState.withFlor) {
        handleInitialFlor();
    } else {
        startTurn();
    }
}

async function handleInitialFlor() {
    const playerHasFlor = gameState.player.hasFlor;
    const iaHasFlor = gameState.ia.hasFlor;

    if (playerHasFlor && iaHasFlor) {
        UI.logToHistory("Ambos jugadores tienen flor.", 'game');
        await handleCanto('FLOR', gameState.mano, true); // Inicia el canto de flor
    } else if (playerHasFlor) {
        await handleCanto('FLOR', CONFIG.PLAYERS.PLAYER, true);
    } else if (iaHasFlor) {
        await handleCanto('FLOR', CONFIG.PLAYERS.IA, true);
    } else {
        startTurn(); // Nadie tiene flor
    }
}

async function startTurn() {
    gameState.isLocked = false;
    UI.updateActionButtons(gameState);

    // Canto inicial de la IA si es mano y no hay flor
    if (gameState.turn === CONFIG.PLAYERS.IA) {
        const iaCanto = IA.decideInitialCanto({isMano: true, withFlor: gameState.withFlor});
        if (iaCanto) {
            await sleep(1000);
            await handleCanto(iaCanto, CONFIG.PLAYERS.IA);
        } else {
            await iaPlayTurn();
        }
    }
}

function createDeck() {
    return [...CONFIG.CARD_HIERARCHY];
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

async function playerPlayCard(card) {
    if (gameState.isLocked || gameState.turn !== CONFIG.PLAYERS.PLAYER || gameState.cantoState.active) return;
    gameState.isLocked = true;

    // Lógica de jugar la carta
    const cardIndex = gameState.player.hand.findIndex(c => c.name === card.name);
    gameState.player.hand.splice(cardIndex, 1);
    gameState.table.player[gameState.roundNumber - 1] = card;

    // Actualizar UI
    document.querySelector(`#player-hand .card[data-card='${JSON.stringify(card)}']`).remove();
    UI.playCardToTable(card, CONFIG.PLAYERS.PLAYER, gameState.roundNumber);
    UI.logToHistory(`${gameState.player.name} juega: ${card.name} ${card.suit}`, 'log-player');

    // Cerrar posibilidad de envido/flor
    gameState.cantoState.envido.closed = true;
    gameState.cantoState.flor.closed = true;
    
    // Cambiar turno a la IA
    gameState.turn = CONFIG.PLAYERS.IA;
    await iaPlayTurn();
}

async function iaPlayTurn() {
    if (gameState.gameIsOver) return;

    UI.updateActionButtons(gameState); // Deshabilitar botones del jugador
    await sleep(1200);

    // Decidir si cantar truco antes de jugar
    if (!gameState.cantoState.truco.level) {
        const trucoCanto = IA.decideTruco({roundHistory: gameState.roundHistory, isMano: gameState.mano === 'ia'});
        if (trucoCanto) {
            await handleCanto(trucoCanto, CONFIG.PLAYERS.IA);
            return; // Esperar respuesta del jugador
        }
    }

    const cardToPlay = IA.playCard({
        table: gameState.table,
        roundNumber: gameState.roundNumber,
        roundHistory: gameState.roundHistory
    });

    gameState.table.ia[gameState.roundNumber - 1] = cardToPlay;
    UI.playCardToTable(cardToPlay, CONFIG.PLAYERS.IA, gameState.roundNumber);
    UI.logToHistory(`TrucoEstrella juega: ${cardToPlay.name} ${cardToPlay.suit}`, 'log-ia');

    // Cerrar posibilidad de envido/flor
    gameState.cantoState.envido.closed = true;
    gameState.cantoState.flor.closed = true;
    
    // Cambiar turno al jugador
    gameState.turn = CONFIG.PLAYERS.PLAYER;

    // Si ambos jugaron, resolver la mano
    if (gameState.table.player[gameState.roundNumber - 1] && gameState.table.ia[gameState.roundNumber - 1]) {
        await resolveHand();
    } else {
        gameState.isLocked = false;
        UI.updateActionButtons(gameState);
    }
}

async function resolveHand() {
    const playerCard = gameState.table.player[gameState.roundNumber - 1];
    const iaCard = gameState.table.ia[gameState.roundNumber - 1];
    let winner;

    if (playerCard.rank > iaCard.rank) {
        winner = CONFIG.PLAYERS.PLAYER;
    } else if (iaCard.rank > playerCard.rank) {
        winner = CONFIG.PLAYERS.IA;
    } else {
        winner = 'parda';
    }
    
    gameState.roundHistory.push({ winner });

    await sleep(500);
    if(winner !== 'parda') {
       UI.highlightWinnerCard(winner, gameState.roundNumber);
       UI.logToHistory(`Gana la ${gameState.roundNumber}ª mano: ${winner === 'player' ? gameState.player.name : 'TrucoEstrella'}.`, 'game');
    } else {
       UI.logToHistory(`La ${gameState.roundNumber}ª mano es parda.`, 'game');
    }
   
    // El ganador de la mano es mano en la siguiente vuelta
    if (winner !== 'parda') {
        gameState.turn = winner;
    } else {
        // En caso de parda, la mano sigue siendo del que empezó la ronda
        gameState.turn = gameState.mano;
    }

    await sleep(1500);
    
    const roundWinner = checkRoundWinner();
    if (roundWinner) {
        awardPoints(roundWinner, gameState.cantoState.truco.points);
        if(!gameState.gameIsOver) newRound();
    } else {
        gameState.roundNumber++;
        if (gameState.turn === CONFIG.PLAYERS.IA) {
            await iaPlayTurn();
        } else {
            gameState.isLocked = false;
            UI.updateActionButtons(gameState);
        }
    }
}

function checkRoundWinner() {
    const history = gameState.roundHistory;
    const p1 = history[0]?.winner;
    const p2 = history[1]?.winner;
    const p3 = history[2]?.winner;

    // Gana con 2 manos
    const playerWins = history.filter(h => h.winner === 'player').length;
    const iaWins = history.filter(h => h.winner === 'ia').length;
    if(playerWins === 2) return CONFIG.PLAYERS.PLAYER;
    if(iaWins === 2) return CONFIG.PLAYERS.IA;

    // Reglas de empate (parda)
    if (p1 === 'parda') {
        // Si la 1ra es parda, el ganador de la 2da gana la ronda.
        if (p2 && p2 !== 'parda') return p2;
        // Si 1ra y 2da son pardas, el ganador de la 3ra gana
        if (p2 === 'parda' && p3 && p3 !== 'parda') return p3;
    }
    // Si la 2da es parda, gana quien ganó la 1ra
    if (p2 === 'parda' && p1 && p1 !== 'parda') return p1;
    // Si la 3ra es parda, gana quien ganó la 1ra
    if (p3 === 'parda' && p1 && p1 !== 'parda') return p1;

    // Si las 3 son pardas, gana el mano de la ronda
    if (playerWins === 0 && iaWins === 0 && history.length === 3) {
        return gameState.mano;
    }
    
    // Ronda no terminada
    if(history.length < 3) return null;

    return null; // Aún no hay ganador de la ronda
}

function awardPoints(winner, points) {
    const winnerName = winner === 'player' ? gameState.player.name : gameState.ia.name;
    gameState[winner].score += points;
    UI.logToHistory(`${winnerName} suma ${points} punto(s).`, 'game');
    UI.updateScoreboard(gameState.player.score, gameState.ia.score, gameState.maxPoints);
    checkGameWinner();
}

function checkGameWinner() {
    if (gameState.player.score >= gameState.maxPoints) {
        endGame(CONFIG.PLAYERS.PLAYER);
    } else if (gameState.ia.score >= gameState.maxPoints) {
        endGame(CONFIG.PLAYERS.IA);
    }
}

function endGame(winner) {
    gameState.gameIsOver = true;
    gameState.isLocked = true;
    const winnerName = winner === 'player' ? gameState.player.name : gameState.ia.name;
    UI.showEndGameModal(`¡Partida terminada!`, `El ganador es ${winnerName} con ${gameState[winner].score} puntos.`);
}

// --- Lógica de Cantos ---
async function handleCanto(canto, singer, isMandatoryFlor = false) {
    if (gameState.isLocked && !isMandatoryFlor) return;
    gameState.isLocked = true;
    gameState.cantoState.active = true;
    gameState.cantoState.turn = (singer === 'player') ? 'ia' : 'player';

    // Manejo especial para flor/contraflor
    if (canto.startsWith('FLOR') || canto.startsWith('CONTRAFLOR')) {
        await handleFlorCanto(canto, singer);
        return;
    }
    // Manejo para el resto de los cantos (Truco, Envido)
    const [type] = canto.split('_'); // TRUCO, ENVIDO, REAL, FALTA
    if (type === 'TRUCO' || type === 'RETRUCO' || type === 'VALE4') {
        await handleTrucoCanto(canto, singer);
    } else {
        await handleEnvidoCanto(canto, singer);
    }
}

async function handleTrucoCanto(canto, singer) {
    const singerName = singer === 'player' ? gameState.player.name : 'TrucoEstrella';
    UI.logToHistory(`${singerName} canta: ¡${canto.replace('_', ' ')}!`, 'log-canto');
    gameState.cantoState.truco.level = canto;
    gameState.cantoState.truco.singer = singer;
    gameState.isLocked = false;
    UI.updateActionButtons(gameState);
    
    if (gameState.cantoState.turn === 'ia') {
        await sleep(1200);
        const response = IA.decideTrucoResponse({level: canto}, {});
        await resolveTrucoResponse(response, 'ia');
    }
}

async function handleEnvidoCanto(canto, singer) {
    const singerName = singer === 'player' ? gameState.player.name : 'TrucoEstrella';
    const cantoText = canto.replace('_', ' ').replace('ENVIDO', 'Envido');
    UI.logToHistory(`${singerName} canta: ¡${cantoText}!`, 'log-canto');

    gameState.cantoState.envido.sequence.push(canto);
    gameState.cantoState.envido.singer = singer;

    UI.updateActionButtons(gameState);

    if (gameState.cantoState.turn === 'ia') {
        await sleep(1200);
        const response = IA.decideEnvidoResponse({level: canto}, {withFlor: gameState.withFlor});
        await resolveEnvidoResponse(response, 'ia');
    }
}

async function handleFlorCanto(canto, singer) {
     const singerName = singer === 'player' ? gameState.player.name : 'TrucoEstrella';
     const cantoText = canto.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
     UI.logToHistory(`${singerName} canta: ¡${cantoText}!`, 'log-canto');

     gameState.cantoState.flor.level = canto;
     gameState.cantoState.flor.singer = singer;
     gameState.cantoState.flor.active = true;
     gameState.cantoState.envido.closed = true; // Flor anula envido
     UI.updateActionButtons(gameState);

     if(gameState.cantoState.turn === 'ia') {
         await sleep(1200);
         const response = IA.decideFlorResponse({level: canto});
         await resolveFlorResponse(response, 'ia');
     } else {
         gameState.isLocked = false;
     }
}

async function playerRespondToCanto(response) {
    const activeCanto = getActiveCanto();
    if (!activeCanto) return;

    if (activeCanto.type === 'truco') {
        await resolveTrucoResponse(response, 'player');
    } else if (activeCanto.type === 'envido') {
        await resolveEnvidoResponse(response, 'player');
    } else if (activeCanto.type === 'flor') {
        await resolveFlorResponse(response, 'player');
    }
}

function getActiveCanto() {
    if (gameState.cantoState.flor.level) return {type: 'flor', ...gameState.cantoState.flor};
    if (gameState.cantoState.envido.sequence.length > 0) return {type: 'envido', ...gameState.cantoState.envido};
    if (gameState.cantoState.truco.level) return {type: 'truco', ...gameState.cantoState.truco};
    return null;
}

// --- Resolución de Respuestas a Cantos ---
async function resolveTrucoResponse(response, responder) {
    const responderName = responder === 'player' ? gameState.player.name : 'TrucoEstrella';
    UI.hideCantoModal();
    gameState.isLocked = true;
    
    if (response === 'QUIERO') {
        UI.logToHistory(`${responderName} dice: ¡Quiero!`, 'log-canto');
        const level = gameState.cantoState.truco.level;
        if(level === 'TRUCO') gameState.cantoState.truco.points = CONFIG.GAME_POINTS.TRUCO;
        if(level === 'RETRUCO') gameState.cantoState.truco.points = CONFIG.GAME_POINTS.RETRUCO;
        if(level === 'VALE_CUATRO') gameState.cantoState.truco.points = CONFIG.GAME_POINTS.VALE_CUATRO;

        gameState.cantoState.active = false;
        gameState.turn = gameState.mano; // Vuelve a jugar el mano de la ronda
        
        // Continuar el juego
        if (gameState.turn === 'ia' && !gameState.table.ia[gameState.roundNumber - 1]) {
            await iaPlayTurn();
        } else {
             gameState.isLocked = false;
             UI.updateActionButtons(gameState);
        }

    } else if (response === 'NO_QUIERO') {
        UI.logToHistory(`${responderName} dice: No quiero.`, 'log-canto');
        const level = gameState.cantoState.truco.level;
        let points = 0;
        if (level === 'TRUCO') points = CONFIG.GAME_POINTS.NO_QUIERO_TRUCO;
        if (level === 'RETRUCO') points = CONFIG.GAME_POINTS.NO_QUIERO_RETRUCO;
        if (level === 'VALE_CUATRO') points = CONFIG.GAME_POINTS.NO_QUIERO_VALE4;

        const winner = (responder === 'player') ? 'ia' : 'player';
        awardPoints(winner, points);
        if(!gameState.gameIsOver) newRound();

    } else { // Es un re-canto (RETRUCO, VALE_CUATRO)
        await handleCanto(response, responder);
    }
}

async function resolveEnvidoResponse(response, responder) {
    const responderName = responder === 'player' ? gameState.player.name : 'TrucoEstrella';
    UI.hideCantoModal();
    
    if (response === 'QUIERO') {
        UI.logToHistory(`${responderName} dice: ¡Quiero!`, 'log-canto');
        resolveEnvidoPoints();
    } else if (response === 'NO_QUIERO') {
        UI.logToHistory(`${responderName} dice: No quiero.`, 'log-canto');
        // Calcular puntos del no quiero
        const lastCanto = gameState.cantoState.envido.sequence.slice(-1)[0];
        let points = CONFIG.GAME_POINTS[`NO_QUIERO_${lastCanto}`] || 1;
        if (gameState.cantoState.envido.sequence.length > 1) { // Caso envido-envido, etc.
             points = (CONFIG.GAME_POINTS[`NO_QUIERO_${gameState.cantoState.envido.sequence.join('_')}`] || points);
        }
        const winner = (responder === 'player') ? 'ia' : 'player';
        awardPoints(winner, points);
    } else if (response === 'FLOR') {
        // La IA/jugador responde con Flor a un envido
        await handleCanto('FLOR', responder);
        return;
    }
    else { // Es un re-canto (REAL_ENVIDO, FALTA_ENVIDO)
        await handleEnvidoCanto(response, responder);
        return;
    }
    
    // El envido se resolvió, continuar con el truco si lo hubo
    gameState.cantoState.envido.closed = true;
    gameState.cantoState.active = false;
    gameState.isLocked = false;
    UI.updateActionButtons(gameState);

    if (!gameState.cantoState.truco.level) { // Si no había un truco pendiente
        if (gameState.turn === 'ia') await iaPlayTurn();
    } else { // Si había un truco, ahora el otro debe responder
        gameState.cantoState.active = true;
        gameState.turn = gameState.cantoState.truco.singer === 'player' ? 'ia' : 'player';
        UI.logToHistory(`Se resuelve el Envido. Continúa el Truco...`, 'game');
        if (gameState.turn === 'ia') {
            await sleep(1200);
            const trucoResponse = IA.decideTrucoResponse({level: gameState.cantoState.truco.level}, {});
            await resolveTrucoResponse(trucoResponse, 'ia');
        }
    }
}

async function resolveFlorResponse(response, responder) {
    const responderName = responder === 'player' ? gameState.player.name : 'TrucoEstrella';
    UI.hideCantoModal();
    
    if (response === 'QUIERO') {
        UI.logToHistory(`${responderName} dice: ¡Con flor me achico!`, 'log-canto');
        resolveFlorPoints();
    } else if(response === 'NO_QUIERO') { // Esto no debería pasar en la lógica de IA, pero por si acaso
         const winner = (responder === 'player') ? 'ia' : 'player';
         const points = gameState.cantoState.flor.level === 'CONTRAFLOR' ? CONFIG.GAME_POINTS.NO_QUIERO_CONTRAFLOR : CONFIG.GAME_POINTS.FLOR;
         awardPoints(winner, points);
    } else { // Re-canto: Contraflor, etc.
        await handleCanto(response, responder);
        return;
    }
    
    gameState.cantoState.flor.closed = true;
    gameState.cantoState.active = false;
    gameState.isLocked = false;
    UI.updateActionButtons(gameState);
    
    // Continuar la ronda
    if (gameState.turn === 'ia') await startTurn();
}


function resolveEnvidoPoints() {
    const playerEnvido = IA.getEnvidoPoints.call({_hand: gameState.player.hand}).points;
    const iaEnvido = IA.getEnvidoPoints().points;
    
    UI.logToHistory(`${gameState.player.name} tiene: ${playerEnvido} de envido.`, 'log-player');
    UI.logToHistory(`TrucoEstrella tiene: ${iaEnvido} de envido.`, 'log-ia');

    let winner, loser, winnerPoints;
    if (playerEnvido > iaEnvido) {
        winner = 'player';
        winnerPoints = playerEnvido;
    } else if (iaEnvido > playerEnvido) {
        winner = 'ia';
        winnerPoints = iaEnvido;
    } else {
        winner = gameState.mano; // El mano gana en caso de empate
        winnerPoints = playerEnvido;
    }
    loser = winner === 'player' ? 'ia' : 'player';
    
    // Calcular puntos a sumar
    const sequence = gameState.cantoState.envido.sequence;
    let totalPoints = 0;
    if (sequence.includes('FALTA_ENVIDO')) {
        totalPoints = CONFIG.GAME_POINTS.FALTA_ENVIDO(gameState[loser].score, gameState.maxPoints);
    } else {
        const key = sequence.join('_');
        totalPoints = CONFIG.GAME_POINTS[key] || 0;
        if(totalPoints === 0){ // Si no hay una key directa, sumar los cantos
            if(sequence.includes('REAL_ENVIDO')) totalPoints += 3;
            if(sequence.includes('ENVIDO')) totalPoints += 2;
        }
    }
    
    awardPoints(winner, totalPoints);
}

function resolveFlorPoints() {
    const playerFlor = IA.getEnvidoPoints.call({_hand: gameState.player.hand, _hasFlor: gameState.player.hasFlor});
    const iaFlor = IA.getEnvidoPoints.call({_hand: gameState.ia.hand, _hasFlor: gameState.ia.hasFlor});

    UI.logToHistory(`${gameState.player.name} muestra su flor: ${playerFlor.points} puntos.`, 'log-player');
    UI.logToHistory(`TrucoEstrella muestra su flor: ${iaFlor.points} puntos.`, 'log-ia');

    let winner, loser;
    if(playerFlor.points > iaFlor.points) winner = 'player';
    else if(iaFlor.points > playerFlor.points) winner = 'ia';
    else winner = gameState.mano;
    loser = winner === 'player' ? 'ia' : 'player';

    let points = 0;
    const level = gameState.cantoState.flor.level;
    if (level === 'CONTRAFLOR_AL_RESTO') {
        points = CONFIG.GAME_POINTS.CONTRAFLOR_AL_RESTO(gameState[loser].score, gameState.maxPoints);
    } else if (level === 'CONTRAFLOR') {
        points = CONFIG.GAME_POINTS.CONTRAFLOR;
    } else { // FLOR
        points = CONFIG.GAME_POINTS.FLOR;
        if (gameState.player.hasFlor) points += 3;
        if (gameState.ia.hasFlor) points += 3;
        points -=3; // Se descuenta el 'base'
    }

    awardPoints(winner, points);
}


// --- Utilidades y Eventos ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setupEventListeners() {
    // Pantalla de inicio
    document.getElementById('start-game-btn').addEventListener('click', () => {
        const settings = {
            playerName: document.getElementById('player-name').value,
            maxPoints: parseInt(document.querySelector('input[name="game-points"]:checked').value),
            withFlor: document.getElementById('with-flor').checked
        };
        startGame(settings);
    });
    document.getElementById('clear-cache-btn').addEventListener('click', () => location.reload(true));

    // Pantalla de juego
    document.getElementById('back-to-menu-btn').addEventListener('click', () => location.reload());
    document.getElementById('player-hand').addEventListener('click', (e) => {
        const cardEl = e.target.closest('.card');
        if (cardEl && cardEl.dataset.card) {
            playerPlayCard(JSON.parse(cardEl.dataset.card));
        }
    });
    
    // Botones de canto
    document.getElementById('truco-btn').addEventListener('click', () => handleCanto('TRUCO', 'player'));
    document.getElementById('retruco-btn').addEventListener('click', () => handleCanto('RETRUCO', 'player'));
    document.getElementById('vale4-btn').addEventListener('click', () => handleCanto('VALE_CUATRO', 'player'));
    
    document.getElementById('envido-btn').addEventListener('click', () => handleCanto('ENVIDO', 'player'));
    document.getElementById('real-envido-btn').addEventListener('click', () => handleCanto('REAL_ENVIDO', 'player'));
    document.getElementById('falta-envido-btn').addEventListener('click', () => handleCanto('FALTA_ENVIDO', 'player'));

    document.getElementById('flor-btn').addEventListener('click', () => handleCanto('FLOR', 'player'));
    document.getElementById('contraflor-btn').addEventListener('click', () => handleCanto('CONTRAFLOR', 'player'));
    document.getElementById('contraflor-resto-btn').addEventListener('click', () => handleCanto('CONTRAFLOR_AL_RESTO', 'player'));

    document.getElementById('mazo-btn').addEventListener('click', () => {
        if(gameState.isLocked) return;
        UI.logToHistory(`${gameState.player.name} se fue al mazo.`, 'log-player');
        // El oponente gana los puntos en juego (mínimo 1)
        const points = gameState.cantoState.truco.points || 1;
        awardPoints('ia', points);
        if(!gameState.gameIsOver) newRound();
    });

    // Modales
    document.getElementById('revancha-btn').addEventListener('click', () => {
        const settings = {
            playerName: gameState.player.name,
            maxPoints: gameState.maxPoints,
            withFlor: gameState.withFlor
        };
        startGame(settings);
    });
    document.getElementById('end-game-menu-btn').addEventListener('click', () => location.reload());
    
    // Modal de Canto (Diálogo) - Respuestas del jugador
    document.getElementById('canto-modal').addEventListener('click', async e => {
        if (e.target.tagName !== 'BUTTON' || gameState.turn !== 'player') return;
        
        gameState.isLocked = true;
        const response = e.target.dataset.value;

        const { truco, envido, flor } = gameState.cantoState;

        if(flor.active && flor.singer === 'ia') await resolveFlorResponse(response, 'player');
        else if (envido.sequence.length > 0 && envido.singer === 'ia' && !envido.closed) await resolveEnvidoResponse(response, 'player');
        else if(truco.level && truco.singer === 'ia') await resolveTrucoResponse(response, 'player');
    });

    // Delegación de eventos para la respuesta del jugador a un canto de la IA
    document.getElementById('actions-column').addEventListener('click', async e => {
        if (!e.target.classList.contains('canto-btn') || e.target.disabled) return;
        if (!gameState.cantoState.active || gameState.turn !== 'player') return;

        const canto = e.target.id.replace('-btn', '').toUpperCase();
        
        // El jugador responde a un canto con otro canto
        if(canto.includes('TRUCO') && gameState.cantoState.truco.level) await playerRespondToCanto(canto);
        if(canto.includes('ENVIDO') && gameState.cantoState.envido.sequence.length > 0) await playerRespondToCanto(canto);
        if(canto.includes('FLOR') && gameState.cantoState.flor.level) await playerRespondToCanto(canto);
    });
}

function init() {
    setupEventListeners();
    UI.showScreen('start-screen');
}

// Iniciar el juego cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);