// =================================================================================
// ARCHIVO DE MANEJO DE LA INTERFAZ DE USUARIO (UI) (Módulo)
// =================================================================================

import { SVG_ICONS, SVG_LOMO_CARTA } from './config.js';

export function agregarAlLog(botones, autor, mensaje) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${autor}:</strong> ${mensaje}`;
    botones.log.appendChild(p);
    botones.log.scrollTop = botones.log.scrollHeight;
}

export function actualizarInfo(botones, mensaje) {
    botones.info.innerHTML = mensaje;
}

export function actualizarMarcador(botones, marcador, jugadorHumano, jugadorCPU) {
    dibujarMarcadorGrafico(botones, marcador, jugadorHumano, jugadorCPU);
}

function dibujarMarcadorGrafico(botones, marcador, jugadorHumano, jugadorCPU) {
    if(!jugadorHumano) return;
    document.getElementById('marcador-humano-nombre').textContent = jugadorHumano.nombre;
    document.getElementById('marcador-cpu-nombre').textContent = jugadorCPU.nombre;
    const porotosHumano = document.getElementById('marcador-humano-porotos');
    const porotosCPU = document.getElementById('marcador-cpu-porotos');
    porotosHumano.innerHTML = ''; 
    porotosCPU.innerHTML = '';

    let htmlHumano = '', htmlCPU = '';

    for(let i = 1; i <= marcador.humano; i++) {
        htmlHumano += `<div class="poroto-grupo"><div class="poroto ${i % 5 === 0 ? 'quinto' : ''}"></div></div>`;
        if(i === 15) htmlHumano += '<div class="linea-buenas"></div>';
    }
    for(let i = 1; i <= marcador.cpu; i++) {
        htmlCPU += `<div class="poroto-grupo"><div class="poroto ${i % 5 === 0 ? 'quinto' : ''}"></div></div>`;
        if(i === 15) htmlCPU += '<div class="linea-buenas"></div>';
    }

    porotosHumano.innerHTML = htmlHumano;
    porotosCPU.innerHTML = htmlCPU;
}

export function crearElementoCarta(carta, esLomo = false) {
    const el = document.createElement('div');
    el.className = 'carta';

    if (esLomo) {
        el.innerHTML = SVG_LOMO_CARTA;
        return el;
    }
    
    const color = (carta.palo === 'oros' || carta.palo === 'copas') ? '#B71C1C' : 'black';
    const svgCarta = `
        <svg viewbox="0 0 85 125" style="background-color: white; border: 2px solid black; border-radius: 8px; width: 100%; height: 100%;">
            <text x="5" y="18" font-size="16" font-weight="bold" fill="${color}">${carta.numero}</text>
            <g transform="scale(0.8) translate(5, 5)">${SVG_ICONS[carta.palo]}</g>
            <text x="42.5" y="118" font-size="9" text-anchor="middle" fill="#424242">${carta.palo.charAt(0).toUpperCase() + carta.palo.slice(1)}</text>
            <text x="80" y="110" font-size="16" font-weight="bold" fill="${color}" transform="rotate(180, 42.5, 62.5)">${carta.numero}</text>
        </svg>
    `;
    el.innerHTML = svgCarta;
    return el;
}

export function dibujarMano(botones, jugadorHumano, turnoDelHumano, juegoPausado, jugarCartaCallback) {
    botones.mano.innerHTML = '';
    jugadorHumano.mano.forEach(carta => {
        const el = crearElementoCarta(carta);
        el.disabled = !turnoDelHumano || juegoPausado;
        if (!el.disabled) {
            el.addEventListener('click', () => jugarCartaCallback(carta));
        }
        botones.mano.appendChild(el);
    });
}

export function dibujarManoCPU(botones, inicial = false) {
    if (inicial) {
        botones.manoCPU.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            botones.manoCPU.appendChild(crearElementoCarta(null, true));
        }
    } else {
        if (botones.manoCPU.firstChild) {
            botones.manoCPU.removeChild(botones.manoCPU.firstChild);
        }
    }
}

export function ocultarTodosLosControles(botones, estadoTruco) {
    for (const key in botones) {
        if (botones[key] && typeof botones[key].style !== 'undefined') {
            if (!['marcadorGrafico', 'info', 'mano', 'nuevoJuego', 'log', 'manoCPU'].includes(key)) {
                if(key === 'truco' && estadoTruco >= 1) {
                    // No ocultar el truco si ya se cantó, para que no reaparezca
                } else {
                    botones[key].style.display = 'none';
                }
            }
        }
    }
}

export function mostrarBotonesRespuesta(botones, turno, tipoCanto, estadoTruco, estadoEnvido) {
    if (turno === 'humano') {
        botones.quiero.style.display = 'block';
        botones.noQuiero.style.display = 'block';
        if (tipoCanto === 'truco') {
            if (estadoTruco === 1) botones.reTruco.style.display = 'block';
            if (estadoTruco === 2) botones.valeCuatro.style.display = 'block';
        } else { // envido
            if (estadoEnvido.nivel < 2) botones.realEnvido.style.display = 'block';
            if (estadoEnvido.nivel < 3) botones.faltaEnvido.style.display = 'block';
        }
    }
}

export function mostrarBotonesDeCantoInicial(botones, juegoPausado, turnoDelHumano, manoActual, estadoEnvido, tieneFlor, estadoTruco) {
    if (juegoPausado || !turnoDelHumano) {
        ocultarTodosLosControles(botones, estadoTruco);
        return;
    }

    if (manoActual === 1 && !estadoEnvido.respondido) {
        if (tieneFlor.humano) {
            botones.flor.style.display = 'block';
        } else if (!tieneFlor.cpu) {
            botones.envido.style.display = 'block';
            botones.realEnvido.style.display = 'block';
            botones.faltaEnvido.style.display = 'block';
        }
    }

    if (estadoTruco < 1) {
        botones.truco.style.display = 'block';
    }
}