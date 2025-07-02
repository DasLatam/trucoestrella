/**
 * config.js
 * Módulo para constantes y configuración del juego Gran Truco Argentino.
 * Centraliza todas las reglas inmutables del juego para fácil mantenimiento.
 */

// Palos de la baraja española
export const PALOS = {
  ESPADA: 'espada',
  BASTO: 'basto',
  ORO: 'oro',
  COPA: 'copa',
};

// Símbolos para la UI, asociados a los palos
export const SIMBOLOS_PALO = {
 : '⚔️',
 : '🌲',
 : '💰',
 : '🍷',
};

// Números de las cartas, incluyendo figuras
export const NUMEROS = ;

// Definición completa de la baraja de 40 cartas
const crearBaraja = () => {
  const baraja =;
  for (const palo of Object.values(PALOS)) {
    for (const numero of NUMEROS) {
      baraja.push({
        id: `${numero}-${palo}`,
        palo,
        numero,
        // El valor para el envido es el número de la carta, o 0 para las figuras (10, 11, 12)
        valorEnvido: numero < 10? numero : 0,
      });
    }
  }
  return baraja;
};

export const BARAJA = crearBaraja();

// Jerarquía de poder de las cartas para el Truco (de mayor a menor)
// A cada carta se le asigna un valor numérico para facilitar la comparación
export const TRUCO_HIERARCHY =;

// Mapeo para obtener el valor de truco de una carta por su ID
export const VALORES_TRUCO = TRUCO_HIERARCHY.reduce((acc, carta) => {
  acc[carta.id] = carta.valorTruco;
  return acc;
}, {});

// Puntos otorgados por cada tipo de canto
export const PUNTOS = {
  TRUCO: { NO_QUERIDO: 1, QUERIDO: 2 },
  RETUCO: { NO_QUERIDO: 2, QUERIDO: 3 },
  VALE_CUATRO: { NO_QUERIDO: 3, QUERIDO: 4 },
  ENVIDO: { NO_QUERIDO: 1, QUERIDO: 2 },
  ENVIDO_ENVIDO: { NO_QUERIDO: 2, QUERIDO: 4 },
  REAL_ENVIDO: { NO_QUERIDO: 1, QUERIDO: 3 },
  FLOR: 3,
  CONTRAFLOR: { NO_QUERIDO: 3, QUERIDO: 6 },
  // Las combinaciones de envido más complejas
  ENVIDO_REAL_ENVIDO: { NO_QUERIDO: 2, QUERIDO: 5 },
  ENVIDO_ENVIDO_REAL_ENVIDO: { NO_QUERIDO: 4, QUERIDO: 7 },
  // La falta envido y contraflor al resto son calculados dinámicamente
};

// Constantes para identificar a los jugadores/equipos
export const JUGADORES = {
  JUGADOR: 'jugador',
  IA: 'ia',
};

// Identificadores para los equipos
export const EQUIPOS = {
  NOSOTROS: 'nosotros',
  ELLOS: 'ellos',
};

// Estados posibles del juego (para la máquina de estados)
export const ESTADOS_JUEGO = {
  INICIO: 'inicio',
  REPARTIENDO: 'repartiendo',
  ESPERANDO_JUGADA: 'esperando_jugada',
  ESPERANDO_RESPUESTA_CANTO: 'esperando_respuesta_canto',
  MANO_TERMINADA: 'mano_terminada',
  PARTIDA_TERMINADA: 'partida_terminada',
};

// Identificadores de los cantos disponibles
export const CANTOS = {
  TRUCO: 'truco',
  RETUCO: 'retruco',
  VALE_CUATRO: 'vale-cuatro',
  ENVIDO: 'envido',
  REAL_ENVIDO: 'real-envido',
  FALTA_ENVIDO: 'falta-envido',
  FLOR: 'flor',
  CONTRAFLOR: 'contraflor',
  CONTRAFLOR_AL_RESTO: 'contraflor-al-resto',
  IR_AL_MAZO: 'me-voy-al-mazo',
  QUIERO: 'quiero',
  NO_QUIERO: 'no-quiero',
};

// Configuración general del juego
export const GAME_CONFIG = {
  CARTAS_POR_MANO: 3,
  MAX_PUNTOS_MALAS: 15,
  PUNTOS_PARTIDA_CORTA: 15,
  PUNTOS_PARTIDA_LARGA: 30,
  TIEMPO_ESPERA_IA: 1500, // ms
};