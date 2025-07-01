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
  estadoCanto: null
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

function cantarEnvido(quien) {
  if (estado.cantos.envido) return;
  estado.estadoCanto = "envido";
  estado.cantos.envido = "envido";
  logHistorial(`${quien === "jugador" ? jugador.nombre : "TrucoEstrella"} canta ENVIDO!`);

  if (quien === "jugador") {
    mostrarRespuestaCanto("envido", respuesta => {
      if (respuesta === "quiero") {
        const resultado = jugador.envido > ia.envido ? "jugador" : jugador.envido < ia.envido ? "ia" : estado.quienEsMano;
        const puntos = 2;
        logHistorial(`${jugador.nombre}: ${jugador.envido} puntos. TrucoEstrella: ${ia.envido} puntos.`);
        logHistorial(`🏁 ${resultado === "jugador" ? jugador.nombre : "TrucoEstrella"} gana el Envido (${puntos} pts)`);
        if (resultado === "jugador") jugador.puntos += puntos;
        else ia.puntos += puntos;
        actualizarPorotos("jugador", jugador.puntos);
        actualizarPorotos("ia", ia.puntos);
      } else {
        logHistorial(`TrucoEstrella dice NO QUIERO al Envido. ${jugador.nombre} gana 1 punto.`);
        jugador.puntos += 1;
        actualizarPorotos("jugador", jugador.puntos);
      }
      estado.estadoCanto = null;
    });
  } else {
    mostrarRespuestaCanto("envido", respuesta => {
      if (respuesta === "quiero") {
        const resultado = jugador.envido > ia.envido ? "jugador" : jugador.envido < ia.envido ? "ia" : estado.quienEsMano;
        const puntos = 2;
        logHistorial(`${jugador.nombre}: ${jugador.envido} puntos. TrucoEstrella: ${ia.envido} puntos.`);
        logHistorial(`🏁 ${resultado === "jugador" ? jugador.nombre : "TrucoEstrella"} gana el Envido (${puntos} pts)`);
        if (resultado === "jugador") jugador.puntos += puntos;
        else ia.puntos += puntos;
        actualizarPorotos("jugador", jugador.puntos);
        actualizarPorotos("ia", ia.puntos);
      } else {
        logHistorial(`${jugador.nombre} dice NO QUIERO al Envido. TrucoEstrella gana 1 punto.`);
        ia.puntos += 1;
        actualizarPorotos("ia", ia.puntos);
      }
      estado.estadoCanto = null;
    });
  }
}

document.getElementById("btn-comenzar").addEventListener("click", iniciarJuego);
document.getElementById("btn-reiniciar").addEventListener("click", () => location.reload());
document.getElementById("btn-limpiar-cache").addEventListener("click", () => location.reload(true));
document.getElementById("btn-truco").addEventListener("click", () => cantarTruco("jugador"));
document.getElementById("btn-envido").addEventListener("click", () => cantarEnvido("jugador"));
