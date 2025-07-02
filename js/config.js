// js/config.js

export const SUITS = {
    SWORDS: '⚔️', // Espadas
    CLUBS: '🌲',  // Bastos
    COINS: '💰',  // Oros
    CUPS: '🍷'   // Copas
};

export const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]; // Sin 8s y 9s

// Jerarquía de cartas para el Truco (de mayor a menor valor)
// Cada elemento es un objeto { value: numero, suit: palo }
// 'null' en suit significa que aplica a cualquier palo
export const TRUCO_HIERARCHY = [
    { value: 1, suit: SUITS.SWORDS }, // As de Espadas (Macho)
    { value: 1, suit: SUITS.CLUBS },  // As de Bastos
    { value: 7, suit: SUITS.SWORDS }, // Siete de Espadas (Siete bravo)
    { value: 7, suit: SUITS.COINS },  // Siete de Oros (Siete bravo)
    { value: 3, suit: null },         // Todos los 3
    { value: 2, suit: null },         // Todos los 2
    { value: 1, suit: SUITS.CUPS },   // As de Copas (Ancho falso)
    { value: 1, suit: SUITS.COINS },  // As de Oros (Ancho falso)
    { value: 12, suit: null },        // Todos los 12 (Rey)
    { value: 11, suit: null },        // Todos los 11 (Caballo)
    { value: 10, suit: null },        // Todos los 10 (Sota)
    { value: 7, suit: SUITS.CUPS },   // Siete de Copas (Siete falso)
    { value: 7, suit: SUITS.CLUBS },  // Siete de Bastos (Siete falso)
    { value: 6, suit: null },         // Todos los 6
    { value: 5, suit: null },         // Todos los 5
    { value: 4, suit: null }          // Todos los 4
];

// Valor de las cartas para el Envido
export const ENVIDO_VALUES = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
    10: 0, 11: 0, 12: 0 // Figuras valen 0
};

export const GAME_CONSTANTS = {
    CARDS_PER_PLAYER: 3,
    POINTS_FOR_ENVIDO_PAIR: 20,
    DEFAULT_PLAYER_NAME: 'Jugador 1',
    DEFAULT_GAME_POINTS: 30,
    DEFAULT_PLAY_WITH_FLOR: false,
    VERSION: 'Beta 1.1' // ACTUALIZADA LA VERSIÓN AQUÍ
};

// Exporta una función para obtener el valor de Truco de una carta
export function getTrucoValue(card) {
    for (let i = 0; i < TRUCO_HIERARCHY.length; i++) {
        const hierarchyCard = TRUCO_HIERARCHY[i];
        // Si el palo es nulo, significa que aplica a cualquier palo (ej. todos los 3)
        if (hierarchyCard.suit === null) {
            if (card.value === hierarchyCard.value) {
                return TRUCO_HIERARCHY.length - i; // Devuelve un valor numérico para comparación
            }
        } else {
            // Si el palo es específico, debe coincidir tanto valor como palo
            if (card.value === hierarchyCard.value && card.suit === hierarchyCard.suit) {
                return TRUCO_HIERARCHY.length - i;
            }
        }
    }
    return 0; // Si la carta no se encuentra (no debería pasar con un mazo válido)
}

// Exporta una función para obtener el valor de Envido de una carta
export function getEnvidoValue(card) {
    return ENVIDO_VALUES[card.value];
}