import { GAME_CONSTANTS } from './config.js';

export function renderPlayerHand(hand, containerId, enableClick = false, onCardClick = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    hand.forEach((card, idx) => {
        const div = document.createElement('div');
        div.className = `card ${card.palo} ${card.jugada ? 'jugada' : ''}`;
        div.innerHTML = `
            <span class="corner top-left">${card.numero}</span>
            <span class="center">${GAME_CONSTANTS.PALOS_EMOJI[card.palo]}</span>
            <span class="corner bottom-right">${card.numero}</span>
        `;
        if (enableClick && !card.jugada) {
            div.addEventListener('click', () => onCardClick(idx));
            div.classList.add('hover:shadow-lg', 'hover:border-yellow-400', 'cursor-pointer');
        }
        container.appendChild(div);
    });
}

export function renderIAHand(numCards, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    for (let i = 0; i < numCards; i++) {
        const div = document.createElement('div');
        div.className = 'card bg-gray-300 border-gray-400';
        div.innerHTML = `
            <span class="corner top-left">?</span>
            <span class="center">🂠</span>
            <span class="corner bottom-right">?</span>
        `;
        container.appendChild(div);
    }
}

export function renderMesa(playedCards) {
    const mesa = document.getElementById('mesa');
    mesa.innerHTML = '';
    playedCards.forEach(({jugador, carta}) => {
        if (!carta) return;
        const div = document.createElement('div');
        div.className = `card ${carta.palo}`;
        div.innerHTML = `
            <span class="corner top-left">${carta.numero}</span>
            <span class="center">${GAME_CONSTANTS.PALOS_EMOJI[carta.palo]}</span>
            <span class="corner bottom-right">${carta.numero}</span>
        `;
        const label = document.createElement('div');
        label.className = 'text-xs text-center mt-1';
        label.textContent = jugador;
        mesa.appendChild(div);
        mesa.appendChild(label);
    });
}

export function renderMarcador(playerScore, iaScore, puntosMax) {
    const marcador = document.getElementById('marcador');
    marcador.innerHTML = '';
    marcador.appendChild(renderFosforos(playerScore, 'Vos', puntosMax));
    marcador.appendChild(renderFosforos(iaScore, 'TrucoEstrella', puntosMax));
}

function renderFosforos(puntos, nombre, puntosMax) {
    const div = document.createElement('div');
    div.className = 'mb-2 flex flex-col items-center';
    const nombreDiv = document.createElement('div');
    nombreDiv.className = 'font-bold mb-1';
    nombreDiv.textContent = nombre;
    div.appendChild(nombreDiv);

    let cuadrados = Math.floor(puntos / 5);
    let resto = puntos % 5;
    let totalCuadrados = Math.ceil(puntosMax / 5);

    for (let i = 0; i < totalCuadrados; i++) {
        const cuadrado = document.createElement('div');
        cuadrado.className = 'flex gap-1 mb-1';
        if (i < cuadrados) {
            cuadrado.innerHTML = fosforoSVG(5, true);
        } else if (i === cuadrados && resto > 0) {
            cuadrado.innerHTML = fosforoSVG(resto, true);
        } else {
            cuadrado.innerHTML = fosforoSVG(5, false);
        }
        div.appendChild(cuadrado);
        if (i === 2 && puntosMax === 30) {
            const linea = document.createElement('div');
            linea.className = 'w-16 h-1 bg-gray-500 my-1 rounded';
            div.appendChild(linea);
        }
    }
    return div;
}

function fosforoSVG(cantidad, encendido) {
    const colores = encendido ? ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'] : ['#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db'];
    let svg = '';
    for (let i = 0; i < cantidad; i++) {
        let style = `width:8px;height:2px;background:${colores[i]};display:inline-block;border-radius:2px;margin:0 1px;`;
        if (i === 0) style += 'transform:rotate(-90deg) translateY(6px);position:relative;top:6px;left:0;';
        if (i === 1) style += 'transform:rotate(0deg);position:relative;top:0;left:0;';
        if (i === 2) style += 'transform:rotate(90deg) translateY(-6px);position:relative;top:-6px;left:0;';
        if (i === 3) style += 'transform:rotate(180deg);position:relative;top:0;left:0;';
        if (i === 4) style += 'width:10px;height:2px;background:#f59e42;transform:rotate(45deg);position:relative;top:-2px;left:2px;';
        svg += `<span style="${style}"></span>`;
    }
    return svg;
}

export function addMessageToHistory(msg, who = 'system') {
    const historial = document.getElementById('historial');
    const div = document.createElement('div');
    div.className = `historial-${who}`;
    div.innerHTML = msg;
    historial.appendChild(div);
    historial.scrollTop = historial.scrollHeight;
}

export function clearPlayedCards() {
    document.getElementById('mesa').innerHTML = '';
}