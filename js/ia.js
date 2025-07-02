/**
 * ia.js
 * Módulo para la lógica y estrategia de la Inteligencia Artificial "TrucoEstrella".
 */

import { JUGADORES, VALORES_TRUCO, PALOS } from './config.js';

/**
 * Función principal que decide la próxima acción de la IA.
 * @param {object} estadoJuego - El estado actual completo del juego.
 * @returns {object} - La acción que la IA ha decidido tomar.
 */
export function decidirJugada(estadoJuego) {
  // Por ahora, la lógica es muy simple: jugar la carta más fuerte que tenga.
  // En el futuro, aquí se implementará la lógica de la matriz de decisión.

  // Lógica de evaluación de mano
  const manoIA = estadoJuego.jugadores.mano;
  const evaluacion = evaluarMano(manoIA);

  // TODO: Implementar lógica de cantos (Envido, Truco, etc.)

  // Lógica de juego de carta
  // Estrategia simple: si es primera ronda, jugar la más fuerte para intentar ganar.
  // Si no, jugar la que mate la carta del oponente si puede, si no, la más baja.
  
  const cartasEnMesaRondaActual = estadoJuego.ronda.cartasEnMesa.slice((estadoJuego.ronda.numero - 1) * 2);
  
  if (cartasEnMesaRondaActual.length === 0) {
    // La IA empieza la ronda. Juega su carta más fuerte.
    return { tipo: 'jugar_carta', valor: evaluacion.cartaMasFuerte.id };
  } else {
    // El jugador ya jugó. La IA debe responder.
    const cartaJugador = cartasEnMesaRondaActual.carta;
    const valorCartaJugador = VALORES_TRUCO[cartaJugador.id];

    // Buscar la carta más baja que pueda ganar
    const cartasGanadoras = manoIA
     .filter(c => VALORES_TRUCO[c.id] > valorCartaJugador)
     .sort((a, b) => VALORES_TRUCO[a.id] - VALORES_TRUCO[b.id]);

    if (cartasGanadoras.length > 0) {
      // Tiene con qué ganar, juega la más chica de las ganadoras
      return { tipo: 'jugar_carta', valor: cartasGanadoras.id };
    } else {
      // No puede ganar, juega su carta más débil
      return { tipo: 'jugar_carta', valor: evaluacion.cartaMasDebil.id };
    }
  }
}

/**
 * Evalúa la mano de la IA para determinar su fuerza.
 * @param {Array<object>} mano - Las cartas en la mano de la IA.
 * @returns {object} - Un objeto con la evaluación de la mano.
 */
function evaluarMano(mano) {
  if (mano.length === 0) {
    return { puntosEnvido: 0, cartaMasFuerte: null, cartaMasDebil: null };
  }

  // Ordenar la mano por valor de truco para encontrar la más fuerte y la más débil
  const manoOrdenadaTruco = [...mano].sort((a, b) => VALORES_TRUCO[b.id] - VALORES_TRUCO[a.id]);

  return {
    puntosEnvido: calcularEnvido(mano),
    cartaMasFuerte: manoOrdenadaTruco,
    cartaMasDebil: manoOrdenadaTruco,
    fuerzaGeneral: mano.reduce((acc, c) => acc + VALORES_TRUCO[c.id], 0) // Métrica simple
  };
}

/**
 * Calcula los puntos de envido para una mano dada.
 * @param {Array<object>} mano - Las cartas a evaluar.
 * @returns {number} - Los puntos de envido.
 */
function calcularEnvido(mano) {
  const palos = {};
  mano.forEach(carta => {
    if (!palos[carta.palo]) {
      palos[carta.palo] =;
    }
    palos[carta.palo].push(carta.valorEnvido);
  });

  let maxPuntos = 0;

  for (const palo in palos) {
    if (palos[palo].length >= 2) {
      // Tiene dos o tres cartas del mismo palo
      const valores = palos[palo].sort((a, b) => b - a);
      const puntos = 20 + valores + valores;
      if (puntos > maxPuntos) {
        maxPuntos = puntos;
      }
    }
  }

  if (maxPuntos > 0) {
    return maxPuntos;
  }

  // Si no hay dos cartas del mismo palo, es el valor de la carta más alta
  return Math.max(...mano.map(c => c.valorEnvido));
}