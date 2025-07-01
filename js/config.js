// js/config.js

// Definición de los palos de la baraja española
export const PALOS = {
    ESPADA: 'espada',
    BASTO: 'basto',
    ORO: 'oro',
    COPA: 'copa',
};

// Valores nominales de las cartas que se usan en el truco
export const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// Jerarquía de las cartas para el truco, de la más alta a la más baja.
// El 'ranking' define el poder de la carta.
export const JERARQUIA_TRUCO = [
    { valor: 1, palo: PALOS.ESPADA, ranking: 14 }, // Ancho de Espada
    { valor: 1, palo: PALOS.BASTO, ranking: 13 },  // Ancho de Basto
    { valor: 7, palo: PALOS.ESPADA, ranking: 12 }, // Siete de Espada
    { valor: 7, palo: PALOS.ORO, ranking: 11 },    // Siete de Oro
    { valor: 3, palo: PALOS.ESPADA, ranking: 10 }, { valor: 3, palo: PALOS.BASTO, ranking: 10 }, { valor: 3, palo: PALOS.ORO, ranking: 10 }, { valor: 3, palo: PALOS.COPA, ranking: 10 },
    { valor: 2, palo: PALOS.ESPADA, ranking: 9 }, { valor: 2, palo: PALOS.BASTO, ranking: 9 }, { valor: 2, palo: PALOS.ORO, ranking: 9 }, { valor: 2, palo: PALOS.COPA, ranking: 9 },
    { valor: 1, palo: PALOS.ORO, ranking: 8 }, { valor: 1, palo: PALOS.COPA, ranking: 8 },
    { valor: 12, palo: PALOS.ESPADA, ranking: 7 }, { valor: 12, palo: PALOS.BASTO, ranking: 7 }, { valor: 12, palo: PALOS.ORO, ranking: 7 }, { valor: 12, palo: PALOS.COPA, ranking: 7 },
    { valor: 11, palo: PALOS.ESPADA, ranking: 6 }, { valor: 11, palo: PALOS.BASTO, ranking: 6 }, { valor: 11, palo: PALOS.ORO, ranking: 6 }, { valor: 11, palo: PALOS.COPA, ranking: 6 },
    { valor: 10, palo: PALOS.ESPADA, ranking: 5 }, { valor: 10, palo: PALOS.BASTO, ranking: 5 }, { valor: 10, palo: PALOS.ORO, ranking: 5 }, { valor: 10, palo: PALOS.COPA, ranking: 5 },
    { valor: 7, palo: PALOS.BASTO, ranking: 4 }, { valor: 7, palo: PALOS.COPA, ranking: 4 },
    { valor: 6, palo: PALOS.ESPADA, ranking: 3 }, { valor: 6, palo: PALOS.BASTO, ranking: 3 }, { valor: 6, palo: PALOS.ORO, ranking: 3 }, { valor: 6, palo: PALOS.COPA, ranking: 3 },
    { valor: 5, palo: PALOS.ESPADA, ranking: 2 }, { valor: 5, palo: PALOS.BASTO, ranking: 2 }, { valor: 5, palo: PALOS.ORO, ranking: 2 }, { valor: 5, palo: PALOS.COPA, ranking: 2 },
    { valor: 4, palo: PALOS.ESPADA, ranking: 1 }, { valor: 4, palo: PALOS.BASTO, ranking: 1 }, { valor: 4, palo: PALOS.ORO, ranking: 1 }, { valor: 4, palo: PALOS.COPA, ranking: 1 },
];

// Mapeo de los valores de las cartas para el cálculo del envido.
// Las figuras (10, 11, 12) valen 0 puntos para el envido.
export const VALOR_ENVIDO = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 10: 0, 11: 0, 12: 0
};

// Puntuaciones para los diferentes cantos del juego.
export const PUNTOS = {
    TRUCO: { NO_QUERIDO: 1, QUERIDO: 2 },
    RETRUCO: { NO_QUERIDO: 2, QUERIDO: 3 },
    VALE_CUATRO: { NO_QUERIDO: 3, QUERIDO: 4 },
    ENVIDO: { NO_QUERIDO: 1, QUERIDO: 2 },
    REAL_ENVIDO: { NO_QUERIDO: 1, QUERIDO: 3 },
    FLOR: { BASE: 3, },
    CONTRAFLOR: { NO_QUERIDO: 3, QUERIDO: 6 },
};

// Niveles de los cantos para gestionar las secuencias
export const NIVELES_TRUCO = {
    '': 0, // No se ha cantado
    TRUCO: 1,
    RETRUCO: 2,
    VALE_CUATRO: 3,
};

export const NIVELES_ENVIDO = {
    '': 0, // No se ha cantado
    ENVIDO: 1,
    REAL_ENVIDO: 2,
    FALTA_ENVIDO: 3,
};

export const NIVELES_FLOR = {
    '': 0, // No se ha cantado
    FLOR: 1,
    CONTRAFLOR: 2,
    CONTRAFLOR_AL_RESTO: 3,
};
