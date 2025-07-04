const CONFIG = {
    puntos: {
        partida15: 15,
        partida30: 30,
    },
    valoresCartas: {
        '1 de Espada': 14,
        '1 de Basto': 13,
        '7 de Espada': 12,
        '7 de Oro': 11,
        '3': 10,
        '2': 9,
        '1 de Copa': 8,
        '1 de Oro': 8,
        '12': 7,
        '11': 6,
        '10': 5,
        '7 de Copa': 4,
        '7 de Basto': 4,
        '6': 3,
        '5': 2,
        '4': 1,
    },
    palos: ['Oro', 'Copa', 'Espada', 'Basto'],
    numeros: ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'],
    nombresJugadores: {
        jugador: "VOS",
        ia: "IA",
        nosotros: "NOS",
        ellos: "ELLOS"
    }
};

const REGLAS_CANTO = {
    // Lógica extraída de cantos_reglas.json para fácil acceso
    momentos: {
        primeraMano: ["ENVIDO", "REAL ENVIDO", "FALTA ENVIDO", "FLOR"],
        siempre: ["TRUCO", "IR AL MAZO"]
    }
};

const REGLAS_FIN_MANO = {
    // Lógica extraída de fin_mano.json para fácil acceso
    condiciones: [
        "Ambos jugadores jugaron 3 cartas",
        "Un jugador se fue al mazo",
        "Se cantó y se quiso un envido/flor y se terminaron los puntos en juego",
        "Un jugador gana las dos primeras manos"
    ]
};