// js/main.js
import * as config from './config.js';
import * as ui from './ui.js';
import * as ia from './ia.js';

// --- Estado del Juego ---
let gameState = {};

function resetGameState() {
    gameState = {
        config: {
            puntosVictoria: 30,
            conFlor: false,
            nombreJugador: "Jugador",
        },
        marcador: { player: 0, cpu: 0 },
        partidaTerminada: false,
        rondaActual: null,
        historial: []
    };
}

function resetRondaState(esManoPlayer) {
    gameState.rondaActual = {
        mazo: [],
        manoPlayer: [],
        manoCpu: [],
        mesa: { player: [], cpu: [] },
        esManoPlayer: esManoPlayer,
        turno: esManoPlayer ? 'player' : 'cpu',
        manoActual: 1,
        ganadorMano: [null, null, null], // [mano1, mano2, mano3]
        cantos: {
            envido: null, // {cantadoPor, nivel, puntos, respondido}
            truco: null,  // {cantadoPor, nivel, respondido}
            flor: null,
        },
        puedeCantarEnvido: true,
        esperandoRespuesta: null // {de, tipo, nivel}
    };
}

// --- Flujo de la Partida ---

function iniciarPartida() {
    resetGameState();
    // Leer configuración de la UI
    gameState.config.puntosVictoria = parseInt(document.querySelector('input[name="puntos"]:checked').value);
    gameState.config.conFlor = document.getElementById('con-flor').checked;
    gameState.config.nombreJugador = document.getElementById('player-name').value;
    
    ui.togglePantallas();
    ui.actualizarNombres(gameState.config.nombreJugador, 'CPU');
    ui.limpiarLog();
    ui.agregarLog(`La partida comienza a ${gameState.config.puntosVictoria} puntos.`, 'sistema');
    
    iniciarNuevaRonda(true); // El jugador es mano en la primera ronda
}

function iniciarNuevaRonda(esManoPlayer) {
    ui.limpiarMesa();
    resetRondaState(esManoPlayer);

    // Crear y barajar mazo
    gameState.rondaActual.mazo = crearMazo();
    barajarMazo(gameState.rondaActual.mazo);

    // Repartir cartas
    for (let i = 0; i < 3; i++) {
        gameState.rondaActual.manoPlayer.push(gameState.rondaActual.mazo.pop());
        gameState.rondaActual.manoCpu.push(gameState.rondaActual.mazo.pop());
    }

    ui.dibujarMano(gameState.rondaActual.manoPlayer, document.getElementById('player-hand'), false, true, jugadorJuegaCarta);
    ui.dibujarMano(gameState.rondaActual.manoCpu, document.getElementById('cpu-hand'), true, false, null);
    
    ui.agregarLog(`--- Nueva Ronda ---`, 'sistema');
    ui.agregarLog(`${esManoPlayer ? gameState.config.nombreJugador : 'CPU'} es mano.`, 'sistema');

    actualizarEstadoBotones();
    
    if (gameState.rondaActual.turno === 'cpu') {
        setTimeout(turnoCPU, 1000);
    }
}

function jugadorJuegaCarta(carta) {
    if (gameState.rondaActual.turno !== 'player' || gameState.rondaActual.esperandoRespuesta) return;

    // Mover carta de la mano a la mesa
    const index = gameState.rondaActual.manoPlayer.indexOf(carta);
    gameState.rondaActual.manoPlayer.splice(index, 1);
    gameState.rondaActual.mesa.player.push(carta);

    // Actualizar UI
    ui.dibujarMano(gameState.rondaActual.manoPlayer, document.getElementById('player-hand'), false, true, jugadorJuegaCarta);
    ui.moverCartaALaMesa(carta, 'player', gameState.rondaActual.manoActual);
    ui.agregarLog(`${gameState.config.nombreJugador} juega ${carta.valor} de ${carta.palo}.`, 'player');

    // Cambiar turno
    cambiarTurno();

    // Si ambos jugaron en esta mano, evaluar
    if (gameState.rondaActual.mesa.cpu.length === gameState.rondaActual.manoActual) {
        setTimeout(evaluarMano, 1000);
    } else {
        setTimeout(turnoCPU, 1000);
    }
}

function turnoCPU() {
    if (gameState.rondaActual.turno !== 'cpu' || gameState.partidaTerminada) return;

    // TODO: Lógica de cantos de la IA
    
    // Decidir qué carta jugar
    const cartaAJugar = ia.decidirJugada(gameState.rondaActual.manoCpu, gameState.rondaActual.manoPlayer, gameState.rondaActual.mesa);
    
    // Mover carta de la mano a la mesa
    const index = gameState.rondaActual.manoCpu.indexOf(cartaAJugar);
    gameState.rondaActual.manoCpu.splice(index, 1);
    gameState.rondaActual.mesa.cpu.push(cartaAJugar);
    
    // Actualizar UI
    ui.dibujarMano(gameState.rondaActual.manoCpu, document.getElementById('cpu-hand'), true, false, null);
    ui.moverCartaALaMesa(cartaAJugar, 'cpu', gameState.rondaActual.manoActual);
    ui.agregarLog(`CPU juega ${cartaAJugar.valor} de ${cartaAJugar.palo}.`, 'cpu');

    // Cambiar turno
    cambiarTurno();

    // Si ambos jugaron, evaluar
    if (gameState.rondaActual.mesa.player.length === gameState.rondaActual.manoActual) {
        setTimeout(evaluarMano, 1000);
    }
}


function cambiarTurno() {
    const ronda = gameState.rondaActual;
    // El turno para la siguiente jugada de cartas lo tiene el ganador de la mano anterior
    // o el que era mano si hubo parda.
    if (ronda.ganadorMano[ronda.manoActual-1]) {
         ronda.turno = ronda.ganadorMano[ronda.manoActual-1];
    } else {
        // Si aún no se definió la mano, el turno pasa al otro jugador
         ronda.turno = ronda.turno === 'player' ? 'cpu' : 'player';
    }
    actualizarEstadoBotones();
}

function evaluarMano() {
    const ronda = gameState.rondaActual;
    const manoNum = ronda.manoActual;
    const cartaPlayer = ronda.mesa.player[manoNum - 1];
    const cartaCpu = ronda.mesa.cpu[manoNum - 1];

    const rankingPlayer = config.JERARQUIA_TRUCO.find(c => c.valor === cartaPlayer.valor && c.palo === cartaPlayer.palo).ranking;
    const rankingCpu = config.JERARQUIA_TRUCO.find(c => c.valor === cartaCpu.valor && c.palo === cartaCpu.palo).ranking;

    let ganador;
    if (rankingPlayer > rankingCpu) {
        ganador = 'player';
    } else if (rankingCpu > rankingPlayer) {
        ganador = 'cpu';
    } else {
        ganador = 'parda';
    }
    
    ronda.ganadorMano[manoNum - 1] = ganador;
    
    if (ganador === 'parda') {
         ui.agregarLog(`Mano ${manoNum} es parda.`, 'sistema');
         // El que es mano en la ronda sigue siéndolo en la jugada siguiente
         ronda.turno = ronda.esManoPlayer ? 'player' : 'cpu';
    } else {
        ui.agregarLog(`${ganador === 'player' ? gameState.config.nombreJugador : 'CPU'} gana la mano ${manoNum}.`, 'sistema');
        // El ganador de la mano es mano en la siguiente jugada
        ronda.turno = ganador;
    }
    
    // El envido solo se puede cantar en la primera mano
    ronda.puedeCantarEnvido = false;

    // Verificar si la ronda terminó
    const ganadorRonda = determinarGanadorRonda();
    if (ganadorRonda) {
        terminarRonda(ganadorRonda);
    } else {
        ronda.manoActual++;
        actualizarEstadoBotones();
        if (ronda.turno === 'cpu') {
            setTimeout(turnoCPU, 1000);
        }
    }
}

function determinarGanadorRonda() {
    const manosGanadas = { player: 0, cpu: 0, parda: 0 };
    const ganadores = gameState.rondaActual.ganadorMano;

    for (const ganador of ganadores) {
        if (ganador) manosGanadas[ganador]++;
    }

    if (manosGanadas.player >= 2) return 'player';
    if (manosGanadas.cpu >= 2) return 'cpu';
    
    // Ganar primera y empatar segunda
    if (ganadores[0] === 'player' && ganadores[1] === 'parda') return 'player';
    if (ganadores[0] === 'cpu' && ganadores[1] === 'parda') return 'cpu';

    // Empatar las tres manos -> gana el que era mano en la ronda
    if (manosGanadas.parda === 3) return gameState.rondaActual.esManoPlayer ? 'player' : 'cpu';
    
    // 1-1 y la tercera parda -> Gana quien ganó la primera
    if (ganadores[2] === 'parda' && manosGanadas.player === 1 && manosGanadas.cpu === 1) {
        return ganadores[0];
    }

    if (gameState.rondaActual.manoActual === 3) {
        // Si se jugaron las 3 manos y no hay definición, algo anda mal, pero por las dudas...
        if (manosGanadas.player > manosGanadas.cpu) return 'player';
        if (manosGanadas.cpu > manosGanadas.player) return 'cpu';
    }

    return null; // La ronda no ha terminado
}


function terminarRonda(ganador) {
    let puntos = 1; // Por defecto, la ronda vale 1 punto (si no se cantó truco)
    const cantoTruco = gameState.rondaActual.cantos.truco;
    if (cantoTruco && cantoTruco.respondido === 'QUIERO') {
        if (cantoTruco.nivel === 'TRUCO') puntos = config.PUNTOS.TRUCO.QUERIDO;
        if (cantoTruco.nivel === 'RETRUCO') puntos = config.PUNTOS.RETRUCO.QUERIDO;
        if (cantoTruco.nivel === 'VALE_CUATRO') puntos = config.PUNTOS.VALE_CUATRO.QUERIDO;
    }
    
    sumarPuntos(ganador, puntos);
    ui.agregarLog(`${ganador === 'player' ? gameState.config.nombreJugador : 'CPU'} gana la ronda y ${puntos} punto(s).`, 'sistema');

    if (!gameState.partidaTerminada) {
        setTimeout(() => iniciarNuevaRonda(!gameState.rondaActual.esManoPlayer), 3000);
    }
}

function sumarPuntos(jugador, cantidad) {
    gameState.marcador[jugador] += cantidad;
    ui.actualizarMarcador(gameState.marcador.player, gameState.marcador.cpu);
    verificarFinPartida();
}

function verificarFinPartida() {
    if (gameState.marcador.player >= gameState.config.puntosVictoria) {
        finalizarPartida('player');
    } else if (gameState.marcador.cpu >= gameState.config.puntosVictoria) {
        finalizarPartida('cpu');
    }
}

function finalizarPartida(ganador) {
    gameState.partidaTerminada = true;
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'CPU';
    ui.agregarLog(`¡PARTIDA TERMINADA! Ganador: ${nombreGanador}`, 'sistema');
    // TODO: Mostrar un modal de fin de partida y opción de revancha.
}


// --- Lógica de Cantos (simplificada) ---
function jugadorCanta(canto) {
    if (canto.includes('ENVIDO')) {
        // Lógica de envido
    } else { // TRUCO, RETRUCO, VALE_CUATRO
        gameState.rondaActual.cantos.truco = { cantadoPor: 'player', nivel: canto, respondido: null };
        gameState.rondaActual.esperandoRespuesta = { de: 'cpu', tipo: 'TRUCO' };
        ui.agregarLog(`${gameState.config.nombreJugador} canta: ¡${canto}!`, 'player');
        actualizarEstadoBotones();
        setTimeout(cpuRespondeCanto, 1500);
    }
}

function cpuRespondeCanto() {
    const cantoPendiente = gameState.rondaActual.esperandoRespuesta;
    let respuesta;
    
    if (cantoPendiente.tipo === 'TRUCO') {
        respuesta = ia.responderTruco(gameState.rondaActual.manoCpu);
    } // Añadir lógica para otros cantos aquí
    
    ui.agregarLog(`CPU responde: ¡${respuesta}!`, 'cpu');
    gameState.rondaActual.esperandoRespuesta = null;
    gameState.rondaActual.cantos.truco.respondido = respuesta;

    if (respuesta === 'NO_QUIERO') {
        // El jugador que cantó gana los puntos del no querido
        const puntosNoQuerido = config.PUNTOS[gameState.rondaActual.cantos.truco.nivel].NO_QUERIDO;
        sumarPuntos('player', puntosNoQuerido);
        ui.agregarLog(`${gameState.config.nombreJugador} gana ${puntosNoQuerido} punto(s).`, 'sistema');
        // La ronda termina para el truco, pero puede seguir por el envido
        // Por simplicidad, iniciamos nueva ronda
        setTimeout(() => iniciarNuevaRonda(!gameState.rondaActual.esManoPlayer), 3000);
    } else { // QUISO
        // El juego continúa
        actualizarEstadoBotones();
        if (gameState.rondaActual.turno === 'cpu') {
            turnoCPU();
        }
    }
}


function actualizarEstadoBotones() {
    const r = gameState.rondaActual;
    const estado = {
        turno: r.turno,
        esperandoRespuesta: r.esperandoRespuesta && r.esperandoRespuesta.de === 'player',
        puedeCantarEnvido: r.puedeCantarEnvido && !r.cantos.envido && r.turno === 'player',
        puedeCantarTruco: !r.cantos.truco || (r.cantos.truco.cantadoPor === 'cpu' && r.cantos.truco.respondido === 'QUIERO'),
        nivelTruco: r.cantos.truco ? (r.cantos.truco.nivel === 'TRUCO' ? 1 : (r.cantos.truco.nivel === 'RETRUCO' ? 2 : 3)) : 0
    };
    ui.actualizarBotones(estado);
}

// --- Helpers del Mazo ---

function crearMazo() {
    const mazo = [];
    for (const palo of Object.values(config.PALOS)) {
        for (const valor of config.VALORES) {
            mazo.push({ valor, palo });
        }
    }
    return mazo;
}

function barajarMazo(mazo) {
    for (let i = mazo.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
}


// --- Inicialización y Event Listeners ---
function init() {
    document.getElementById('start-game-btn').addEventListener('click', iniciarPartida);
    document.getElementById('btn-truco').addEventListener('click', () => jugadorCanta('TRUCO'));
    // TODO: Añadir listeners para los demás botones de cantos
}

init();