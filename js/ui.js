// js/ui.js

const playerHandDiv = document.getElementById('player-hand');
const cpuHandDiv = document.getElementById('cpu-hand');
const historialLog = document.getElementById('historial-log');

// --- Funciones de renderizado ---

export function dibujarCarta(carta, elementoPadre, esOculta, esJugable, alClick) {
    const cartaDiv = document.createElement('div');
    cartaDiv.classList.add('carta');
    if (esOculta) {
        cartaDiv.classList.add('oculta');
    } else {
        cartaDiv.innerHTML = `
            <span class="valor-carta">${carta.valor}</span>
            <span class="palo-carta">${obtenerSimboloPalo(carta.palo)}</span>
        `;
    }
    if (esJugable) {
        cartaDiv.classList.add('jugador-carta');
        cartaDiv.onclick = () => alClick(carta);
    }
    elementoPadre.appendChild(cartaDiv);
    return cartaDiv;
}

export function dibujarMano(mano, div, esOculta, esJugable, alClick) {
    div.innerHTML = '';
    mano.forEach(carta => dibujarCarta(carta, div, esOculta, esJugable, alClick));
}

export function moverCartaALaMesa(carta, jugador, manoNumero) {
    const slotId = `${jugador}-slot-${manoNumero}`;
    const slot = document.getElementById(slotId);
    slot.innerHTML = ''; // Limpiar por si acaso
    dibujarCarta(carta, slot, false, false, null);
}

export function actualizarMarcador(marcadorPlayer, marcadorCpu) {
    const divPlayer = document.getElementById('marcador-player');
    const divCpu = document.getElementById('marcador-cpu');

    const dibujarPorotos = (puntos, div) => {
        div.innerHTML = '';
        let restantes = puntos;
        let conMalas = false;

        if (puntos > 15 && puntos <= 30) { // Lógica para separar "malas" y "buenas"
            dibujarGrupo(15, div, false);
            div.classList.add('linea-malas');
            restantes -= 15;
            conMalas = true;
        } else {
             div.classList.remove('linea-malas');
        }
        
        dibujarGrupo(restantes, div, conMalas);
    };
    
    dibujarPorotos(marcadorPlayer, divPlayer);
    dibujarPorotos(marcadorCpu, divCpu);
}

function dibujarGrupo(puntos, div) {
    const gruposDeCinco = Math.floor(puntos / 5);
    const individuales = puntos % 5;

    for (let i = 0; i < gruposDeCinco; i++) {
        const grupoDiv = document.createElement('div');
        grupoDiv.className = 'poroto-grupo';
        for (let j = 0; j < 4; j++) {
            const poroto = document.createElement('div');
            poroto.className = 'poroto';
            grupoDiv.appendChild(poroto);
        }
        const cruzado = document.createElement('div');
        cruzado.className = 'cruzado';
        grupoDiv.appendChild(cruzado);
        div.appendChild(grupoDiv);
    }

    if (individuales > 0) {
        const grupoDiv = document.createElement('div');
        grupoDiv.className = 'poroto-grupo';
        for (let i = 0; i < individuales; i++) {
            const poroto = document.createElement('div');
            poroto.className = 'poroto';
            grupoDiv.appendChild(poroto);
        }
        div.appendChild(grupoDiv);
    }
}


export function limpiarMesa() {
    for(let i = 1; i <= 3; i++) {
        document.getElementById(`cpu-slot-${i}`).innerHTML = '';
        document.getElementById(`player-slot-${i}`).innerHTML = '';
    }
}

export function agregarLog(mensaje, autor) {
    const p = document.createElement('p');
    p.textContent = mensaje;
    if (autor === 'player') p.className = 'log-player';
    else if (autor === 'cpu') p.className = 'log-cpu';
    else p.className = 'log-sistema';
    historialLog.appendChild(p);
    historialLog.scrollTop = historialLog.scrollHeight;
}

export function limpiarLog() {
    historialLog.innerHTML = '';
}

export function actualizarNombres(nombrePlayer, nombreCpu) {
    document.getElementById('player-name-marcador').textContent = nombrePlayer;
    document.getElementById('cpu-name-marcador').textContent = nombreCpu;
}

export function togglePantallas() {
    document.getElementById('setup-screen').classList.toggle('activa');
    document.getElementById('game-screen').classList.toggle('activa');
}

export function actualizarBotones(estado) {
    // Deshabilitar todos por defecto
    document.querySelectorAll('.botonera button').forEach(btn => btn.disabled = true);
    
    // Habilitar según el estado
    if (estado.turno === 'player') {
        if (estado.esperandoRespuesta) {
            document.getElementById('btn-quiero').disabled = false;
            document.getElementById('btn-no-quiero').disabled = false;
        } else {
            document.getElementById('btn-ir-al-mazo').disabled = false;
            if (estado.puedeCantarEnvido) {
                document.getElementById('btn-envido').disabled = false;
                document.getElementById('btn-real-envido').disabled = false;
                document.getElementById('btn-falta-envido').disabled = false;
            }
            if (estado.puedeCantarTruco) {
                const nivelTruco = estado.nivelTruco;
                document.getElementById('btn-truco').disabled = nivelTruco > 0;
                document.getElementById('btn-retruco').disabled = nivelTruco !== 1;
                document.getElementById('btn-vale-cuatro').disabled = nivelTruco !== 2;
            }
        }
    }
}


// --- Helpers ---
function obtenerSimboloPalo(palo) {
    switch (palo) {
        case 'espada': return '⚔️';
        case 'basto': return '🌲';
        case 'oro': return '💰';
        case 'copa': return '🍷';
        default: return '';
    }
}