export const GAME_CONSTANTS = {
    CARDS_PER_PLAYER: 3,
    POINTS_TO_WIN: 30,
    POINTS_TO_WIN_SHORT: 15,
    PALOS: ['espada', 'basto', 'oro', 'copa'],
    PALOS_EMOJI: {
        espada: '⚔️',
        basto: '🌲',
        oro: '💰',
        copa: '🍷'
    },
    CARTAS: [1,2,3,4,5,6,7,10,11,12],
    CARTA_VALOR_TRUCO: [
        [1, 'espada', 14],
        [1, 'basto', 13],
        [7, 'espada', 12],
        [7, 'oro', 11],
        [3, '', 10],
        [2, '', 9],
        [1, 'copa', 8],
        [1, 'oro', 8],
        [12, '', 7],
        [11, '', 6],
        [10, '', 5],
        [7, 'copa', 4],
        [7, 'basto', 4],
        [6, '', 3],
        [5, '', 2],
        [4, '', 1]
    ],
    VERSION: 'Beta 3.0 Copilot'
};