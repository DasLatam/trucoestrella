export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

export function updatePlayerName(name) {
    document.getElementById('player-name-display').textContent = name;
    document.getElementById('player-score-name').textContent = name;
}

export function drawCard(card, element, isFaceUp) {
    element.innerHTML = '';
    element.classList.remove('face-down', 'player-card');

    if (isFaceUp) {
        element.innerHTML = `
            <span class="number">${card.number}</span>
            <span class="suit">${card.suit}</span>
            <span class="number-bottom">${card.number}</span>
        `;
        element.dataset.card = JSON.stringify(card);
    } else {
        element.classList.add('face-down');
    }
}

export function clearTable() {
    document.querySelectorAll('#table .card-slot').forEach(slot => {
        slot.innerHTML = '';
        slot.classList.remove('winner');
    });
}

export function drawHands(playerHand, iaHand) {
    const playerHandDiv = document.getElementById('player-hand');
    const iaHandDiv = document.getElementById('ia-hand');
    
    playerHandDiv.innerHTML = '';
    iaHandDiv.innerHTML = '';

    playerHand.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card player-card';
        drawCard(card, cardEl, true);
        playerHandDiv.appendChild(cardEl);
    });

    iaHand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        drawCard(null, cardEl, false);
        iaHandDiv.appendChild(cardEl);
    });
}

export function playCardToTable(card, player, handNumber) {
    const tableSlot = document.querySelector(`#${player}-table .card-slot:nth-child(${handNumber})`);
    tableSlot.innerHTML = ''; // Limpiar slot por si acaso
    const cardEl = document.createElement('div');
    cardEl.className = 'card played';
    drawCard(card, cardEl, true);
    tableSlot.appendChild(cardEl);
}

export function highlightWinnerCard(player, handNumber) {
    const tableSlot = document.querySelector(`#${player}-table .card-slot:nth-child(${handNumber})`);
    if(tableSlot && tableSlot.firstChild) {
        tableSlot.firstChild.classList.add('winner');
    }
}

export function logToHistory(message, type) {
    const historyLog = document.getElementById('history-log');
    historyLog.innerHTML += `<p class="log-${type}">${message}</p>`;
    historyLog.scrollTop = historyLog.scrollHeight;
}

export function updateScoreboard(playerScore, iaScore, maxPoints) {
    const drawFosforos = (score, container) => {
        container.innerHTML = '';
        if (maxPoints === 30) {
            const scorePart1 = Math.min(score, 15);
            const scorePart2 = Math.max(0, score - 15);

            drawGroups(scorePart1, container);
            if (score > 15 || maxPoints === 30) {
                 container.innerHTML += '<div class="score-divider"></div>';
            }
            drawGroups(scorePart2, container);

        } else {
            drawGroups(score, container);
        }
    };
    
    const drawGroups = (score, container) => {
        const fullGroups = Math.floor(score / 5);
        const remainder = score % 5;

        for (let i = 0; i < fullGroups; i++) {
            const group = document.createElement('div');
            group.className = 'fosforo-group';
            group.innerHTML = `
                <div class="fosforo"></div><div class="fosforo"></div>
                <div class="fosforo"></div><div class="fosforo"></div>
                <div class="fosforo fosforo-h"></div>
            `;
            container.appendChild(group);
        }

        if (remainder > 0) {
            const group = document.createElement('div');
            group.className = 'fosforo-group';
            for (let i = 0; i < remainder; i++) {
                group.innerHTML += '<div class="fosforo"></div>';
            }
            container.appendChild(group);
        }
    };

    drawFosforos(playerScore, document.getElementById('player-score'));
    drawFosforos(iaScore, document.getElementById('ia-score'));
}

export function showCantoModal(message, options) {
    return new Promise(resolve => {
        const modal = document.getElementById('canto-modal');
        const modalMessage = document.getElementById('modal-message');
        const modalOptions = document.getElementById('modal-options');

        modalMessage.textContent = message;
        modalOptions.innerHTML = '';

        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = option.text;
            button.onclick = () => {
                modal.classList.remove('active');
                resolve(option.value);
            };
            if(option.type === 'primary') button.classList.add('btn-primary');
            modalOptions.appendChild(button);
        });
        
        modal.classList.add('active');
    });
}

export function hideCantoModal() {
    document.getElementById('canto-modal').classList.remove('active');
}

export function updateActionButtons(gameState) {
    const { cantoState, turn, player, withFlor, roundNumber } = gameState;
    const isPlayerTurn = turn === player.id;
    
    const buttons = {
        'truco-btn': false, 'retruco-btn': false, 'vale4-btn': false,
        'envido-btn': false, 'real-envido-btn': false, 'falta-envido-btn': false,
        'flor-btn': false, 'contraflor-btn': false, 'contraflor-resto-btn': false,
        'mazo-btn': isPlayerTurn
    };

    if (isPlayerTurn && !cantoState.active) {
        // TRUCO
        if (!cantoState.truco.level) {
            buttons['truco-btn'] = true;
        } else if (cantoState.truco.level === 'TRUCO' && cantoState.truco.singer !== player.id) {
            buttons['retruco-btn'] = true;
        } else if (cantoState.truco.level === 'RETRUCO' && cantoState.truco.singer !== player.id) {
            buttons['vale4-btn'] = true;
        }

        // ENVIDO (solo en primera mano)
        if (roundNumber === 1 && !cantoState.envido.closed && !cantoState.flor.active) {
            buttons['envido-btn'] = true;
            buttons['real-envido-btn'] = true;
            buttons['falta-envido-btn'] = true;
        }

        // FLOR
        if (withFlor && roundNumber === 1 && player.hasFlor && !cantoState.envido.active && !cantoState.flor.closed) {
             if (!cantoState.flor.level) {
                 buttons['flor-btn'] = true;
             } else if (cantoState.flor.level === 'FLOR' && cantoState.flor.singer !== player.id) {
                 buttons['contraflor-btn'] = true;
                 buttons['contraflor-resto-btn'] = true;
             }
        }
    }
    
    for (const [id, enabled] of Object.entries(buttons)) {
        document.getElementById(id).disabled = !enabled;
    }
}

export function showEndGameModal(title, message) {
     document.getElementById('end-game-title').textContent = title;
     document.getElementById('end-game-message').textContent = message;
     document.getElementById('end-game-modal').classList.add('active');
}

export function hideEndGameModal() {
    document.getElementById('end-game-modal').classList.remove('active');
}