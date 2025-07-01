// main.js
import { crearMazo, getValorEnvido, getValorTruco, jerarquiaTruco } from "./config.js";
import {
  mostrarMano,
  mostrarCartaEnMesa,
  limpiarMesa,
  actualizarPorotos,
  logHistorial,
  mostrarBotonesCanto,
  ocultarBotonesCanto,
  mostrarModalVictoria,
  mostrarOpcionesEnvido,
  mostrarOpcionesTruco,
  mostrarRespuestaCanto,
  bloquearCartas,
  desbloquearCartas
} from "./ui.js";
import {
  iaJugarCarta,
  iaElegirCantoTruco,
  iaResponderTruco,
  iaElegirCantoEnvido,
  iaResponderEnvido
} from "./ia.js";

let jugador = { nombre: "Jugador", puntos: 0, mano: [], envido: 0 };
let ia = { nombre: "TrucoEstrella", puntos: 0, mano: [], envido: 0 };

let estado = {
  turno: "jugador",
  cartasJugadas: [],
  enRonda: false,
  ronda: 1,
  partidaA: 15,
  florHabilitada: false,
  quienEsMano: "jugador",
  mazo: [],
  manoActual: 1,
  cantos: {
    envido: null,
    truco: { nivel: 1, activo: false },
    flor: null
  },
  historialManos: [],
  cartasJugador: [],
  cartasIA: [],
  estadoCanto: null // 'envido', 'truco', etc.
};

function iniciarJuego() {
  jugador.nombre = document.getElementById("input-nombre").value || "Jugador";
  estado.partidaA = parseInt(document.querySelector('input[name="puntos"]:checked').value);
  estado.florHabilitada = document.getElementById("check-flor").checked;

  document.getElementById("pantalla-inicio").style.display = "none";
  document.getElementById("pantalla-juego").style.display = "flex";

  logHistorial(`🎯 Comienza la partida a ${estado.partidaA} puntos.`);
  iniciarRonda();
}

function iniciarRonda() {
  estado.enRonda = true;
  estado.cartasJugadas = [];
  estado.manoActual = 1;
  estado.cantos = { envido: null, truco: { nivel: 1, activo: false }, flor: null };
  estado.turno = estado.quienEsMano;

  estado.mazo = mezclar(crearMazo());
  jugador.mano = estado.mazo.splice(0, 3);
  ia.mano = estado.mazo.splice(0, 3);

  jugador.envido = getValorEnvido(jugador.mano);
  ia.envido = getValorEnvido(ia.mano);

  mostrarMano("jugador", jugador.mano, false, jugarCarta);
  mostrarMano("ia", ia.mano, true);
  limpiarMesa();
  actualizarPorotos("jugador", jugador.puntos);
  actualizarPorotos("ia", ia.puntos);
  mostrarBotonesCanto(true);

  logHistorial(`🃏 Ronda ${estado.ronda}: Mano es ${estado.quienEsMano}`);

  if (estado.turno === "ia") turnoIA();
}

function jugarCarta(carta, index) {
  if (estado.turno !== "jugador" || estado.estadoCanto) return;

  bloquearCartas();
  jugador.mano.splice(index, 1);
  estado.cartasJugador.push(carta);
  estado.cartasJugadas.push({ jugador: "jugador", carta });

  mostrarMano("jugador", jugador.mano, false, jugarCarta);
  mostrarCartaEnMesa("jugador", carta);
  cambiarTurno();
}

function turnoIA() {
  if (estado.estadoCanto) return;

  setTimeout(() => {
    const eleccion = iaElegirCantoTruco(ia.mano);
    if (!estado.cantos.truco.activo && eleccion === "truco") {
      cantarTruco("ia");
      return;
    }

    const cartaJugador = estado.cartasJugadas.filter(c => c.jugador === "jugador")[estado.manoActual - 1];
    const cartaIA = iaJugarCarta(ia.mano, cartaJugador?.carta);
    ia.mano = ia.mano.filter(c => c !== cartaIA);
    estado.cartasIA.push(cartaIA);
    estado.cartasJugadas.push({ jugador: "ia", carta: cartaIA });
    mostrarMano("ia", ia.mano, true);
    mostrarCartaEnMesa("ia", cartaIA);
    cambiarTurno();
  }, 1000);
}

function cambiarTurno() {
  if (estado.cartasJugador.length === estado.manoActual && estado.cartasIA.length === estado.manoActual) {
    const cartaJ = estado.cartasJugador[estado.manoActual - 1];
    const cartaI = estado.cartasIA[estado.manoActual - 1];
    const resultado = compararCartas(cartaJ, cartaI);

    if (resultado === 1) logHistorial(`🟢 Mano ${estado.manoActual} la gana ${jugador.nombre}`);
    else if (resultado === -1) logHistorial(`🔴 Mano ${estado.manoActual} la gana TrucoEstrella`);
    else logHistorial(`⚪ Mano ${estado.manoActual} es parda`);

    estado.manoActual++;

    if (estado.manoActual > 3) terminarRonda();
    else estado.turno = estado.quienEsMano === "jugador" ? "ia" : "jugador";

    desbloquearCartas();
    if (estado.turno === "ia") turnoIA();
  } else {
    estado.turno = estado.turno === "jugador" ? "ia" : "jugador";
    desbloquearCartas();
    if (estado.turno === "ia") turnoIA();
  }
}

function compararCartas(carta1, carta2) {
  const valor1 = getValorTruco(carta1);
  const valor2 = getValorTruco(carta2);
  if (valor1 > valor2) return 1;
  else if (valor1 < valor2) return -1;
  else return 0;
}

function terminarRonda() {
  const manosGanadas = { jugador: 0, ia: 0 };

  for (let i = 0; i < 3; i++) {
    const cJ = estado.cartasJugador[i];
    const cI = estado.cartasIA[i];
    if (!cJ || !cI) continue;
    const res = compararCartas(cJ, cI);
    if (res === 1) manosGanadas.jugador++;
    else if (res === -1) manosGanadas.ia++;
  }

  let ganador = null;
  if (manosGanadas.jugador > manosGanadas.ia) ganador = "jugador";
  else if (manosGanadas.ia > manosGanadas.jugador) ganador = "ia";
  else ganador = estado.quienEsMano;

  if (ganador === "jugador") {
    jugador.puntos += estado.cantos.truco.nivel;
    logHistorial(`✅ Ronda ganada por ${jugador.nombre}`);
  } else {
    ia.puntos += estado.cantos.truco.nivel;
    logHistorial(`❌ Ronda ganada por TrucoEstrella`);
  }

  actualizarPorotos("jugador", jugador.puntos);
  actualizarPorotos("ia", ia.puntos);

  if (jugador.puntos >= estado.partidaA) mostrarModalVictoria(jugador.nombre);
  else if (ia.puntos >= estado.partidaA) mostrarModalVictoria("TrucoEstrella");
  else {
    estado.ronda++;
    estado.quienEsMano = estado.quienEsMano === "jugador" ? "ia" : "jugador";
    estado.cartasJugador = [];
    estado.cartasIA = [];
    iniciarRonda();
  }
}

function cantarTruco(quien) {
  estado.estadoCanto = "truco";
  logHistorial(`${quien === "jugador" ? jugador.nombre : "TrucoEstrella"} canta TRUCO!`);

  if (quien === "jugador") {
    mostrarRespuestaCanto("truco", respuesta => {
      if (respuesta === "quiero") {
        estado.cantos.truco.activo = true;
        logHistorial(`TrucoEstrella dice QUIERO al Truco.`);
      } else {
        logHistorial(`TrucoEstrella dice NO QUIERO al Truco. Gana 1 punto ${jugador.nombre}`);
        jugador.puntos += 1;
        terminarRonda();
        return;
      }
      estado.estadoCanto = null;
    });
  } else {
    mostrarRespuestaCanto("truco", respuesta => {
      if (respuesta === "quiero") {
        estado.cantos.truco.activo = true;
        logHistorial(`${jugador.nombre} dice QUIERO al Truco.`);
      } else {
        logHistorial(`${jugador.nombre} dice NO QUIERO al Truco. Gana 1 punto TrucoEstrella`);
        ia.puntos += 1;
        terminarRonda();
        return;
      }
      estado.estadoCanto = null;
    });
  }
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
document.getElementById("btn-truco").addEventListener("click", () => cantarTruco("jugador"));