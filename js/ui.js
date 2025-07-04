const UI = {
    // ... (elementos de la UI sin cambios) ...
    pointsPopup: document.getElementById('points-popup'),
    popupTitle: document.getElementById('popup-title'),
    popupContent: document.getElementById('popup-content'),
    popupWinner: document.getElementById('popup-winner'),

    // ... (initialize, showGameScreen, createCardHTML sin cambios) ...
    
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
            const cardElement = UI.createCardHTML(card, false, false); // DEBUG: Mostrar cartas IA
            UI.iaHandContainer.appendChild(cardElement);
        });
    },
    
    // --- MODIFICADA Y NUEVAS FUNCIONES ---
    
    updateActionButtons: (gameState) => {
        UI.actionsContainer.innerHTML = '';
        const { chantState, envidoAvailable, turnOwner } = gameState;
        let actions = [];

        if (turnOwner === 'player' && !gameState.actionsLocked) {
             if (chantState.type === 'truco') {
                if (chantState.level === 'TRUCO' && chantState.responder === 'player') {
                    actions.push('RETRUCO');
                }
                if (chantState.level === 'RETRUCO' && chantState.responder === 'player') {
                    actions.push('VALE CUATRO');
                }
            } else if (!chantState.type) { // Si no hay un canto de truco activo
                actions.push('TRUCO');
            }
    
            if (envidoAvailable) {
                actions.push('ENVIDO', 'REAL ENVIDO', 'FALTA ENVIDO');
            }
        }
       
        // Lógica para responder a un canto
        if (chantState.active && chantState.responder === 'player') {
            actions = ['QUIERO', 'NO QUIERO'];
            if (chantState.type === 'truco') {
                 if (chantState.level === 'TRUCO') actions.push('RETRUCO');
                 if (chantState.level === 'RETRUCO') actions.push('VALE CUATRO');
            }
             if (chantState.type === 'envido') {
                actions.push('ENVIDO', 'REAL ENVIDO', 'FALTA ENVIDO');
            }
            if (chantState.type === 'flor' && chantState.level === 'FLOR'){
                 actions.push('CONTRAFLOR', 'CONTRAFLOR AL RESTO');
            }
        }

        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action;
            button.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full text-sm mb-1';
            button.addEventListener('click', () => main.handlePlayerAction(action));
            UI.actionsContainer.appendChild(button);
        });
        
        // Botón de irse al mazo siempre disponible en el turno del jugador
        if (turnOwner === 'player') {
            const mazoButton = document.createElement('button');
            mazoButton.textContent = 'IR AL MAZO';
            mazoButton.className = 'bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded w-full mt-auto';
            mazoButton.addEventListener('click', () => main.handlePlayerAction('IR AL MAZO'));
            UI.actionsContainer.appendChild(mazoButton);
        }
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

    // ... (resto de funciones como drawCardOnTable, clearTable, etc., sin cambios) ...
};