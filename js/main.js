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
            envido: null, // {cantadoPor, nivel, respondido, cadena:[], resuelto: false}
            truco: null,  // {cantadoPor, nivel, respondido}
            flor: null,   // {cantadoPor, nivel, respondido, puntosPlayer, puntosCpu}
        },
        etapa: 'inicio', // 'inicio', 'truco'
        rondaTerminada: false,
        jugadaEnProgreso: false, // *** FIX: Evitar jugadas rápidas ***
        esperandoRespuesta: null, // {de, tipo, nivel, etc.}
        cantoPausado: null, // Para pausar el truco si se canta envido
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
    // *** FIX: Cambiar nombre de CPU ***
    ui.actualizarNombres(gameState.config.nombreJugador, 'TrucoEstrella');
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
    ui.agregarLog(`${esManoPlayer ? gameState.config.nombreJugador : 'TrucoEstrella'} es mano.`, 'sistema');

    // La lógica de la ronda comienza aquí
    procesarTurno();
}

/**
 * Procesa el turno actual, ya sea del jugador o de la IA.
 */
function procesarTurno() {
    const r = gameState.rondaActual;
    if (r.rondaTerminada || gameState.partidaTerminada) return;
    
    r.jugadaEnProgreso = false; // Se libera el bloqueo para el nuevo turno

    // Lógica de Flor (tiene máxima prioridad)
    if (gameState.config.conFlor && r.etapa === 'inicio') {
        const florPlayer = ia.calcularFlor(r.manoPlayer);
        const florCpu = ia.calcularFlor(r.manoCpu);

        if (florPlayer > 0 && florCpu > 0) {
            setTimeout(() => resolverFlor(), 1000);
            return;
        }
        if (florPlayer > 0 && r.turno === 'player' && !r.cantos.flor) {
            ui.agregarLog('Tienes flor, debes cantarla.', 'sistema');
            actualizarEstadoBotones();
            return;
        }
        if (florCpu > 0 && r.turno === 'cpu' && !r.cantos.flor) {
            setTimeout(() => procesarCanto('cpu', 'FLOR', 'FLOR'), 1000);
            return;
        }
    }

    actualizarEstadoBotones();
    
    if (r.turno === 'cpu' && !r.esperandoRespuesta) {
        setTimeout(turnoCPU, 1200);
    }
}

/**
 * Lógica para el turno de la IA.
 */
function turnoCPU() {
    const r = gameState.rondaActual;
    if (r.turno !== 'cpu' || r.rondaTerminada || r.esperandoRespuesta || r.jugadaEnProgreso) return;

    r.jugadaEnProgreso = true;

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
    if (r.turno !== 'player' || r.esperandoRespuesta || r.rondaTerminada || r.jugadaEnProgreso) return;

    if (gameState.config.conFlor && r.etapa === 'inicio' && ia.calcularFlor(r.manoPlayer) > 0 && !r.cantos.flor) {
        ui.agregarLog('¡Error! Debes cantar FLOR antes de jugar.', 'sistema');
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
    if (!carta) {
        console.error(`jugarCarta fue llamada con una carta inválida para ${jugador}.`);
        const ganador = jugador === 'player' ? 'cpu' : 'player';
        ui.agregarLog(`Error de estado. ${jugador} no pudo jugar.`, 'sistema');
        terminarRondaPorAbandono(ganador, 1, 'error de estado');
        return;
    }

    const r = gameState.rondaActual;
    r.jugadaEnProgreso = true; // Bloquear nuevas jugadas hasta que termine la secuencia
    actualizarEstadoBotones();

    const mano = jugador === 'player' ? r.manoPlayer : r.manoCpu;
    const nombreJugador = jugador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';

    const index = mano.indexOf(carta);
    if (index > -1) mano.splice(index, 1);
    r.mesa[jugador].push(carta);

    if (r.etapa === 'inicio') {
        r.etapa = 'truco';
    }

    const manoDiv = document.getElementById(`${jugador}-hand`);
    ui.dibujarMano(mano, manoDiv, jugador === 'cpu', jugador === 'player', jugadorJuegaCarta);
    ui.moverCartaALaMesa(carta, jugador, r.manoActual);
    ui.agregarLog(`${nombreJugador} juega ${carta.valor} de ${carta.palo}.`, jugador);
    
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
         r.turno = r.esManoPlayer ? 'player' : 'cpu';
    } else {
        const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
        ui.agregarLog(`${nombreGanador} gana la mano ${manoNum}.`, 'sistema');
        r.turno = ganador;
    }
    
    const ganadorRonda = determinarGanadorRonda();
    if (ganadorRonda) {
        terminarRondaPorJuego(ganadorRonda);
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

    // 1. Gana 2 de 3
    if (manosGanadas.player >= 2) return 'player';
    if (manosGanadas.cpu >= 2) return 'cpu';

    // 2. Si se jugaron 2 manos
    if (g[1] !== null) {
        // Gana la primera y empata la segunda
        if (g[0] !== 'parda' && g[1] === 'parda') return g[0];
        // Empata la primera y gana la segunda
        if (g[0] === 'parda' && g[1] !== 'parda') return g[1];
    }

    // 3. Si se jugaron las 3 manos
    if (g[2] !== null) {
        // Empata la primera y la segunda, gana la tercera
        if (g[0] === 'parda' && g[1] === 'parda') {
            return g[2] === 'parda' ? (gameState.rondaActual.esManoPlayer ? 'player' : 'cpu') : g[2];
        }
        // Gana-Pierde-Empata o Pierde-Gana-Empata
        if (g[2] === 'parda') return g[0];
    }

    return null; // La ronda no ha terminado
}

/**
 * Finaliza la ronda por el juego de cartas (Truco) y otorga los puntos.
 */
function terminarRondaPorJuego(ganador) {
    if (gameState.rondaActual.rondaTerminada) return;
    gameState.rondaActual.rondaTerminada = true;

    let puntos = 1; 
    const cantoTruco = gameState.rondaActual.cantos.truco;
    if (cantoTruco && cantoTruco.respondido === 'QUIERO') {
        if (cantoTruco.nivel === 'VALE_CUATRO') puntos = config.PUNTOS.VALE_CUATRO.QUERIDO;
        else if (cantoTruco.nivel === 'RETRUCO') puntos = config.PUNTOS.RETRUCO.QUERIDO;
        else if (cantoTruco.nivel === 'TRUCO') puntos = config.PUNTOS.TRUCO.QUERIDO;
    }
    
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    ui.agregarLog(`${nombreGanador} gana la ronda.`, 'sistema');
    sumarPuntos(ganador, puntos, 'del truco');

    // *** FIX: Alternar quién es mano en la siguiente ronda ***
    gameState.esManoPlayerInicial = !gameState.rondaActual.esManoPlayer;
    setTimeout(() => iniciarNuevaRonda(gameState.esManoPlayerInicial), 3000);
}

// --- Lógica de Cantos ---

/**
 * Procesa un canto realizado por el jugador o la IA.
 */
function procesarCanto(cantador, tipo, nivel) {
    const r = gameState.rondaActual;
    const oponente = cantador === 'player' ? 'cpu' : 'player';
    const nombreCantador = cantador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    
    // *** FIX: Lógica para permitir Envido después de Truco ***
    if (tipo === 'ENVIDO' && r.esperandoRespuesta && r.esperandoRespuesta.tipo === 'TRUCO') {
        r.cantoPausado = r.esperandoRespuesta;
        r.esperandoRespuesta = null;
        ui.agregarLog(`${nombreCantador} interrumpe con: ¡${nivel.replace(/_/g, ' ')}!`, cantador);
    } else {
        ui.agregarLog(`${nombreCantador} canta: ¡${nivel.replace(/_/g, ' ')}!`, cantador);
    }

    const cantoActual = r.cantos[tipo.toLowerCase()] || { cadena: [] };
    cantoActual.cantadoPor = cantador;
    cantoActual.nivel = nivel;
    cantoActual.cadena.push(nivel);
    r.cantos[tipo.toLowerCase()] = cantoActual;

    r.esperandoRespuesta = { de: oponente, tipo: tipo, nivel: nivel };
    
    if (tipo === 'FLOR') {
        resolverFlor();
        return;
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

    if (['RETRUCO', 'REAL_ENVIDO', 'CONTRAFLOR', 'FALTA_ENVIDO'].includes(respuesta.decision)) {
        procesarCanto('cpu', canto.tipo, respuesta.decision);
    } else {
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
    const nombreRespondedor = respondedor === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    const oponente = respondedor === 'player' ? 'cpu' : 'player';

    ui.agregarLog(`${nombreRespondedor} dice: ¡${decision.replace(/_/g, ' ')}!`, respondedor);
    
    r.esperandoRespuesta = null;
    r.cantos[canto.tipo.toLowerCase()].respondido = decision;

    if (decision === 'NO_QUIERO') {
        let puntos = 1;
        let motivo = `por ${canto.nivel} no querido`;
        if (canto.tipo === 'TRUCO') {
            puntos = config.PUNTOS[canto.nivel].NO_QUERIDO;
            terminarRondaPorAbandono(oponente, puntos, motivo);
        }
        if (canto.tipo === 'ENVIDO') {
            puntos = calcularPuntosEnvidoNoQuerido();
            sumarPuntos(oponente, puntos, motivo);
            r.cantos.envido.resuelto = true;
            continuarRondaParaTruco();
        }
    } else { // QUISO
        if (canto.tipo === 'ENVIDO') {
            resolverEnvido();
        } else { // TRUCO
            continuarRondaParaTruco();
        }
    }
}

function resolverEnvido() {
    const r = gameState.rondaActual;
    r.cantos.envido.resuelto = true;
    const puntosPlayer = ia.calcularPuntosEnvido(r.manoPlayer);
    const puntosCpu = ia.calcularPuntosEnvido(r.manoCpu);
    
    // *** FIX: Mostrar puntos en el historial ***
    ui.agregarLog(`${gameState.config.nombreJugador} tiene ${puntosPlayer} de envido.<br>TrucoEstrella tiene ${puntosCpu} de envido.`, 'sistema');
    
    let ganador;
    if (puntosPlayer > puntosCpu) ganador = 'player';
    else if (puntosCpu > puntosPlayer) ganador = 'cpu';
    else ganador = r.esManoPlayer ? 'player' : 'cpu';
    
    const puntosGanados = calcularPuntosEnvidoQuerido();
    sumarPuntos(ganador, puntosGanados, 'del envido');
    
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    ui.mostrarModal(`Gana el Envido: ${nombreGanador}`, `${gameState.config.nombreJugador}: ${puntosPlayer} puntos.<br>TrucoEstrella: ${puntosCpu} puntos.`);
    
    continuarRondaParaTruco();
}

function resolverFlor() {
    const r = gameState.rondaActual;
    if (r.rondaTerminada) return;
    r.rondaTerminada = true;

    const puntosPlayer = ia.calcularFlor(r.manoPlayer);
    const puntosCpu = ia.calcularFlor(r.manoCpu);
    let ganador, perdedor, puntosGanados, motivo;

    if (puntosPlayer > 0 && puntosCpu === 0) {
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
        
        const cantoFlor = r.cantos.flor || { nivel: 'FLOR' };
        if (cantoFlor.nivel === 'CONTRAFLOR_AL_RESTO') {
            const puntosOponente = gameState.marcador[perdedor];
            puntosGanados = gameState.config.puntosVictoria - puntosOponente;
        } else if (cantoFlor.nivel === 'CONTRAFLOR') {
            puntosGanados = 6;
        } else {
            puntosGanados = 4;
        }
        motivo = `de ${cantoFlor.nivel}`;
    }

    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    ui.mostrarModal(`Resultado de la Flor`, `${nombreGanador} gana ${puntosGanados} puntos.<br>${gameState.config.nombreJugador}: ${puntosPlayer} pts. | TrucoEstrella: ${puntosCpu} pts.`);
    sumarPuntos(ganador, puntosGanados, motivo);
    gameState.esManoPlayerInicial = !gameState.rondaActual.esManoPlayer;
    setTimeout(() => iniciarNuevaRonda(gameState.esManoPlayerInicial), 4000);
}


// --- Utilidades ---

function continuarRondaParaTruco() {
    const r = gameState.rondaActual;
    r.etapa = 'truco';
    
    if (r.cantoPausado) {
        r.esperandoRespuesta = r.cantoPausado;
        r.cantoPausado = null;
        ui.agregarLog(`Se reanuda el ${r.esperandoRespuesta.nivel}...`, 'sistema');
        if (r.esperandoRespuesta.de === 'cpu') {
            setTimeout(cpuRespondeCanto, 1500);
        } else {
            procesarTurno();
        }
    } else {
        procesarTurno();
    }
}

function calcularPuntosEnvidoQuerido() {
    const cadena = gameState.rondaActual.cantos.envido.cadena;
    if (cadena.includes('FALTA_ENVIDO')) {
        const oponente = gameState.rondaActual.cantos.envido.cantadoPor === 'player' ? 'cpu' : 'player';
        return gameState.config.puntosVictoria - gameState.marcador[oponente];
    }
    let puntos = 0;
    if (cadena.includes('REAL_ENVIDO')) puntos += 3;
    puntos += cadena.filter(c => c === 'ENVIDO').length * 2;
    return puntos || 2;
}

function calcularPuntosEnvidoNoQuerido() {
    const cadena = gameState.rondaActual.cantos.envido.cadena;
    let puntos = 0;
    for(let i = 0; i < cadena.length -1; i++) {
        const canto = cadena[i];
        if (canto === 'ENVIDO') puntos += 2;
        if (canto === 'REAL_ENVIDO') puntos += 3;
    }
    return puntos + 1;
}

function terminarRondaPorAbandono(ganador, puntos, motivo) {
    const r = gameState.rondaActual;
    if (r.rondaTerminada) return;
    r.rondaTerminada = true;

    sumarPuntos(ganador, puntos, motivo);
    gameState.esManoPlayerInicial = !gameState.rondaActual.esManoPlayer;
    setTimeout(() => iniciarNuevaRonda(gameState.esManoPlayerInicial), 2000);
}

function jugadorVaAlMazo() {
    const r = gameState.rondaActual;
    ui.agregarLog(`${gameState.config.nombreJugador} se va al mazo.`, 'player');
    let puntos = 1;
    let motivo = 'por abandono';
    if (r.cantos.truco && r.cantos.truco.respondido !== 'NO_QUIERO') {
        puntos = config.PUNTOS[r.cantos.truco.nivel].QUERIDO -1;
    } else if (r.cantos.envido && !r.cantos.envido.resuelto) {
        puntos = calcularPuntosEnvidoNoQuerido();
        motivo = 'del envido no querido';
    }
    terminarRondaPorAbandono('cpu', puntos, motivo);
}

function sumarPuntos(jugador, cantidad, motivo) {
    if (gameState.partidaTerminada) return;
    gameState.marcador[jugador] += cantidad;
    const nombreJugador = jugador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    ui.agregarLog(`${nombreJugador} suma ${cantidad} punto(s) ${motivo || ''}.`, 'punto');
    ui.actualizarMarcador(gameState.marcador.player, gameState.marcador.cpu, gameState.config.puntosVictoria);
    verificarFinPartida();
}

function verificarFinPartida() {
    if (gameState.marcador.player >= gameState.config.puntosVictoria || gameState.marcador.cpu >= gameState.config.puntosVictoria) {
        finalizarPartida(gameState.marcador.player >= gameState.config.puntosVictoria ? 'player' : 'cpu');
    }
}

function finalizarPartida(ganador) {
    gameState.partidaTerminada = true;
    const nombreGanador = ganador === 'player' ? gameState.config.nombreJugador : 'TrucoEstrella';
    ui.mostrarModal(`¡Partida Terminada!`, `El ganador es ${nombreGanador} con ${gameState.marcador[ganador]} puntos.`, true);
    ui.agregarLog(`--- FIN DE LA PARTIDA ---`, 'sistema');
    actualizarEstadoBotones();
}

function actualizarEstadoBotones() {
    if (gameState.partidaTerminada || gameState.rondaActual.rondaTerminada) {
        ui.actualizarBotones({}); // Deshabilita todos
        return;
    }
    const r = gameState.rondaActual;
    const esTurnoPlayer = r.turno === 'player';
    const esperandoRespuestaPlayer = r.esperandoRespuesta && r.esperandoRespuesta.de === 'player';
    
    const florPlayer = gameState.config.conFlor ? ia.calcularFlor(r.manoPlayer) : 0;

    const estado = {
        esTurnoPlayer: esTurnoPlayer,
        jugadaEnProgreso: r.jugadaEnProgreso,
        esperandoRespuesta: esperandoRespuestaPlayer,
        
        // *** FIX: Lógica para permitir Envido después de Truco ***
        puedeCantarEnvido: (esTurnoPlayer || (esperandoRespuestaPlayer && r.esperandoRespuesta.tipo === 'TRUCO')) && r.etapa === 'inicio' && !r.cantos.flor && !(r.cantos.envido?.resuelto),
        puedeSubirEnvido: esperandoRespuestaPlayer && r.esperandoRespuesta.tipo === 'ENVIDO',
        nivelEnvidoActual: r.cantos.envido ? config.NIVELES_ENVIDO[r.cantos.envido.nivel] : 0,

        puedeCantarTruco: esTurnoPlayer && (!r.cantos.truco || (r.cantos.truco.cantadoPor !== 'player' && r.cantos.truco.respondido === 'QUIERO')),
        nivelTrucoActual: r.cantos.truco ? config.NIVELES_TRUCO[r.cantos.truco.nivel] : 0,
        
        puedeCantarFlor: esTurnoPlayer && gameState.config.conFlor && r.etapa === 'inicio' && florPlayer > 0 && !r.cantos.flor,
        puedeSubirFlor: esperandoRespuestaPlayer && r.esperandoRespuesta.tipo === 'FLOR' && florPlayer > 0,
        nivelFlorActual: r.cantos.flor ? config.NIVELES_FLOR[r.cantos.flor.nivel] : 0,
        
        esperandoRespuestaTruco: esperandoRespuestaPlayer && r.esperandoRespuesta.tipo === 'TRUCO',
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
// *** FIX: Envolver en DOMContentLoaded para evitar errores de elementos nulos ***
document.addEventListener('DOMContentLoaded', () => {
    function init() {
        document.getElementById('start-game-btn').addEventListener('click', iniciarPartida);
        document.getElementById('modal-close-btn').addEventListener('click', ui.ocultarModal);
        
        document.getElementById('btn-revancha').addEventListener('click', () => {
            ui.ocultarModal();
            iniciarPartida();
        });
        document.getElementById('btn-menu-principal').addEventListener('click', () => {
            window.location.reload();
        });
        document.getElementById('btn-clear-cache').addEventListener('click', () => {
            window.location.reload(true);
        });

        document.getElementById('btn-truco').addEventListener('click', () => procesarCanto('player', 'TRUCO', 'TRUCO'));
        document.getElementById('btn-retruco').addEventListener('click', () => procesarCanto('player', 'TRUCO', 'RETRUCO'));
        document.getElementById('btn-vale-cuatro').addEventListener('click', () => procesarCanto('player', 'TRUCO', 'VALE_CUATRO'));
        
        document.getElementById('btn-envido').addEventListener('click', () => procesarCanto('player', 'ENVIDO', 'ENVIDO'));
        document.getElementById('btn-real-envido').addEventListener('click', () => procesarCanto('player', 'ENVIDO', 'REAL_ENVIDO'));
        document.getElementById('btn-falta-envido').addEventListener('click', () => procesarCanto('player', 'ENVIDO', 'FALTA_ENVIDO'));
        
        document.getElementById('btn-flor').addEventListener('click', () => procesarCanto('player', 'FLOR', 'FLOR'));
        document.getElementById('btn-contraflor').addEventListener('click', () => procesarCanto('player', 'FLOR', 'CONTRAFLOR'));
        document.getElementById('btn-contraflor-resto').addEventListener('click', () => procesarCanto('player', 'FLOR', 'CONTRAFLOR_AL_RESTO'));
        
        document.getElementById('btn-quiero').addEventListener('click', () => procesarRespuesta('player', 'QUIERO'));
        document.getElementById('btn-no-quiero').addEventListener('click', () => procesarRespuesta('player', 'NO_QUIERO'));
        
        document.getElementById('btn-ir-al-mazo').addEventListener('click', jugadorVaAlMazo);
    }

    init();
});
