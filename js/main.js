const main = {
    deck: [],
    gameState: {},

    initialize: () => {
        UI.initialize();
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
        // Limpiar modales de partidas anteriores
        const oldModal = document.querySelector('.absolute.inset-0');
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
        main.createDeck();
        main.shuffleDeck();
        
        main.gameState = {
            ...main.baseGameState, // Trae puntajes y config
            hands: { player: [], ia: [] },
            table: { player: [], ia: [] }, // Cartas jugadas en la mano actual
            roundWins: { player: 0, ia: 0 },
            currentRound: 1,
            turnOwner: main.baseGameState.isHand,
            actionsLocked: false,
            chantState: { type: null, points: 1 } // Puntos por mano por defecto
        };
        
        main.dealCards();
        
        UI.clearTable();
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.updateScoreboard(main.gameState.scores.player, main.gameState.scores.ia, main.gameState.targetScore);
        UI.updateActionButtons(['TRUCO', 'IR AL MAZO']); // Acciones iniciales
        UI.logEvent('--- Nueva Mano ---', 'system');
        UI.logEvent(`Es mano <b>${main.gameState.isHand === 'player' ? main.gameState.playerName : 'IA'}</b>.`, 'system');

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

        const card = hand.splice(cardIndex, 1)[0];
        main.gameState.table[playerType].push(card);
        
        UI.logEvent(`${playerType === 'player' ? main.gameState.playerName : 'TrucoEstrella'} juega: <b>${card.id}</b>`, playerType);
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.drawCardOnTable(card, playerType);

        // Cambiar turno
        main.gameState.turnOwner = (playerType === 'player') ? 'ia' : 'player';
        main.gameState.actionsLocked = true;

        // Si ambos jugaron, evaluar la ronda
        if (main.gameState.table.player.length === main.gameState.currentRound && main.gameState.table.ia.length === main.gameState.currentRound) {
            setTimeout(main.evaluateRound, 1000);
        } else {
            // Si no, es el turno del otro jugador
             if (main.gameState.turnOwner === 'ia') {
                IA.makeDecision(main.gameState);
            } else {
                main.gameState.actionsLocked = false;
            }
        }
    },

    evaluateRound: () => {
        const playerCard = main.gameState.table.player[main.gameState.currentRound - 1];
        const iaCard = main.gameState.table.ia[main.gameState.currentRound - 1];
        let roundWinner;

        if (playerCard.valor > iaCard.valor) {
            roundWinner = 'player';
        } else if (iaCard.valor > playerCard.valor) {
            roundWinner = 'ia';
        } else {
            roundWinner = 'tie';
        }

        if (roundWinner !== 'tie') {
            main.gameState.roundWins[roundWinner]++;
            UI.highlightWinner(roundWinner);
            UI.logEvent(`<b>${roundWinner === 'player' ? main.gameState.playerName : 'IA'}</b> gana la ${main.gameState.currentRound}° ronda.`, 'system');
        } else {
            UI.logEvent(`La ${main.gameState.currentRound}° ronda es <b>parda</b>.`, 'system');
            // La primera mano parda la gana el que es mano.
            if (main.gameState.currentRound === 1) {
                 main.gameState.roundWins[main.gameState.isHand]++;
                 UI.logEvent(`Como es mano, <b>${main.gameState.isHand === 'player' ? main.gameState.playerName : 'IA'}</b> gana la mano.`, 'system');
            }
        }

        // Chequear si la mano terminó
        const { player, ia } = main.gameState.roundWins;
        if (player >= 2 || ia >= 2 || (player === 1 && ia === 0 && roundWinner === 'tie') || (ia === 1 && player === 0 && roundWinner === 'tie')) {
            setTimeout(main.endHand, 1500);
            return;
        }

        // Si la mano no terminó, preparamos la siguiente ronda
        setTimeout(main.startNextRound, 1500);
    },

    startNextRound: () => {
        main.gameState.currentRound++;
        UI.clearTable();
        UI.logEvent(`--- Ronda ${main.gameState.currentRound} ---`, 'system');

        // El ganador de la ronda anterior empieza la siguiente
        // (Lógica simplificada, el ganador real se define por la mano)
        // Por ahora, sigue el orden de "mano"
        main.gameState.turnOwner = main.gameState.isHand;
        main.gameState.actionsLocked = false;
        
        if (main.gameState.turnOwner === 'ia') {
            main.gameState.actionsLocked = true;
            IA.makeDecision(main.gameState);
        }
    },

    endHand: (quitter) => {
        let handWinner;
        if(quitter) {
            handWinner = (quitter === 'player') ? 'ia' : 'player';
        } else {
            const { player, ia } = main.gameState.roundWins;
            if(player > ia) handWinner = 'player';
            else if (ia > player) handWinner = 'ia';
            else handWinner = main.gameState.isHand; // En caso de empate total (parda, parda, parda) gana el mano.
        }

        const points = main.gameState.chantState.points;
        main.baseGameState.scores[handWinner] += points;
        
        UI.logEvent(`<b>${handWinner === 'player' ? main.gameState.playerName : 'IA'}</b> gana la mano y <b>${points}</b> punto(s).`, 'system');

        // Actualizar el estado base con los nuevos puntajes
        main.gameState.scores = main.baseGameState.scores;
        UI.updateScoreboard(main.gameState.scores.player, main.gameState.scores.ia, main.gameState.targetScore);

        // Chequear si el juego terminó
        if (main.gameState.scores.player >= main.gameState.targetScore || main.gameState.scores.ia >= main.gameState.targetScore) {
            main.checkGameOver();
        } else {
            // Si no, cambiar de mano y empezar una nueva
            main.baseGameState.isHand = (main.baseGameState.isHand === 'player') ? 'ia' : 'player';
            setTimeout(main.startNewHand, 2000);
        }
    },

    checkGameOver: () => {
        const { player, ia } = main.gameState.scores;
        const target = main.gameState.targetScore;
        if(player >= target) {
            UI.showEndGameModal('player');
        } else if (ia >= target) {
            UI.showEndGameModal('ia');
        }
    },

    handlePlayerAction: async (action) => {
        if(main.gameState.actionsLocked) return;
        
        UI.logEvent(`${main.gameState.playerName} canta: <b>${action}</b>`, 'jugador');
        UI.showChant('player', action);
        main.gameState.actionsLocked = true;

        if (action === 'IR AL MAZO') {
            main.endHand('player');
            return;
        }

        if (action === 'TRUCO') {
            const response = await IA.respondToChant('TRUCO', main.gameState);
            UI.showChant('ia', response);
            UI.logEvent(`TrucoEstrella responde: <b>${response}</b>`, 'ia');
            
            if (response === 'QUIERO') {
                main.gameState.chantState.type = 'TRUCO';
                main.gameState.chantState.points = 2;
                main.gameState.actionsLocked = false; // El juego continua
            } else { // NO QUIERO
                main.baseGameState.scores.player++; // Gana 1 punto por el rechazo
                main.endHand(); // Termina la mano, pero sin pasar el control, ya que los puntos se sumaron
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', main.initialize);