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
    const mesaRondas = document.getElementById('mesa-rondas');
    mesaRondas.innerHTML = '';
    const nombres = ['Primera', 'Segunda', 'Tercera'];
    for (let ronda = 1; ronda <= 3; ronda++) {
        const col = document.createElement('div');
        col.className = 'flex flex-col items-center gap-1';
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
        <div class="text-xs text-gray-500 mt-1">Versión: <b>Beta 3.4 Copilot</b></div>
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

export function renderCantoBotonera(gameState) {
    const cantosCol = document.getElementById('cantos-col');
    cantosCol.innerHTML = '';

    // Si hay un canto pendiente y el jugador debe responder, mostrar botones de respuesta
    if (gameState.cantoPendiente && gameState.esperandoRespuesta && gameState.quienDebeResponder === 'player') {
        gameState.cantoPendiente.opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.className = 'game-canto-btn bg-yellow-700 hover:bg-yellow-800 py-3 rounded text-lg font-bold mb-1';
            btn.textContent = opcion;
            btn.onclick = () => {
                if (opcion === 'Quiero') window.aceptarCanto('player');
                else if (opcion === 'No Quiero') window.rechazarCanto('player');
                else window.iniciarCanto('player', opcion);
            };
            cantosCol.appendChild(btn);
        });
        return;
    }

    // Si no hay canto pendiente, mostrar opciones válidas según el estado
    let opciones = [];
    if (!gameState.trucoCantado && !gameState.envidoCantado && !gameState.florCantada && gameState.playedCards.length === 0) {
        opciones = ['Truco', 'Envido', 'Real Envido', 'Falta Envido'];
        if (gameState.flor) opciones.push('Flor');
    }
    if (gameState.florCantada && !gameState.envidoCantado) {
        opciones = ['Flor'];
        if (tieneFlor(gameState.playerHand) && tieneFlor(gameState.iaHand)) {
            opciones.push('Contra Flor', 'Contra Flor al Resto');
        }
    }
    if (gameState.trucoCantado && !gameState.cantoPendiente) {
        opciones = ['ReTruco', 'Vale Cuatro'];
    }
    opciones.push('Me voy al Mazo', 'Volver al Menú');
    opciones.forEach(canto => {
        const btn = document.createElement('button');
        btn.className = 'game-canto-btn bg-yellow-700 hover:bg-yellow-800 py-3 rounded text-lg font-bold mb-1';
        btn.textContent = canto;
        btn.setAttribute('data-canto', canto);
        btn.onclick = () => {
            if (canto === 'Me voy al Mazo') {
                const rival = 'TrucoEstrella';
                addMessageToHistory(`${gameState.playerName} se fue al mazo. Punto para ${rival}`, 'system');
                gameState.iaScore += puntosEnDisputa(gameState);
                renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
                if (gameState.iaScore >= gameState.puntosMax) {
                    document.getElementById('modal-fin-partida-content').textContent = `Ganador: TrucoEstrella`;
                    document.getElementById('modal-fin-partida').classList.remove('hidden');
                } else {
                    window.initializeGame();
                }
            } else if (canto === 'Volver al Menú') {
                window.location.reload();
            } else {
                window.iniciarCanto('player', canto);
            }
        };
        cantosCol.appendChild(btn);
    });
}

function tieneFlor(mano) {
    return mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo;
}

function puntosEnDisputa(gameState) {
    if (gameState.cantoPendiente) {
        const tipo = gameState.cantoPendiente.tipo;
        if (tipo === 'Truco') return 2;
        if (tipo === 'ReTruco') return 3;
        if (tipo === 'Vale Cuatro') return 4;
    }
    return 1;
}