const UI = {
    homeScreen: document.getElementById('home-screen'),
    gameScreen: document.getElementById('game-screen'),
    playerNameInput: document.getElementById('player-name'),
    actionsContainer: document.getElementById('actions-container'),
    iaHandContainer: document.getElementById('ia-hand-container'),
    playerSlot: document.getElementById('player-slot'),
    iaSlot: document.getElementById('ia-slot'),
    playerNameGame: document.getElementById('player-name-game'),
    playerHandContainer: document.getElementById('player-hand-container'),
    iaChantArea: document.getElementById('ia-chant-area'),
    playerChantArea: document.getElementById('player-chant-area'),
    scoreContainer: document.getElementById('score-container'),
    gameLog: document.getElementById('game-log'),
    pointsPopup: document.getElementById('points-popup'),
    popupTitle: document.getElementById('popup-title'),
    popupContent: document.getElementById('popup-content'),
    popupWinner: document.getElementById('popup-winner'),

    initialize: (startGameCallback) => {
        document.getElementById('start-vs-ia').addEventListener('click', startGameCallback);
        document.getElementById('clear-cache').addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });
        document.getElementById('back-to-menu').addEventListener('click', () => {
            window.location.reload();
        });
        const savedName = localStorage.getItem('trucoPlayerName');
        if (savedName) { UI.playerNameInput.value = savedName; }
    },

    showGameScreen: () => {
        UI.homeScreen.classList.add('hidden');
        UI.gameScreen.classList.remove('hidden');
    },

    createCardHTML: (card, isPlayerCard = false, isFaceDown = false) => {
        const cardDiv = document.createElement('div');
        if (isFaceDown) {
            cardDiv.className = 'card card-back';
            return cardDiv;
        }

        cardDiv.className = `card ${isPlayerCard ? 'playable' : ''}`;
        cardDiv.dataset.card = card.id;

        const suitSymbols = { 'Oro': '💰', 'Copa': '🍷', 'Espada': '⚔️', 'Basto': '🌲' };
        
        const numberTop = document.createElement('span');
        numberTop.className = 'card-number top-left';
        numberTop.textContent = card.numero;
        
        const numberBottom = document.createElement('span');
        numberBottom.className = 'card-number bottom-right';
        numberBottom.textContent = card.numero;
        
        const suitCenter = document.createElement('span');
        suitCenter.className = 'card-suit';
        suitCenter.textContent = suitSymbols[card.palo];

        cardDiv.appendChild(numberTop);
        cardDiv.appendChild(suitCenter);
        cardDiv.appendChild(numberBottom);
        
        return cardDiv;
    },
    
    drawHands: (playerHand, iaHand) => {
        UI.playerHandContainer.innerHTML = '';
        UI.iaHandContainer.innerHTML = '';
        UI.playerNameGame.textContent = localStorage.getItem('trucoPlayerName') || 'Jugador';

        playerHand.forEach(card => {
            const cardElement = UI.createCardHTML(card, true, false);
            cardElement.addEventListener('click', () => main.playCard(card.id));
            UI.playerHandContainer.appendChild(cardElement);
        });

        iaHand.forEach(card => {
            const cardElement = UI.createCardHTML(card, false, false);
            UI.iaHandContainer.appendChild(cardElement);
        });
    },

    drawCardOnTable: (card, playerType) => {
        const slot = playerType === 'player' ? UI.playerSlot : UI.iaSlot;
        slot.innerHTML = '';
        slot.appendChild(UI.createCardHTML(card, false, false));
    },

    clearTable: () => {
        UI.playerSlot.innerHTML = '';
        UI.iaSlot.innerHTML = '';
        UI.playerSlot.classList.remove('winner-glow');
        UI.iaSlot.classList.remove('winner-glow');
    },

    highlightWinner: (playerType) => {
        const slot = playerType === 'player' ? UI.playerSlot : UI.iaSlot;
        if(slot) slot.classList.add('winner-glow');
    },
    
    updateActionButtons: (gameState) => {
        UI.actionsContainer.innerHTML = '';
        const { chantState, envidoAvailable, turnOwner, actionsLocked } = gameState;
        let actions = [];

        if (turnOwner === 'player' && !actionsLocked && !chantState.active) {
            if (chantState.type !== 'truco') {
                actions.push('TRUCO');
            } else {
                if (chantState.level === 'TRUCO') actions.push('RETRUCO');
                if (chantState.level === 'RETRUCO') actions.push('VALE CUATRO');
            }
            if (envidoAvailable) {
                actions.push('ENVIDO', 'REAL ENVIDO', 'FALTA ENVIDO');
            }
        }
       
        if (chantState.active && chantState.responder === 'player') {
            if (chantState.type === 'flor' && chantState.level === 'FLOR') {
                 actions.push('CON FLOR ME ACHICO', 'CONTRAFLOR');
            } else {
                actions = ['QUIERO', 'NO QUIERO'];
                if (chantState.type === 'truco') {
                     if (chantState.level === 'TRUCO') actions.push('RETRUCO');
                     if (chantState.level === 'RETRUCO') actions.push('VALE CUATRO');
                }
                 if (chantState.type === 'envido') {
                    actions.push('ENVIDO', 'REAL ENVIDO', 'FALTA ENVIDO');
                }
            }
        }

        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action;
            button.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full text-sm mb-1';
            button.addEventListener('click', () => main.handlePlayerAction(action));
            UI.actionsContainer.appendChild(button);
        });
        
        if (turnOwner === 'player') {
            const mazoButton = document.createElement('button');
            mazoButton.textContent = 'IR AL MAZO';
            mazoButton.className = 'bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded w-full mt-auto';
            mazoButton.addEventListener('click', () => main.handlePlayerAction('IR AL MAZO'));
            UI.actionsContainer.appendChild(mazoButton);
        }
    },
    
    showChant: (playerType, text) => {
        const area = playerType === 'player' ? UI.playerChantArea : UI.iaChantArea;
        area.textContent = text.toUpperCase() + '!';
        setTimeout(() => { area.textContent = ''; }, 2000);
    },
    
    showPointsPopup: (title, playerTantos, iaTantos, winnerName) => {
        UI.popupTitle.textContent = title;
        UI.popupContent.innerHTML = `
            <p>${main.gameState.playerName}: ${playerTantos} Puntos</p>
            <p>TrucoEstrella: ${iaTantos} Puntos</p>
        `;
        UI.popupWinner.textContent = `Gana ${winnerName}`;
        
        UI.pointsPopup.classList.remove('hidden', 'opacity-0');
        UI.pointsPopup.classList.add('opacity-100');

        setTimeout(() => {
            UI.pointsPopup.classList.remove('opacity-100');
            UI.pointsPopup.classList.add('opacity-0');
            setTimeout(() => UI.pointsPopup.classList.add('hidden'), 300);
        }, 3000);
    },

    updateScoreboard: (playerScore, iaScore, targetScore) => {
        UI.scoreContainer.innerHTML = '';
        const scoreWrapper = document.createElement('div');
        scoreWrapper.className = 'flex justify-around w-full';

        const createScoreColumn = (name, score) => {
            const column = document.createElement('div');
            column.className = 'flex flex-col items-center';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-xl font-bold';
            nameDiv.textContent = name;
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'flex flex-wrap w-full justify-center';
            
            let remainingScore = score;
            const groupsOfFive = Math.floor(remainingScore / 5);
            for(let g=0; g < groupsOfFive; g++){
                const box = document.createElement('div');
                box.className = 'score-box';
                for(let i=1; i<=5; i++) {
                    const line = document.createElement('div'); line.className = 'score-line';
                    if (i === 1) line.classList.add('left'); if (i === 2) line.classList.add('bottom');
                    if (i === 3) line.classList.add('right'); if (i === 4) line.classList.add('top');
                    if (i === 5) line.classList.add('diag');
                    box.appendChild(line);
                }
                scoreDiv.appendChild(box);
            }
            remainingScore %= 5;
            if(remainingScore > 0){
                const box = document.createElement('div'); box.className = 'score-box';
                for(let i=1; i<=remainingScore; i++) {
                    const line = document.createElement('div'); line.className = 'score-line';
                    if (i === 1) line.classList.add('left'); if (i === 2) line.classList.add('bottom');
                    if (i === 3) line.classList.add('right'); if (i === 4) line.classList.add('top');
                    box.appendChild(line);
                }
                scoreDiv.appendChild(box);
            }
            column.appendChild(nameDiv); column.appendChild(scoreDiv); return column;
        }

        scoreWrapper.appendChild(createScoreColumn(CONFIG.nombresJugadores.jugador, playerScore));
        scoreWrapper.appendChild(createScoreColumn(CONFIG.nombresJugadores.ia, iaScore));

        UI.scoreContainer.appendChild(scoreWrapper);
        if (targetScore === 30 && !UI.scoreContainer.querySelector('.divider')) {
            const divider = document.createElement('div');
            divider.className = 'divider absolute w-full border-t-2 border-dashed border-gray-400';
            divider.style.top = '50%';
            UI.scoreContainer.style.position = 'relative';
            UI.scoreContainer.appendChild(divider);
        }
    },

    logEvent: (message, player) => {
        const p = document.createElement('p');
        p.innerHTML = message;
        if(player === 'jugador') p.style.color = '#60a5fa';
        else if (player === 'ia') p.style.color = '#f87171';
        else p.style.color = '#a3a3a3';
        UI.gameLog.appendChild(p);
        UI.gameLog.scrollTop = UI.gameLog.scrollHeight;
    },

    showEndGameModal: (winner) => {
        const modal = document.createElement('div');
        modal.className = 'absolute inset-0 bg-black bg-opacity-75 flex flex-col justify-center items-center z-50';
        const message = document.createElement('h2');
        message.className = 'text-5xl font-bold mb-8';
        message.textContent = winner === 'player' ? '¡GANASTE!' : 'PERDISTE';

        const revanchaButton = document.createElement('button');
        revanchaButton.textContent = 'Revancha';
        revanchaButton.className = 'bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg text-2xl';
        revanchaButton.onclick = () => main.startGame();

        modal.appendChild(message);
        modal.appendChild(revanchaButton);
        document.body.appendChild(modal);
    }
};