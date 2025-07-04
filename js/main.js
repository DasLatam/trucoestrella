const main = {
    deck: [],
    gameState: {},
    baseGameState: {},

    initialize: () => {
        UI.initialize(main.startGame);
    },

    createDeck: () => {
        main.deck = [];
        for (const palo of CONFIG.palos) {
            for (const numero of CONFIG.numeros) {
                const cardId = `${numero} de ${palo}`;
                let valor = CONFIG.valoresCartas[numero];
                if (CONFIG.valoresCartas[cardId]) {
                    valor = CONFIG.valoresCartas[cardId];
                }
                main.deck.push({ id: cardId, numero, palo, valor });
            }
        }
    },

    shuffleDeck: () => {
        for (let i = main.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [main.deck[i], main.deck[j]] = [main.deck[j], main.deck[i]];
        }
    },
    
    dealCards: () => {
        main.gameState.hands.player = main.deck.slice(0, 3);
        main.gameState.hands.ia = main.deck.slice(3, 6);
    },

    startGame: () => {
        const oldModal = document.querySelector('.absolute.inset-0.z-50');
        if (oldModal) oldModal.remove();

        const playerName = UI.playerNameInput.value || 'Jugador';
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
            currentRound: 1,
            turnOwner: main.baseGameState.isHand,
            actionsLocked: true,
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
        
        main.gameState.envidoAvailable = false;
        
        if (playerHasFlor) {
            UI.logEvent(`${main.gameState.playerName} canta: <b>FLOR</b>`, 'jugador');
            UI.showChant('player', 'FLOR');
            main.gameState.florChanted.player = true;
        }
        if (iaHasFlor) {
            UI.logEvent(`TrucoEstrella canta: <b>FLOR</b>`, 'ia');
            UI.showChant('ia', 'FLOR');
            main.gameState.florChanted.ia = true;
        }

        if (playerHasFlor && !iaHasFlor) {
            main.baseGameState.scores.player += CONFIG.PUNTOS_CANTO.flor.normal;
            UI.logEvent(`<b>${main.gameState.playerName}</b> se anota 3 puntos de flor.`, 'system');
        } else if (!playerHasFlor && iaHasFlor) {
            main.baseGameState.scores.ia += CONFIG.PUNTOS_CANTO.flor.normal;
            UI.logEvent(`<b>TrucoEstrella</b> se anota 3 puntos de flor.`, 'system');
        } else {
             UI.logEvent('Ambos jugadores tienen flor. Se define por canto.', 'system');
             // TODO: Implementar la secuencia de "CONTRAFLOR"
        }
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
        main.unlockActionsForTurn();
    },

    unlockActionsForTurn: () => {
        main.gameState.actionsLocked = false;
        UI.updateActionButtons(main.gameState);
        if (main.gameState.turnOwner === 'ia') {
            main.gameState.actionsLocked = true;
            IA.makeDecision(main.gameState);
        }
    },
    
    playCard: (cardId, isIA = false) => {
        const playerType = isIA ? 'ia' : 'player';
        if (main.gameState.turnOwner !== playerType || main.gameState.actionsLocked) return;

        const hand = main.gameState.hands[playerType];
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        if(main.gameState.currentRound === 1) main.gameState.envidoAvailable = false;

        const card = hand.splice(cardIndex, 1)[0];
        main.gameState.table[playerType].push(card);
        
        UI.logEvent(`${playerType === 'player' ? main.gameState.playerName : 'TrucoEstrella'} juega: <b>${card.id}</b>`, playerType);
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.drawCardOnTable(card, playerType);

        main.gameState.turnOwner = (playerType === 'player') ? 'ia' : 'player';
        main.gameState.actionsLocked = true;
        UI.updateActionButtons(main.gameState);

        if (main.gameState.table.player.length === main.gameState.currentRound && main.gameState.table.ia.length === main.gameState.currentRound) {
            setTimeout(main.evaluateRound, 1000);
        } else {
             if (main.gameState.turnOwner === 'ia') {
                IA.makeDecision(main.gameState);
            } else {
                main.gameState.actionsLocked = false;
                UI.updateActionButtons(main.gameState);
            }
        }
    },

    evaluateRound: () => {
        const playerCard = main.gameState.table.player[main.gameState.currentRound - 1];
        const iaCard = main.gameState.table.ia[main.gameState.currentRound - 1];
        let roundWinner;

        if (playerCard.valor > iaCard.valor) roundWinner = 'player';
        else if (iaCard.valor > playerCard.valor) roundWinner = 'ia';
        else roundWinner = 'tie';

        if (roundWinner !== 'tie') {
            main.gameState.roundWins[roundWinner]++;
            UI.highlightWinner(roundWinner);
            UI.logEvent(`<b>${roundWinner === 'player' ? main.gameState.playerName : 'IA'}</b> gana la ${main.gameState.currentRound}° ronda.`, 'system');
        } else {
            main.gameState.roundWins.player++; main.gameState.roundWins.ia++; // parda
            UI.logEvent(`La ${main.gameState.currentRound}° ronda es <b>parda</b>.`, 'system');
        }

        const { player, ia } = main.gameState.roundWins;
        if (player >= 2 || ia >= 2) {
            setTimeout(main.endHand, 1500);
            return;
        }

        if(main.gameState.currentRound >= 3) {
            setTimeout(main.endHand, 1500);
            return;
        }
        
        setTimeout(main.startNextRound, 1500);
    },

    startNextRound: () => {
        main.gameState.currentRound++;
        UI.clearTable();
        UI.logEvent(`--- Ronda ${main.gameState.currentRound} ---`, 'system');

        let lastRoundWinner = 'tie';
        const pCard = main.gameState.table.player[main.gameState.currentRound - 2];
        const iCard = main.gameState.table.ia[main.gameState.currentRound - 2];
        if(pCard.valor > iCard.valor) lastRoundWinner = 'player';
        if(iCard.valor > pCard.valor) lastRoundWinner = 'ia';

        main.gameState.turnOwner = lastRoundWinner === 'tie' ? main.gameState.isHand : lastRoundWinner;
        
        main.unlockActionsForTurn();
    },

    endHand: (quitter) => {
        let handWinner;
        if(quitter) {
            handWinner = (quitter === 'player') ? 'ia' : 'player';
        } else {
            const { player, ia } = main.gameState.roundWins;
            if(player > ia) handWinner = 'player';
            else if (ia > player) handWinner = 'ia';
            else handWinner = main.gameState.isHand;
        }

        const points = main.gameState.chantState.pointsOnTable;
        main.baseGameState.scores[handWinner] += points;
        
        UI.logEvent(`<b>${handWinner === 'player' ? main.gameState.playerName : 'IA'}</b> gana la mano y <b>${points}</b> punto(s).`, 'system');

        main.gameState.scores = main.baseGameState.scores;
        UI.updateScoreboard(main.gameState.scores.player, main.gameState.scores.ia, main.gameState.targetScore);

        if (main.gameState.scores.player >= main.gameState.targetScore || main.gameState.scores.ia >= main.gameState.targetScore) {
            main.checkGameOver();
        } else {
            main.baseGameState.isHand = (main.baseGameState.isHand === 'player') ? 'ia' : 'player';
            setTimeout(main.startNewHand, 2000);
        }
    },

    checkGameOver: () => {
        const { player, ia } = main.gameState.scores;
        const target = main.gameState.targetScore;
        if(player >= target) UI.showEndGameModal('player');
        else if (ia >= target) UI.showEndGameModal('ia');
    },

    handlePlayerAction: (action) => {
        if (main.gameState.actionsLocked && !main.gameState.chantState.active) return;
        if (action === 'IR AL MAZO') { main.endHand('player'); return; }
        if (['QUIERO', 'NO QUIERO'].includes(action) || (main.gameState.chantState.active && main.gameState.chantState.responder === 'player')) {
            main.resolveChant(action, 'player');
        } else {
            main.initiateChant(action, 'player');
        }
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
            active: true, type: chantType, level: action, caller: caller, responder: responder, 
            pointsOnTable: main.gameState.chantState.pointsOnTable, history: [action]
        };

        if (chantType === 'envido') main.gameState.envidoAvailable = false;
        
        UI.updateActionButtons(main.gameState);

        if (responder === 'ia') {
            const response = await IA.respondToChant(main.gameState.chantState, main.gameState);
            main.resolveChant(response, 'ia');
        } else {
             main.gameState.actionsLocked = false;
             UI.updateActionButtons(main.gameState);
        }
    },

    resolveChant: async (response, responder) => {
        const { level, caller } = main.gameState.chantState;
        const callerName = caller === 'player' ? main.gameState.playerName : 'TrucoEstrella';
        const responderName = responder === 'player' ? main.gameState.playerName : 'TrucoEstrella';
        
        UI.logEvent(`${responderName} responde: <b>${response}</b>`, responder);
        UI.showChant(responder, response);

        if (response === 'NO QUIERO') {
            const chantConfig = CONFIG.PUNTOS_CANTO[level.toLowerCase().replace(" ", "")];
            const points = chantConfig.noQuiero;
            
            main.baseGameState.scores[caller] += points;
            UI.logEvent(`<b>${callerName}</b> gana <b>${points}</b> punto(s).`, 'system');
            UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);

            main.gameState.chantState = { active: false, type: null, level: null, pointsOnTable: 1 };
            if (main.gameState.chantState.type === 'truco') main.endHand();
            else main.unlockActionsForTurn();

        } else if (response === 'QUIERO') {
            main.gameState.chantState.active = false;
            
            if (main.gameState.chantState.type === 'truco') {
                main.gameState.chantState.pointsOnTable = CONFIG.PUNTOS_CANTO[level.toLowerCase()].quiero;
                UI.logEvent(`El <b>TRUCO</b> se juega por <b>${main.gameState.chantState.pointsOnTable}</b> puntos.`, 'system');
                main.unlockActionsForTurn();
            } else {
                main.resolveEnvido();
            }
        } else {
            await main.initiateChant(response, responder);
        }
    },

    resolveEnvido: () => {
        const playerTantos = main.gameState.playerEnvido;
        const iaTantos = main.gameState.iaEnvido;
        let winner, winnerName, points = 0;

        if (playerTantos > iaTantos) winner = 'player';
        else if (iaTantos > playerTantos) winner = 'ia';
        else winner = main.gameState.isHand;
        
        winnerName = winner === 'player' ? main.gameState.playerName : 'TrucoEstrella';
        
        // TODO: Calcular puntos correctamente para Falta Envido y cantos acumulados
        points = CONFIG.PUNTOS_CANTO.envido.quiero;
        main.baseGameState.scores[winner] += points;

        UI.showPointsPopup('ENVIDO', playerTantos, iaTantos, winnerName);
        UI.logEvent(`Envido: ${main.gameState.playerName} (${playerTantos}) vs IA (${iaTantos}). Gana <b>${winnerName}</b> ${points} puntos.`, 'system');
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
        
        main.gameState.chantState = { ...main.gameState.chantState, active: false, type: null, level: null };
        main.unlockActionsForTurn();
    }
};

document.addEventListener('DOMContentLoaded', main.initialize);