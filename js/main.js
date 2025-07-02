import { GAME_CONSTANTS } from './config.js';
import { renderPlayerHand, renderIAHand, renderMesa, renderMarcador, addMessageToHistory, clearPlayedCards } from './ui.js';
import { iaElegirCarta, iaResponderCanto } from './ia.js';

// --- Estado global del juego ---
export let gameState = {
    playerName: 'Vos',
    playerHand: [],
    iaHand: [],
    deck: [],
    playedCards: [],
    playerScore: 0,
    iaScore: 0,
    puntosMax: 30,
    flor: false,
    manoPlayerId: 'player',
    currentRound: 1,
    turno: 'player',
    rondaGanada: [],
    envidoCantado: false,
    florCantada: false,
    trucoCantado: false,
    cantoActual: null,
    iaCantoActual: null,
    partidaTerminada: false
};

// --- Utilidades ---
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function createDeck() {
    let deck = [];
    for (let palo of GAME_CONSTANTS.PALOS) {
        for (let numero of GAME_CONSTANTS.CARTAS) {
            let valorTruco = getValorTruco(numero, palo);
            let valorEnvido = (numero >= 10) ? 0 : numero;
            deck.push({ numero, palo, valorTruco, valorEnvido, jugada: false });
        }
    }
    return deck;
}

function getValorTruco(numero, palo) {
    for (let [n, p, v] of GAME_CONSTANTS.CARTA_VALOR_TRUCO) {
        if (n === numero && (p === '' || p === palo)) return v;
    }
    // Si no está en la tabla, valor bajo
    return 0;
}

function dealCards(deck, cantidad) {
    let playerHand = deck.slice(0, cantidad).map(c => ({ ...c }));
    let iaHand = deck.slice(cantidad, cantidad * 2).map(c => ({ ...c }));
    let resto = deck.slice(cantidad * 2);
    return { playerHand, iaHand, deck: resto };
}

export function calcularEnvido(mano) {
    let palos = {};
    mano.forEach(carta => {
        if (!palos[carta.palo]) palos[carta.palo] = [];
        palos[carta.palo].push(carta.valorEnvido);
    });
    let max = 0;
    for (let palo in palos) {
        if (palos[palo].length >= 2) {
            let valores = palos[palo].sort((a, b) => b - a);
            max = Math.max(max, valores[0] + valores[1] + 20);
        } else {
            max = Math.max(max, palos[palo][0]);
        }
    }
    return max;
}

// --- Pantalla de inicio ---
function showStartScreen() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
}

// --- Pantalla de juego ---
function showGameScreen(config) {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    gameState.playerName = config.playerName;
    gameState.puntosMax = config.puntosMax;
    gameState.flor = config.flor;
    initializeGame();
}

// --- Inicializar nueva mano ---
function initializeGame() {
    gameState.deck = shuffleDeck(createDeck());
    const { playerHand, iaHand, deck } = dealCards(gameState.deck, GAME_CONSTANTS.CARDS_PER_PLAYER);
    gameState.playerHand = playerHand;
    gameState.iaHand = iaHand;
    gameState.deck = deck;
    gameState.playedCards = [];
    gameState.currentRound = 1;
    gameState.turno = gameState.manoPlayerId;
    gameState.rondaGanada = [];
    gameState.envidoCantado = false;
    gameState.florCantada = false;
    gameState.trucoCantado = false;
    gameState.cantoActual = null;
    gameState.iaCantoActual = null;
    gameState.partidaTerminada = false;

    renderPlayerHand(gameState.playerHand, 'player-hand', true, onPlayerCardClick);
    renderIAHand(GAME_CONSTANTS.CARDS_PER_PLAYER, 'ia-hand');
    clearPlayedCards();
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    addMessageToHistory('Cartas repartidas.', 'system');
    addMessageToHistory(`Ronda 1. Mano: ${gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella'}.`, 'system');
    updateCantosUI();
    if (gameState.manoPlayerId === 'player') {
        addMessageToHistory('¡Tu turno!', 'system');
    } else {
        setTimeout(iaTurno, 1200);
    }
}

// --- Lógica de jugada de carta ---
function onPlayerCardClick(idx) {
    if (gameState.turno !== 'player' || gameState.partidaTerminada) return;
    let carta = gameState.playerHand[idx];
    if (carta.jugada) return;
    carta.jugada = true;
    gameState.playedCards.push({ jugador: gameState.playerName, carta });
    renderPlayerHand(gameState.playerHand, 'player-hand', true, onPlayerCardClick);
    renderMesa(gameState.playedCards);
    addMessageToHistory(`${gameState.playerName} jugó ${carta.numero} ${carta.palo}`, 'player');
    gameState.turno = 'ia';
    checkFinRonda();
    if (!gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function iaTurno() {
    if (gameState.turno !== 'ia' || gameState.partidaTerminada) return;
    let idx = iaElegirCarta(gameState.iaHand, gameState.playedCards);
    let carta = gameState.iaHand[idx];
    carta.jugada = true;
    gameState.playedCards.push({ jugador: 'TrucoEstrella', carta });
    renderIAHand(GAME_CONSTANTS.CARDS_PER_PLAYER, 'ia-hand');
    renderMesa(gameState.playedCards);
    addMessageToHistory(`TrucoEstrella jugó ${carta.numero} ${carta.palo}`, 'ia');
    gameState.turno = 'player';
    checkFinRonda();
}

function checkFinRonda() {
    let jugadasRonda = gameState.playedCards.length % 2 === 0;
    if (jugadasRonda) {
        // Determinar ganador de la ronda
        let idx = gameState.playedCards.length - 2;
        let carta1 = gameState.playedCards[idx].carta;
        let carta2 = gameState.playedCards[idx + 1].carta;
        let ganador = null;
        if (carta1.valorTruco > carta2.valorTruco) ganador = gameState.playedCards[idx].jugador;
        else if (carta2.valorTruco > carta1.valorTruco) ganador = gameState.playedCards[idx + 1].jugador;
        else ganador = 'parda';
        gameState.rondaGanada.push(ganador);
        addMessageToHistory(`Ganador de la ronda: ${ganador === 'parda' ? 'Empate' : ganador}`, 'system');
        if (gameState.rondaGanada.length === 2) {
            // Determinar ganador de la mano
            let manoGanador = determinarGanadorMano();
            sumarPuntosMano(manoGanador);
        }
    }
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
}

function determinarGanadorMano() {
    let [r1, r2] = gameState.rondaGanada;
    if (r1 === r2 && r1 !== 'parda') return r1;
    if (r1 !== 'parda' && r2 === 'parda') return r1;
    if (r2 !== 'parda' && r1 === 'parda') return r2;
    return gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella';
}

function sumarPuntosMano(ganador) {
    if (ganador === gameState.playerName) gameState.playerScore += 1;
    else if (ganador === 'TrucoEstrella') gameState.iaScore += 1;
    addMessageToHistory(`Punto para ${ganador}`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    if (gameState.playerScore >= gameState.puntosMax || gameState.iaScore >= gameState.puntosMax) {
        gameState.partidaTerminada = true;
        showFinPartidaModal(gameState.playerScore >= gameState.puntosMax ? gameState.playerName : 'TrucoEstrella');
    } else {
        setTimeout(initializeGame, 2000);
    }
}

// --- Cantos ---
function updateCantosUI() {
    document.querySelectorAll('.game-canto-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
    if (gameState.envidoCantado) {
        document.querySelectorAll('.game-canto-btn[data-canto="Envido"],.game-canto-btn[data-canto="Real Envido"],.game-canto-btn[data-canto="Falta Envido"]').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        });
    }
    if (gameState.trucoCantado) {
        document.querySelectorAll('.game-canto-btn[data-canto="Truco"],.game-canto-btn[data-canto="ReTruco"],.game-canto-btn[data-canto="Vale Cuatro"]').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        });
    }
}

function handleCanto(canto) {
    if (gameState.partidaTerminada) return;
    gameState.cantoActual = canto;
    addMessageToHistory(`${gameState.playerName} canta ${canto.toUpperCase()}!`, 'player');
    document.getElementById('canto-actual').textContent = canto.toUpperCase() + '!';
    if (['Envido', 'Real Envido', 'Falta Envido'].includes(canto)) {
        gameState.envidoCantado = true;
        showEnvidoPopup();
    }
    if (['Truco', 'ReTruco', 'Vale Cuatro'].includes(canto)) {
        gameState.trucoCantado = true;
        let respuesta = iaResponderCanto(canto, gameState);
        setTimeout(() => {
            addMessageToHistory(`TrucoEstrella responde: ${respuesta}`, 'ia');
            document.getElementById('canto-ia').textContent = respuesta;
            if (respuesta === 'No Quiero') {
                gameState.playerScore += 1;
                addMessageToHistory('¡Sumás 1 punto!', 'system');
                renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
                setTimeout(initializeGame, 2000);
            }
        }, 1000);
    }
    updateCantosUI();
}

// --- Popup Envido/Flor ---
function showEnvidoPopup() {
    const playerEnvido = calcularEnvido(gameState.playerHand);
    const iaEnvido = calcularEnvido(gameState.iaHand);
    let winner = playerEnvido > iaEnvido ? gameState.playerName : 'TrucoEstrella';
    let html = `
        <div><b>${gameState.playerName}:</b> ${playerEnvido} puntos</div>
        <div><b>TrucoEstrella:</b> ${iaEnvido} puntos</div>
        <div class="mt-2 font-bold text-green-700">¡Gana ${winner}!</div>
    `;
    document.getElementById('popup-envido-title').textContent = 'Resultado Envido';
    document.getElementById('popup-envido-content').innerHTML = html;
    document.getElementById('popup-envido').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('popup-envido').classList.add('hidden');
        if (winner === gameState.playerName) gameState.playerScore += 2;
        else gameState.iaScore += 2;
        renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
        addMessageToHistory(`Envido: ${gameState.playerName} ${playerEnvido} - TrucoEstrella ${iaEnvido}. Gana ${winner}`, 'system');
        setTimeout(initializeGame, 2000);
    }, 3000);
}

// --- Modal Fin de Partida ---
function showFinPartidaModal(winner) {
    document.getElementById('modal-fin-partida-content').textContent = `Ganador: ${winner}`;
    document.getElementById('modal-fin-partida').classList.remove('hidden');
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('startGameBtn').addEventListener('click', () => {
        const config = {
            playerName: document.getElementById('playerName').value || 'Vos',
            puntosMax: parseInt(document.getElementById('gamePoints').value),
            flor: document.getElementById('florRule').checked
        };
        showGameScreen(config);
    });
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché y reiniciar el juego?')) {
            localStorage.clear();
            location.reload();
        }
    });
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        showStartScreen();
    });
    document.getElementById('btn-revancha').addEventListener('click', () => {
        document.getElementById('modal-fin-partida').classList.add('hidden');
        initializeGame();
    });
    document.querySelectorAll('.game-canto-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const canto = btn.getAttribute('data-canto');
            handleCanto(canto);
        });
    });
    document.getElementById('btn-mazo').addEventListener('click', () => {
        addMessageToHistory(`${gameState.playerName} se fue al mazo.`, 'player');
        gameState.iaScore += 1;
        renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
        setTimeout(initializeGame, 2000);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    showStartScreen();
    setupEventListeners();
});