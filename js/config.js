const CONFIG = {
    puntos: {
        partida15: 15,
        partida30: 30,
    },
    valoresCartas: {
        '1 de Espada': 14, '1 de Basto': 13, '7 de Espada': 12, '7 de Oro': 11,
        '3': 10, '2': 9, '1 de Copa': 8, '1 de Oro': 8,
        '12': 7, '11': 6, '10': 5,
        '7 de Copa': 4, '7 de Basto': 4,
        '6': 3, '5': 2, '4': 1,
    },
    palos: ['Oro', 'Copa', 'Espada', 'Basto'],
    numeros: ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'],
    nombresJugadores: {
        jugador: "VOS", ia: "IA", nosotros: "NOS", ellos: "ELLOS"
    },
    // --- NUEVA SECCIÓN ---
    PUNTOS_CANTO: {
        truco: { noQuiero: 1, quiero: 2 },
        retruco: { noQuiero: 2, quiero: 3 },
        valeCuatro: { noQuiero: 3, quiero: 4 },
        envido: { noQuiero: 1, quiero: 2 },
        realEnvido: { noQuiero: 1, quiero: 3 },
        faltaEnvido: { noQuiero: 1 }, // El quiero es dinámico
        flor: {
            normal: 3,
            contraflor: { noQuiero: 4, quiero: 6 },
            contraflorAlResto: { noQuiero: 6 } // El quiero es dinámico
        }
    }
};

const REGLAS_CANTO = {
    momentos: {
        primeraMano: ["ENVIDO", "REAL ENVIDO", "FALTA ENVIDO", "FLOR"],
        siempre: ["TRUCO", "IR AL MAZO"]
    }
};

// ... (resto del archivo sin cambios) ...