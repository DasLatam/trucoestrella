import { GAME_CONSTANTS } from './config.js';
import { cargarReglasFinMano, esFinDeMano } from './finManoReglas.js';
import { iaElegirCarta, iaResponderCanto } from './ia.js';

// Variables de estado globales (ajusta según tu implementación)
let reglasCargadas = false;
let reglasFinManoCargadas = false;
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
    // ...resto de la lógica...
}

// Fin de mano
function terminarMano() {
    alternarMano();
    setTimeout(() => {
        initializeGame();
        updateCantosUI();
    }, 2000);
}

// Ejemplo de función para "Me voy al Mazo"
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

// Chequeo de fin de ronda (solo UNA definición)
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

// Ejemplo de iaTurno
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

// Ejemplo de función tieneFlor exportada
export function tieneFlor(mano) {
    return mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo;
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

function obtenerOpcionesCanto(tipo, rivalTieneFlor = false) {
    if (tipo === 'Envido') return ['Quiero', 'Real Envido', 'Falta Envido', 'No Quiero'];
    if (tipo === 'Real Envido') return ['Quiero', 'Falta Envido', 'No Quiero'];
    if (tipo === 'Falta Envido') return ['Quiero', 'No Quiero'];
    if (tipo === 'Truco') return ['Quiero', 'ReTruco', 'No Quiero'];
    if (tipo === 'ReTruco') return ['Quiero', 'Vale Cuatro', 'No Quiero'];
    if (tipo === 'Vale Cuatro') return ['Quiero', 'No Quiero'];
    if (tipo === 'Flor') {
        // Solo se puede responder con Flor si el rival tiene Flor
        if (rivalTieneFlor) return ['Flor', 'Contra Flor', 'Contra Flor al Resto'];
        return []; // No hay respuesta posible si el rival no tiene Flor
    }
    if (tipo === 'Contra Flor') {
        if (rivalTieneFlor) return ['Contra Flor al Resto'];
        return [];
    }
    if (tipo === 'Contra Flor al Resto') {
        return [];
    }
    return [];
}

export function puedeCantar(quien, tipo) {
    if (!reglasCargadas) return false;
    // NO bloquees por esperandoRespuesta
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

// Ejemplo de iaTurno
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

// --- NUEVO: Manejo de puntos reglamentario (continuación)


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

// resolver canto
function resolverCanto(evento, resultado) {
    const ronda = gameState.rondaActual; // o como determines la ronda
    if (esFinDeMano(evento, resultado, ronda)) {
        terminarMano();
    }
    // ...resto de la lógica...
}