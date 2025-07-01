// config.js

// Palos de la baraja española
export const PALOS = ["espada", "basto", "oro", "copa"];

// Símbolos visuales
export const SIMBOLOS_PALOS = {
  espada: "⚔️",
  basto: "🌲",
  oro: "💰",
  copa: "🍷",
};

// Cartas válidas por palo
export const NUMEROS_VALIDOS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// Ranking de Truco (de mayor a menor)
export const RANKING_TRUCO = [
  { numero: 1, palo: "espada" },
  { numero: 1, palo: "basto" },
  { numero: 7, palo: "espada" },
  { numero: 7, palo: "oro" },
  { numero: 3 },
  { numero: 2 },
  { numero: 1 },
  { numero: 12 },
  { numero: 11 },
  { numero: 10 },
  { numero: 7 },
  { numero: 6 },
  { numero: 5 },
  { numero: 4 },
];

// Valor numérico para comparar cartas en Truco
export const getValorTruco = (carta) => {
  for (let i = 0; i < RANKING_TRUCO.length; i++) {
    const r = RANKING_TRUCO[i];
    if (r.numero === carta.numero && (!r.palo || r.palo === carta.palo)) {
      return i;
    }
  }
  return 99; // invalida
};

// Valor para Envido y Flor
export const getValorEnvido = (mano) => {
  const grupos = {};
  for (const carta of mano) {
    if (!grupos[carta.palo]) grupos[carta.palo] = [];
    grupos[carta.palo].push(carta);
  }

  let max = 0;
  for (const cartas of Object.values(grupos)) {
    const nums = cartas.map(c => c.numero <= 7 ? c.numero : 0);
    if (cartas.length >= 2) {
      const mejores = nums.sort((a, b) => b - a).slice(0, 2);
      const suma = mejores[0] + mejores[1] + 20;
      if (suma > max) max = suma;
    } else {
      const sola = nums[0] || 0;
      if (sola > max) max = sola;
    }
  }

  return max;
};

// Crea la baraja completa
export const crearMazo = () => {
  const mazo = [];
  for (const palo of PALOS) {
    for (const numero of NUMEROS_VALIDOS) {
      mazo.push({ numero, palo });
    }
  }
  return mazo;
};
