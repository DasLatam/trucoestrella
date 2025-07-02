/**
 * ui.js
 * Módulo para todas las manipulaciones del DOM y la interfaz de usuario.
 * No contiene lógica de juego, solo renderiza el estado proporcionado por main.js.
 */

import { SIMBOLOS_PALO, JUGADORES } from './config.js';
import { procesarAccionJugador, getConfiguracionActual } from './main.js';

// Referencias a elementos del DOM
const pantallaInicio = document.getElementById('pantalla-inicio');
const pantallaJuego = document.getElementById('pantalla-juego');
const formInicio = document.getElementById('form-inicio');
const inputNombre = document.getElementById('nombre-jugador');
const btnLimpiarCache = document.getElementById('limpiar-cache');
const btnVolverMenu = document.getElementById('volver-menu');

const manoJugadorContainer = document.getElementById('mano-jugador');
const manoIAContainer = document.getElementById('mano-ia');
const mesaJugadorContainer = document.getElementById('mesa-jugador');
const mesaIAContainer = document.getElementById('mesa-ia');
const marcadorNosotros = document.getElementById('marcador-nosotros');
const marcadorEllos = document.getElementById('marcador-ellos');
const historialContainer = document.getElementById('historial-partida');
const nombreJugadorDisplay = document.getElementById('nombre-jugador-display');
const nombreIADisplay = document.getElementById('nombre-ia-display');

const modalFinPartida = document.getElementById('modal-fin-partida');
const mensajeGanador = document.getElementById('mensaje-ganador');
const puntajeFinal = document.getElementById('puntaje-final');
const btnRevancha = document.getElementById('btn-revancha');
const btnMenuPrincipal = document.getElementById('btn-menu-principal');

const botonesCanto = document.getElementById('canto-buttons');

let iniciarPartidaCallback;
let jugarManoCallback;

/**
 * Inicializa la UI, configura los event listeners principales.
 * @param {function} iniciarPartidaFn - Callback para iniciar la partida desde main.js.
 * @param {function} jugarManoFn - Callback para reiniciar una mano (revancha).
 */
export function inicializarUI(iniciarPartidaFn, jugarManoFn) {
  iniciarPartidaCallback = iniciarPartidaFn;
  jugarManoCallback = jugarManoFn;

  formInicio.addEventListener('submit', (e) => {
    e.preventDefault();
    const configuracion = {
      nombreJugador: inputNombre.value |

| 'Jugador',
      puntosVictoria: document.querySelector('input[name="puntos"]:checked').value,
      conFlor: document.getElementById('con-flor').checked,
    };
    iniciarPartidaCallback(configuracion);
  });

  btnLimpiarCache.addEventListener('click', () => window.location.reload(true));
  btnVolverMenu.addEventListener('click', volverAlMenu);
  btnMenuPrincipal.addEventListener('click', volverAlMenu);
  
  btnRevancha.addEventListener('click', () => {
      modalFinPartida.style.display = 'none';
      iniciarPartidaCallback(getConfiguracionActual());
  });

  // Event listener para los botones de canto (delegación de eventos)
  botonesCanto.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' &&!e.target.disabled) {
      const canto = e.target.dataset.canto;
      procesarAccionJugador({ tipo: 'cantar', valor: canto });
    }
  });
}

function volverAlMenu() {
    pantallaJuego.style.display = 'none';
    modalFinPartida.style.display = 'none';
    pantallaInicio.style.display = 'flex';
}

export function mostrarPantallaJuego() {
  pantallaInicio.style.display = 'none';
  pantallaJuego.style.display = 'grid';
}

export function actualizarNombres(nombreJugador, nombreIA) {
    nombreJugadorDisplay.textContent = nombreJugador;
    nombreIADisplay.textContent = nombreIA;
}

/**
 * Dibuja las cartas en la mano de un jugador.
 * @param {string} jugador - JUGADOR o IA.
 * @param {Array<object>} cartas - Array de objetos de carta.
 */
export function dibujarMano(jugador, cartas) {
  const container = jugador === JUGADORES.JUGADOR? manoJugadorContainer : manoIAContainer;
  container.innerHTML = '';
  cartas.forEach(carta => {
    const cartaEl = document.createElement('div');
    cartaEl.classList.add('carta');
    if (jugador === JUGADORES.JUGADOR) {
      cartaEl.innerHTML = `<span>${carta.numero}</span><span>${SIMBOLOS_PALO[carta.palo]}</span>`;
      cartaEl.dataset.id = carta.id;
      cartaEl.addEventListener('click', () => {
        procesarAccionJugador({ tipo: 'jugar_carta', valor: carta.id });
      });
    } else {
      cartaEl.classList.add('dorso');
    }
    container.appendChild(cartaEl);
  });
}

/**
 * Mueve una carta de la mano a la mesa.
 * @param {string} jugador - JUGADOR o IA.
 * @param {object} carta - El objeto de la carta jugada.
 * @param {number} ronda - El número de la ronda (1, 2, o 3).
 */
export function jugarCarta(jugador, carta, ronda) {
  const mesaContainer = jugador === JUGADORES.JUGADOR? mesaJugadorContainer : mesaIAContainer;
  const slot = mesaContainer.querySelector(`.slot[data-ronda="${ronda}"]`);
  
  if (slot) {
    slot.innerHTML = `<div class="carta"><span>${carta.numero}</span><span>${SIMBOLOS_PALO[carta.palo]}</span></div>`;
  }

  // Quitar la carta de la mano en la UI
  const manoContainer = jugador === JUGADORES.JUGADOR? manoJugadorContainer : manoIAContainer;
  if (jugador === JUGADORES.JUGADOR) {
      const cartaEnMano = manoContainer.querySelector(`[data-id="${carta.id}"]`);
      if (cartaEnMano) cartaEnMano.remove();
  } else {
      // Quitar una carta del dorso
      if(manoContainer.firstChild) manoContainer.firstChild.remove();
  }
}

export function limpiarMesa() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => slot.innerHTML = '');
}

/**
 * Actualiza el marcador de puntos con el sistema de "porotos".
 * @param {number} puntosNosotros 
 * @param {number} puntosEllos 
 * @param {number} puntosVictoria
 */
export function actualizarMarcador(puntosNosotros, puntosEllos, puntosVictoria) {
  const dibujarPorotos = (puntos) => {
    let html = '';
    const gruposDeCinco = Math.floor(puntos / 5);
    const resto = puntos % 5;

    for (let i = 0; i < gruposDeCinco; i++) {
      html += '<div class="poroto-grupo"><s>||||</s></div>';
    }
    if (resto > 0) {
      html += `<div class="poroto-grupo">${'|'.repeat(resto)}</div>`;
    }
    return html;
  };
  
  marcadorNosotros.innerHTML = dibujarPorotos(puntosNosotros);
  marcadorEllos.innerHTML = dibujarPorotos(puntosEllos);
  
  // Añadir línea divisoria si es a 30
  document.querySelector('.marcador').classList.toggle('a30', puntosVictoria == 30);
}

/**
 * Añade un mensaje al historial de la partida.
 * @param {Array<object>} historial - El array de mensajes del historial.
 */
export function actualizarHistorial(historial) {
  historialContainer.innerHTML = '';
  historial.forEach(evento => {
    const p = document.createElement('p');
    p.textContent = evento.mensaje;
    p.classList.add(`historial-${evento.jugador}`);
    historialContainer.appendChild(p);
  });
  historialContainer.scrollTop = historialContainer.scrollHeight;
}

/**
 * Habilita o deshabilita los botones de canto según el estado del juego.
 * @param {object} estadoJuego - El estado actual del juego.
 */
export function actualizarBotones(estadoJuego) {
    const puedeCantarEnvido = estadoJuego.ronda.numero === 1 &&!estadoJuego.cantoActual; // Simplificado
    const puedeCantarTruco =!estadoJuego.cantoActual |

| estadoJuego.cantoActual.tipo.includes('truco'); // Simplificado

    document.querySelector('[data-canto="envido"]').disabled =!puedeCantarEnvido;
    document.querySelector('[data-canto="real-envido"]').disabled =!puedeCantarEnvido;
    document.querySelector('[data-canto="falta-envido"]').disabled =!puedeCantarEnvido;
    document.querySelector('[data-canto="truco"]').disabled =!puedeCantarTruco;
    // Lógica más compleja para retruco, etc. iría aquí
}

/**
 * Resalta visualmente qué jugador tiene el turno.
 * @param {string} jugadorActual - El jugador que tiene el turno.
 */
export function resaltarTurno(jugadorActual) {
    document.getElementById('zona-jugador').classList.toggle('turno-activo', jugadorActual === JUGADORES.JUGADOR);
    document.getElementById('zona-ia').classList.toggle('turno-activo', jugadorActual === JUGADORES.IA);
}

/**
 * Muestra el modal de fin de partida.
 * @param {string} ganador - Nombre del ganador.
 * @param {object} puntuacion - Objeto con los puntajes finales.
 */
export function mostrarModalFinPartida(ganador, puntuacion) {
    mensajeGanador.textContent = `¡Partida terminada! El ganador es ${ganador}.`;
    puntajeFinal.textContent = `Resultado final: ${puntuacion.nosotros} a ${puntuacion.ellos}.`;
    modalFinPartida.style.display = 'flex';
}