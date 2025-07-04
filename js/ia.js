const main = {
    // ... (deck sin cambios) ...
    gameState: {},
    baseGameState: {}, // Guardará el estado entre manos

    // ... (initialize, createDeck, shuffleDeck, dealCards sin cambios) ...

    startGame: () => {
        // ... (lógica de limpieza y configuración inicial sin cambios) ...
        main.baseGameState = {
            playerName: playerName,
            targetScore: parseInt(targetScore),
            withFlor: withFlor,
            scores: { player: 0, ia: 0 },
            isHand: 'player'
        };
        // ... (resto sin cambios) ...
    },

    startNewHand: () => {
        UI.clearTable();
        main.createDeck();
        main.shuffleDeck();
        
        main.gameState = {
            ...main.baseGameState,
            hands: { player: [], ia: [] },
            table: { player: [], ia: [] },
            roundWins: { player: 0, ia: 0 },
            currentRound: 1,
            turnOwner: main.baseGameState.isHand,
            actionsLocked: true, // Bloquear acciones hasta chequear la flor
            envidoAvailable: true,
            florChanted: { player: false, ia: false },
            chantState: {
                active: false, type: null, level: null, caller: null, responder: null,
                pointsOnTable: 1, history: []
            }
        };
        
        main.dealCards();
        main.gameState.playerEnvido = IA.calculateEnvido(main.gameState.hands.player);
        main.gameState.iaEnvido = IA.calculateEnvido(main.gameState.hands.ia);
        main.gameState.playerFlor = IA.calculateFlor(main.gameState.hands.player);
        main.gameState.iaFlor = IA.calculateFlor(main.gameState.hands.ia);
        
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.updateScoreboard(main.gameState.scores.player, main.gameState.scores.ia, main.gameState.targetScore);
        UI.logEvent('--- Nueva Mano ---', 'system');
        UI.logEvent(`Es mano <b>${main.gameState.isHand === 'player' ? main.gameState.playerName : 'IA'}</b>.`, 'system');

        // La lógica de la flor tiene prioridad
        setTimeout(main.handleFlor, 500);
    },

    handleFlor: () => {
        const { withFlor, playerFlor, iaFlor } = main.gameState;
        if (!withFlor) {
            main.unlockActionsForTurn();
            return;
        }

        const playerHasFlor = playerFlor.hasFlor;
        const iaHasFlor = iaFlor.hasFlor;

        if (!playerHasFlor && !iaHasFlor) {
            main.unlockActionsForTurn();
            return;
        }
        
        main.gameState.envidoAvailable = false; // Flor anula envido
        
        if (playerHasFlor && !iaHasFlor) {
            UI.logEvent(`${main.gameState.playerName} canta: <b>FLOR</b>`, 'jugador');
            main.baseGameState.scores.player += CONFIG.PUNTOS_CANTO.flor.normal;
            UI.logEvent(`<b>${main.gameState.playerName}</b> se anota 3 puntos de flor.`, 'system');
            main.gameState.florChanted.player = true;
            main.unlockActionsForTurn();
        } else if (!playerHasFlor && iaHasFlor) {
            UI.logEvent(`TrucoEstrella canta: <b>FLOR</b>`, 'ia');
            main.baseGameState.scores.ia += CONFIG.PUNTOS_CANTO.flor.normal;
            UI.logEvent(`<b>TrucoEstrella</b> se anota 3 puntos de flor.`, 'system');
            main.gameState.florChanted.ia = true;
            main.unlockActionsForTurn();
        } else { // Ambos tienen flor
             UI.logEvent('Ambos jugadores tienen flor. Se define por canto.', 'system');
             // TODO: Implementar la secuencia de "CONTRAFLOR"
             main.unlockActionsForTurn(); // Simplificado por ahora
        }
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
    },

    unlockActionsForTurn: () => {
        main.gameState.actionsLocked = false;
        UI.updateActionButtons(main.gameState);
        if (main.gameState.turnOwner === 'ia') {
            main.gameState.actionsLocked = true;
            const action = IA.decideAction(main.gameState);
            if (action.type === 'chant') main.handleIaAction(action.value);
            else if (action.type === 'play') main.playCard(action.value, true);
        }
    },
    
    // ... (playCard, evaluateRound, startNextRound, endHand, checkGameOver sin cambios mayores) ...
    // La mayor refactorización está en el manejo de acciones/cantos

    handlePlayerAction: (action) => {
        if (main.gameState.actionsLocked) return;

        // Respuestas a un canto
        if (['QUIERO', 'NO QUIERO'].includes(action)) {
            main.resolveChant(action);
            return;
        }
        
        // Iniciar o escalar un canto
        main.initiateChant(action, 'player');
    },
    
    handleIaAction: (action) => {
        main.initiateChant(action, 'ia');
    },

    initiateChant: async (action, caller) => {
        main.gameState.actionsLocked = true;
        const responder = caller === 'player' ? 'ia' : 'player';
        
        UI.logEvent(`${caller === 'player' ? main.gameState.playerName : 'TrucoEstrella'} canta: <b>${action}</b>`, caller);
        UI.showChant(caller, action);
        
        const chantType = ['TRUCO', 'RETRUCO', 'VALE CUATRO'].includes(action) ? 'truco' : 'envido';
        main.gameState.chantState = {
            active: true, type: chantType, level: action, caller: caller, responder: responder, history: [action]
        };

        if (chantType === 'envido') main.gameState.envidoAvailable = false;
        
        UI.updateActionButtons(main.gameState);

        if (responder === 'ia') {
            const response = await IA.respondToChant(main.gameState.chantState, main.gameState);
            main.resolveChant(response);
        } else { // Turno del jugador para responder
             main.gameState.actionsLocked = false;
             UI.updateActionButtons(main.gameState);
        }
    },

    resolveChant: async (response) => {
        const { type, level, caller, responder } = main.gameState.chantState;
        const callerName = caller === 'player' ? main.gameState.playerName : 'TrucoEstrella';
        
        UI.logEvent(`${responder === 'player' ? main.gameState.playerName : 'TrucoEstrella'} responde: <b>${response}</b>`, responder);
        UI.showChant(responder, response);

        if (response === 'NO QUIERO') {
            let points = 0;
            if (type === 'truco') points = CONFIG.PUNTOS_CANTO[level.toLowerCase()].noQuiero;
            if (type === 'envido') points = CONFIG.PUNTOS_CANTO[level.toLowerCase()].noQuiero;
            
            main.baseGameState.scores[caller] += points;
            UI.logEvent(`<b>${callerName}</b> gana <b>${points}</b> punto(s).`, 'system');
            UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);

            if (type === 'truco') {
                main.endHand(); // El truco no querido termina la mano
            } else { // El envido no querido no termina la mano
                main.gameState.chantState = { active: false, type: null, level: null, pointsOnTable: 1 };
                main.unlockActionsForTurn();
            }

        } else if (response === 'QUIERO') {
            main.gameState.chantState.active = false;
            
            if (type === 'truco') {
                main.gameState.chantState.pointsOnTable = CONFIG.PUNTOS_CANTO[level.toLowerCase()].quiero;
                UI.logEvent(`El <b>TRUCO</b> se juega por <b>${main.gameState.chantState.pointsOnTable}</b> puntos.`, 'system');
                main.unlockActionsForTurn();
            } else { // Es envido
                main.resolveEnvido();
            }

        } else { // El jugador escaló el canto
            await main.initiateChant(response, responder);
        }
    },

    resolveEnvido: () => {
        const playerTantos = main.gameState.playerEnvido;
        const iaTantos = main.gameState.iaEnvido;
        let winner, winnerName, points;

        if (playerTantos > iaTantos) {
            winner = 'player';
        } else if (iaTantos > playerTantos) {
            winner = 'ia';
        } else { // Empate, gana el mano
            winner = main.gameState.isHand;
        }
        
        winnerName = winner === 'player' ? main.gameState.playerName : 'TrucoEstrella';

        // TODO: Calcular puntos correctamente para Falta Envido etc.
        points = CONFIG.PUNTOS_CANTO.envido.quiero; // Simplificado por ahora
        main.baseGameState.scores[winner] += points;

        UI.showPointsPopup('ENVIDO', playerTantos, iaTantos, winnerName);
        UI.logEvent(`Envido: ${main.gameState.playerName} (${playerTantos}) vs IA (${iaTantos}). Gana <b>${winnerName}</b> ${points} puntos.`, 'system');
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
        
        // El juego continúa
        main.gameState.chantState = { active: false, type: null, level: null, pointsOnTable: 1 };
        main.unlockActionsForTurn();
    }
};

document.addEventListener('DOMContentLoaded', main.initialize);