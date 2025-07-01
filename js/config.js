export const SUITS = {
    ESPADA: '⚔️',
    BASTO: '🌲',
    ORO: '💰',
    COPA: '🍷'
};

export const CARD_HIERARCHY = [
    { number: 1, suit: SUITS.ESPADA, rank: 14, name: "Ancho de Espada" },
    { number: 1, suit: SUITS.BASTO, rank: 13, name: "Ancho de Basto" },
    { number: 7, suit: SUITS.ESPADA, rank: 12, name: "Siete de Espada" },
    { number: 7, suit: SUITS.ORO, rank: 11, name: "Siete de Oro" },
    { number: 3, suit: SUITS.ESPADA, rank: 10, name: "Tres" },
    { number: 3, suit: SUITS.BASTO, rank: 10, name: "Tres" },
    { number: 3, suit: SUITS.ORO, rank: 10, name: "Tres" },
    { number: 3, suit: SUITS.COPA, rank: 10, name: "Tres" },
    { number: 2, suit: SUITS.ESPADA, rank: 9, name: "Dos" },
    { number: 2, suit: SUITS.BASTO, rank: 9, name: "Dos" },
    { number: 2, suit: SUITS.ORO, rank: 9, name: "Dos" },
    { number: 2, suit: SUITS.COPA, rank: 9, name: "Dos" },
    { number: 1, suit: SUITS.ORO, rank: 8, name: "Ancho Falso" },
    { number: 1, suit: SUITS.COPA, rank: 8, name: "Ancho Falso" },
    { number: 12, suit: SUITS.ESPADA, rank: 7, name: "Doce" },
    { number: 12, suit: SUITS.BASTO, rank: 7, name: "Doce" },
    { number: 12, suit: SUITS.ORO, rank: 7, name: "Doce" },
    { number: 12, suit: SUITS.COPA, rank: 7, name: "Doce" },
    { number: 11, suit: SUITS.ESPADA, rank: 6, name: "Once" },
    { number: 11, suit: SUITS.BASTO, rank: 6, name: "Once" },
    { number: 11, suit: SUITS.ORO, rank: 6, name: "Once" },
    { number: 11, suit: SUITS.COPA, rank: 6, name: "Once" },
    { number: 10, suit: SUITS.ESPADA, rank: 5, name: "Diez" },
    { number: 10, suit: SUITS.BASTO, rank: 5, name: "Diez" },
    { number: 10, suit: SUITS.ORO, rank: 5, name: "Diez" },
    { number: 10, suit: SUITS.COPA, rank: 5, name: "Diez" },
    { number: 7, suit: SUITS.BASTO, rank: 4, name: "Siete Falso" },
    { number: 7, suit: SUITS.COPA, rank: 4, name: "Siete Falso" },
    { number: 6, suit: SUITS.ESPADA, rank: 3, name: "Seis" },
    { number: 6, suit: SUITS.BASTO, rank: 3, name: "Seis" },
    { number: 6, suit: SUITS.ORO, rank: 3, name: "Seis" },
    { number: 6, suit: SUITS.COPA, rank: 3, name: "Seis" },
    { number: 5, suit: SUITS.ESPADA, rank: 2, name: "Cinco" },
    { number: 5, suit: SUITS.BASTO, rank: 2, name: "Cinco" },
    { number: 5, suit: SUITS.ORO, rank: 2, name: "Cinco" },
    { number: 5, suit: SUITS.COPA, rank: 2, name: "Cinco" },
    { number: 4, suit: SUITS.ESPADA, rank: 1, name: "Cuatro" },
    { number: 4, suit: SUITS.BASTO, rank: 1, name: "Cuatro" },
    { number: 4, suit: SUITS.ORO, rank: 1, name: "Cuatro" },
    { number: 4, suit: SUITS.COPA, rank: 1, name: "Cuatro" },
];

export const GAME_POINTS = {
    NO_QUIERO_TRUCO: 1,
    TRUCO: 2,
    NO_QUIERO_RETRUCO: 2,
    RETRUCO: 3,
    NO_QUIERO_VALE4: 3,
    VALE_CUATRO: 4,
    
    NO_QUIERO_ENVIDO: 1,
    ENVIDO: 2,
    
    NO_QUIERO_REAL_ENVIDO: 1,
    REAL_ENVIDO: 3,
    
    NO_QUIERO_ENVIDO_ENVIDO: 2,
    ENVIDO_ENVIDO: 4,

    NO_QUIERO_ENVIDO_REAL: 3,
    ENVIDO_REAL: 5,

    NO_QUIERO_ENVIDO_ENVIDO_REAL: 4,
    ENVIDO_ENVIDO_REAL: 7,

    FALTA_ENVIDO: (opponentPoints, maxPoints) => maxPoints - opponentPoints,

    FLOR: 3,
    NO_QUIERO_CONTRAFLOR: 3,
    CONTRAFLOR: 6,
    NO_QUIERO_CONTRAFLOR_AL_RESTO: 6,
    CONTRAFLOR_AL_RESTO: (opponentPoints, maxPoints) => maxPoints - opponentPoints,
};

export const PLAYERS = {
    PLAYER: 'player',
    IA: 'ia'
};