// js/ui.js

// --- Elementos del DOM ---
const historialLog = document.getElementById('historial-log');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnRevancha = document.getElementById('btn-revancha');

// --- Funciones de renderizado ---

/**
 * Crea y dibuja una carta en el DOM con gráficos SVG.
 * @param {object} carta - El objeto carta a dibujar.
 * @param {HTMLElement} elementoPadre - El elemento donde se añadirá la carta.
 * @param {boolean} esOculta - Si la carta debe mostrarse boca abajo.
 * @param {boolean} esJugable - Si la carta es del jugador y se puede hacer clic en ella.
 * @param {function} alClick - La función a ejecutar al hacer clic en la carta.
 */
export function dibujarCarta(carta, elementoPadre, esOculta, esJugable, alClick) {
    const cartaDiv = document.createElement('div');
    cartaDiv.classList.add('carta');
    if (esOculta) {
        cartaDiv.classList.add('oculta');
    } else {
        // *** FIX: Usar SVG para dibujar los palos según el número ***
        cartaDiv.innerHTML = `
            <div class="valor-carta-esquina top-left">${carta.valor}</div>
            <div class="carta-svg-container">${crearSvgCarta(carta)}</div>
            <div class="valor-carta-esquina bottom-right">${carta.valor}</div>
        `;
    }
    if (esJugable) {
        cartaDiv.classList.add('jugador-carta');
        cartaDiv.onclick = () => alClick(carta);
    }
    elementoPadre.appendChild(cartaDiv);
    return cartaDiv;
}

/**
 * Dibuja la mano completa de un jugador.
 */
export function dibujarMano(mano, div, esOculta, esJugable, alClick) {
    div.innerHTML = '';
    mano.forEach(carta => dibujarCarta(carta, div, esOculta, esJugable, alClick));
}

/**
 * Mueve una carta jugada a su correspondiente slot en la mesa.
 */
export function moverCartaALaMesa(carta, jugador, manoNumero) {
    const slotId = `${jugador}-slot-${manoNumero}`;
    const slot = document.getElementById(slotId);
    slot.innerHTML = ''; // Limpiar por si acaso
    dibujarCarta(carta, slot, false, false, null);
}

/**
 * Actualiza el marcador de puntos con el sistema de "porotos".
 */
export function actualizarMarcador(puntosPlayer, puntosCpu, puntosVictoria) {
    const divPlayer = document.getElementById('marcador-player');
    const divCpu = document.getElementById('marcador-cpu');
    const esA30 = puntosVictoria === 30;

    dibujarPorotos(puntosPlayer, divPlayer, esA30);
    dibujarPorotos(puntosCpu, divCpu, esA30);
}

function dibujarPorotos(puntos, div, esA30) {
    div.innerHTML = '';
    
    const dibujarGrupo = (puntosAGraficar, contenedor) => {
        const gruposDeCinco = Math.floor(puntosAGraficar / 5);
        const individuales = puntosAGraficar % 5;

        for (let i = 0; i < gruposDeCinco; i++) {
            const grupoDiv = document.createElement('div');
            grupoDiv.className = 'poroto-grupo';
            for (let j = 0; j < 4; j++) {
                grupoDiv.appendChild(document.createElement('div')).className = 'poroto';
            }
            grupoDiv.appendChild(document.createElement('div')).className = 'cruzado';
            contenedor.appendChild(grupoDiv);
        }

        if (individuales > 0) {
            const grupoDiv = document.createElement('div');
            grupoDiv.className = 'poroto-grupo';
            for (let i = 0; i < individuales; i++) {
                grupoDiv.appendChild(document.createElement('div')).className = 'poroto';
            }
            contenedor.appendChild(grupoDiv);
        }
    };

    if (esA30 && puntos > 15) {
        const malas = document.createElement('div');
        dibujarGrupo(15, malas);
        div.appendChild(malas);
        
        const buenas = document.createElement('div');
        buenas.className = 'linea-malas'; // Esta clase añade la línea divisoria
        dibujarGrupo(puntos - 15, buenas);
        div.appendChild(buenas);
    } else {
        dibujarGrupo(puntos, div);
    }
}

/**
 * Limpia las cartas de la mesa.
 */
export function limpiarMesa() {
    for(let i = 1; i <= 3; i++) {
        const slotCpu = document.getElementById(`cpu-slot-${i}`);
        const slotPlayer = document.getElementById(`player-slot-${i}`);
        slotCpu.innerHTML = '';
        slotPlayer.innerHTML = '';
        slotCpu.classList.remove('ganador');
        slotPlayer.classList.remove('ganador');
    }
}

/**
 * Añade una entrada al log de historial.
 * @param {string} mensaje - El texto a mostrar.
 * @param {string} tipo - 'player', 'cpu', 'sistema' o 'punto' para el estilo.
 */
export function agregarLog(mensaje, tipo) {
    const p = document.createElement('p');
    p.innerHTML = mensaje; // Usar innerHTML para permitir saltos de línea con <br>
    p.className = `log-${tipo}`;
    historialLog.appendChild(p);
    historialLog.scrollTop = historialLog.scrollHeight;
}

export function limpiarLog() {
    historialLog.innerHTML = '';
}

/**
 * Actualiza los nombres de los jugadores en la UI.
 */
export function actualizarNombres(nombrePlayer, nombreCpu) {
    document.getElementById('player-name-display').textContent = nombrePlayer;
    document.getElementById('cpu-name-display').textContent = nombreCpu;
    document.getElementById('player-name-marcador').textContent = nombrePlayer;
    document.getElementById('cpu-name-marcador').textContent = nombreCpu;
}

/**
 * Cambia entre la pantalla de configuración y la de juego.
 */
export function togglePantallas() {
    document.getElementById('setup-screen').classList.toggle('activa');
    document.getElementById('game-screen').classList.toggle('activa');
}

/**
 * Habilita o deshabilita los botones de canto según el estado del juego.
 * @param {object} estadoBotones - Un objeto que define qué botones deben estar activos.
 */
export function actualizarBotones(estadoBotones) {
    document.querySelectorAll('.botonera .btn').forEach(btn => btn.disabled = true);
    
    if (estadoBotones.esperandoRespuesta) {
        document.getElementById('btn-quiero').disabled = false;
        document.getElementById('btn-no-quiero').disabled = false;
        
        if (estadoBotones.puedeSubirEnvido) {
            document.getElementById('btn-envido').disabled = estadoBotones.nivelEnvidoActual >= 1;
            document.getElementById('btn-real-envido').disabled = estadoBotones.nivelEnvidoActual >= 2;
            document.getElementById('btn-falta-envido').disabled = false;
        }
        if (estadoBotones.puedeSubirFlor) {
             document.getElementById('btn-contraflor').disabled = estadoBotones.nivelFlorActual >= 2;
             document.getElementById('btn-contraflor-resto').disabled = false;
        }
        if (estadoBotones.esperandoRespuestaTruco && estadoBotones.puedeCantarEnvido) {
            document.getElementById('btn-envido').disabled = false;
            document.getElementById('btn-real-envido').disabled = false;
            document.getElementById('btn-falta-envido').disabled = false;
        }

    } else if(estadoBotones.esTurnoPlayer) {
        document.getElementById('btn-ir-al-mazo').disabled = false;
        if (estadoBotones.puedeCantarEnvido) {
            document.getElementById('btn-envido').disabled = false;
            document.getElementById('btn-real-envido').disabled = false;
            document.getElementById('btn-falta-envido').disabled = false;
        }
        if (estadoBotones.puedeCantarTruco) {
            document.getElementById('btn-truco').disabled = estadoBotones.nivelTrucoActual > 0;
            document.getElementById('btn-retruco').disabled = estadoBotones.nivelTrucoActual !== 1;
            document.getElementById('btn-vale-cuatro').disabled = estadoBotones.nivelTrucoActual !== 2;
        }
        if (estadoBotones.puedeCantarFlor) {
            document.getElementById('btn-flor').disabled = false;
        }
    }
}

/**
 * Muestra un modal con información.
 */
export function mostrarModal(titulo, contenido, esFinPartida = false) {
    modalTitle.textContent = titulo;
    modalBody.innerHTML = contenido;
    btnRevancha.style.display = esFinPartida ? 'inline-block' : 'none';
    modal.classList.add('activa');
}

/**
 * Oculta el modal.
 */
export function ocultarModal() {
    modal.classList.remove('activa');
}

/**
 * Resalta el slot de la mesa del ganador de una mano.
 */
export function resaltarManoGanadora(ganador, manoNum) {
    if (ganador !== 'parda') {
        document.getElementById(`${ganador}-slot-${manoNum}`).classList.add('ganador');
    }
}

// --- Helpers de SVG ---

/**
 * Genera el contenido SVG para una carta específica.
 * @param {object} carta - La carta para la que se generará el SVG.
 * @returns {string} - El string HTML del SVG.
 */
function crearSvgCarta(carta) {
    const { valor, palo } = carta;
    let contenidoCentral = '';

    const paloInfo = {
        oro: { class: 'palo-oro', path: '<path d="M25 50 C 10 55, 5 30, 15 20 S 20 0, 25 0 S 30 0, 35 20 S 40 55, 25 50 Z M 20 15 C 20 12, 30 12, 30 15 S 20 18, 20 15 Z" />' },
        copa: { class: 'palo-copa', path: '<path d="M10 0 H 40 V 15 C 40 25, 32.5 30, 25 30 S 10 25, 10 15 Z M 20 32 H 30 V 45 H 38 V 50 H 12 V 45 H 20 Z" />' },
        espada: { class: 'palo-espada', path: '<path d="M25 0 L 35 20 C 40 30, 35 40, 25 50 S 10 30, 15 20 Z M 20 45 H 30 V 50 H 20 Z" />' },
        basto: { class: 'palo-basto', path: '<path d="M25 0 C 30 5, 32 15, 30 25 S 28 40, 25 50 S 22 40, 20 25 S 20 5, 25 0 Z M 22 10 L 18 15 M 32 20 L 28 25 M 18 35 L 12 40" />' }
    };

    const figuraInfo = { 10: 'S', 11: 'C', 12: 'R' };
    const simbolo = `<g transform="scale(0.8)">${paloInfo[palo].path}</g>`;

    // Posiciones predefinidas para los símbolos en la carta
    const layouts = {
        1: [[50, 50]],
        2: [[50, 25], [50, 75]],
        3: [[50, 20], [50, 50], [50, 80]],
        4: [[30, 25], [70, 25], [30, 75], [70, 75]],
        5: [[30, 25], [70, 25], [50, 50], [30, 75], [70, 75]],
        6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
        7: [[30, 20], [70, 20], [50, 35], [30, 50], [70, 50], [30, 80], [70, 80]]
    };

    if (valor >= 10) {
        contenidoCentral = `
            <text x="50" y="65" text-anchor="middle" class="figura-letra">${figuraInfo[valor]}</text>
            <g transform="translate(37.5, 70) scale(0.25)">${paloInfo[palo].path}</g>
        `;
    } else {
        const positions = layouts[valor] || [];
        contenidoCentral = positions.map(([x, y], i) => {
            // Invertir los símbolos de la mitad inferior
            const transform = y > 50 ? `translate(${x}, ${y}) scale(1, -1)` : `translate(${x}, ${y})`;
            return `<g transform="${transform} translate(-25, -25)">${simbolo}</g>`;
        }).join('');
    }

    return `
        <svg class="carta-svg-container" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <g class="${paloInfo[palo].class}">
                ${contenidoCentral}
            </g>
        </svg>
    `;
}
