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
    chatInput: document.getElementById('chat-input'),
    chatSend: document.getElementById('chat-send'),
    reloadUI: document.getElementById('reload-ui'),
    pointsPopup: document.getElementById('points-popup'),
    popupTitle: document.getElementById('popup-title'),
    popupContent: document.getElementById('popup-content'),
    popupWinner: document.getElementById('popup-winner'),
    chantTimeout: null,

    initialize: (startGameCallback) => {
        document.getElementById('start-vs-ia').addEventListener('click', startGameCallback);
        document.getElementById('clear-cache').addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });
        document.getElementById('back-to-menu').addEventListener('click', () => window.location.reload());
        UI.reloadUI.addEventListener('click', () => main.forceRedraw());
        
        UI.chatSend.addEventListener('click', UI.sendChatMessage);
        UI.chatInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') UI.sendChatMessage();
        });

        const savedName = localStorage.getItem('trucoPlayerName');
        if (savedName) UI.playerNameInput.value = savedName;
    },

    sendChatMessage: () => {
        const message = UI.chatInput.value.trim();
        if (message) {
            UI.logEvent(`${main.gameState.playerName}: ${message}`, 'jugador');
            UI.chatInput.value = '';
        }
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

        cardDiv.appendChild(numberTop); cardDiv.appendChild(suitCenter); cardDiv.appendChild(numberBottom);
        return cardDiv;
    },
    
    drawHands: (playerHand, iaHand) => {
        UI.playerHandContainer.innerHTML = '';
        UI.iaHandContainer.innerHTML = '';
        UI.playerNameGame.textContent = localStorage.getItem('trucoPlayerName') || 'Jugador 1';

        playerHand.forEach(card => {
            const cardElement = UI.createCardHTML(card, true, false);
            cardElement.addEventListener('click', () => main.playCard(card.id));
            UI.playerHandContainer.appendChild(cardElement);
        });

        iaHand.forEach(card => {
            const cardElement = UI.createCardHTML(card, false, true); // AI cards are face down
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
    
    updateActionButtons: (availableActions) => {
        UI.actionsContainer.innerHTML = '';

        availableActions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action;
            button.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full text-sm mb-1';
            button.addEventListener('click', () => main.handlePlayerAction(action));
            UI.actionsContainer.appendChild(button);
        });
        
        const mazoButton = document.createElement('button');
        mazoButton.textContent = 'Me Voy al Mazo';
        mazoButton.className = 'bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded w-full mt-auto';
        mazoButton.addEventListener('click', () => main.handlePlayerAction('Me Voy al Mazo'));
        UI.actionsContainer.appendChild(mazoButton);
    },
    
    showChant: (playerType, text) => {
        const area = playerType === 'player' ? UI.playerChantArea : UI.iaChantArea;
        clearTimeout(UI.chantTimeout);
        area.className = 'h-1/3 flex items-center justify-center text-yellow-400 font-bold p-2 text-3xl uppercase';
        area.textContent = text + '!';
        UI.chantTimeout = setTimeout(() => { area.textContent = ''; }, 5000);
    },
    
    showPointsPopup: (title, playerTantos, iaTantos, winnerName) => {
        UI.popupTitle.textContent = title;
        UI.popupContent.innerHTML = `<p>${main.gameState.playerName}: ${playerTantos} Puntos</p><p>TrucoEstrella: ${iaTantos} Puntos</p>`;
        UI.popupWinner.textContent = `Gana ${winnerName}`;
        UI.pointsPopup.classList.remove('hidden');
        setTimeout(() => UI.pointsPopup.classList.add('hidden'), 3000);
    },

    updateScoreboard: (playerScore, iaScore, targetScore) => {
        UI.scoreContainer.innerHTML = '';
        
        const createScoreColumn = (name, score) => {
            const column = document.createElement('div');
            column.className = 'flex flex-col items-center w-1/2';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-xl font-bold mb-2';
            nameDiv.textContent = name;
            column.appendChild(nameDiv);

            for (let s = 1; s <= score; s++) {
                if ((s - 1) % 5 === 0) {
                    const box = document.createElement('div');
                    box.className = 'score-box';
                    box.dataset.score = Math.floor((s-1)/5);
                    column.appendChild(box);
                }
                const currentBox = column.querySelector(`[data-score="${Math.floor((s-1)/5)}"]`);
                const line = document.createElement('div');
                line.className = 'score-line';
                const pointInBox = s % 5 === 0 ? 5 : s % 5;
                if (pointInBox === 1) line.classList.add('left');
                if (pointInBox === 2) line.classList.add('top');
                if (pointInBox === 3) line.classList.add('right');
                if (pointInBox === 4) line.classList.add('bottom');
                if (pointInBox === 5) line.classList.add('diag');
                currentBox.appendChild(line);
            }
            return column;
        };
        
        const scoreWrapper = document.createElement('div');
        scoreWrapper.className = 'flex justify-around w-full';
        scoreWrapper.appendChild(createScoreColumn(CONFIG.nombresJugadores.jugador, playerScore));
        scoreWrapper.appendChild(createScoreColumn(CONFIG.nombresJugadores.ia, iaScore));
        UI.scoreContainer.appendChild(scoreWrapper);

        if (targetScore === 30) {
            const divider = document.createElement('div');
            divider.style.position = 'absolute';
            divider.style.width = '100%';
            divider.style.borderTop = '2px dashed #9ca3af';
            divider.style.top = 'calc(3 * (60px + 10px) + 2rem)';
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