const main = {
    deck: [],
    gameState: {},

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
        console.log("Mano Jugador:", main.gameState.hands.player);
        console.log("Mano IA:", main.gameState.hands.ia);
    },

    startGame: () => {
        const playerName = UI.playerNameInput.value || 'Jugador';
        localStorage.setItem('trucoPlayerName', playerName);
        
        const targetScore = document.querySelector('input[name="points"]:checked').value;
        const withFlor = document.getElementById('with-flor').checked;

        main.gameState = {
            playerName: playerName,
            targetScore: parseInt(targetScore),
            withFlor: withFlor,
            scores: { player: 0, ia: 0 },
            hands: { player: [], ia: [] },
            table: { player: [], ia: [] },
            currentPlayer: 'player',
            isHand: 'player', // Quien es "mano"
            round: 1,
            gameLog: []
        };
        
        UI.showGameScreen();
        UI.logEvent(`Partida nueva a ${targetScore} puntos.`, 'system');
        main.startNewHand();
    },

    startNewHand: () => {
        main.createDeck();
        main.shuffleDeck();
        main.dealCards();

        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia);
        UI.updateScoreboard(main.gameState.scores.player, main.gameState.scores.ia, main.gameState.targetScore);
        UI.logEvent('--- Nueva Mano ---', 'system');
        UI.logEvent(`Es mano ${main.gameState.isHand === 'player' ? main.gameState.playerName : 'IA'}.`, 'system');
    },

    playCard: (cardId, isIA = false) => {
        const hand = isIA ? main.gameState.hands.ia : main.gameState.hands.player;
        const cardIndex = hand.findIndex(c => c.id === cardId);
        
        if (cardIndex === -1) {
            console.error("La carta no está en la mano.", cardId, hand);
            return;
        }

        const card = hand.splice(cardIndex, 1)[0];
        
        if (isIA) {
            main.gameState.table.ia.push(card);
             UI.logEvent(`TrucoEstrella juega: ${card.id}`, 'ia');
        } else {
            main.gameState.table.player.push(card);
            UI.logEvent(`${main.gameState.playerName} juega: ${card.id}`, 'jugador');
        }

        // Actualizar la UI (redibujar manos y mesa)
        UI.drawHands(main.gameState.hands.player, main.gameState.hands.ia); // Redibuja las manos
        // TODO: Dibujar las cartas en la mesa (en player-slot y ia-slot)
        
        // TODO: Añadir lógica para determinar ganador de la mano y cambiar de turno
        // Por ahora, solo pasa el turno a la IA
        if (!isIA) {
            main.gameState.currentPlayer = 'ia';
            IA.makeDecision(main.gameState);
        } else {
             main.gameState.currentPlayer = 'player';
        }
    }
};

// Iniciar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', main.initialize);