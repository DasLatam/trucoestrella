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
        jugador: "VOS", ia: "IA"
    }
};

const PUNTOS_CANTO = [
  { "canto": "Envido", "puntos_no_quiero": 1, "puntos_ganador": 2 },
  { "canto": "Real Envido", "puntos_no_quiero": 1, "puntos_ganador": 3 },
  { "canto": "Falta Envido", "puntos_no_quiero": 1, "puntos_ganador": "Falta" },
  { "canto": "Envido,Envido", "puntos_no_quiero": 2, "puntos_ganador": 4 },
  { "canto": "Envido,Real Envido", "puntos_no_quiero": 2, "puntos_ganador": 5 },
  { "canto": "Envido,Falta Envido", "puntos_no_quiero": 2, "puntos_ganador": "Falta" },
  { "canto": "Envido,Envido,Real Envido", "puntos_no_quiero": 4, "puntos_ganador": 7 },
  { "canto": "Envido,Envido,Falta Envido", "puntos_no_quiero": 4, "puntos_ganador": "Falta" },
  { "canto": "Flor", "puntos_no_quiero": null, "puntos_ganador": 3 },
  { "canto": "Contra Flor", "puntos_no_quiero": 4, "puntos_ganador": 6 },
  { "canto": "Contra Flor al Resto", "puntos_no_quiero": 6, "puntos_ganador": "Falta" },
  { "canto": "Truco", "puntos_no_quiero": 1, "puntos_ganador": 2 },
  { "canto": "ReTruco", "puntos_no_quiero": 2, "puntos_ganador": 3 },
  { "canto": "Vale Cuatro", "puntos_no_quiero": 3, "puntos_ganador": 4 }
];

const REGLAS_CANTO = {
  "PRIMERA": {
    "no_jugo": { "Envido": true, "Real Envido": true, "Falta Envido": true },
  },
  "CUALQUIER_RONDA": {
      "sin_truco": { "Truco": true },
      "con_truco": { "ReTruco": true },
      "con_retruco": { "Vale Cuatro": true }
  },
  "RESPUESTA_ENVIDO": {
      "Envido": { "Envido": true, "Real Envido": true, "Falta Envido": true },
      "Real Envido": { "Falta Envido": true }
  },
   "RESPUESTA_FLOR": {
      "Flor": { "Contra Flor": true }
  }
};