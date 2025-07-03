import { GAME_CONSTANTS } from './config.js';
import { renderPlayerHand, renderIAHand, renderMesaRondas, renderMarcador, addMessageToHistory, renderCantoBotonera } from './ui.js';
import { iaElegirCarta, iaResponderCanto, iaCantarCanto } from './ia.js';
import { cargarReglasCantos, esCantoValido } from './cantosReglas.js';

// Estado global del partido
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
    cantoPendiente: null,
    esperandoRespuesta: false,
    quienDebeResponder: null,
    rondaEmpieza: 'player'
};

// Utilidades
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

// Pantalla de inicio
function showStartScreen() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
}

// Pantalla de juego
function showGameScreen(config) {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    gameState.playerName = config.playerName || 'Jugador 1';
    gameState.puntosMax = config.puntosMax;
    gameState.flor = config.flor;
    initializeGame();
}

// Inicializar nueva mano
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

function updateCantosUI() {
    renderCantoBotonera(gameState);
}

// Lógica de jugada de carta
function onPlayerCardClick(idx) {
    if (gameState.turno !== 'player' || gameState.partidaTerminada || gameState.esperandoRespuesta) return;
    let carta = gameState.playerHand[idx];
    if (carta.jugada) return;
    carta.jugada = true;
    gameState.playedCards.push({ jugador: gameState.playerName, carta, ronda: gameState.rondaActual });
    renderPlayerHand(gameState.playerHand, 'mesa-player', true, onPlayerCardClick);
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    addMessageToHistory(`${gameState.playerName} jugó ${carta.numero} ${carta.palo}`, 'player');
    updateCantosUI();
    gameState.turno = 'ia';
    checkFinRonda();
    if (!gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function iaTurno() {
    if (gameState.turno !== 'ia' || gameState.partidaTerminada || gameState.esperandoRespuesta) return;
    // IA puede cantar envido/flor/truco si corresponde
    if (!gameState.envidoCantado && !gameState.florCantada && gameState.currentRound === 1 && !gameState.trucoCantado && gameState.playedCards.length === 0) {
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
    updateCantosUI();
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
        // Si alguien ganó dos rondas, termina la mano
        let ganadorMano = determinarGanadorMano();
        if (ganadorMano) {
            sumarPuntosMano(ganadorMano);
        } else if (gameState.rondaGanada.length < 3) {
            // Si no hay ganador, sigue la siguiente ronda
            gameState.rondaActual++;
            // El que ganó la ronda anterior empieza la siguiente, si fue parda sigue el que empezó la ronda
            gameState.turno = ganador === 'parda'
                ? gameState.rondaEmpieza
                : (ganador === gameState.playerName ? 'player' : 'ia');
            if (gameState.turno === 'ia') setTimeout(iaTurno, 1200);
        }
    }
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    updateCantosUI();
}

function determinarGanadorMano() {
    let [r1, r2] = gameState.rondaGanada;
    if (r1 === r2 && r1 !== 'parda') return r1;
    if (r1 !== 'parda' && r2 === 'parda') return r1;
    if (r2 !== 'parda' && r1 === 'parda') return r2;
    if (gameState.rondaGanada.length === 3) {
        // Tercera ronda define
        let r3 = gameState.rondaGanada[2];
        if (r3 !== 'parda') return r3;
        // Si la tercera también es parda, gana el que fue mano
        return gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella';
    }
    return null;
}

function sumarPuntosMano(ganador) {
    let historial = [];
    if (gameState.cantoPendiente && (gameState.cantoPendiente.tipo === 'Truco' || gameState.cantoPendiente.tipo === 'ReTruco' || gameState.cantoPendiente.tipo === 'Vale Cuatro')) {
        historial = gameState.cantoPendiente.historial;
    } else if (gameState.trucoCantado) {
        historial = [{ tipo: 'Truco' }];
    }
    let puntos = historial.length ? calcularPuntosTruco(historial, true) : 1;
    if (ganador === gameState.playerName) gameState.playerScore += puntos;
    else if (ganador === 'TrucoEstrella') gameState.iaScore += puntos;
    addMessageToHistory(`Punto para ${ganador} (+${puntos})`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    if (gameState.playerScore >= gameState.puntosMax || gameState.iaScore >= gameState.puntosMax) {
        gameState.partidaTerminada = true;
        showFinPartidaModal(gameState.playerScore >= gameState.puntosMax ? gameState.playerName : 'TrucoEstrella');
    } else {
        alternarMano();
        setTimeout(() => {
            initializeGame();
            updateCantosUI();
        }, 2000);
    }
}

// --- NUEVO: Manejo de puntos reglamentario ---

function calcularPuntosEnvido(historial, querido = true) {
    let cantos = historial.map(h => h.tipo);
    let puntos = 0;
    let envidos = cantos.filter(c => c === 'Envido').length;
    let real = cantos.includes('Real Envido');
    let falta = cantos.includes('Falta Envido');

    if (falta) {
        return 'falta';
    }
    if (real && envidos === 2) puntos = querido ? 7 : 4;
    else if (real && envidos === 1) puntos = querido ? 5 : 2;
    else if (real) puntos = querido ? 3 : 1;
    else if (envidos === 2) puntos = querido ? 4 : 2;
    else if (envidos === 1) puntos = querido ? 2 : 1;
    return puntos;
}

function calcularPuntosFlor(historial, querido = true) {
    let cantos = historial.map(h => h.tipo);
    if (cantos.includes('Contra Flor al Resto')) return 'falta';
    if (cantos.includes('Contra Flor')) return 6;
    return 3;
}

function calcularPuntosTruco(historial, querido = true) {
    let cantos = historial.map(h => h.tipo);
    let truco = cantos.includes('Truco');
    let retruco = cantos.includes('ReTruco');
    let valeCuatro = cantos.includes('Vale Cuatro');
    if (truco && retruco && valeCuatro) return querido ? 4 : 3;
    if (truco && retruco) return querido ? 3 : 2;
    if (truco) return querido ? 2 : 1;
    return 1;
}

// Máquina de estados para cantos y subidas
function iniciarCanto(quien, tipo) {
    if (gameState.esperandoRespuesta) return;
    if (gameState.cantoPendiente) {
        gameState.cantoPendiente.historial.push({ quien, tipo });
        gameState.cantoPendiente.tipo = tipo;
        gameState.cantoPendiente.opciones = obtenerOpcionesCanto(tipo);
        gameState.cantoPendiente.estado = 'pendiente';
        gameState.cantoPendiente.subido = true;
        gameState.cantoPendiente.ultimoQueSubio = quien;
        gameState.quienDebeResponder = (quien === 'player') ? 'ia' : 'player';
    } else {
        gameState.cantoPendiente = {
            tipo,
            quien,
            historial: [{ quien, tipo }],
            estado: 'pendiente',
            opciones: obtenerOpcionesCanto(tipo),
            subido: false,
            ultimoQueSubio: quien
        };
        gameState.quienDebeResponder = (quien === 'player') ? 'ia' : 'player';
    }
    gameState.esperandoRespuesta = true;
    addMessageToHistory(`${quien === 'player' ? gameState.playerName : 'TrucoEstrella'} canta ${tipo.toUpperCase()}!`, quien);
    updateCantosUI();
    if (gameState.quienDebeResponder === 'ia') {
        setTimeout(() => responderCantoIA(gameState.cantoPendiente.tipo), 1000);
    }
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

export function puedeCantar(quien, tipo) {
    if (!reglasCargadas) return false;
    if (gameState.esperandoRespuesta) return false;

    const ronda = gameState.rondaActual;
    const esMano = (gameState.manoPlayerId === quien);
    const jugoCarta = (gameState.playedCards.filter(pc => pc.jugador === quien && pc.ronda === ronda).length > 0);
    const subioApuesta = !!gameState.cantoPendiente;

    return esCantoValido({
        ronda,
        esMano,
        jugoCarta,
        subioApuesta
    }, tipo);
}

function responderCantoIA(tipo) {
    let respuesta = iaResponderCanto(tipo, gameState);
    addMessageToHistory(`TrucoEstrella responde: ${respuesta}`, 'ia');
    if (respuesta === 'Quiero') {
        aceptarCanto('ia');
    } else if (respuesta === 'No Quiero') {
        rechazarCanto('ia');
    } else {
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
        gameState.cantoPendiente.estado = 'aceptado';
        gameState.esperandoRespuesta = false;
        gameState.quienDebeResponder = null;
        updateCantosUI();
    }
}

export function rechazarCanto(quien) {
    let tipo = gameState.cantoPendiente.tipo;
    let historial = gameState.cantoPendiente.historial;
    let puntos = 1;

    if (tipo === 'Envido' || tipo === 'Real Envido' || tipo === 'Falta Envido') {
        let pts = calcularPuntosEnvido(historial, false);
        if (pts === 'falta') {
            puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
        } else {
            puntos = pts;
        }
    } else if (tipo === 'Flor' || tipo === 'Contra Flor' || tipo === 'Contra Flor al Resto') {
        let pts = calcularPuntosFlor(historial, false);
        if (pts === 'falta') {
            puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
        } else {
            puntos = pts;
        }
    } else if (tipo === 'Truco' || tipo === 'ReTruco' || tipo === 'Vale Cuatro') {
        puntos = calcularPuntosTruco(historial, false);
    }

    let ultimo = gameState.cantoPendiente.ultimoQueSubio || gameState.cantoPendiente.quien;
    let ganador = (ultimo === 'player') ? gameState.playerName : 'TrucoEstrella';
    if (ganador === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`¡${ganador} suma ${puntos} punto${puntos > 1 ? 's' : ''} por rechazo!`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    // Continuar la mano si corresponde
    if (gameState.turno === 'ia' && !gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function resolverEnvido(tipo) {
    const playerEnvido = calcularEnvido(gameState.playerHand);
    const iaEnvido = calcularEnvido(gameState.iaHand);
    let winner = playerEnvido > iaEnvido ? gameState.playerName : 'TrucoEstrella';
    let historial = gameState.cantoPendiente.historial;
    let puntos = calcularPuntosEnvido(historial, true);
    if (puntos === 'falta') {
        puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    }
    if (winner === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`Envido: ${gameState.playerName} ${playerEnvido} - TrucoEstrella ${iaEnvido}. Gana ${winner} (+${puntos})`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    // Continuar la mano si corresponde
    if (gameState.turno === 'ia' && !gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function resolverFlor(tipo) {
    const playerFlor = tieneFlor(gameState.playerHand) ? calcularEnvido(gameState.playerHand) : 0;
    const iaFlor = tieneFlor(gameState.iaHand) ? calcularEnvido(gameState.iaHand) : 0;
    let winner = playerFlor > iaFlor ? gameState.playerName : 'TrucoEstrella';
    let historial = gameState.cantoPendiente.historial;
    let puntos = calcularPuntosFlor(historial, true);
    if (puntos === 'falta') {
        puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    }
    if (winner === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`Flor: ${gameState.playerName} ${playerFlor} - TrucoEstrella ${iaFlor}. Gana ${winner} (+${puntos})`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    // Continuar la mano si corresponde
    if (gameState.turno === 'ia' && !gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function alternarMano() {
    gameState.manoPlayerId = (gameState.manoPlayerId === 'player') ? 'ia' : 'player';
    gameState.turno = gameState.manoPlayerId;
}

// Modal Fin de Partido
function showFinPartidaModal(winner) {
    document.getElementById('modal-fin-partida-content').textContent = `Ganador: ${winner}`;
    document.getElementById('modal-fin-partida').classList.remove('hidden');
}

// Event Listeners
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
        updateCantosUI();
    });
}

let reglasCargadas = false;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarReglasCantos();
    reglasCargadas = true;
    showStartScreen();
    setupEventListeners();
});

window.iniciarCanto = iniciarCanto;
window.aceptarCanto = aceptarCanto;
window.rechazarCanto = rechazarCanto;
window.initializeGame = initializeGame;
window.updateCantosUI = updateCantosUI;