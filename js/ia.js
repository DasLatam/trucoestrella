const IA = {
    makeDecision: (gameState) => {
        setTimeout(() => {
            const action = IA.decideAction(gameState);
            if (action.type === 'chant') {
                main.handleIaAction(action.value);
            } else if (action.type === 'play') {
                main.playCard(action.value, true);
            }
        }, 1200);
    },

    decideAction: (gameState) => {
        // 1. Obligación: Cantar flor si la tiene y no la cantó
        if (gameState.withFlor && IA.calculateFlor(gameState.hands.ia).hasFlor && !gameState.florChanted.ia) {
            return { type: 'chant', value: 'FLOR' };
        }
        
        // 2. Oportunismo: Cantar envido si tiene buenos puntos y puede
        if (gameState.envidoAvailable) {
            const myEnvido = IA.calculateEnvido(gameState.hands.ia);
            if (myEnvido >= 28) {
                return { type: 'chant', value: 'ENVIDO' };
            }
        }
        
        // 3. Oportunismo: Cantar truco si tiene buenas cartas
        if (!gameState.chantState.type) {
            const goodCards = gameState.hands.ia.filter(c => c.valor >= 10).length;
            if (goodCards >= 2) {
                return { type: 'chant', value: 'TRUCO' };
            }
        }

        // 4. Por defecto: Jugar una carta
        const cardToPlay = IA.decideCardToPlay(gameState);
        return { type: 'play', value: cardToPlay.id };
    },

    decideCardToPlay: (gameState) => {
        const { hands, table, roundWins, isHand, currentRound } = gameState;
        const myHand = [...hands.ia].sort((a, b) => a.valor - b.valor);

        if (myHand.length === 0) return null;

        if (roundWins.player === 1 && currentRound === 2) return myHand[myHand.length - 1];
        if (roundWins.ia === 1 && currentRound === 2) return myHand[0];
        if (currentRound === 2 && table.player.length === 1 && table.ia.length === 1 && table.player[0].valor === table.ia[0].valor) {
            return myHand[myHand.length - 1];
        }
        if (currentRound === 3 && roundWins.player === 1 && roundWins.ia === 1) return myHand[myHand.length - 1];

        if (currentRound === 1 && isHand === 'ia') return myHand[myHand.length - 1];
        
        if (table.player.length === currentRound) {
            const playerCard = table.player[currentRound - 1];
            const winningCard = myHand.find(c => c.valor > playerCard.valor);
            if (winningCard) return winningCard;
        }

        return myHand[0];
    },

    respondToChant: (chant, gameState) => {
        UI.logEvent('TrucoEstrella está pensando...', 'ia');
        return new Promise(resolve => {
            setTimeout(() => {
                let response = 'NO QUIERO';
                const { level, type } = chant;

                if (type === 'truco') {
                    const goodCards = gameState.hands.ia.filter(c => c.valor >= 10).length;
                    const bestCardValue = Math.max(...gameState.hands.ia.map(c => c.valor));
                    
                    if (level === 'TRUCO') {
                        if (goodCards >= 1 || bestCardValue >= 11) response = 'QUIERO';
                        if (goodCards >= 2 && bestCardValue >= 12) response = 'RETRUCO';
                    } else if (level === 'RETRUCO') {
                        if (bestCardValue >= 13) response = 'QUIERO';
                    } else if (level === 'VALE CUATRO') {
                         if (bestCardValue === 14) response = 'QUIERO';
                    }
                } else if (type === 'envido') {
                    const myEnvido = IA.calculateEnvido(gameState.hands.ia);
                    if (myEnvido >= 27) response = 'QUIERO';
                    if (myEnvido >= 30 && level === 'ENVIDO') response = 'REAL ENVIDO';
                } else if (type === 'flor') {
                     response = 'QUIERO';
                }
                resolve(response);
            }, 1500);
        });
    },

    calculateEnvido: (hand) => {
        let envidoValues = {};
        hand.forEach(card => {
            if (!envidoValues[card.palo]) envidoValues[card.palo] = [];
            let value = card.numero >= 10 ? 0 : parseInt(card.numero);
            envidoValues[card.palo].push(value);
        });

        let maxEnvido = 0;
        for (const palo in envidoValues) {
            if (envidoValues[palo].length >= 2) {
                envidoValues[palo].sort((a, b) => b - a);
                maxEnvido = Math.max(maxEnvido, 20 + envidoValues[palo][0] + envidoValues[palo][1]);
            }
        }

        if (maxEnvido === 0) {
            let singleCardValues = hand.map(c => c.numero >= 10 ? 0 : parseInt(c.numero));
            maxEnvido = Math.max(...singleCardValues);
        }
        return maxEnvido;
    },

    calculateFlor: (hand) => {
        if (hand.length < 3) return { hasFlor: false, points: 0 };
        let paloCount = {};
        hand.forEach(card => {
            paloCount[card.palo] = (paloCount[card.palo] || 0) + 1;
        });

        if (Object.values(paloCount).some(count => count === 3)) {
            let points = hand.reduce((acc, card) => acc + (card.numero >= 10 ? 0 : parseInt(card.numero)), 20);
            return { hasFlor: true, points: points };
        }
        return { hasFlor: false, points: 0 };
    }
};