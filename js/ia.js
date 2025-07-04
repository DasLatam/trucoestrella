const IA = {
    makeDecision: (gameState) => {
        setTimeout(() => {
            const availableActions = main.getAvailableActions();
            const action = IA.decideAction(gameState, availableActions);
            
            if (action.type === 'chant') {
                main.handleIaAction(action.value);
            } else if (action.type === 'play') {
                main.playCard(action.value, true);
            }
        }, 1200);
    },

    decideAction: (gameState, availableActions) => {
        const chantActions = availableActions.filter(a => a !== 'Jugar Carta' && a !== 'Me Voy al Mazo');
        const { scores, withFlor, florChanted, hands } = gameState;

        // 1. Obligación: Cantar flor si la tiene y está disponible la acción
        if (withFlor && IA.calculateFlor(hands.ia).hasFlor && !florChanted.ia) {
            if (chantActions.includes('Flor')) return { type: 'chant', value: 'Flor' };
        }
        
        // 2. Oportunismo: Cantar envido si es una buena jugada
        if (chantActions.some(a => a.includes('Envido'))) {
            const myEnvido = IA.calculateEnvido(hands.ia);
            if (myEnvido >= 30 && scores.ia <= scores.player && chantActions.includes('Real Envido')) {
                return { type: 'chant', value: 'Real Envido' };
            }
            if (myEnvido >= 28 && chantActions.includes('Envido')) {
                return { type: 'chant', value: 'Envido' };
            }
        }
        
        // 3. Oportunismo: Cantar truco
        if (chantActions.includes('Truco')) {
            const goodCards = hands.ia.filter(c => c.valor >= 11).length;
            if (goodCards >= 2 || (goodCards >= 1 && scores.ia < scores.player)) {
                return { type: 'chant', value: 'Truco' };
            }
        }

        // 4. Por defecto: Jugar una carta
        const cardToPlay = IA.decideCardToPlay(gameState);
        return { type: 'play', value: cardToPlay.id };
    },

    decideCardToPlay: (gameState) => {
        const { hands, table, roundWins, isHand, rondaNumero } = gameState;
        const myHand = [...hands.ia].sort((a, b) => a.valor - b.valor);

        if (myHand.length === 0) return null;

        if (roundWins.player > roundWins.ia && rondaNumero > 1) return myHand[myHand.length - 1];
        if (roundWins.ia > roundWins.player && rondaNumero > 1) return myHand[0];
        if (rondaNumero === 2 && table.player[0].valor === table.ia[0].valor) return myHand[myHand.length - 1];
        if (rondaNumero === 3 && roundWins.player === roundWins.ia) return myHand[myHand.length - 1];
        if (rondaNumero === 1 && isHand === 'ia') return myHand[myHand.length - 1];
        
        if (table.player.length === rondaNumero) {
            const playerCard = table.player[rondaNumero - 1];
            const winningCard = myHand.find(c => c.valor > playerCard.valor);
            if (winningCard) return winningCard;
        }

        return myHand[0];
    },

    respondToChant: (chant, availableResponses, gameState) => {
        UI.logEvent('TrucoEstrella está pensando...', 'ia');
        return new Promise(resolve => {
            setTimeout(() => {
                let response = 'No Quiero'; // Respuesta por defecto
                const { type } = chant;
                const { scores, playerFlor, iaFlor, hands } = gameState;

                if (type === 'truco') {
                    const goodCards = hands.ia.filter(c => c.valor >= 10).length;
                    const bestCardValue = Math.max(...hands.ia.map(c => c.valor));
                    
                    if (availableResponses.includes('ReTruco') && bestCardValue >= 12 && scores.ia < scores.player + 5) response = 'ReTruco';
                    else if (availableResponses.includes('Quiero')) {
                        if (goodCards >= 1 || bestCardValue >= 11) response = 'Quiero';
                    }
                } else if (type === 'envido') {
                    const myEnvido = IA.calculateEnvido(hands.ia);
                     if (availableResponses.includes('Real Envido') && myEnvido >= 31) response = 'Real Envido';
                     else if (availableResponses.includes('Envido') && myEnvido >= 29) response = 'Envido';
                     else if (availableResponses.includes('Quiero') && myEnvido >= 27) response = 'Quiero';

                } else if (type === 'flor') {
                    if (availableResponses.includes('Contra Flor') && iaFlor.points > playerFlor.points) response = 'Contra Flor';
                    else if (availableResponses.includes('Con Flor me Achico')) response = 'Con Flor me Achico';
                    else if (availableResponses.includes('Quiero')) response = 'Quiero'; // Para Contraflor
                }
                
                // Si la respuesta decidida no es válida, optar por la más segura.
                if (!availableResponses.includes(response)) {
                    if (availableResponses.includes('Quiero')) response = 'Quiero';
                    else response = 'No Quiero';
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