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

export function renderIAHand(hand, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    hand.forEach(card => {
        const div = document.createElement('div');
        div.className = `card bg-gray-300 border-gray-400`;
        div.innerHTML = `
            <span class="corner top-left">?</span>
            <span class="center">🂠</span>
            <span class="corner bottom-right">?</span>
        `;
        container.appendChild(div);
    });
}

export function renderMesaRondas(playedCards, playerName) {
    // Horizontal: Primera, Segunda, Tercera
    const mesaRondas = document.getElementById('mesa-rondas');
    mesaRondas.innerHTML = '';
    const nombres = ['Primera', 'Segunda', 'Tercera'];
    for (let ronda = 1; ronda <= 3; ronda++) {
        const col = document.createElement('div');
        col.className = 'flex flex-col items-center gap-1';
        // IA arriba
        let cartaIA = playedCards.find(pc => pc.jugador === 'TrucoEstrella' && pc.ronda === ronda);
        let cartaPlayer = playedCards.find(pc => pc.jugador === playerName && pc.ronda === ronda);
        col.innerHTML = `
            <div>${cartaIA ? renderCardHTML(cartaIA.carta) : renderEmptyCard()}</div>
            <div class="mx-2 text-base font-bold text-gray-300">${nombres[ronda-1]}</div>
            <div>${cartaPlayer ? renderCardHTML(cartaPlayer.carta) : renderEmptyCard()}</div>
        `;
        mesaRondas.appendChild(col);
    }
}

function renderCardHTML(card) {
    return `<div class="card ${card.palo} jugada" style="pointer-events:none;">
        <span class="corner top-left">${card.numero}</span>
        <span class="center">${GAME_CONSTANTS.PALOS_EMOJI[card.palo]}</span>
        <span class="corner bottom-right">${card.numero}</span>
    </div>`;
}
function renderEmptyCard() {
    return `<div class="card bg-gray-200 border-gray-300 jugada" style="pointer-events:none;opacity:0.3;"></div>`;
}

export function renderMarcador(playerScore, iaScore, puntosMax) {
    const marcador = document.getElementById('marcador');
    marcador.innerHTML = `
        <div class="flex flex-col items-center mb-2">
            <span class="text-lg text-yellow-300 font-bold">Vos</span>
            <span class="text-5xl">${playerScore}</span>
        </div>
        <div class="flex flex-col items-center mb-2">
            <span class="text-lg text-blue-300 font-bold">TrucoEstrella</span>
            <span class="text-5xl">${iaScore}</span>
        </div>
        <div class="text-base text-gray-400 mt-2">A ${puntosMax} puntos</div>
    `;
}

export function addMessageToHistory(msg, who = 'system') {
    const historial = document.getElementById('historial');
    const div = document.createElement('div');
    div.className = `historial-${who}`;
    div.innerHTML = msg;
    historial.appendChild(div);
    historial.scrollTop = historial.scrollHeight;
}