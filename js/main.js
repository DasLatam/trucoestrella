const main = {
    deck: [],
    gameState: {},
    baseGameState: {},

    initialize: () => {
        UI.initialize(main.startGame);
    },

    forceRedraw: () => {
        if(!main.gameState || Object.keys(main.gameState).length === 0) return;
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        main.gameState.table.player.forEach(card => UI.drawCardOnTable(card, 'player'));
        main.gameState.table.ia.forEach(card => UI.drawCardOnTable(card, 'ia'));
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
        UI.updateActionButtons(main.getAvailableActions());
    },

    // --- GAME SETUP ---
    createDeck: () => { /* ... sin cambios ... */ },
    shuffleDeck: () => { /* ... sin cambios ... */ },
    dealCards: () => { /* ... sin cambios ... */ },

    startGame: () => {
        const oldModal = document.querySelector('.absolute.inset-0.z-50');
        if (oldModal) oldModal.remove();

        const playerName = UI.playerNameInput.value || 'Jugador 1';
        localStorage.setItem('trucoPlayerName', playerName);
        
        const targetScore = document.querySelector('input[name="points"]:checked').value;
        const withFlor = document.getElementById('with-flor').checked;

        main.baseGameState = {
            playerName: playerName,
            targetScore: parseInt(targetScore),
            withFlor: withFlor,
            scores: { player: 0, ia: 0 },
            isHand: 'player'
        };
        
        UI.showGameScreen();
        UI.logEvent(`Partida nueva a ${main.baseGameState.targetScore} puntos.`, 'system');
        UI.updateScoreboard(0, 0, main.baseGameState.targetScore);
        main.startNewHand();
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
            rondaNumero: 1,
            turnOwner: main.baseGameState.isHand,
            actionsLocked: false,
            florChanted: { player: false, ia: false },
            envidoChantedBy: null,
            chantState: {
                active: false, type: null, history: [], pointsOnTable: 1
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

        setTimeout(main.processTurn, 100);
    },

    // --- CORE GAME FLOW ---
    processTurn: () => {
        // This function decides what happens at the start of a turn
        main.gameState.actionsLocked = true;
        const florToShow = main.handleFlor();
        if (florToShow) {
            // Flor logic will handle unlocking actions
            return;
        }

        // If no flor, proceed with normal turn
        main.unlockActionsForTurn();
    },

    handleFlor: () => {
        const { withFlor, playerFlor, iaFlor, isHand } = main.gameState;
        if (!withFlor || (!playerFlor.hasFlor && !iaFlor.hasFlor)) {
            return false;
        }
        
        if (playerFlor.hasFlor) main.gameState.florChanted.player = true;
        if (iaFlor.hasFlor) main.gameState.florChanted.ia = true;

        setTimeout(() => {
            if (playerFlor.hasFlor) UI.showChant('player', 'Flor');
            if (iaFlor.hasFlor) UI.showChant('ia', 'Flor');

            if (playerFlor.hasFlor && !iaFlor.hasFlor) {
                main.awardPoints('player', 3, 'de flor');
                main.unlockActionsForTurn();
            } else if (!playerFlor.hasFlor && iaFlor.hasFlor) {
                main.awardPoints('ia', 3, 'de flor');
                main.unlockActionsForTurn();
            } else {
                UI.logEvent('Ambos jugadores tienen flor. Se define por canto.', 'system');
                main.initiateChant('Flor', isHand, isHand === 'player' ? 'ia' : 'player');
            }
        }, 500);
        return true;
    },
    
    unlockActionsForTurn: () => {
        main.gameState.actionsLocked = false;
        if (main.gameState.turnOwner === 'player') {
            UI.updateActionButtons(main.getAvailableActions());
        } else {
            IA.makeDecision(main.gameState);
        }
    },
    
    playCard: (cardId, isIA = false) => {
        const playerType = isIA ? 'ia' : 'player';
        if (main.gameState.turnOwner !== playerType || main.gameState.actionsLocked) return;

        main.gameState.actionsLocked = true;
        UI.updateActionButtons([]);

        const hand = main.gameState.hands[playerType];
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) {
            main.gameState.actionsLocked = false;
            return;
        }

        const card = hand.splice(cardIndex, 1)[0];
        main.gameState.table[playerType].push(card);
        
        UI.logEvent(`${playerType === 'player' ? main.gameState.playerName : 'TrucoEstrella'} juega: <b>${card.id}</b>`, playerType);
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.drawCardOnTable(card, playerType);

        const bothPlayed = main.gameState.table.player.length === main.gameState.rondaNumero && main.gameState.table.ia.length === main.gameState.rondaNumero;

        if (bothPlayed) {
            main.gameState.turnOwner = null; // No one's turn until round is evaluated
            setTimeout(main.evaluateRound, 1000);
        } else {
            main.gameState.turnOwner = (playerType === 'player') ? 'ia' : 'player';
            main.unlockActionsForTurn();
        }
    },

    evaluateRound: () => {
        const playerCard = main.gameState.table.player.at(-1);
        const iaCard = main.gameState.table.ia.at(-1);
        let roundWinner;

        if (playerCard.valor > iaCard.valor) roundWinner = 'player';
        else if (iaCard.valor > playerCard.valor) roundWinner = 'ia';
        else { roundWinner = 'tie'; main.gameState.roundWins.player++; main.gameState.roundWins.ia++; }

        if (roundWinner !== 'tie') {
            main.gameState.roundWins[roundWinner]++;
            UI.highlightWinner(roundWinner);
            UI.logEvent(`<b>${roundWinner === 'player' ? main.gameState.playerName : 'IA'}</b> gana la Ronda ${main.gameState.rondaNumero}.`, 'system');
        } else {
            UI.logEvent(`Ronda ${main.gameState.rondaNumero} es <b>parda</b>.`, 'system');
        }

        const { player, ia } = main.gameState.roundWins;
        if ( (player >= 2 && ia < 2) || (ia >= 2 && player < 2) || main.gameState.rondaNumero >= 3 ) {
            setTimeout(() => main.endHand(), 1500);
            return;
        }
        
        setTimeout(main.startNextRound, 1500);
    },

    startNextRound: () => {
        main.gameState.rondaNumero++;
        UI.clearTable();
        UI.logEvent(`--- Ronda ${main.gameState.rondaNumero} ---`, 'system');
        const lastPlayerCard = main.gameState.table.player.at(-1), lastIaCard = main.gameState.table.ia.at(-1);
        let lastRoundWinner = 'tie';
        if (lastPlayerCard.valor > lastIaCard.valor) lastRoundWinner = 'player';
        else if (lastIaCard.valor > lastPlayerCard.valor) lastRoundWinner = 'ia';
        main.gameState.turnOwner = lastRoundWinner === 'tie' ? main.gameState.isHand : lastRoundWinner;
        main.unlockActionsForTurn();
    },

    endHand: (quitter) => {
        let handWinner;
        let points = main.gameState.chantState.pointsOnTable;
        let reason = 'de la mano';

        if (quitter) {
            handWinner = (quitter === 'player') ? 'ia' : 'player';
            if (main.gameState.chantState.type === 'truco') {
                 reason = 'por irse al mazo';
            } else {
                points = 1;
                reason = 'por irse al mazo';
            }
        } else {
            const { player, ia } = main.gameState.roundWins;
            if (player > ia) handWinner = 'player';
            else if (ia > player) handWinner = 'ia';
            else handWinner = main.gameState.isHand;
        }

        main.awardPoints(handWinner, points, reason);
        if (!main.checkGameOver()) {
             main.baseGameState.isHand = main.baseGameState.isHand === 'player' ? 'ia' : 'player';
             setTimeout(main.startNewHand, 2000);
        }
    },

    // --- ACTION AND CHANT LOGIC ---
    getAvailableActions: () => {
        const { rondaNumero, table, chantState, turnOwner, withFlor, envidoChantedBy, florChanted } = main.gameState;
        let available = [];

        if (chantState.active && chantState.responder === turnOwner) {
            available.push('Quiero', 'No Quiero');
            const lastChant = chantState.history.at(-1);
            if (chantState.type === 'truco') {
                const responseKey = chantState.history.includes('ReTruco') ? 'con_retruco' : 'con_truco';
                if(REGLAS_CANTO.CUALQUIER_RONDA[responseKey]) available.push(...Object.keys(REGLAS_CANTO.CUALQUIER_RONDA[responseKey]));
            } else if (chantState.type === 'envido' && REGLAS_CANTO.RESPUESTA_ENVIDO[lastChant]) {
                available.push(...Object.keys(REGLAS_CANTO.RESPUESTA_ENVIDO[lastChant]));
            } else if (chantState.type === 'flor' && REGLAS_CANTO.RESPUESTA_FLOR[lastChant]) {
                available.push(...Object.keys(REGLAS_CANTO.RESPUESTA_FLOR[lastChant]));
            }
             if(chantState.type === 'flor') available.push('Con Flor me Achico');
        } else if (!chantState.active) {
            // Envido
            if (rondaNumero === 1 && table.player.length === 0 && table.ia.length === 0 && !withFlor && !envidoChantedBy) {
                available.push(...Object.keys(REGLAS_CANTO.PRIMERA.no_jugo));
            }
            // Truco
            const trucoHistory = chantState.history.filter(c => ['Truco', 'ReTruco', 'ValeCuatro'].includes(c));
            if (trucoHistory.length === 0) {
                available.push('Truco');
            } else {
                if (chantState.responder === turnOwner) {
                     const lastTruco = trucoHistory.at(-1);
                     const responseKey = lastTruco === 'Truco' ? 'con_truco' : 'con_retruco';
                     if (REGLAS_CANTO.CUALQUIER_RONDA[responseKey]) available.push(...Object.keys(REGLAS_CANTO.CUALQUIER_RONDA[responseKey]));
                }
            }
        }
        return [...new Set(available)];
    },
    
    handlePlayerAction: (action) => {
        if (main.gameState.actionsLocked) return;
        if (action === 'Me Voy al Mazo') { main.endHand('player'); return; }
        if (main.gameState.chantState.active && main.gameState.chantState.responder === 'player') {
            main.resolveChant(action, 'player');
        } else {
            main.initiateChant(action, 'player', 'ia');
        }
    },
    
    handleIaAction: (action) => {
        main.initiateChant(action, 'ia', 'player');
    },

    initiateChant: async (action, caller, responder) => {
        main.gameState.actionsLocked = true;
        UI.logEvent(`${caller === 'player' ? main.gameState.playerName : 'TrucoEstrella'} canta: <b>${action}</b>`, caller);
        UI.showChant(caller, action);
        
        const chantType = ['Truco', 'ReTruco', 'Vale Cuatro'].includes(action) ? 'truco' : (action.includes('Flor')) ? 'flor' : 'envido';
        
        main.gameState.chantState.active = true;
        main.gameState.chantState.type = chantType;
        main.gameState.chantState.caller = caller;
        main.gameState.chantState.responder = responder;
        main.gameState.chantState.history.push(action.replace(/ /g, ''));
        if (chantType === 'envido') main.gameState.envidoChantedBy = caller;

        UI.updateActionButtons([]);

        if (responder === 'ia') {
            const response = await IA.respondToChant(main.gameState.chantState, main.getAvailableActions(), main.gameState);
            main.resolveChant(response, 'ia');
        } else {
             main.unlockActionsForTurn();
        }
    },

    resolveChant: async (response, responder) => {
        const { type, caller, history } = main.gameState.chantState;
        
        UI.logEvent(`${responder === 'player' ? main.gameState.playerName : 'TrucoEstrella'} responde: <b>${response}</b>`, responder);
        UI.showChant(responder, response);

        if (response === 'No Quiero' || response === 'Con Flor me Achico') {
            const chantKey = history.join(',');
            const pointsData = PUNTOS_CANTO.find(p => p.canto.replace(/ /g, '').replace(/-/g, '') === chantKey);
            const points = pointsData ? pointsData.puntos_no_quiero : 1;
            
            main.awardPoints(caller, points, `por ${type} no querido`);

            if (type === 'truco') {
                 // No se llama a endHand aquí, porque awardPoints ya chequea el fin de partida, y la mano termina sin dar puntos de ronda.
                 setTimeout(() => main.startNewHand(), 2000);
            } else {
                main.gameState.chantState = { ...main.gameState.chantState, active: false, type: null, history: [] };
                main.unlockActionsForTurn();
            }
        } else if (response === 'Quiero') {
            main.gameState.chantState.active = false;
            if (type === 'truco') main.resolveTrucoQuiero();
            else if (type === 'envido') main.resolveEnvido();
            else if (type === 'flor') main.resolveFlor();
        } else {
            await main.initiateChant(response, responder, caller);
        }
    },
    
    resolveTrucoQuiero: () => {
        const lastTruco = main.gameState.chantState.history.filter(c => ['Truco', 'ReTruco', 'ValeCuatro'].includes(c)).at(-1);
        const pointsData = PUNTOS_CANTO.find(p => p.canto.replace(/ /g, '') === lastTruco);
        if (pointsData) main.gameState.chantState.pointsOnTable = pointsData.puntos_ganador;
        UI.logEvent(`El <b>TRUCO</b> se juega por <b>${main.gameState.chantState.pointsOnTable}</b> puntos.`, 'system');
        main.gameState.chantState.type = 'truco';
        main.gameState.chantState.responder = main.gameState.chantState.caller; // Quien quiso puede subir
        main.unlockActionsForTurn();
    },

    resolveEnvido: () => {
        const { playerEnvido, iaEnvido, isHand, scores, targetScore, chantState } = main.gameState;
        let winner = (playerEnvido > iaEnvido) ? 'player' : (iaEnvido > playerEnvido) ? 'ia' : isHand;
        
        const chantKey = chantState.history.join(',');
        const pointsData = PUNTOS_CANTO.find(p => p.canto.replace(/ /g, '') === chantKey);
        let points = 1;
        if(pointsData){
            if(pointsData.puntos_ganador === 'Falta'){
                const loser = winner === 'player' ? 'ia' : 'player';
                points = targetScore - scores[loser];
            } else {
                points = pointsData.puntos_ganador;
            }
        }
        
        UI.showPointsPopup('ENVIDO', playerEnvido, iaEnvido, winner === 'player' ? main.gameState.playerName : 'TrucoEstrella');
        if(!main.awardPoints(winner, points, 'de envido')) {
             main.gameState.chantState = { ...main.gameState.chantState, active: false, type: null, history: [] };
             main.unlockActionsForTurn();
        }
    },

    resolveFlor: () => {
         const { playerFlor, iaFlor, isHand } = main.gameState;
         let winner = (playerFlor.points > iaFlor.points) ? 'player' : (iaFlor.points > iaFlor.points) ? 'ia' : isHand;
         const points = 6;
         UI.showPointsPopup('FLOR', playerFlor.points, iaFlor.points, winner === 'player' ? main.gameState.playerName : 'TrucoEstrella');
         if(!main.awardPoints(winner, points, 'de flor')) {
            main.gameState.chantState = { ...main.gameState.chantState, active: false, type: null, history: [] };
            main.unlockActionsForTurn();
        }
    },

    awardPoints: (player, points, reason) => {
        main.baseGameState.scores[player] += points;
        const playerName = player === 'player' ? main.baseGameState.playerName : 'TrucoEstrella';
        UI.logEvent(`<b>${playerName}</b> se anota <b>${points}</b> punto(s) ${reason}.`, 'system');
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
        return main.checkGameOver();
    }
};

document.addEventListener('DOMContentLoaded', main.initialize);