// main.js
import { crearMazo, getValorEnvido, getValorTruco } from "./config.js";
import { mostrarMano, mostrarCartaEnMesa, limpiarMesa, actualizarPorotos, logHistorial } from "./ui.js";
import { iaElegirCantoEnvido, iaResponderEnvido, iaJugarCarta } from "./ia.js";

let jugador = {
  nombre: "Jugador",
  puntos: 0,
  mano: [],
};

let ia = {
  nombre: "TrucoEstrella",
  puntos: 0,
  mano: [],
};

let estado = {
  turno: "jugador", // o "ia"
  cartasJugadas: [],
  enRonda: false,
  enMano: false,
  ronda: 1,
  partidaA: 15,
  florHabilitada: false,
  quienEsMano: "jugador",
  mazo: [],
};

function iniciarJuego() {
  const nombre = document.getElementById("input-nombre").value || "Jugador";
  const puntos = document.querySelector('input[name="puntos"]:checked').value;
  const flor = document.getElementById("check-flor").checked;

  jugador.nombre = nombre;
  jugador.puntos = 0;
  ia.puntos = 0;
  estado.partidaA = parseInt(puntos);
  estado.florHabilitada = flor;
  estado.ronda = 1;
  estado.quienEsMano = Math.random() < 0.5 ? "jugador" : "ia";

  document.getElementById("pantalla-inicio").style.display = "none";
  document.getElementById("pantalla-juego").style.display = "flex";
  logHistorial(`🃏 ¡Comienza la partida a ${estado.partidaA} puntos!`);
  iniciarRonda();
}

function iniciarRonda() {
  estado.enRonda = true;
  estado.cartasJugadas = [];
  estado.turno = estado.quienEsMano;

  estado.mazo = mezclar(crearMazo());

  jugador.mano = estado.mazo.splice(0, 3);
  ia.mano = estado.mazo.splice(0, 3);

  limpiarMesa();
  mostrarMano("jugador", jugador.mano, false, jugarCarta);
  mostrarMano("ia", ia.mano, true);
  actualizarPorotos("jugador", jugador.puntos);
  actualizarPorotos("ia", ia.puntos);

  logHistorial(`🎲 Ronda ${estado.ronda}. Mano: ${estado.quienEsMano === "jugador" ? jugador.nombre : "TrucoEstrella"}`);

  if (estado.florHabilitada) verificarFlor();

  if (estado.turno === "ia") setTimeout(turnoIA, 1000);
}

function verificarFlor() {
  const florJugador = contarFlor(jugador.mano);
  const florIA = contarFlor(ia.mano);

  if (florJugador >= 0 && florIA >= 0) {
    logHistorial(`🌸 Flor de ambos: Jugador ${florJugador} pts vs IA ${florIA} pts`);
    if (florJugador > florIA) jugador.puntos += 3;
    else if (florIA > florJugador) ia.puntos += 3;
  } else if (florJugador >= 0) {
    logHistorial(`🌸 ${jugador.nombre} tiene Flor (${florJugador} pts)`);
    jugador.puntos += 3;
  } else if (florIA >= 0) {
    logHistorial("🌸 TrucoEstrella tiene Flor");
    ia.puntos += 3;
  }
  actualizarPorotos("jugador", jugador.puntos);
  actualizarPorotos("ia", ia.puntos);
}

function contarFlor(mano) {
  const palos = mano.map(c => c.palo);
  const set = new Set(palos);
  if (set.size === 1) {
    return getValorEnvido(mano);
  }
  return -1;
}

function turnoIA() {
  const carta = iaJugarCarta(ia.mano, estado.cartasJugadas[estado.cartasJugadas.length - 1]?.jugador === "jugador" ? estado.cartasJugadas[estado.cartasJugadas.length - 1].carta : null);
  ia.mano = ia.mano.filter(c => c !== carta);
  mostrarMano("ia", ia.mano, true);
  mostrarCartaEnMesa("ia", carta);
  estado.cartasJugadas.push({ jugador: "ia", carta });

  // Ahora turno del jugador
  estado.turno = "jugador";
  mostrarMano("jugador", jugador.mano, false, jugarCarta);
}

function jugarCarta(carta, index) {
  if (estado.turno !== "jugador") return;
  jugador.mano.splice(index, 1);
  mostrarMano("jugador", jugador.mano, false, jugarCarta);
  mostrarCartaEnMesa("jugador", carta);
  estado.cartasJugadas.push({ jugador: "jugador", carta });

  estado.turno = "ia";
  setTimeout(turnoIA, 1000);
}

function mezclar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

document.getElementById("btn-comenzar").addEventListener("click", iniciarJuego);
document.getElementById("btn-reiniciar").addEventListener("click", () => location.reload());
document.getElementById("btn-limpiar-cache").addEventListener("click", () => location.reload(true));
