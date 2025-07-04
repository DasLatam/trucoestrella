const UI = {
    // Elementos de la UI
    homeScreen: document.getElementById('home-screen'),
    gameScreen: document.getElementById('game-screen'),
    playerNameInput: document.getElementById('player-name'),
    
    actionsContainer: document.getElementById('actions-container'),
    iaHandContainer: document.getElementById('ia-hand-container'),
    tableContainer: document.getElementById('table-container'),
    playerSlot: document.getElementById('player-slot'),
    iaSlot: document.getElementById('ia-slot'),
    playerNameGame: document.getElementById('player-name-game'),
    playerHandContainer: document.getElementById('player-hand-container'),

    iaChantArea: document.getElementById('ia-chant-area'),
    playerChantArea: document.getElementById('player-chant-area'),
    scoreContainer: document.getElementById('score-container'),
    gameLog: document.getElementById('game-log'),

    // Métodos de la UI
    initialize: (playerName, startGameCallback) => {
        document.getElementById('start-vs-ia').addEventListener('click', startGameCallback);
        document.getElementById('clear-cache').addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });
        document.getElementById('back-to-menu').addEventListener('click', () => {
            window.location.reload();
        });

        const savedName = localStorage.getItem('trucoPlayerName');
        if (savedName) {
            UI.playerNameInput.value = savedName;
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

        const suitSymbols = { 'Oro': '♦', 'Copa': '♥', 'Espada': '♠', 'Basto': '♣' };
        
        const numberTop = document.createElement('span');
        numberTop.className = 'card-number top-left';
        numberTop.textContent = card.numero;
        
        const numberBottom = document.createElement('span');
        numberBottom.className = 'card-number bottom-right';
        numberBottom.textContent = card.numero;
        
        const suitCenter = document.createElement('span');
        suitCenter.className = 'card-suit';
        suitCenter.style.color = (card.palo === 'Oro' || card.palo === 'Copa') ? '#ef4444' : '#1f2937';
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

        iaHand.forEach(() => {
            const cardElement = UI.createCardHTML(null, false, true);
            UI.iaHandContainer.appendChild(cardElement);
        });
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
            while(remainingScore > 0) {
                const pointsInBox = Math.min(remainingScore, 5);
                const box = document.createElement('div');
                box.className = 'score-box';
                for(let i=1; i<=pointsInBox; i++) {
                    const line = document.createElement('div');
                    line.className = 'score-line';
                    if (i === 1) line.classList.add('left');
                    if (i === 2) line.classList.add('bottom');
                    if (i === 3) line.classList.add('right');
                    if (i === 4) line.classList.add('top');
                    if (i === 5) line.classList.add('diag');
                    box.appendChild(line);
                }
                scoreDiv.appendChild(box);
                remainingScore -= pointsInBox;
            }
            
            column.appendChild(nameDiv);
            column.appendChild(scoreDiv);
            return column;
        }

        scoreWrapper.appendChild(createScoreColumn(CONFIG.nombresJugadores.jugador, playerScore));
        scoreWrapper.appendChild(createScoreColumn(CONFIG.nombresJugadores.ia, iaScore));

        UI.scoreContainer.appendChild(scoreWrapper);
        // Add divider for 30 point games
        if (targetScore === 30) {
            const divider = document.createElement('div');
            divider.className = 'absolute w-full border-t-2 border-dashed border-gray-400';
            divider.style.top = '50%';
            UI.scoreContainer.style.position = 'relative';
            UI.scoreContainer.appendChild(divider);
        }
    },

    logEvent: (message, player) => {
        const p = document.createElement('p');
        p.textContent = message;
        if(player === 'jugador') {
            p.style.color = '#60a5fa'; // blue-400
        } else if (player === 'ia') {
            p.style.color = '#f87171'; // red-400
        } else {
             p.style.color = '#a3a3a3'; // neutral-400
        }
        UI.gameLog.appendChild(p);
        UI.gameLog.scrollTop = UI.gameLog.scrollHeight;
    }
};