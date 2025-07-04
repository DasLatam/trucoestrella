const IA = {
    makeDecision: (gameState) => {
        console.log("IA está pensando...", gameState);
        
        setTimeout(() => {
            // TODO: Lógica para decidir si cantar algo antes de jugar
            
            const cardToPlay = IA.decideCardToPlay(gameState);
            if (cardToPlay) {
                main.playCard(cardToPlay.id, true);
            }

        }, 1200);
    },

    decideCardToPlay: (gameState) => {
        const { hands, table, roundWins, isHand, currentRound } = gameState;
        const myHand = [...hands.ia].sort((a, b) => a.valor - b.valor); // Ordenar de menor a mayor

        // Si perdí la primera, tengo que ganar la segunda con mi mejor carta.
        if (roundWins.player === 1 && currentRound === 2) {
            return myHand[myHand.length - 1]; // Jugar la más alta
        }
        
        // Si gané la primera, juego la más baja para guardar las buenas.
        if (roundWins.ia === 1 && currentRound === 2) {
            return myHand[0]; // Jugar la más baja
        }

        // Si la primera fue parda, juego la más alta para asegurar la segunda.
        if (currentRound === 2 && table.player.length === 1 && table.ia.length === 1 && table.player[0].valor === table.ia[0].valor) {
            return myHand[myHand.length - 1];
        }

        // Si es la tercera mano y vamos 1-1, juego mi mejor carta restante.
        if (currentRound === 3 && roundWins.player === 1 && roundWins.ia === 1) {
            return myHand[myHand.length - 1];
        }

        // Comportamiento por defecto:
        // Si soy mano, empiezo con mi carta más alta para marcar la cancha.
        if (currentRound === 1 && isHand === 'ia') {
            return myHand[myHand.length - 1];
        }
        // Si no soy mano, juego una carta para ganar la ronda si puedo.
        if (table.player.length === currentRound) {
            const playerCard = table.player[currentRound-1];
            // Buscar la carta más baja que gane
            const winningCard = myHand.find(c => c.valor > playerCard.valor);
            if (winningCard) return winningCard;
        }

        // Si nada de lo anterior aplica, o si no puedo ganar, juego la más baja.
        return myHand[0];
    },

    respondToChant: (chantType, gameState) => {
        UI.logEvent('TrucoEstrella está pensando...', 'ia');
        return new Promise(resolve => {
            setTimeout(() => {
                let response = 'NO QUIERO';
                if (chantType === 'TRUCO') {
                    // Lógica de respuesta al Truco
                    const goodCards = gameState.hands.ia.filter(c => c.valor >= 10).length;
                    const bestCardValue = Math.max(...gameState.hands.ia.map(c => c.valor));
                    
                    if (goodCards >= 2 || bestCardValue >= 12) {
                        response = 'QUIERO';
                    } else if (goodCards === 1 && gameState.scores.ia < gameState.scores.player) {
                        // Si voy perdiendo y tengo al menos una buena, me arriesgo
                        response = 'QUIERO';
                    }
                }
                // TODO: Lógica para Envido
                resolve(response);
            }, 1500);
        });
    },

    calculateEnvido: (hand) => {
        let envidoValues = {};
        hand.forEach(card => {
            if (!envidoValues[card.palo]) {
                envidoValues[card.palo] = [];
            }
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
            let singleCardValues = hand.map(c => c.numero >=10 ? 0 : parseInt(c.numero));
            maxEnvido = Math.max(...singleCardValues);
        }
        return maxEnvido;
    }
};