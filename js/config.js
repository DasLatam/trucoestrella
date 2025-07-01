// js/config.js

export const PALOS = {
    ESPADA: 'espada',
    BASTO: 'basto',
    ORO: 'oro',
    COPA: 'copa',
};

export const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export const JERARQUIA_TRUCO = [
    { valor: 1, palo: PALOS.ESPADA, ranking: 14 },
    { valor: 1, palo: PALOS.BASTO, ranking: 13 },
    { valor: 7, palo: PALOS.ESPADA, ranking: 12 },
    { valor: 7, palo: PALOS.ORO, ranking: 11 },
    { valor: 3, palo: PALOS.ESPADA, ranking: 10 },
    { valor: 3, palo: PALOS.BASTO, ranking: 10 },
    { valor: 3, palo: PALOS.ORO, ranking: 10 },
    { valor: 3, palo: PALOS.COPA, ranking: 10 },
    { valor: 2, palo: PALOS.ESPADA, ranking: 9 },
    { valor: 2, palo: PALOS.BASTO, ranking: 9 },
    { valor: 2, palo: PALOS.ORO, ranking: 9 },
    { valor: 2, palo: PALOS.COPA, ranking: 9 },
    { valor: 1, palo: PALOS.ORO, ranking: 8 },
    { valor: 1, palo: PALOS.COPA, ranking: 8 },
    { valor: 12, palo: PALOS.ESPADA, ranking: 7 },
    { valor: 12, palo: PALOS.BASTO, ranking: 7 },
    { valor: 12, palo: PALOS.ORO, ranking: 7 },
    { valor: 12, palo: PALOS.COPA, ranking: 7 },
    { valor: 11, palo: PALOS.ESPADA, ranking: 6 },
    { valor: 11, palo: PALOS.BASTO, ranking: 6 },
    { valor: 11, palo: PALOS.ORO, ranking: 6 },
    { valor: 11, palo: PALOS.COPA, ranking: 6 },
    { valor: 10, palo: PALOS.ESPADA, ranking: 5 },
    { valor: 10, palo: PALOS.BASTO, ranking: 5 },
    { valor: 10, palo: PALOS.ORO, ranking: 5 },
    { valor: 10, palo: PALOS.COPA, ranking: 5 },
    { valor: 7, palo: PALOS.BASTO, ranking: 4 },
    { valor: 7, palo: PALOS.COPA, ranking: 4 },
    { valor: 6, palo: PALOS.ESPADA, ranking: 3 },
    { valor: 6, palo: PALOS.BASTO, ranking: 3 },
    { valor: 6, palo: PALOS.ORO, ranking: 3 },
    { valor: 6, palo: PALOS.COPA, ranking: 3 },
    { valor: 5, palo: PALOS.ESPADA, ranking: 2 },
    { valor: 5, palo: PALOS.BASTO, ranking: 2 },
    { valor: 5, palo: PALOS.ORO, ranking: 2 },
    { valor: 5, palo: PALOS.COPA, ranking: 2 },
    { valor: 4, palo: PALOS.ESPADA, ranking: 1 },
    { valor: 4, palo: PALOS.BASTO, ranking: 1 },
    { valor: 4, palo: PALOS.ORO, ranking: 1 },
    { valor: 4, palo: PALOS.COPA, ranking: 1 },
];

export const VALOR_ENVIDO = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 10: 0, 11: 0, 12: 0
};

export const PUNTOS = {
    TRUCO: {
        NO_QUERIDO: 1,
        QUERIDO: 2,
    },
    RETRUCO: {
        NO_QUERIDO: 2,
        QUERIDO: 3,
    },
    VALE_CUATRO: {
        NO_QUERIDO: 3,
        QUERIDO: 4,
    },
    ENVIDO: {
        NO_QUERIDO: 1,
        QUERIDO: 2,
    },
    ENVIDO_ENVIDO: {
        NO_QUERIDO: 2,
        QUERIDO: 4,
    },
    REAL_ENVIDO: {
        NO_QUERIDO: 1,
        QUERIDO: 3,
    },
    FLOR: {
        BASE: 3,
        CONTRAFLOR: 6,
    }
};