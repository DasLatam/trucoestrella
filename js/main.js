// js/main.js
import * as config from './config.js';
import * as ui from './ui.js';
import * as ia from './ia.js';

// --- Estado del Juego ---
let gameState = {};

/**
 * Resetea el estado del juego a su valor inicial.
 */
function resetGameState() {
    gameState = {
        config: {
            puntosVictoria: 30,
            conFlor: false,
            nombreJugador: "Jugador",
        },
        marcador: { player: 0, cpu: 0 },
        partidaTerminada: false,
        esManoPlayerInicial: true,
        rondaActual: null,
    };
}

/**
 * Resetea el estado de una ronda.
 * @param {boolean} esManoPlayer - Si el jugador es mano en esta ronda.
 */
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
            envido: null, // {cantadoPor, nivel, puntos, respondido, cadena:[]}
            truco: null,  // {cantadoPor, nivel, respondido}
            flor: null,   // {cantadoPor, nivel, respondido, puntosPlayer, puntosCpu}
        },
        puedeCantarEnvido: true,
        puedeCantarFlor: true,
        esperandoRespuesta: null, // {de, tipo, nivel, etc.}
        rondaTerminada: false,
    };
}

// --- Flujo de la Partida ---

/**
 * Inicia una nueva partida con la configuración de la pantalla inicial.
 */
function iniciarPartida() {
    resetGameState();
    // Leer configuración de la UI
    gameState.config.puntosVictoria = parseInt(document.querySelector('input[name="puntos"]:checked').value);
    gameState.config.conFlor = document.getElementById('con-flor').checked;
    gameState.config.nombreJugador = document.getElementById('player-name').value || 'Jugador';
    
    ui.togglePantallas();
    ui.actualizarNombres(gameState.config.nombreJugador, 'CPU');
    ui.limpiarLog();
    ui.agregarLog(`La partida comienza a ${gameState.config.puntosVictoria} puntos.`, 'sistema');
    if (gameState.config.conFlor) ui.agregarLog('Se juega con flor.', 'sistema');
    
    iniciarNuevaRonda(gameState.esManoPlayerInicial);
}

/**
 * Inicia una nueva ronda, barajando y repartiendo cartas.
 */
function iniciarNuevaRonda(esManoPlayer) {
    if (gameState.partidaTerminada) return;

    ui.limpiarMesa();
    resetRondaState(esManoPlayer);
    ui.actualizarMarcador(gameState.marcador.player, gameState.marcador.cpu, gameState.config.puntosVictoria);

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

    // La lógica de la ronda comienza aquí
    procesarTurno();
}

/**
 * Procesa el turno actual, ya sea del jugador o de la IA.
 */
function procesarTurno() {
    if (gameState.rondaActual.rondaTerminada || gameState.partidaTerminada) return;
    
    // Lógica de Flor al inicio del turno de cada jugador
    if (gameState.config.conFlor && gameState.rondaActual.puedeCantarFlor) {
        const r = gameState.rondaActual;
        const florPlayer = ia.calcularFlor(r.manoPlayer);
        const florCpu = ia.calcularFlor(r.manoCpu);

        if (r.turno === 'player' && florPlayer > 0 && !r.cantos.flor) {
            ui.agregarLog('Tienes flor, debes cantarla.', 'sistema');
            actualizarEstadoBotones();
            return; // Espera a que el jugador cante flor
        }
        if (r.turno === 'cpu' && florCpu > 0 && !r.cantos.flor) {
            setTimeout(() => procesarCanto('cpu', 'FLOR', 'FLOR'), 1000);
            return; // La CPU canta su flor
        }
    }

    actualizarEstadoBotones();
    
    if (gameState.rondaActual.turno === 'cpu' && !gameState.rondaActual.esperandoRespuesta) {
        setTimeout(turnoCPU, 1200);
    }
}

/**
 * Lógica para el turno de la IA.
 */
function turnoCPU() {
    const r = gameState.rondaActual;
    if (r.turno !== 'cpu' || r.rondaTerminada || r.esperandoRespuesta) return;

    // 1. IA decide si canta algo
    const canto = ia.decidirCanto(r.manoCpu, r);
    if (canto) {
        procesarCanto('cpu', canto.tipo, canto.nivel);
        return;
    }

    // 2. Si no canta, juega una carta
    const cartaAJugar = ia.decidirJugada(r.manoCpu, r);
    
    jugarCarta('cpu', cartaAJugar);
}

/**
 * Lógica para cuando el jugador juega una carta.
 */
function jugadorJuegaCarta(carta) {
    const r = gameState.rondaActual;
    if (r.turno !== 'player' || r.esperandoRespuesta || r.rondaTerminada) return;

    // Validar si el jugador DEBE cantar flor y no lo ha hecho
    if (gameState.config.conFlor && r.puedeCantarFlor && ia.calcularFlor(r.manoPlayer) > 0 && !r.cantos.flor) {
        ui.agregarLog('¡Error! Debes cantar FLOR antes de jugar.', 'sistema');
        // Penalización: se considera que se achicó
        resolverFlor(true); // El jugador se achica
        return;
    }

    jugarCarta('player', carta);
}

/**
 * Lógica genérica para jugar una carta, usada por el jugador y la IA.
 * @param {string} jugador - 'player' o 'cpu'.
 * @param {object} carta - La carta a jugar.
 */
function jugarCarta(jugador, carta) {
    const r = gameState.rondaActual;
    const mano = jugador === 'player' ? r.manoPlayer : r.manoCpu;
    const nombreJugador = jugador === 'player' ? gameState.config.nombreJugador : 'CPU';

    const index = mano.indexOf(carta);
    if (index > -1) {
        mano.splice(index, 1);
    }
    r.mesa[jugador].push(carta);

    // Deshabilitar cantos de envido/flor después de la primera carta
    if (r.mesa.player.length + r.mesa.cpu.length === 1) {
        r.puedeCantarEnvido = false;
        r.puedeCantarFlor = false;
    }

    // Actualizar UI
    const manoDiv = document.getElementById(`${jugador}-hand`);
    ui.dibujarMano(mano, manoDiv, jugador === 'cpu', jugador === 'player', jugadorJuegaCarta);
    ui.moverCartaALaMesa(carta, jugador, r.manoActual);
    ui.agregarLog(`${nombreJugador} juega ${carta.valor} de ${carta.palo}.`, jugador);
    
    // Evaluar si la mano terminó
    if (r.mesa.player.length === r.manoActual && r.mesa.cpu.length === r.manoActual) {
        setTimeout(evaluarMano, 1000);
    } else {
        cambiarTurno();
        procesarTurno();
    }
}


function cambiarTurno() {
    gameState.rondaActual.turno = gameState.rondaActual.turno === 'player' ? 'cpu' : 'player';
}

/**
 * Evalúa el resultado de una mano jugada.
 */
function evaluarMano() {
    const r = gameState.rondaActual;
    const manoNum = r.manoActual;
    const cartaPlayer = r.mesa.player[manoNum - 1];
    const cartaCpu = r.mesa.cpu[manoNum - 1];

    const rankingPlayer = config.JERARQUIA_TRUCO.find(c => c.valor === cartaPlayer.valor && c.palo === cartaPlayer.palo).ranking;
    const rankingCpu = config.JERARQUIA_TRUCO.find(c => c.valor === cartaCpu.valor && c.palo === cartaCpu.palo).ranking;

    let ganador;
    if (rankingPlayer > rankingCpu) ganador = 'player';
    else if (rankingCpu > rankingPlayer) ganador = 'cpu';
    else ganador = 'parda';
    
    r.ganadorMano[manoNum - 1] = ganador;
    ui.resaltarManoGanadora(ganador, manoNum);
    
    if (ganador === 'parda') {
         ui.agregarLog(`Mano ${manoNum} es parda.`, 'sistema');
         r.turno = r.esManoPlayer ? 'player' : 'cpu'; // El que es mano en la ronda sigue siéndolo
    } else {
        const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'CPU';
        ui.agregarLog(`${nombreGanador} gana la mano ${manoNum}.`, 'sistema');
        r.turno = ganador; // El ganador de la mano es mano en la siguiente jugada
    }
    
    const ganadorRonda = determinarGanadorRonda();
    if (ganadorRonda) {
        terminarRonda(ganadorRonda);
    } else {
        r.manoActual++;
        procesarTurno();
    }
}

/**
 * Determina si la ronda ha terminado por el juego de cartas y quién es el ganador.
 */
function determinarGanadorRonda() {
    const g = gameState.rondaActual.ganadorMano;
    const manosGanadas = { player: 0, cpu: 0, parda: 0 };
    g.forEach(ganador => { if(ganador) manosGanadas[ganador]++; });

    if (manosGanadas.player >= 2) return 'player';
    if (manosGanadas.cpu >= 2) return 'cpu';
    
    if (g[0] === 'player' && g[1] === 'parda') return 'player';
    if (g[0] === 'cpu' && g[1] === 'parda') return 'cpu';

    if (g[0] === 'parda') {
        if (g[1] === 'player') return 'player';
        if (g[1] === 'cpu') return 'cpu';
        if (g[1] === 'parda' && g[2] !== null) return g[2] === 'parda' ? (gameState.rondaActual.esManoPlayer ? 'player' : 'cpu') : g[2];
    }
    
    if (gameState.rondaActual.manoActual === 3 && g[2] !== null) {
        if (g[2] === 'parda') return g[0];
    }

    return null; // La ronda no ha terminado
}

/**
 * Finaliza la ronda por el juego de cartas (Truco) y otorga los puntos.
 */
function terminarRonda(ganador) {
    if (gameState.rondaActual.rondaTerminada) return;
    gameState.rondaActual.rondaTerminada = true;

    let puntos = 1; 
    const cantoTruco = gameState.rondaActual.cantos.truco;
    if (cantoTruco && cantoTruco.respondido === 'QUIERO') {
        if (cantoTruco.nivel === 'VALE_CUATRO') puntos = config.PUNTOS.VALE_CUATRO.QUERIDO;
        else if (cantoTruco.nivel === 'RETRUCO') puntos = config.PUNTOS.RETRUCO.QUERIDO;
        else if (cantoTruco.nivel === 'TRUCO') puntos = config.PUNTOS.TRUCO.QUERIDO;
    }
    
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'CPU';
    ui.agregarLog(`${nombreGanador} gana la ronda.`, 'sistema');
    sumarPuntos(ganador, puntos, 'del truco');

    setTimeout(() => iniciarNuevaRonda(!gameState.rondaActual.esManoPlayer), 3000);
}

// --- Lógica de Cantos ---

/**
 * Procesa un canto realizado por el jugador o la IA.
 */
function procesarCanto(cantador, tipo, nivel) {
    const r = gameState.rondaActual;
    const oponente = cantador === 'player' ? 'cpu' : 'player';
    const nombreCantador = cantador === 'player' ? gameState.config.nombreJugador : 'CPU';
    const cantoActual = r.cantos[tipo.toLowerCase()] || { cadena: [] };

    ui.agregarLog(`${nombreCantador} canta: ¡${nivel.replace(/_/g, ' ')}!`, cantador);

    cantoActual.cantadoPor = cantador;
    cantoActual.nivel = nivel;
    cantoActual.cadena.push(nivel);
    r.cantos[tipo.toLowerCase()] = cantoActual;

    r.esperandoRespuesta = { de: oponente, tipo: tipo, nivel: nivel };
    
    // Si se canta flor, se calculan los puntos para la posible respuesta de la IA
    if (tipo === 'FLOR') {
        r.cantos.flor.puntosJugador = ia.calcularFlor(r.manoPlayer);
    }

    actualizarEstadoBotones();

    if (oponente === 'cpu') {
        setTimeout(cpuRespondeCanto, 1500);
    }
}

/**
 * Lógica para la respuesta de la IA a un canto del jugador.
 */
function cpuRespondeCanto() {
    const r = gameState.rondaActual;
    const canto = r.esperandoRespuesta;
    const respuesta = ia.decidirRespuesta(r.manoCpu, canto, r);

    // Si la respuesta es otro canto (subir la apuesta)
    if (respuesta.decision === 'RETRUCO' || respuesta.decision === 'REAL_ENVIDO' || respuesta.decision === 'CONTRAFLOR') {
        procesarCanto('cpu', canto.tipo, respuesta.decision);
    } else { // Si es Quiero o No Quiero
        procesarRespuesta('cpu', respuesta.decision);
    }
}

/**
 * Procesa una respuesta (Quiero, No Quiero, etc.) de cualquier jugador.
 */
function procesarRespuesta(respondedor, decision) {
    const r = gameState.rondaActual;
    if (!r.esperandoRespuesta) return;

    const canto = r.esperandoRespuesta;
    const nombreRespondedor = respondedor === 'player' ? gameState.config.nombreJugador : 'CPU';
    const oponente = respondedor === 'player' ? 'cpu' : 'player';

    ui.agregarLog(`${nombreRespondedor} dice: ¡${decision.replace(/_/g, ' ')}!`, respondedor);
    
    r.esperandoRespuesta = null;
    r.cantos[canto.tipo.toLowerCase()].respondido = decision;

    if (decision === 'NO_QUIERO') {
        let puntos = 1;
        if (canto.tipo === 'TRUCO') puntos = config.PUNTOS[canto.nivel].NO_QUERIDO;
        if (canto.tipo === 'ENVIDO') puntos = calcularPuntosEnvidoNoQuerido();
        if (canto.tipo === 'FLOR') puntos = config.PUNTOS.CONTRAFLOR.NO_QUERIDO;
        
        sumarPuntos(oponente, puntos, `por ${canto.nivel} no querido`);
        finalizarManoDeJuego();
    } else { // QUISO
        if (canto.tipo === 'ENVIDO') {
            resolverEnvido();
        } else if (canto.tipo === 'FLOR') {
            resolverFlor();
        } else { // TRUCO
            // El juego continúa, el turno vuelve a quien era mano de la ronda
            r.turno = r.esManoPlayer ? 'player' : 'player'; // Corrección: debe ser el que jugó la última carta o el mano
            procesarTurno();
        }
    }
}

function resolverEnvido() {
    const r = gameState.rondaActual;
    const puntosPlayer = ia.calcularPuntosEnvido(r.manoPlayer);
    const puntosCpu = ia.calcularPuntosEnvido(r.manoCpu);
    
    let ganador;
    if (puntosPlayer > puntosCpu) ganador = 'player';
    else if (puntosCpu > puntosPlayer) ganador = 'cpu';
    else ganador = r.esManoPlayer ? 'player' : 'cpu';
    
    const puntosGanados = calcularPuntosEnvidoQuerido();
    sumarPuntos(ganador, puntosGanados, 'del envido');
    
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'CPU';
    ui.mostrarModal(`Gana el Envido: ${nombreGanador}`, `${gameState.config.nombreJugador}: ${puntosPlayer} puntos.<br>CPU: ${puntosCpu} puntos.`);
    
    r.cantos.envido.resuelto = true;
    r.turno = r.esManoPlayer ? 'player' : 'cpu';
    procesarTurno();
}

function resolverFlor(jugadorSeAchica = false) {
    const r = gameState.rondaActual;
    if (r.rondaTerminada) return;
    r.rondaTerminada = true;

    const puntosPlayer = ia.calcularFlor(r.manoPlayer);
    const puntosCpu = ia.calcularFlor(r.manoCpu);
    let ganador, perdedor, puntosGanados, motivo;

    if (jugadorSeAchica) {
        ganador = 'cpu';
        puntosGanados = 3;
        motivo = "por flor no cantada";
    } else if (puntosPlayer > 0 && puntosCpu === 0) {
        ganador = 'player';
        puntosGanados = 3;
        motivo = "de flor";
    } else if (puntosCpu > 0 && puntosPlayer === 0) {
        ganador = 'cpu';
        puntosGanados = 3;
        motivo = "de flor";
    } else { // Ambos tienen flor
        ganador = (puntosPlayer > puntosCpu) ? 'player' : (puntosCpu > puntosPlayer ? 'cpu' : (r.esManoPlayer ? 'player' : 'cpu'));
        perdedor = (ganador === 'player') ? 'cpu' : 'player';
        
        const cantoFlor = r.cantos.flor;
        if (cantoFlor.nivel === 'CONTRAFLOR_AL_RESTO') {
            const puntosOponente = gameState.marcador[perdedor];
            puntosGanados = gameState.config.puntosVictoria - puntosOponente;
        } else if (cantoFlor.nivel === 'CONTRAFLOR') {
            puntosGanados = 6;
        } else {
            puntosGanados = 4; // 3 por la flor + 1 por la segunda flor
        }
        motivo = `de ${cantoFlor.nivel}`;
    }

    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'CPU';
    ui.mostrarModal(`Resultado de la Flor`, `${nombreGanador} gana ${puntosGanados} puntos.<br>${gameState.config.nombreJugador}: ${puntosPlayer} pts. | CPU: ${puntosCpu} pts.`);
    sumarPuntos(ganador, puntosGanados, motivo);
    setTimeout(() => iniciarNuevaRonda(!r.esManoPlayer), 4000);
}


// --- Utilidades ---

function calcularPuntosEnvidoQuerido() {
    const cadena = gameState.rondaActual.cantos.envido.cadena;
    if (cadena.includes('FALTA_ENVIDO')) {
        const oponente = gameState.rondaActual.cantos.envido.cantadoPor === 'player' ? 'cpu' : 'player';
        return gameState.config.puntosVictoria - gameState.marcador[oponente];
    }
    let puntos = 0;
    if (cadena.includes('REAL_ENVIDO')) puntos += 3;
    puntos += cadena.filter(c => c === 'ENVIDO').length * 2;
    return puntos || 2; // Mínimo 2 si es solo un envido querido
}

function calcularPuntosEnvidoNoQuerido() {
    const cadena = gameState.rondaActual.cantos.envido.cadena;
    let puntos = 0;
    for(let i = 0; i < cadena.length -1; i++) {
        if (cadena[i] === 'ENVIDO') puntos += 2;
        if (cadena[i] === 'REAL_ENVIDO') puntos += 3;
    }
    return puntos + 1;
}

function jugadorVaAlMazo() {
    const r = gameState.rondaActual;
    if (r.rondaTerminada) return;
    r.rondaTerminada = true;

    ui.agregarLog(`${gameState.config.nombreJugador} se va al mazo.`, 'player');
    let puntos = 1;
    if (r.cantos.truco) {
        puntos = config.PUNTOS[r.cantos.truco.nivel].NO_QUERIDO;
    }
    sumarPuntos('cpu', puntos, 'por abandono');
    setTimeout(() => iniciarNuevaRonda(!r.esManoPlayer), 2000);
}

function finalizarManoDeJuego() {
    const r = gameState.rondaActual;
    if (r.rondaTerminada) return;
    r.rondaTerminada = true;
    setTimeout(() => iniciarNuevaRonda(!r.esManoPlayer), 3000);
}

function sumarPuntos(jugador, cantidad, motivo) {
    if (gameState.partidaTerminada) return;
    gameState.marcador[jugador] += cantidad;
    ui.agregarLog(`${jugador === 'player' ? gameState.config.nombreJugador : 'CPU'} suma ${cantidad} punto(s) ${motivo || ''}.`, 'punto');
    ui.actualizarMarcador(gameState.marcador.player, gameState.marcador.cpu, gameState.config.puntosVictoria);
    verificarFinPartida();
}

function verificarFinPartida() {
    if (gameState.marcador.player >= gameState.config.puntosVictoria || gameState.marcador.cpu >= gameState.config.puntosVictoria) {
        finalizarPartida(gameState.marcador.player > gameState.marcador.cpu ? 'player' : 'cpu');
    }
}

function finalizarPartida(ganador) {
    gameState.partidaTerminada = true;
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'CPU';
    ui.mostrarModal('¡Partida Terminada!', `El ganador es ${nombreGanador} con ${gameState.marcador[ganador]} puntos.`);
    ui.agregarLog(`--- FIN DE LA PARTIDA ---`, 'sistema');
    actualizarEstadoBotones();
}

function actualizarEstadoBotones() {
    if (gameState.partidaTerminada) {
        ui.actualizarBotones({}); // Deshabilita todos
        return;
    }
    const r = gameState.rondaActual;
    const esTurnoPlayer = r.turno === 'player';
    const esperandoRespuestaPlayer = r.esperandoRespuesta && r.esperandoRespuesta.de === 'player';
    
    const florPlayer = gameState.config.conFlor ? ia.calcularFlor(r.manoPlayer) : 0;

    const estado = {
        esTurnoPlayer: esTurnoPlayer,
        esperandoRespuesta: esperandoRespuestaPlayer,
        
        puedeCantarEnvido: esTurnoPlayer && r.puedeCantarEnvido && !r.cantos.flor,
        puedeSubirEnvido: esperandoRespuestaPlayer && r.esperandoRespuesta.tipo === 'ENVIDO',
        nivelEnvidoActual: r.cantos.envido ? config.NIVELES_ENVIDO[r.cantos.envido.nivel] : 0,

        puedeCantarTruco: esTurnoPlayer && (!r.cantos.truco || (r.cantos.truco.cantadoPor !== 'player' && r.cantos.truco.respondido === 'QUIERO')),
        nivelTrucoActual: r.cantos.truco ? config.NIVELES_TRUCO[r.cantos.truco.nivel] : 0,
        
        puedeCantarFlor: esTurnoPlayer && gameState.config.conFlor && r.puedeCantarFlor && florPlayer > 0 && !r.cantos.flor,
        puedeSubirFlor: esperandoRespuestaPlayer && r.esperandoRespuesta.tipo === 'FLOR' && florPlayer > 0,
        nivelFlorActual: r.cantos.flor ? config.NIVELES_FLOR[r.cantos.flor.nivel] : 0,
    };
    ui.actualizarBotones(estado);
}

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
    document.getElementById('modal-close-btn').addEventListener('click', ui.ocultarModal);

    // Listeners de cantos del jugador
    document.getElementById('btn-truco').addEventListener('click', () => procesarCanto('player', 'TRUCO', 'TRUCO'));
    document.getElementById('btn-retruco').addEventListener('click', () => procesarCanto('player', 'TRUCO', 'RETRUCO'));
    document.getElementById('btn-vale-cuatro').addEventListener('click', () => procesarCanto('player', 'TRUCO', 'VALE_CUATRO'));
    
    document.getElementById('btn-envido').addEventListener('click', () => procesarCanto('player', 'ENVIDO', 'ENVIDO'));
    document.getElementById('btn-real-envido').addEventListener('click', () => procesarCanto('player', 'ENVIDO', 'REAL_ENVIDO'));
    document.getElementById('btn-falta-envido').addEventListener('click', () => procesarCanto('player', 'ENVIDO', 'FALTA_ENVIDO'));
    
    document.getElementById('btn-flor').addEventListener('click', () => procesarCanto('player', 'FLOR', 'FLOR'));
    document.getElementById('btn-contraflor').addEventListener('click', () => procesarCanto('player', 'FLOR', 'CONTRAFLOR'));
    document.getElementById('btn-contraflor-resto').addEventListener('click', () => procesarCanto('player', 'FLOR', 'CONTRAFLOR_AL_RESTO'));
    
    // Listeners de respuestas del jugador
    document.getElementById('btn-quiero').addEventListener('click', () => procesarRespuesta('player', 'QUIERO'));
    document.getElementById('btn-no-quiero').addEventListener('click', () => procesarRespuesta('player', 'NO_QUIERO'));
    
    document.getElementById('btn-ir-al-mazo').addEventListener('click', jugadorVaAlMazo);
}

init();
