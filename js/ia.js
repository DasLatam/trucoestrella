// js/ia.js
import { JERARQUIA_TRUCO, VALOR_ENVIDO } from './config.js';

function getRanking(carta) {
    const rankingInfo = JERARQUIA_TRUCO.find(c => c.valor === carta.valor && c.palo === carta.palo);
    return rankingInfo ? rankingInfo.ranking : 0;
}

function calcularPuntosEnvido(mano) {
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

export function decidirJugada(manoCpu, manoJugador, mesa) {
    const cartaJugador = mesa.jugador[mesa.jugador.length - 1];
    const rankingJugador = cartaJugador ? getRanking(cartaJugador) : -1;

    manoCpu.sort((a, b) => getRanking(a) - getRanking(b)); // Ordenar de menor a mayor ranking

    if (rankingJugador === -1) { // Si la CPU es mano
        // Jugar la carta más baja
        return manoCpu[0];
    } else {
        // Intentar ganar con la carta más baja posible
        const ganadoras = manoCpu.filter(c => getRanking(c) > rankingJugador);
        if (ganadoras.length > 0) {
            return ganadoras[0]; // La primera de las ganadoras (que es la de menor ranking)
        } else {
            // Si no puede ganar, tirar la más baja
            return manoCpu[0];
        }
    }
}

export function decidirCantoEnvido(manoCpu, esMano) {
    const puntos = calcularPuntosEnvido(manoCpu);
    if (esMano && puntos >= 28) { // Criterio: si es mano y tiene 28 o más
        if (puntos >= 31) return 'REAL_ENVIDO';
        return 'ENVIDO';
    }
    return null; // No canta
}

export function responderEnvido(manoCpu, cantoActual) {
    const misPuntos = calcularPuntosEnvido(manoCpu);
    // Lógica simple de respuesta
    if (misPuntos >= 30) return 'QUIERO'; // Siempre quiere con 30+
    if (misPuntos < 25) return 'NO_QUIERO'; // Nunca quiere con menos de 25
    
    // Entre 25 y 29, depende del canto
    if (cantoActual.includes('FALTA')) return 'NO_QUIERO';
    if (cantoActual.includes('REAL') && misPuntos < 27) return 'NO_QUIERO';
    
    return 'QUIERO';
}

// TODO: Implementar lógica más avanzada para Truco y Flor
export function decidirCantoTruco(manoCpu, estadoRonda) {
    const rankingMedio = manoCpu.reduce((acc, c) => acc + getRanking(c), 0) / manoCpu.length;
    // Si la CPU ganó la primera mano y tiene una carta decente, canta truco
    if (estadoRonda.manosGanadas.cpu === 1 && estadoRonda.manosGanadas.player === 0 && rankingMedio > 8) {
        return 'TRUCO';
    }
    return null;
}

export function responderTruco(manoCpu) {
    const rankingMedio = manoCpu.reduce((acc, c) => acc + getRanking(c), 0) / manoCpu.length;
    if (rankingMedio > 9) return 'QUIERO'; // Si tiene buenas cartas en promedio
    return 'NO_QUIERO';
}

export function calcularFlor(mano) {
    const primerPalo = mano[0].palo;
    if (mano.every(c => c.palo === primerPalo)) {
        return 20 + mano.reduce((sum, c) => sum + VALOR_ENVIDO[c.valor], 0);
    }
    return 0;
}

export function responderFlor(manoCpu) {
    const misPuntosFlor = calcularFlor(manoCpu);
    if (misPuntosFlor > 30) return 'CONTRAFLOR';
    return 'QUIERO'; // Responde 'Flor' implicitamente y luego 'Quiero' a la contraflor del rival si la hay
}