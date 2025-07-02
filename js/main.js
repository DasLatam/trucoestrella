import { GAME_CONSTANTS } from './config.js';
import { renderPlayerHand, renderIAHand, renderMesaRondas, renderMarcador, addMessageToHistory, renderCantoBotonera } from './ui.js';
import { iaElegirCarta, iaResponderCanto, iaCantarCanto } from './ia.js';

// --- Estado global del juego ---
export let gameState = {
    playerName: 'Jugador 1',
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
    partidaTerminada: false,
    rondaActual: 1,
    cantoPendiente: null, // { tipo, quien, estado, historial, opciones }
    esperandoRespuesta: false,
    quienDebeResponder: null,
    rondaEmpieza: 'player'
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

function tieneFlor(mano) {
    return mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo;
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
    gameState.playerName = config.playerName || 'Jugador 1';
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
    gameState.rondaActual = 1;
    gameState.cantoPendiente = null;
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.rondaEmpieza = gameState.manoPlayerId;

    renderPlayerHand(gameState.playerHand, 'mesa-player', true, onPlayerCardClick);
    renderIAHand(gameState.iaHand, 'mesa-ia');
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    addMessageToHistory('Cartas repartidas.', 'system');
    addMessageToHistory(`Primera ronda. Mano: ${gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella'}.`, 'system');
    updateCantosUI();
    if (gameState.manoPlayerId === 'player') {
        addMessageToHistory('¡Tu turno!', 'system');
    } else {
        setTimeout(iaTurno, 1200);
    }
}

// --- Lógica de jugada de carta ---
function onPlayerCardClick(idx) {
    if (gameState.turno !== 'player' || gameState.partidaTerminada || gameState.esperandoRespuesta) return;
    let carta = gameState.playerHand[idx];
    if (carta.jugada) return;
    carta.jugada = true;
    gameState.playedCards.push({ jugador: gameState.playerName, carta, ronda: gameState.rondaActual });
    renderPlayerHand(gameState.playerHand, 'mesa-player', true, onPlayerCardClick);
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    addMessageToHistory(`${gameState.playerName} jugó ${carta.numero} ${carta.palo}`, 'player');
    gameState.turno = 'ia';
    checkFinRonda();
    if (!gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function iaTurno() {
    if (gameState.turno !== 'ia' || gameState.partidaTerminada || gameState.esperandoRespuesta) return;
    // IA puede cantar envido/flor/truco si corresponde
    if (!gameState.envidoCantado && !gameState.florCantada && gameState.currentRound === 1 && !gameState.trucoCantado) {
        let canto = iaCantarCanto(gameState);
        if (canto) {
            iniciarCanto('ia', canto);
            return;
        }
    }
    let idx = iaElegirCarta(gameState.iaHand, gameState.playedCards);
    let carta = gameState.iaHand[idx];
    carta.jugada = true;
    gameState.playedCards.push({ jugador: 'TrucoEstrella', carta, ronda: gameState.rondaActual });
    renderIAHand(gameState.iaHand, 'mesa-ia');
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    addMessageToHistory(`TrucoEstrella jugó ${carta.numero} ${carta.palo}`, 'ia');
    gameState.turno = 'player';
    checkFinRonda();
}

function checkFinRonda() {
    let jugadasRonda = gameState.playedCards.filter(pc => pc.ronda === gameState.rondaActual).length === 2;
    if (jugadasRonda) {
        let jugadas = gameState.playedCards.filter(pc => pc.ronda === gameState.rondaActual);
        let carta1 = jugadas[0].carta;
        let carta2 = jugadas[1].carta;
        let ganador = null;
        if (carta1.valorTruco > carta2.valorTruco) ganador = jugadas[0].jugador;
        else if (carta2.valorTruco > carta1.valorTruco) ganador = jugadas[1].jugador;
        else ganador = 'parda';
        gameState.rondaGanada.push(ganador);
        addMessageToHistory(`Ganador de la ronda: ${ganador === 'parda' ? 'Empate' : ganador}`, 'system');
        if (gameState.rondaActual < 3) {
            gameState.rondaActual++;
        }
        if (gameState.rondaGanada.length === 2) {
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
        alternarMano();
        setTimeout(initializeGame, 2000);
    }
}

function alternarMano() {
    gameState.manoPlayerId = (gameState.manoPlayerId === 'player') ? 'ia' : 'player';
}

// --- Cantos y opciones dinámicas ---
function updateCantosUI() {
    renderCantoBotonera(gameState);
}

// --- Nuevo sistema de cantos y respuestas ---
function iniciarCanto(quien, tipo) {
    // Validar si se puede cantar ese canto según el reglamento y el estado actual
    if (!puedeCantar(quien, tipo)) return;
    gameState.cantoPendiente = {
        tipo,
        quien,
        historial: [{ quien, tipo }],
        estado: 'pendiente',
        opciones: obtenerOpcionesCanto(tipo),
        subido: false
    };
    gameState.esperandoRespuesta = true;
    gameState.quienDebeResponder = (quien === 'player') ? 'ia' : 'player';
    addMessageToHistory(`${quien === 'player' ? gameState.playerName : 'TrucoEstrella'} canta ${tipo.toUpperCase()}!`, quien);
    updateCantosUI();
    if (gameState.quienDebeResponder === 'ia') {
        setTimeout(() => responderCantoIA(tipo), 1000);
    }
}

function puedeCantar(quien, tipo) {
    // Reglas básicas: Envido solo antes de jugar la primera carta y antes de Truco, Flor bloquea Envido, etc.
    if (tipo === 'Envido' || tipo === 'Real Envido' || tipo === 'Falta Envido') {
        if (gameState.envidoCantado || gameState.florCantada) return false;
        if (gameState.playedCards.length > 0) return false;
        if (gameState.trucoCantado) return false;
    }
    if (tipo === 'Flor') {
        if (!gameState.flor || gameState.florCantada || gameState.envidoCantado) return false;
        if (gameState.playedCards.length > 0) return false;
    }
    if (tipo === 'Truco') {
        if (gameState.trucoCantado) return false;
    }
    if (tipo === 'ReTruco') {
        if (!gameState.trucoCantado || gameState.cantoPendiente?.tipo !== 'Truco') return false;
    }
    if (tipo === 'Vale Cuatro') {
        if (!gameState.trucoCantado || gameState.cantoPendiente?.tipo !== 'ReTruco') return false;
    }
    return true;
}

function obtenerOpcionesCanto(tipo) {
    if (tipo === 'Envido') return ['Quiero', 'Real Envido', 'Falta Envido', 'No Quiero'];
    if (tipo === 'Real Envido') return ['Quiero', 'Falta Envido', 'No Quiero'];
    if (tipo === 'Falta Envido') return ['Quiero', 'No Quiero'];
    if (tipo === 'Flor') return ['Quiero', 'Contra Flor', 'Contra Flor al Resto', 'No Quiero'];
    if (tipo === 'Contra Flor') return ['Quiero', 'Contra Flor al Resto', 'No Quiero'];
    if (tipo === 'Contra Flor al Resto') return ['Quiero', 'No Quiero'];
    if (tipo === 'Truco') return ['Quiero', 'ReTruco', 'No Quiero'];
    if (tipo === 'ReTruco') return ['Quiero', 'Vale Cuatro', 'No Quiero'];
    if (tipo === 'Vale Cuatro') return ['Quiero', 'No Quiero'];
    return [];
}

function responderCantoIA(tipo) {
    let respuesta = iaResponderCanto(tipo, gameState);
    addMessageToHistory(`TrucoEstrella responde: ${respuesta}`, 'ia');
    if (respuesta === 'Quiero') {
        aceptarCanto('ia');
    } else if (respuesta === 'No Quiero') {
        rechazarCanto('ia');
    } else {
        // Subida
        iniciarCanto('ia', respuesta);
    }
}

export function aceptarCanto(quien) {
    let tipo = gameState.cantoPendiente.tipo;
    if (tipo === 'Envido' || tipo === 'Real Envido' || tipo === 'Falta Envido') {
        gameState.envidoCantado = true;
        resolverEnvido(tipo);
    }
    if (tipo === 'Flor' || tipo === 'Contra Flor' || tipo === 'Contra Flor al Resto') {
        gameState.florCantada = true;
        resolverFlor(tipo);
    }
    if (tipo === 'Truco' || tipo === 'ReTruco' || tipo === 'Vale Cuatro') {
        gameState.trucoCantado = true;
        // El juego sigue, pero se guarda el nivel del Truco para sumar los puntos al final de la mano
        gameState.cantoPendiente.estado = 'aceptado';
        gameState.esperandoRespuesta = false;
        gameState.quienDebeResponder = null;
        updateCantosUI();
    }
}

export function rechazarCanto(quien) {
    let tipo = gameState.cantoPendiente.tipo;
    let puntos = 1;
    if (tipo === 'Envido') puntos = 1;
    if (tipo === 'Real Envido') puntos = 2;
    if (tipo === 'Falta Envido') puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    if (tipo === 'Flor') puntos = 2;
    if (tipo === 'Contra Flor') puntos = 3;
    if (tipo === 'Contra Flor al Resto') puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    if (tipo === 'Truco') puntos = 1;
    if (tipo === 'ReTruco') puntos = 2;
    if (tipo === 'Vale Cuatro') puntos = 3;

    let ganador = (gameState.cantoPendiente.quien === 'player') ? 'TrucoEstrella' : gameState.playerName;
    if (ganador === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`¡${ganador} suma ${puntos} punto${puntos > 1 ? 's' : ''} por rechazo!`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    if (gameState.playerScore >= gameState.puntosMax || gameState.iaScore >= gameState.puntosMax) {
        gameState.partidaTerminada = true;
        showFinPartidaModal(gameState.playerScore >= gameState.puntosMax ? gameState.playerName : 'TrucoEstrella');
    }
}

function resolverEnvido(tipo) {
    const playerEnvido = calcularEnvido(gameState.playerHand);
    const iaEnvido = calcularEnvido(gameState.iaHand);
    let winner = playerEnvido > iaEnvido ? gameState.playerName : 'TrucoEstrella';
    let puntos = 2;
    if (tipo === 'Real Envido') puntos = 3;
    if (tipo === 'Falta Envido') puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    if (winner === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`Envido: ${gameState.playerName} ${playerEnvido} - TrucoEstrella ${iaEnvido}. Gana ${winner} (+${puntos})`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    if (gameState.playerScore >= gameState.puntosMax || gameState.iaScore >= gameState.puntosMax) {
        gameState.partidaTerminada = true;
        showFinPartidaModal(gameState.playerScore >= gameState.puntosMax ? gameState.playerName : 'TrucoEstrella');
    }
}

function resolverFlor(tipo) {
    const playerFlor = tieneFlor(gameState.playerHand) ? calcularEnvido(gameState.playerHand) : 0;
    const iaFlor = tieneFlor(gameState.iaHand) ? calcularEnvido(gameState.iaHand) : 0;
    let winner = playerFlor > iaFlor ? gameState.playerName : 'TrucoEstrella';
    let puntos = 3;
    if (tipo === 'Contra Flor') puntos = 6;
    if (tipo === 'Contra Flor al Resto') puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    if (winner === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`Flor: ${gameState.playerName} ${playerFlor} - TrucoEstrella ${iaFlor}. Gana ${winner} (+${puntos})`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    if (gameState.playerScore >= gameState.puntosMax || gameState.iaScore >= gameState.puntosMax) {
        gameState.partidaTerminada = true;
        showFinPartidaModal(gameState.playerScore >= gameState.puntosMax ? gameState.playerName : 'TrucoEstrella');
    }
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
            playerName: document.getElementById('playerName').value || 'Jugador 1',
            puntosMax: parseInt(document.getElementById('gamePoints').value),
            flor: document.getElementById('florRule').checked
        };
        showGameScreen(config);
    });
    document.getElementById('btn-revancha').addEventListener('click', () => {
        document.getElementById('modal-fin-partida').classList.add('hidden');
        initializeGame();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    showStartScreen();
    setupEventListeners();
});

window.iniciarCanto = iniciarCanto;
window.aceptarCanto = aceptarCanto;
window.rechazarCanto = rechazarCanto;