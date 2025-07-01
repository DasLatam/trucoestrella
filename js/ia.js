// ia.js

import { getValorEnvido, getValorTruco } from "./config.js";
import { logHistorial } from "./ui.js";

export function iaElegirCantoEnvido(mano) {
  const puntos = getValorEnvido(mano);
  if (puntos >= 30) return "falta envido";
  if (puntos >= 27) return "real envido";
  if (puntos >= 25) return "envido";
  return null;
}

export function iaResponderEnvido(mano, cantoJugador) {
  const puntos = getValorEnvido(mano);

  if (cantoJugador === "envido" && puntos >= 26) return "quiero";
  if (cantoJugador === "real envido" && puntos >= 28) return "quiero";
  if (cantoJugador === "falta envido" && puntos >= 30) return "quiero";

  return "no quiero";
}

export function iaDecidirTruco(mano, esMano) {
  const valores = mano.map(getValorTruco);
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  if (esMano && promedio < 6) return "truco";
  return null;
}

export function iaResponderTruco(mano, cantoActual) {
  const valores = mano.map(getValorTruco);
  const tieneBuenas = valores.filter(v => v < 5).length >= 2;

  if (tieneBuenas && cantoActual === "truco") return "quiero";
  if (tieneBuenas && cantoActual === "retruco") return "quiero";
  if (!tieneBuenas) return "no quiero";

  return "quiero";
}

export function iaJugarCarta(manoIA, cartaJugador) {
  let elegida;

  if (!cartaJugador) {
    // IA juega primero: carta más débil
    elegida = manoIA.reduce((min, c) => getValorTruco(c) > getValorTruco(min) ? min : c);
  } else {
    // IA reacciona
    const ganadoras = manoIA.filter(c => getValorTruco(c) < getValorTruco(cartaJugador));
    if (ganadoras.length > 0) {
      // Jugar la más débil que le gana
      elegida = ganadoras.reduce((min, c) => getValorTruco(c) > getValorTruco(min) ? min : c);
    } else {
      // Perder con la peor
      elegida = manoIA.reduce((max, c) => getValorTruco(c) > getValorTruco(max) ? max : c);
    }
  }

  logHistorial(`TrucoEstrella juega ${elegida.numero} ${elegida.palo}`);
  return elegida;
}
