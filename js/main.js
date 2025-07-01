// =================================================================================
// ARCHIVO PRINCIPAL (main.js) (Módulo)
// Orquesta todo el juego, maneja el estado y los eventos.
// =================================================================================

// --- Importar Módulos ---
// Importamos las constantes y los dibujos de config.js
import { PALOS, NUMEROS, JERARQUIA_TRUCO, SVG_ICONS, SVG_LOMO_CARTA } from './config.js';

// Importamos todas las funciones de la interfaz de ui.js
import * as ui from './ui.js';

// Importamos las funciones de la inteligencia artificial de ia.js
import { elegirCartaCPU, decisionCPU } from './ia.js';

// --- Variables de Estado Globales ---
// Estas variables guardan toda la información sobre la partida en curso.
let marcador, jugadorHumano, jugadorCPU, manoActual, manosGanadas, resultadosManos, turnoDelHumano, estadoEnvido, estadoTruco, cantoActual, tieneFlor, manoDeLaRonda, jugadorMano, cartaJugadaPorLider, juegoPausado;
let PUNTOS_PARA_GANAR, JUGAR_CON_FLOR;

// --- Objeto de Botones y Elementos del DOM ---
// Se declara aquí pero se inicializa cuando el DOM está listo.
let botones;

// --- Funciones Base de Lógica (necesarias en varios módulos) ---
window.compararCartas = function(c1, c2) {
    if (!c1 || !c2) return 'empate';
    if (c1.rankingTruco < c2.rankingTruco) return 'humano';
    if (c2.rankingTruco < c1.rankingTruco) return 'cpu';
    return 'empate';
}

window.calcularEnvido = function(mano) {
    if (JUGAR_CON_FLOR && detectarFlor(mano)) return 0;
    const palos = {};
    for (const carta of mano) {
        if (!palos[carta.palo]) {
            palos[carta.palo] = [];
        }
        palos[carta.palo].push(carta.valorEnvido);
    }
    let mejorPuntaje = 0;
    for (const palo in palos) {
        const cartasDelPalo = palos[palo];
        if (cartasDelPalo.length >= 2) {
            cartasDelPalo.sort((a, b) => b - a);
            const puntaje = 20 + cartasDelPalo[0] + cartasDelPalo[1];
            if (puntaje > mejorPuntaje) {
                mejorPuntaje = puntaje;
            }
        }
    }
    if (mejorPuntaje === 0) {
        const valores = mano.map(carta => carta.valorEnvido);
        mejorPuntaje = Math.max(...valores);
    }
    return mejorPuntaje;
}

// --- Lógica de Juego Principal ---
function comenzarPartida() {
    PUNTOS_PARA_GANAR = parseInt(document.querySelector('input[name="puntos-partida"]:checked').value);
    JUGAR_CON_FLOR = document.getElementById('con-flor').checked;
    const nombreJugador = document.getElementById('nombre-jugador').value || 'Jugador';

    jugadorHumano = { nombre: nombreJugador };
    jugadorCPU = { nombre: 'TrucoEstrella' };

    ui.actualizarMarcador(botones, { humano: 0, cpu: 0 }, jugadorHumano, jugadorCPU);
    document.getElementById('nombre-mano-humano').textContent = `Mano de ${jugadorHumano.nombre}`;
    document.getElementById('cpu-titulo').textContent = `Mano de ${jugadorCPU.nombre}`;

    document.getElementById('pantalla-config').style.display = 'none';
    document.getElementById('area-juego-wrapper').style.display = 'block';

    manoDeLaRonda = 'cpu';
    iniciarPartida();
}

function iniciarPartida() {
    marcador = { humano: 0, cpu: 0 };
    manoDeLaRonda = (manoDeLaRonda === 'humano') ? 'cpu' : 'humano';
    if (botones.log) { botones.log.innerHTML = ''; }
    iniciarRonda();
}

function iniciarRonda() {
    manoActual = 1; manosGanadas = { humano: 0, cpu: 0 }; resultadosManos = [];
    estadoEnvido = { nivel: 0, respondido: false }; estadoTruco = 0; cantoActual = null; tieneFlor = { humano: false, cpu: false, respondido: false };
    jugadorMano = manoDeLaRonda; cartaJugadaPorLider = null; ui.reanudarJuego();

    jugadorHumano.mano = [];
    jugadorCPU.mano = [];

    ui.actualizarMarcador(botones, marcador, jugadorHumano, jugadorCPU);
    ui.ocultarTodosLosControles(botones, estadoTruco);
    botones.nuevoJuego.style.display = 'none';

    for (let i = 1; i <= 3; i++) {
        document.getElementById(`slot-humano-${i}`).innerHTML = '';
        document.getElementById(`slot-cpu-${i}`).innerHTML = '';
    }

    const baraja = crearBarajaTruco();
    barajar(baraja);

    for (let i = 0; i < 3; i++) {
        jugadorHumano.mano.push(baraja.pop());
        jugadorCPU.mano.push(baraja.pop());
    }

    if (JUGAR_CON_FLOR) {
        tieneFlor.humano = detectarFlor(jugadorHumano.mano);
        tieneFlor.cpu = detectarFlor(jugadorCPU.mano);
    }

    ui.dibujarManoCPU(botones, true);
    ui.dibujarMano(botones, jugadorHumano, turnoDelHumano, juegoPausado, jugarCarta);

    if (tieneFlor.humano) {
        botones.flor.style.display = 'block';
        ui.actualizarInfo(botones, `¡Tienes Flor! Debes cantarla.`);
    } else if (tieneFlor.cpu) {
        ui.agregarAlLog(botones, jugadorCPU.nombre, "¡FLOR!");
        finalizarRonda(null, { tipo: 'flor', ganador: 'cpu' });
    } else {
        prepararSiguienteMano();
    }
}

function prepararSiguienteMano() {
    if (juegoPausado) return;
    if (manoActual > 1) {
        const ganadorManoAnterior = resultadosManos[manoActual - 2];
        if (ganadorManoAnterior !== 'empate') jugadorMano = ganadorManoAnterior;
    }
    turnoDelHumano = (jugadorMano === 'humano');
    ui.dibujarMano(botones, jugadorHumano, turnoDelHumano, juegoPausado, jugarCarta);
    if (turnoDelHumano) {
        ui.actualizarInfo(botones, `Mano ${manoActual}. Eres mano, te toca jugar.`);
        ui.mostrarBotonesDeCantoInicial(botones, juegoPausado, turnoDelHumano, manoActual, estadoEnvido, tieneFlor, estadoTruco);
    } else {
        ui.actualizarInfo(botones, `Mano ${manoActual}. Juega ${jugadorCPU.nombre}.`);
        ui.mostrarBotonesDeCantoInicial(botones, juegoPausado, turnoDelHumano, manoActual, estadoEnvido, tieneFlor, estadoTruco);
        setTimeout(jugarTurnoCPU, 1500);
    }
}

function jugarCarta(cartaJugada) {
    if (!turnoDelHumano || juegoPausado) return;
    if (tieneFlor.humano && !tieneFlor.respondido) {
        ui.actualizarInfo(botones, "No puedes jugar, debes cantar la Flor.");
        return;
    }

    ui.pausarJuego();
    ui.ocultarTodosLosControles(botones, estadoTruco, true);

    jugadorHumano.mano = jugadorHumano.mano.filter(c => c.id !== cartaJugada.id);
    ui.dibujarMano(botones, jugadorHumano, turnoDelHumano, juegoPausado, jugarCarta);
    document.getElementById(`slot-humano-${manoActual}`).appendChild(ui.crearElementoCarta(cartaJugada));
    ui.agregarAlLog(botones, jugadorHumano.nombre, `juega ${cartaJugada.nombre}`);

    if (cartaJugadaPorLider) {
        setTimeout(() => evaluarMano(cartaJugadaPorLider, cartaJugada), 500);
    } else {
        cartaJugadaPorLider = cartaJugada;
        ui.actualizarInfo(botones, `Esperando jugada...`);
        setTimeout(jugarTurnoCPU, 1500);
    }
}

function evaluarMano(c1, c2) {
    const ganadorMano = compararCartas(c1, c2);
    resultadosManos.push(ganadorMano);
    if (ganadorMano !== 'empate') manosGanadas[ganadorMano]++;

    const elHumano = document.getElementById(`slot-humano-${manoActual}`).firstChild.querySelector('svg');
    const elCPU = document.getElementById(`slot-cpu-${manoActual}`).firstChild.querySelector('svg');

    if (ganadorMano === 'humano') elHumano.classList.add('carta-ganadora');
    else if (ganadorMano === 'cpu') elCPU.classList.add('carta-ganadora');

    ui.actualizarInfo(botones, (ganadorMano === 'empate') ? 'Mano parda.' : `Gana la mano ${ganadorMano === 'humano' ? jugadorHumano.nombre : jugadorCPU.nombre}.`);
    cartaJugadaPorLider = null;
    setTimeout(revisarFinDeRonda, 2000);
}

function revisarFinDeRonda() {
    const ganoYEmpardoHumano = manosGanadas.humano === 1 && resultadosManos.length >= 2 && resultadosManos[0] === 'humano' && resultadosManos[1] === 'empate';
    const ganoYEmpardoCPU = manosGanadas.cpu === 1 && resultadosManos.length >= 2 && resultadosManos[0] === 'cpu' && resultadosManos[1] === 'empate';
    const ganadorPorDosManos = manosGanadas.humano === 2 || manosGanadas.cpu === 2;

    if (ganadorPorDosManos || ganoYEmpardoHumano || ganoYEmpardoCPU || manoActual === 3) {
        finalizarRonda();
    } else {
        manoActual++;
        ui.reanudarJuego();
        prepararSiguienteMano();
    }
}

function finalizarRonda(ganadorPorNoQuerer, configFlor = null) {
    ui.pausarJuego();
    ui.ocultarTodosLosControles(botones, estadoTruco);
    let ganadorFinal, puntos;

    if (configFlor) {
        puntos = 3;
        ganadorFinal = configFlor.ganador;
    } else if (ganadorPorNoQuerer) {
        ganadorFinal = (ganadorPorNoQuerer === 'humano') ? 'humano' : 'cpu';
        let puntosNoQuerido = { truco: estadoTruco === 0 ? 1 : estadoTruco, envido: [0, 1, 2, 3][estadoEnvido.nivel] };
        puntos = puntosNoQuerido[cantoActual] || 1;
    } else {
        puntos = [1, 2, 3, 4][estadoTruco] || 1;
        if (manosGanadas.humano === manosGanadas.cpu) {
            ganadorFinal = resultadosManos[0] === 'empate' ? manoDeLaRonda : resultadosManos[0];
        } else {
            ganadorFinal = manosGanadas.humano > manosGanadas.cpu ? 'humano' : 'cpu';
        }
    }

    marcador[ganadorFinal] += puntos;
    ui.actualizarMarcador(botones, marcador, jugadorHumano, jugadorCPU);
    const nombreGanador = (ganadorFinal === 'humano') ? jugadorHumano.nombre : jugadorCPU.nombre;
    ui.actualizarInfo(botones, `🏆 ¡${nombreGanador} gana la ronda y se lleva ${puntos} ${puntos > 1 ? 'puntos' : 'punto'}! 🏆`);

    setTimeout(() => {
        if (marcador.humano >= PUNTOS_PARA_GANAR) {
            ui.actualizarInfo(botones, `🎉 ¡FELICIDADES, ${jugadorHumano.nombre.toUpperCase()}, HAS GANADO LA PARTIDA! 🎉`);
            botones.nuevoJuego.style.display = 'block';
        } else if (marcador.cpu >= PUNTOS_PARA_GANAR) {
            ui.actualizarInfo(botones, `Gana ${jugadorCPU.nombre}. ¡Mejor suerte la próxima!`);
            botones.nuevoJuego.style.display = 'block';
        } else {
            iniciarPartida();
        }
    }, 3000);
}

// Ligar las funciones globales a window para que los otros módulos puedan acceder a ellas
window.pausarJuego = pausarJuego;
window.reanudarJuego = reanudarJuego;
window.jugarCarta = jugarCarta;
window.prepararSiguienteMano = prepararSiguienteMano;
window.finalizarRonda = finalizarRonda;
window.resolverEnvido = resolverEnvido;
window.manejarCantoEnvido = manejarCantoEnvido;
window.manejarCantoTruco = manejarCantoTruco;
window.manejarRespuesta = manejarRespuesta;
window.decisionCPU = decisionCPU;

// Inicializar el juego al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el objeto 'botones'
    window.botones = {
        log: document.getElementById('log-juego'),
        marcadorGrafico: document.getElementById('marcador-grafico'),
        info: document.getElementById('info-juego'),
        mano: document.getElementById('mano-humano'),
        manoCPU: document.getElementById('mano-cpu'),
        nuevoJuego: document.getElementById('btn-nuevo-juego'),
        flor: document.getElementById('btn-flor'),
        contraflor: document.getElementById('btn-contraflor'),
        contraflorResto: document.getElementById('btn-contraflor-resto'),
        envido: document.getElementById('btn-envido'),
        realEnvido: document.getElementById('btn-real-envido'),
        faltaEnvido: document.getElementById('btn-falta-envido'),
        truco: document.getElementById('btn-truco'),
        quiero: document.getElementById('btn-quiero'),
        noQuiero: document.getElementById('btn-no-quiero'),
        reTruco: document.getElementById('btn-re-truco'),
        valeCuatro: document.getElementById('btn-vale-cuatro')
    };

    // Asignar los eventos a los botones
    document.getElementById('btn-comenzar').addEventListener('click', comenzarPartida);
    botones.nuevoJuego.addEventListener('click', iniciarPartida);
    botones.flor.addEventListener('click', manejarCantoFlor);
    botones.envido.addEventListener('click', () => manejarCantoEnvido('humano', 1));
    botones.realEnvido.addEventListener('click', () => manejarCantoEnvido('humano', 2));
    botones.faltaEnvido.addEventListener('click', () => manejarCantoEnvido('humano', 3));
    botones.truco.addEventListener('click', () => manejarCantoTruco('humano'));
    botones.quiero.addEventListener('click', () => manejarRespuesta('humano', 'quiero'));
    botones.noQuiero.addEventListener('click', () => manejarRespuesta('humano', 'no-quiero'));
    botones.reTruco.addEventListener('click', () => manejarRespuesta('humano', 're-truco'));
    botones.valeCuatro.addEventListener('click', () => manejarRespuesta('humano', 'vale-cuatro'));
});