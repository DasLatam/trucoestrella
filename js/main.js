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
                if (CONFIG.valoresCartas[cardId]) valor = CONFIG.valoresCartas[cardId];
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
        const { withFlor, playerFlor, iaFlor, isHand } = main.gameState;
        if (!withFlor || (!playerFlor.hasFlor && !iaFlor.hasFlor)) {
            main.unlockActionsForTurn();
            return;
        }

        main.gameState.envidoAvailable = false;
        
        if (playerFlor.hasFlor) {
            UI.logEvent(`${main.gameState.playerName} canta: <b>FLOR</b>`, 'jugador');
            UI.showChant('player', 'FLOR');
            main.gameState.florChanted.player = true;
        }
        if (iaFlor.hasFlor) {
            UI.logEvent(`TrucoEstrella canta: <b>FLOR</b>`, 'ia');
            UI.showChant('ia', 'FLOR');
            main.gameState.florChanted.ia = true;
        }

        if (playerFlor.hasFlor && !iaFlor.hasFlor) {
            main.awardPoints('player', CONFIG.PUNTOS_CANTO.flor.normal, 'de flor');
            main.unlockActionsForTurn();
        } else if (!playerFlor.hasFlor && iaFlor.hasFlor) {
            main.awardPoints('ia', CONFIG.PUNTOS_CANTO.flor.normal, 'de flor');
            main.unlockActionsForTurn();
        } else {
            UI.logEvent('Ambos jugadores tienen flor. Se define por canto.', 'system');
            const firstToAct = isHand;
            const secondToAct = isHand === 'player' ? 'ia' : 'player';
            main.initiateChant('FLOR', firstToAct, secondToAct);
        }
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
        else { roundWinner = 'tie'; main.gameState.roundWins.player++; main.gameState.roundWins.ia++; }

        if (roundWinner !== 'tie') {
            main.gameState.roundWins[roundWinner]++;
            UI.highlightWinner(roundWinner);
            UI.logEvent(`<b>${roundWinner === 'player' ? main.gameState.playerName : 'IA'}</b> gana la ${main.gameState.currentRound}° ronda.`, 'system');
        } else {
            UI.logEvent(`La ${main.gameState.currentRound}° ronda es <b>parda</b>.`, 'system');
        }

        const { player, ia } = main.gameState.roundWins;
        if (player >= 2 || ia >= 2 || main.gameState.currentRound >= 3) {
            setTimeout(main.endHand, 1500);
            return;
        }
        
        setTimeout(main.startNextRound, 1500);
    },

    startNextRound: () => {
        main.gameState.currentRound++;
        UI.clearTable();
        UI.logEvent(`--- Ronda ${main.gameState.currentRound} ---`, 'system');

        const lastPlayerCard = main.gameState.table.player[main.gameState.currentRound - 2];
        const lastIaCard = main.gameState.table.ia[main.gameState.currentRound - 2];
        let lastRoundWinner = 'tie';
        if (lastPlayerCard.valor > lastIaCard.valor) lastRoundWinner = 'player';
        else if (lastIaCard.valor > lastPlayerCard.valor) lastRoundWinner = 'ia';
        
        main.gameState.turnOwner = lastRoundWinner === 'tie' ? main.gameState.isHand : lastRoundWinner;
        main.unlockActionsForTurn();
    },

    endHand: (quitter) => {
        let handWinner;
        if (quitter) {
            handWinner = (quitter === 'player') ? 'ia' : 'player';
        } else {
            const { player, ia } = main.gameState.roundWins;
            if (player > ia) handWinner = 'player';
            else if (ia > player) handWinner = 'ia';
            else handWinner = main.gameState.isHand;
        }

        main.awardPoints(handWinner, main.gameState.chantState.pointsOnTable, 'de la mano');
        
        if (main.baseGameState.scores[handWinner] < main.baseGameState.targetScore) {
             main.baseGameState.isHand = (main.baseGameState.isHand === 'player') ? 'ia' : 'player';
             setTimeout(main.startNewHand, 2000);
        }
    },

    checkGameOver: () => {
        const { player, ia } = main.baseGameState.scores;
        const target = main.baseGameState.targetScore;
        if (player >= target) UI.showEndGameModal('player');
        else if (ia >= target) UI.showEndGameModal('ia');
    },

    handlePlayerAction: (action) => {
        if (main.gameState.actionsLocked && !main.gameState.chantState.active) return;
        if (action === 'IR AL MAZO') { main.endHand('player'); return; }
        
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
        
        const chantType = ['TRUCO', 'RETRUCO', 'VALE CUATRO'].includes(action) ? 'truco' : (action.includes('FLOR')) ? 'flor' : 'envido';
        
        main.gameState.chantState.active = true;
        main.gameState.chantState.type = chantType;
        main.gameState.chantState.level = action;
        main.gameState.chantState.caller = caller;
        main.gameState.chantState.responder = responder;
        main.gameState.chantState.history.push(action);

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
        const { type, caller } = main.gameState.chantState;
        
        UI.logEvent(`${responder === 'player' ? main.gameState.playerName : 'TrucoEstrella'} responde: <b>${response}</b>`, responder);
        UI.showChant(responder, response);

        if (response === 'NO QUIERO' || response === 'CON FLOR ME ACHICO') {
            main.resolveNoQuiero(response);
        } else if (response === 'QUIERO') {
            main.gameState.chantState.active = false;
            if (type === 'truco') main.resolveTrucoQuiero();
            else if (type === 'envido') main.resolveEnvido();
            else if (type === 'flor') main.resolveFlor();
        } else {
            await main.initiateChant(response, responder, caller);
        }
    },

    calculateChantPoints: (history) => {
        let quieroPoints = 0; let noQuieroPoints = 0; let isFalta = false;
        history.forEach(chant => {
            if (chant === 'ENVIDO') { quieroPoints += 2; }
            if (chant === 'REAL ENVIDO') { quieroPoints += 3; }
            if (chant === 'FALTA ENVIDO') isFalta = true;
        });
        noQuieroPoints = quieroPoints === 0 ? 1 : quieroPoints;
        return { quiero: quieroPoints, noQuiero: noQuieroPoints, isFalta: isFalta };
    },

    resolveNoQuiero: (response) => {
        const { type, history, caller } = main.gameState.chantState;
        let points = 0; let reason = 'no querido';

        if (type === 'envido') points = main.calculateChantPoints(history).noQuiero;
        else if (type === 'truco') points = CONFIG.PUNTOS_CANTO[history[history.length - 1].toLowerCase()].noQuiero;
        else if (type === 'flor') {
            points = CONFIG.PUNTOS_CANTO.flor.contraflor.noQuiero;
            if (response === 'CON FLOR ME ACHICO') reason = 'achique';
        }
        
        main.awardPoints(caller, points, `por ${type} ${reason}`);

        if (type === 'truco') { main.endHand(); } 
        else {
            main.gameState.chantState = { active: false, type: null, level: null, pointsOnTable: main.gameState.chantState.pointsOnTable, history: [] };
            main.unlockActionsForTurn();
        }
    },
    
    resolveTrucoQuiero: () => {
        const level = main.gameState.chantState.history.at(-1);
        main.gameState.chantState.pointsOnTable = CONFIG.PUNTOS_CANTO[level.toLowerCase()].quiero;
        main.gameState.chantState.type = 'truco';
        main.gameState.chantState.level = level;
        UI.logEvent(`El <b>TRUCO</b> se juega por <b>${main.gameState.chantState.pointsOnTable}</b> puntos.`, 'system');
        main.unlockActionsForTurn();
    },

    resolveEnvido: () => {
        const { playerEnvido, iaEnvido, isHand, scores, targetScore, chantState } = main.gameState;
        let winner;
        if (playerEnvido > iaEnvido) winner = 'player';
        else if (iaEnvido > playerEnvido) winner = 'ia';
        else winner = isHand;
        
        const pointData = main.calculateChantPoints(chantState.history);
        let points = pointData.quiero;
        if (pointData.isFalta) {
            const loser = winner === 'player' ? 'ia' : 'player';
            points = targetScore - scores[loser];
        }

        UI.showPointsPopup('ENVIDO', playerEnvido, iaEnvido, winner === 'player' ? main.gameState.playerName : 'TrucoEstrella');
        main.awardPoints(winner, points, 'de envido');
        
        main.gameState.chantState = { ...main.gameState.chantState, active: false, type: null, level: null, history: [] };
        main.unlockActionsForTurn();
    },

    resolveFlor: () => {
        const { playerFlor, iaFlor, isHand } = main.gameState;
        let winner;
        if (playerFlor.points > iaFlor.points) winner = 'player';
        else if (iaFlor.points > iaFlor.points) winner = 'ia';
        else winner = isHand;
        
        const points = CONFIG.PUNTOS_CANTO.flor.contraflor.quiero; // Simplificado

        UI.showPointsPopup('FLOR', playerFlor.points, iaFlor.points, winner === 'player' ? main.gameState.playerName : 'TrucoEstrella');
        main.awardPoints(winner, points, 'de flor');
        
        main.gameState.chantState = { ...main.gameState.chantState, active: false, type: null, level: null, history: [] };
        main.unlockActionsForTurn();
    },

    awardPoints: (player, points, reason) => {
        main.baseGameState.scores[player] += points;
        const playerName = player === 'player' ? main.baseGameState.playerName : 'TrucoEstrella';
        UI.logEvent(`<b>${playerName}</b> se anota <b>${points}</b> punto(s) ${reason}.`, 'system');
        UI.updateScoreboard(main.baseGameState.scores.player, main.baseGameState.scores.ia, main.baseGameState.targetScore);
        main.checkGameOver();
    }
};

document.addEventListener('DOMContentLoaded', main.initialize);