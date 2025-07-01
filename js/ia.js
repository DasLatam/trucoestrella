// ia.js

function calcularEnvido(mano) {
  const palos = {};
  mano.forEach(carta => {
    if (!palos[carta.palo]) palos[carta.palo] = [];
    palos[carta.palo].push(carta.numero <= 7 ? carta.numero : 0);
  });

  let max = 0;
  for (const palo in palos) {
    const nums = palos[palo].sort((a, b) => b - a);
    if (nums.length >= 2) {
      max = Math.max(max, 20 + nums[0] + nums[1]);
    } else if (nums.length === 1) {
      max = Math.max(max, nums[0]);
    }
  }
  return max;
}

function iaElegirCantoEnvido(mano, esMano) {
  const puntos = calcularEnvido(mano);
  if (puntos >= 30) return "falta envido";
  if (puntos >= 27 && esMano) return "real envido";
  if (puntos >= 25) return "envido";
  return null;
}

function iaResponderEnvido(mano, tipo) {
  const puntos = calcularEnvido(mano);
  if (tipo === "envido" && puntos >= 26) return "quiero";
  if (tipo === "real envido" && puntos >= 28) return "quiero";
  if (tipo === "falta envido" && puntos >= 30) return "quiero";
  return "no quiero";
}

function iaElegirCantoTruco(mano, ganoPrimera) {
  const fuerza = mano.reduce((acc, carta) => acc + carta.rank, 0) / mano.length;
  if (fuerza >= 15 || ganoPrimera) return "truco";
  return null;
}

function iaResponderTruco(mano, tipo) {
  const fuerza = mano.reduce((acc, carta) => acc + carta.rank, 0) / mano.length;
  if (tipo === "truco" && fuerza > 13) return "quiero";
  if (tipo === "retruco" && fuerza > 15) return "quiero";
  if (tipo === "vale cuatro" && fuerza > 16) return "quiero";
  return "no quiero";
}

function iaElegirCarta(mano, cartaJugador) {
  if (!cartaJugador) {
    return mano.indexOf(mano.reduce((c, m) => c.rank < m.rank ? c : m));
  }
  const ganadoras = mano.filter(c => c.rank > cartaJugador.rank);
  if (ganadoras.length > 0) {
    const menorGanadora = ganadoras.reduce((a, b) => a.rank < b.rank ? a : b);
    return mano.indexOf(menorGanadora);
  }
  const perdedora = mano.reduce((a, b) => a.rank < b.rank ? a : b);
  return mano.indexOf(perdedora);
}

export {
  calcularEnvido,
  iaElegirCantoEnvido,
  iaResponderEnvido,
  iaElegirCantoTruco,
  iaResponderTruco,
  iaElegirCarta
};

