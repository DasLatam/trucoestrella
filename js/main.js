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
            actionsLocked: true,
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

        setTimeout(main.handleFlor, 500);
    },

    handleFlor: () => {
        const { withFlor, playerFlor, iaFlor, isHand } = main.gameState;
        if (!withFlor || (!playerFlor.hasFlor && !iaFlor.hasFlor)) {
            main.unlockActionsForTurn();
            return;
        }
        
        if (playerFlor.hasFlor) {
            UI.logEvent(`${main.gameState.playerName} canta: <b>Flor</b>`, 'jugador');
            UI.showChant('player', 'Flor');
            main.gameState.florChanted.player = true;
        }
        if (iaFlor.hasFlor) {
            UI.logEvent(`TrucoEstrella canta: <b>Flor</b>`, 'ia');
            UI.showChant('ia', 'Flor');
            main.gameState.florChanted.ia = true;
        }

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
    },
    
    getAvailableActions: () => {
        const { rondaNumero, table, chantState, turnOwner, withFlor, envidoChantedBy } = main.gameState;
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
            const jugo = table[turnOwner].length > 0;
            if (rondaNumero === 1 && !jugo && !withFlor && !envidoChantedBy) {
                available.push(...Object.keys(REGLAS_CANTO.PRIMERA.no_jugo));
            }
            const trucoHistory = chantState.history.filter(c => ['Truco', 'ReTruco', 'ValeCuatro'].includes(c));
            if (trucoHistory.length === 0) {
                available.push('Truco');
            } else {
                const lastTruco = trucoHistory.at(-1);
                const responseKey = lastTruco === 'Truco' ? 'con_truco' : 'con_retruco';
                if (REGLAS_CANTO.CUALQUIER_RONDA[responseKey]) {
                     available.push(...Object.keys(REGLAS_CANTO.CUALQUIER_RONDA[responseKey]));
                }
            }
        }
        return [...new Set(available)];
    },
    
    unlockActionsForTurn: () => {
        main.gameState.actionsLocked = false;
        if(main.gameState.turnOwner === 'player'){
            UI.updateActionButtons(main.getAvailableActions());
        } else {
            main.gameState.actionsLocked = true;
            setTimeout(() => IA.makeDecision(main.gameState), 500);
        }
    },
    
    playCard: (cardId, isIA = false) => {
        const playerType = isIA ? 'ia' : 'player';
        if (main.gameState.turnOwner !== playerType || main.gameState.actionsLocked) return;

        const hand = main.gameState.hands[playerType];
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = hand.splice(cardIndex, 1)[0];
        main.gameState.table[playerType].push(card);
        
        UI.logEvent(`${playerType === 'player' ? main.gameState.playerName : 'TrucoEstrella'} juega: <b>${card.id}</b>`, playerType);
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.drawCardOnTable(card, playerType);

        main.gameState.turnOwner = (playerType === 'player') ? 'ia' : 'player';
        main.gameState.actionsLocked = true;
        UI.updateActionButtons([]);

        if (main.gameState.table.player.length === main.gameState.rondaNumero && main.gameState.table.ia.length === main.gameState.rondaNumero) {
            setTimeout(main.evaluateRound, 1000);
        } else {
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

        if (quitter) {
            handWinner = (quitter === 'player') ? 'ia' : 'player';
            if(main.gameState.chantState.type !== 'truco') points = 1;
        } else {
            const { player, ia } = main.gameState.roundWins;
            if (player > ia) handWinner = 'player';
            else if (ia > player) handWinner = 'ia';
            else handWinner = main.gameState.isHand;
        }
        main.awardPoints(handWinner, points, 'de la mano');
        if (!main.checkGameOver()) {
             main.baseGameState.isHand = main.baseGameState.isHand === 'player' ? 'ia' : 'player';
             setTimeout(main.startNewHand, 2000);
        }
    },

    checkGameOver: () => {
        const { player, ia } = main.baseGameState.scores;
        if (player >= main.baseGameState.targetScore || ia >= main.baseGameState.targetScore) {
            UI.showEndGameModal(player >= main.baseGameState.targetScore ? 'player' : 'ia');
            return true;
        }
        return false;
    },

    handlePlayerAction: (action) => {
        if (main.gameState.actionsLocked && !main.gameState.chantState.active) return;
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
             main.gameState.actionsLocked = false;
             UI.updateActionButtons(main.getAvailableActions());
        }
    },

    resolveChant: async (response, responder) => {
        const { type, caller } = main.gameState.chantState;
        
        UI.logEvent(`${responder === 'player' ? main.gameState.playerName : 'TrucoEstrella'} responde: <b>${response}</b>`, responder);
        UI.showChant(responder, response);

        if (response === 'No Quiero' || response === 'Con Flor me Achico') {
            const chantKey = main.gameState.chantState.history.join(',');
            const pointsData = PUNTOS_CANTO.find(p => p.canto.replace(/ /g, '') === chantKey);
            const points = pointsData ? pointsData.puntos_no_quiero : 1;
            main.awardPoints(caller, points, `por ${type} no querido`);

            if (type === 'truco') main.endHand();
            else {
                main.gameState.chantState = { active: false, type: null, history: [], pointsOnTable: main.gameState.chantState.pointsOnTable };
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
        const pointsData = PUNTOS_CANTO.find(p => p.canto === lastTruco);
        if (pointsData) main.gameState.chantState.pointsOnTable = pointsData.puntos_ganador;
        UI.logEvent(`El <b>TRUCO</b> se juega por <b>${main.gameState.chantState.pointsOnTable}</b> puntos.`, 'system');
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