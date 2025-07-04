import { GAME_CONSTANTS } from './config.js';
import { cargarReglasFinMano, esFinDeMano } from './finManoReglas.js';
import { iaElegirCarta, iaResponderCanto } from './ia.js';

// Estado global del juego
let gameState = {
    manoPlayerId: 'player',
    turno: 'player',
    rondaEmpieza: 'player',
    rondaActual: 1,
    rondaGanada: [],
    playerScore: 0,
    iaScore: 0,
    puntosMax: 15,
    partidaTerminada: false,
    esperandoRespuesta: false,
    cantoPendiente: null,
    playedCards: [],
    iaHand: [],
    playerName: 'Jugador 1'
    // ...otros campos según tu juego...
};

// Alternar mano y turno inicial
function alternarMano() {
    gameState.manoPlayerId = (gameState.manoPlayerId === 'player') ? 'ia' : 'player';
    gameState.turno = gameState.manoPlayerId;
    gameState.rondaEmpieza = gameState.manoPlayerId;
}

// Inicializar juego
function initializeGame() {
    gameState.turno = gameState.manoPlayerId;
    gameState.rondaEmpieza = gameState.manoPlayerId;
    gameState.rondaActual = 1;
    gameState.rondaGanada = [];
    gameState.playedCards = [];
    gameState.cantoPendiente = null;
    gameState.esperandoRespuesta = false;
    // ...tu lógica de repartir cartas, etc...
}

// Fin de mano
function terminarMano() {
    alternarMano();
    setTimeout(() => {
        initializeGame();
        updateCantosUI();
    }, 2000);
}

// "Me voy al Mazo"
function handleMeVoyAlMazo() {
    const ronda = gameState.rondaActual;
    if (esFinDeMano('Me voy al maso', 'Siempre', ronda)) {
        terminarMano();
        return;
    }
    let ganador = (gameState.turno === 'player') ? 'TrucoEstrella' : gameState.playerName;
    if (ganador === gameState.playerName) gameState.playerScore += 1;
    else gameState.iaScore += 1;
    addMessageToHistory(`${ganador} suma 1 punto porque el rival se fue al mazo.`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    alternarMano();
    setTimeout(() => {
        initializeGame();
        updateCantosUI();
    }, 2000);
}

// Rechazo de canto
export function rechazarCanto(quien) {
    let tipo = gameState.cantoPendiente.tipo;
    let puntos = 1;
    let ultimo = gameState.cantoPendiente.ultimoQueSubio || gameState.cantoPendiente.quien;
    let ganador = (ultimo === 'player') ? gameState.playerName : 'TrucoEstrella';
    if (ganador === gameState.playerName) gameState.playerScore += puntos;
    else gameState.iaScore += puntos;
    addMessageToHistory(`¡${ganador} suma ${puntos} punto${puntos > 1 ? 's' : ''} por rechazo!`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);

    const ronda = gameState.rondaActual;
    if (esFinDeMano(tipo, 'No Quiero', ronda)) {
        terminarMano();
        return;
    }

    gameState.esperandoRespuesta = false;
    gameState.quienDebeResponder = null;
    gameState.cantoPendiente = null;
    updateCantosUI();
    if (gameState.turno === 'ia' && !gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

// Chequeo de fin de ronda
function checkFinRonda() {
    let ganadorMano = determinarGanadorMano();
    if (ganadorMano) {
        sumarPuntosMano(ganadorMano);
        const ronda = gameState.rondaActual;
        if (esFinDeMano('Se ganan las dos primeras rondas', 'Siempre', ronda)) {
            terminarMano();
            return;
        }
    } else if (gameState.rondaGanada.length < 3) {
        gameState.rondaActual++;
        let ganador = gameState.rondaGanada[gameState.rondaGanada.length - 1];
        gameState.turno = ganador === 'parda'
            ? gameState.rondaEmpieza
            : (ganador === gameState.playerName ? 'player' : 'ia');
        if (gameState.turno === 'ia') setTimeout(iaTurno, 1200);
    }
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    updateCantosUI();
}

// Turno de la IA
function iaTurno() {
    if (gameState.turno !== 'ia' || gameState.partidaTerminada || gameState.esperandoRespuesta) return;
    // ... IA canta si corresponde ...
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

// Función tieneFlor exportada
export function tieneFlor(mano) {
    return mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo;
}

// Resolver canto (ejemplo)
function resolverCanto(evento, resultado) {
    const ronda = gameState.rondaActual;
    if (esFinDeMano(evento, resultado, ronda)) {
        terminarMano();
    }
    // ...resto de la lógica...
}

// Aquí puedes agregar el resto de tus helpers, lógica de UI, etc.