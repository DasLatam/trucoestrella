// js/ia.js
import { JERARQUIA_TRUCO, VALOR_ENVIDO, NIVELES_ENVIDO, NIVELES_TRUCO, NIVELES_FLOR } from './config.js';

// --- Funciones de Cálculo ---

function getRanking(carta) {
    const rankingInfo = JERARQUIA_TRUCO.find(c => c.valor === carta.valor && c.palo === carta.palo);
    return rankingInfo ? rankingInfo.ranking : 0;
}

export function calcularPuntosEnvido(mano) {
    if (calcularFlor(mano) > 0) return 0; // Si hay flor, no hay envido

    const palos = {};
    mano.forEach(carta => {
        if (!palos[carta.palo]) palos[carta.palo] = [];
        palos[carta.palo].push(VALOR_ENVIDO[carta.valor]);
    });

    let maxPuntos = 0;
    for (const palo in palos) {
        if (palos[palo].length >= 2) {
            const valores = palos[palo].sort((a, b) => b - a);
            maxPuntos = Math.max(maxPuntos, 20 + valores[0] + valores[1]);
        }
    }
    
    if (maxPuntos === 0) { // Si no hay dos del mismo palo, es el valor más alto
        const valores = mano.map(c => VALOR_ENVIDO[c.valor]);
        maxPuntos = Math.max(...valores);
    }

    return maxPuntos;
}

export function calcularFlor(mano) {
    const primerPalo = mano[0].palo;
    if (mano.every(c => c.palo === primerPalo)) {
        return 20 + mano.reduce((sum, c) => sum + VALOR_ENVIDO[c.valor], 0);
    }
    return 0;
}


// --- Funciones de Decisión de la IA ---

/**
 * Decide qué carta jugar.
 * @param {Array} manoCpu - La mano actual de la IA.
 * @param {object} rondaState - El estado actual de la ronda.
 * @returns {object|null} La carta que la IA ha decidido jugar, o null si no puede.
 */
export function decidirJugada(manoCpu, rondaState) {
    if (!manoCpu || manoCpu.length === 0) {
        console.error("IA: decidirJugada fue llamada con una mano vacía.");
        return null;
    }

    const cartaJugador = rondaState.mesa.player[rondaState.manoActual - 1];
    const rankingJugador = cartaJugador ? getRanking(cartaJugador) : -1;

    const manoOrdenada = [...manoCpu].sort((a, b) => getRanking(a) - getRanking(b));

    if (rankingJugador === -1) { 
        if (rondaState.ganadorMano[0] === 'cpu') {
            return manoOrdenada[manoOrdenada.length - 1];
        }
        return manoOrdenada[0];
    } else { 
        const ganadoras = manoOrdenada.filter(c => getRanking(c) > rankingJugador);
        if (ganadoras.length > 0) {
            return ganadoras[0];
        } else {
            return manoOrdenada[0];
        }
    }
}

/**
 * Decide si la IA debe cantar algo al inicio de su turno.
 * @param {Array} manoCpu - La mano de la IA.
 * @param {object} rondaState - El estado actual de la ronda.
 * @param {object} config - La configuración del juego (ej. conFlor).
 * @returns {object|null} El canto a realizar o null.
 */
export function decidirCanto(manoCpu, rondaState, config) {
    const puntosEnvido = calcularPuntosEnvido(manoCpu);
    const puntosFlor = calcularFlor(manoCpu);

    // 1. Decisión de Flor (prioridad máxima)
    // *** FIX: Corregido el ReferenceError a gameState ***
    if (rondaState.etapa === 'inicio' && config.conFlor && puntosFlor > 0) {
        return { tipo: 'FLOR', nivel: 'FLOR' };
    }

    // 2. Decisión de Envido (solo si no hay flor)
    // *** FIX: Lógica de envido más agresiva ***
    if (rondaState.etapa === 'inicio' && !rondaState.cantos.flor && !rondaState.cantos.envido) {
        if (puntosEnvido >= 30) return { tipo: 'ENVIDO', nivel: 'REAL_ENVIDO' };
        if (puntosEnvido >= 27) return { tipo: 'ENVIDO', nivel: 'ENVIDO' };
    }

    // 3. Decisión de Truco
    const rankingMedio = manoCpu.reduce((acc, c) => acc + getRanking(c), 0) / manoCpu.length;
    const nivelTrucoActual = rondaState.cantos.truco ? NIVELES_TRUCO[rondaState.cantos.truco.nivel] : 0;
    
    if (nivelTrucoActual === 0) { // Si no se ha cantado truco
        if (rankingMedio > 8 || (rondaState.ganadorMano[0] === 'cpu' && rankingMedio > 6)) {
            return { tipo: 'TRUCO', nivel: 'TRUCO' };
        }
    } else if (nivelTrucoActual === 1 && rondaState.cantos.truco.cantadoPor === 'player') { // Si el jugador cantó truco
         if (rankingMedio > 10) {
            return { tipo: 'TRUCO', nivel: 'RETRUCO' };
        }
    }
    
    return null; // No canta nada
}


/**
 * Decide cómo responder a un canto del jugador.
 */
export function decidirRespuesta(manoCpu, canto, rondaState) {
    const puntosEnvido = calcularPuntosEnvido(manoCpu);
    const puntosFlor = calcularFlor(manoCpu);
    
    switch (canto.tipo) {
        case 'ENVIDO':
            // *** FIX: Lógica de respuesta de envido más agresiva ***
            if (puntosEnvido >= 30 && NIVELES_ENVIDO[canto.nivel] < NIVELES_ENVIDO.FALTA_ENVIDO) return { decision: 'FALTA_ENVIDO' };
            if (puntosEnvido >= 27 && NIVELES_ENVIDO[canto.nivel] < NIVELES_ENVIDO.REAL_ENVIDO) return { decision: 'REAL_ENVIDO' };
            if (puntosEnvido >= 26) return { decision: 'QUIERO' };
            return { decision: 'NO_QUIERO' };

        case 'TRUCO':
            const rankingMedio = manoCpu.reduce((acc, c) => acc + getRanking(c), 0) / manoCpu.length;
            if (canto.nivel === 'TRUCO' && rankingMedio > 10) return { decision: 'RETRUCO' };
            if (rankingMedio > 8) return { decision: 'QUIERO' };
            return { decision: 'NO_QUIERO' };
            
        case 'FLOR':
            if (puntosFlor > 0) {
                if (puntosFlor > canto.puntosJugador && NIVELES_FLOR[canto.nivel] < NIVELES_FLOR.CONTRAFLOR) {
                    return { decision: 'CONTRAFLOR' };
                }
                return { decision: 'QUIERO' };
            }
            return { decision: 'PASO' }; 
    }
    return { decision: 'NO_QUIERO' };
}
