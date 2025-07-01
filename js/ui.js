// js/ui.js

// --- Elementos del DOM ---
const historialLog = document.getElementById('historial-log');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

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
        // Contenedor para el SVG y los números de las esquinas
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
    p.textContent = mensaje;
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
        
        // Permitir subir la apuesta de envido
        if (estadoBotones.puedeSubirEnvido) {
            document.getElementById('btn-envido').disabled = estadoBotones.nivelEnvidoActual >= 1;
            document.getElementById('btn-real-envido').disabled = estadoBotones.nivelEnvidoActual >= 2;
            document.getElementById('btn-falta-envido').disabled = false;
        }
        // Permitir subir la apuesta de flor
        if (estadoBotones.puedeSubirFlor) {
             document.getElementById('btn-contraflor').disabled = estadoBotones.nivelFlorActual >= 2;
             document.getElementById('btn-contraflor-resto').disabled = false;
        }

    } else if(estadoBotones.esTurnoPlayer) {
        document.getElementById('btn-ir-al-mazo').disabled = false;
        // Cantos de Envido
        if (estadoBotones.puedeCantarEnvido) {
            document.getElementById('btn-envido').disabled = false;
            document.getElementById('btn-real-envido').disabled = false;
            document.getElementById('btn-falta-envido').disabled = false;
        }
        // Cantos de Truco
        if (estadoBotones.puedeCantarTruco) {
            document.getElementById('btn-truco').disabled = estadoBotones.nivelTrucoActual > 0;
            document.getElementById('btn-retruco').disabled = estadoBotones.nivelTrucoActual !== 1;
            document.getElementById('btn-vale-cuatro').disabled = estadoBotones.nivelTrucoActual !== 2;
        }
        // Cantos de Flor
        if (estadoBotones.puedeCantarFlor) {
            document.getElementById('btn-flor').disabled = false;
        }
    }
}

/**
 * Muestra un modal con información.
 */
export function mostrarModal(titulo, contenido) {
    modalTitle.textContent = titulo;
    modalBody.innerHTML = contenido;
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
        oro: { class: 'palo-oro', path: '<path d="M50 85 C 20 95, 10 60, 25 40 S 30 5, 50 5 S 70 5, 75 40 S 80 95, 50 85 Z M 40 25 C 40 20, 60 20, 60 25 S 40 30, 40 25 Z" />' },
        copa: { class: 'palo-copa', path: '<path d="M20 5 H 80 V 25 C 80 45, 65 50, 50 50 S 20 45, 20 25 Z M 40 55 H 60 V 85 H 75 V 95 H 25 V 85 H 40 Z" />' },
        espada: { class: 'palo-espada', path: '<path d="M50 5 L 65 40 C 75 60, 70 75, 50 95 S 25 60, 35 40 Z M 40 85 H 60 V 95 H 40 Z" />' },
        basto: { class: 'palo-basto', path: '<path d="M50 5 C 60 15, 65 30, 60 50 S 55 80, 50 95 S 45 80, 40 50 S 40 15, 50 5 Z M 45 20 L 35 30 M 65 40 L 55 50 M 40 65 L 30 75" />' }
    };

    const figuraInfo = {
        10: 'S', // Sota
        11: 'C', // Caballo
        12: 'R'  // Rey
    };

    if (valor >= 10) {
        // Para figuras, mostrar la letra y un palo grande
        contenidoCentral = `
            <text x="50" y="65" text-anchor="middle" class="figura-letra">${figuraInfo[valor]}</text>
            <g transform="translate(48, 70) scale(0.3)">
                ${paloInfo[palo].path}
            </g>
        `;
    } else {
        // Para números, mostrar un palo grande en el centro
        // (Una implementación más compleja podría mostrar N palos)
        contenidoCentral = `
             <g transform="translate(0, 5) scale(0.8)">
                ${paloInfo[palo].path}
            </g>
        `;
    }

    return `
        <svg class="carta-svg-container" viewBox="0 0 100 150" >
            <g class="${paloInfo[palo].class}">
                ${contenidoCentral}
            </g>
        </svg>
    `;
}
