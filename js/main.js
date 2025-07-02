/**
 * main.js
 * Orquestador principal del juego Gran Truco Argentino.
 * Maneja el estado del juego, la lógica de las reglas y la secuencia de turnos.
 * No interactúa directamente con el DOM, delega esa tarea a ui.js.
 */

import * as config from './config.js';
import * as ui from './ui.js';
import * as ia from './ia.js';

// El objeto que contiene todo el estado de la partida actual
let estadoJuego = {};

/**
 * Inicializa o resetea el estado del juego a sus valores por defecto.
 */
function inicializarEstado() {
  estadoJuego = {
    configuracion: {
      nombreJugador: 'Jugador',
      puntosVictoria: config.GAME_CONFIG.PUNTOS_PARTIDA_LARGA,
      conFlor: false,
    },
    puntuacion: {
     : 0,
     : 0,
    },
    historial:,
    jugadores: {
     : { mano:, equipo: config.EQUIPOS.NOSOTROS },
     : { mano:, equipo: config.EQUIPOS.ELLOS },
    },
    dealer: null, // Quién reparte. Se decide al inicio.
    mano: null, // Quién empieza la ronda.
    turnoActual: null, // Jugador que tiene el turno.
    estado: config.ESTADOS_JUEGO.INICIO,
    ronda: {
      numero: 0, // 1, 2 o 3
      cartasEnMesa:, // [{ jugador, carta }]
      resultado:, // [{ ganador, parda }]
    },
    cantoActual: null, // Guarda el estado de un canto en progreso
  };
}

/**
 * Inicia una nueva partida con la configuración proporcionada desde la UI.
 * @param {object} configuracion - { nombreJugador, puntosVictoria, conFlor }
 */
function iniciarPartida(configuracion) {
  inicializarEstado();
  estadoJuego.configuracion = configuracion;
  ui.mostrarPantallaJuego();
  ui.actualizarNombres(configuracion.nombreJugador, 'TrucoEstrella');
  
  // Decidir quién es el primer dealer (simulado, en 1v1 empieza el jugador)
  estadoJuego.dealer = config.JUGADORES.IA;
  
  jugarMano();
}

/**
 * Orquesta una mano completa: barajar, repartir, jugar las 3 rondas.
 */
function jugarMano() {
  // Resetear estado de la mano
  estadoJuego.ronda = { numero: 1, cartasEnMesa:, resultado: };
  estadoJuego.cantoActual = null;
  
  // Rotar dealer y mano
  estadoJuego.dealer = (estadoJuego.dealer === config.JUGADORES.JUGADOR)? config.JUGADORES.IA : config.JUGADORES.JUGADOR;
  estadoJuego.mano = (estadoJuego.dealer === config.JUGADORES.JUGADOR)? config.JUGADORES.IA : config.JUGADORES.JUGADOR;
  estadoJuego.turnoActual = estadoJuego.mano;

  // Barajar y repartir
  const barajaMezclada =.sort(() => Math.random() - 0.5);
  estadoJuego.jugadores.mano = barajaMezclada.splice(0, config.GAME_CONFIG.CARTAS_POR_MANO);
  estadoJuego.jugadores.mano = barajaMezclada.splice(0, config.GAME_CONFIG.CARTAS_POR_MANO);

  // Actualizar UI
  ui.limpiarMesa();
  ui.dibujarMano(config.JUGADORES.JUGADOR, estadoJuego.jugadores.mano);
  ui.dibujarMano(config.JUGADORES.IA, estadoJuego.jugadores.mano);
  agregarAlHistorial(`Nueva mano. Reparte ${estadoJuego.dealer}. Es mano ${estadoJuego.mano}.`);

  // Comprobar si hay flor (si se juega con flor)
  if (estadoJuego.configuracion.conFlor) {
    // Lógica de flor... (para futura implementación)
  }

  estadoJuego.estado = config.ESTADOS_JUEGO.ESPERANDO_JUGADA;
  gestionarTurno();
}

/**
 * Gestiona el turno actual. Si es la IA, le pide una jugada. Si es el jugador, espera una acción.
 */
function gestionarTurno() {
  ui.actualizarBotones(estadoJuego);
  ui.resaltarTurno(estadoJuego.turnoActual);

  if (estadoJuego.turnoActual === config.JUGADORES.IA) {
    setTimeout(() => {
      const accion = ia.decidirJugada(estadoJuego);
      procesarAccion(config.JUGADORES.IA, accion);
    }, config.GAME_CONFIG.TIEMPO_ESPERA_IA);
  }
}

/**
 * Procesa una acción realizada por un jugador o la IA.
 * @param {string} jugador - El jugador que realiza la acción.
 * @param {object} accion - La acción a procesar. { tipo: 'jugar_carta'/'cantar', valor: cartaId/cantoId }
 */
function procesarAccion(jugador, accion) {
  if (jugador!== estadoJuego.turnoActual && accion.tipo!== 'responder_canto') {
    // Acción fuera de turno, ignorar (en un entorno real, podría penalizarse)
    return;
  }

  agregarAlHistorial(`${jugador}: ${accion.valor.replace(/-/g, ' ')}`, jugador);

  switch (accion.tipo) {
    case 'jugar_carta':
      jugarCarta(jugador, accion.valor);
      break;
    case 'cantar':
      // Lógica de cantos...
      break;
    case 'responder_canto':
      // Lógica de respuesta a cantos...
      break;
    case 'irse_al_mazo':
      // Lógica de irse al mazo...
      break;
  }
}

/**
 * Lógica para cuando un jugador juega una carta.
 * @param {string} jugador - El jugador que juega la carta.
 * @param {string} idCarta - El ID de la carta jugada.
 */
function jugarCarta(jugador, idCarta) {
  // Quitar carta de la mano del jugador
  const manoJugador = estadoJuego.jugadores[jugador].mano;
  const indiceCarta = manoJugador.findIndex(c => c.id === idCarta);
  const cartaJugada = manoJugador.splice(indiceCarta, 1);

  // Añadir carta a la mesa
  estadoJuego.ronda.cartasEnMesa.push({ jugador, carta: cartaJugada });
  ui.jugarCarta(jugador, cartaJugada, estadoJuego.ronda.numero);
  
  // Cambiar turno
  cambiarTurno();

  // Si la ronda terminó (ambos jugaron)
  if (estadoJuego.ronda.cartasEnMesa.length === 2 * estadoJuego.ronda.numero) {
    resolverRonda();
  } else {
    gestionarTurno();
  }
}

/**
 * Resuelve una ronda, determina el ganador y pasa a la siguiente o termina la mano.
 */
function resolverRonda() {
  const inicioSlice = (estadoJuego.ronda.numero - 1) * 2;
  const jugadasRonda = estadoJuego.ronda.cartasEnMesa.slice(inicioSlice);
  
  const jugada1 = jugadasRonda;
  const jugada2 = jugadasRonda;

  const valor1 = config.VALORES_TRUCO[jugada1.carta.id];
  const valor2 = config.VALORES_TRUCO[jugada2.carta.id];

  let ganadorRonda;
  let parda = false;

  if (valor1 > valor2) {
    ganadorRonda = jugada1.jugador;
  } else if (valor2 > valor1) {
    ganadorRonda = jugada2.jugador;
  } else {
    parda = true;
    ganadorRonda = 'parda';
    // En caso de parda, la mano siguiente la inicia el que es mano de la ronda
  }
  
  estadoJuego.ronda.resultado.push({ ganador: ganadorRonda, parda });
  agregarAlHistorial(`Fin de la ronda ${estadoJuego.ronda.numero}. ${parda? 'Parda.' : `Gana ${ganadorRonda}.`}`);
  
  // Determinar quién empieza la siguiente ronda
  if (parda) {
    estadoJuego.turnoActual = estadoJuego.mano;
  } else {
    estadoJuego.turnoActual = ganadorRonda;
  }
  
  // Verificar si la mano terminó
  if (verificarFinDeMano()) {
    terminarMano();
  } else {
    estadoJuego.ronda.numero++;
    gestionarTurno();
  }
}

/**
 * Verifica si la mano ha concluido según los resultados de las rondas.
 * @returns {boolean} - True si la mano terminó, false en caso contrario.
 */
function verificarFinDeMano() {
  const resultados = estadoJuego.ronda.resultado;
  if (resultados.length < 2) return false;

  const nosotros = resultados.filter(r => r.ganador === config.JUGADORES.JUGADOR).length;
  const ellos = resultados.filter(r => r.ganador === config.JUGADORES.IA).length;
  const pardas = resultados.filter(r => r.parda).length;

  // Gana quien gana 2 rondas
  if (nosotros === 2 |

| ellos === 2) return true;
  
  // Si hay 3 rondas jugadas
  if (resultados.length === 3) return true;

  // Reglas de empate
  // Empate en la primera, gana quien gane la segunda
  if (resultados.parda &&!resultados.parda) return true;
  // Gana primera, pierde segunda, empata tercera -> gana el de la primera
  if (!resultados.parda &&!resultados.parda && resultados.ganador!== resultados.ganador && resultados.length === 3 && resultados.parda) return true;

  return false;
}

/**
 * Termina la mano, calcula el ganador y los puntos, y prepara la siguiente mano o fin de partida.
 */
function terminarMano() {
  estadoJuego.estado = config.ESTADOS_JUEGO.MANO_TERMINADA;
  const ganadorMano = calcularGanadorMano();
  
  // Por ahora, solo se suma 1 punto por mano ganada (sin cantos)
  const puntosGanados = 1; 

  if (ganadorMano) {
    const equipoGanador = estadoJuego.jugadores[ganadorMano].equipo;
    estadoJuego.puntuacion[equipoGanador] += puntosGanados;
    agregarAlHistorial(`Mano ganada por ${ganadorMano}. Suma ${puntosGanados} punto(s).`);
  } else {
    agregarAlHistorial('La mano terminó en parda total. No hay puntos.');
  }

  ui.actualizarMarcador(estadoJuego.puntuacion.nosotros, estadoJuego.puntuacion.ellos, estadoJuego.configuracion.puntosVictoria);
  
  // Verificar fin de partida
  if (estadoJuego.puntuacion.nosotros >= estadoJuego.configuracion.puntosVictoria |

| estadoJuego.puntuacion.ellos >= estadoJuego.configuracion.puntosVictoria) {
    terminarPartida();
  } else {
    // Pausa antes de la siguiente mano
    setTimeout(jugarMano, 3000);
  }
}

/**
 * Calcula el ganador final de la mano basado en los resultados de las rondas.
 */
function calcularGanadorMano() {
    const resultados = estadoJuego.ronda.resultado;
    const r1 = resultados;
    const r2 = resultados.length > 1? resultados : null;
    const r3 = resultados.length > 2? resultados : null;

    // Gana quien gana 2 rondas
    const victoriasNosotros = resultados.filter(r => r.ganador === config.JUGADORES.JUGADOR).length;
    const victoriasEllos = resultados.filter(r => r.ganador === config.JUGADORES.IA).length;

    if (victoriasNosotros > victoriasEllos) return config.JUGADORES.JUGADOR;
    if (victoriasEllos > victoriasNosotros) return config.JUGADORES.IA;

    // Reglas de desempate complejas
    if (r1.parda) {
        return r2.parda? (r3? r3.ganador : estadoJuego.mano) : r2.ganador;
    }
    if (r2 && r2.parda) {
        return r1.ganador;
    }
    if (r3 && r3.parda) {
        return r1.ganador;
    }
    
    // Si se empatan las 3, gana el mano
    if (r1.parda && r2.parda && r3.parda) return estadoJuego.mano;

    return estadoJuego.mano; // Default: si todo falla, gana el mano
}


/**
 * Finaliza la partida y muestra el modal de fin de juego.
 */
function terminarPartida() {
  estadoJuego.estado = config.ESTADOS_JUEGO.PARTIDA_TERMINADA;
  const ganador = estadoJuego.puntuacion.nosotros >= estadoJuego.configuracion.puntosVictoria? estadoJuego.configuracion.nombreJugador : 'TrucoEstrella';
  ui.mostrarModalFinPartida(ganador, estadoJuego.puntuacion);
}

function cambiarTurno() {
  estadoJuego.turnoActual = (estadoJuego.turnoActual === config.JUGADORES.JUGADOR)? config.JUGADORES.IA : config.JUGADORES.JUGADOR;
}

function agregarAlHistorial(mensaje, jugador = 'sistema') {
  estadoJuego.historial.push({ mensaje, jugador });
  ui.actualizarHistorial(estadoJuego.historial);
}

// Interfaz pública del módulo main
export function procesarAccionJugador(accion) {
  if (estadoJuego.estado === config.ESTADOS_JUEGO.ESPERANDO_JUGADA && estadoJuego.turnoActual === config.JUGADORES.JUGADOR) {
    procesarAccion(config.JUGADORES.JUGADOR, accion);
  }
}

export function getConfiguracionActual() {
  return estadoJuego.configuracion;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  inicializarEstado();
  ui.inicializarUI(iniciarPartida, jugarMano);
});