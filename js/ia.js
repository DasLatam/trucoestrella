const IA = {
    // ... (makeDecision sin cambios, ahora delega a funciones más específicas) ...

    decideAction: (gameState) => {
        // 1. Obligación: Cantar flor si la tiene
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

    // ... (decideCardToPlay sin cambios) ...

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
                        // Si tiene muy buenas cartas, puede querer retruco
                        if (goodCards >= 2 && bestCardValue >= 12) response = 'RETRUCO';
                    } else if (level === 'RETRUCO') {
                        if (bestCardValue >= 13) response = 'QUIERO'; // Si tiene una de las 2 más altas
                    } else if (level === 'VALE CUATRO') {
                         if (bestCardValue === 14) response = 'QUIERO'; // Solo quiere con el Ancho de Espadas
                    }
                } else if (type === 'envido') {
                    const myEnvido = IA.calculateEnvido(gameState.hands.ia);
                    if (myEnvido >= 27) {
                        response = 'QUIERO';
                    }
                    if (myEnvido >= 30 && level === 'ENVIDO') {
                        response = 'REAL ENVIDO'; // Escalar si tiene muy buenos puntos
                    }
                } else if (type === 'flor') {
                     response = 'QUIERO'; // Por ahora, la IA siempre quiere la contraflor
                }
                resolve(response);
            }, 1500);
        });
    },

    calculateEnvido: (hand) => {
        // ... (sin cambios) ...
    },

    calculateFlor: (hand) => {
        let paloCount = {};
        hand.forEach(card => {
            paloCount[card.palo] = (paloCount[card.palo] || 0) + 1;
        });

        if (paloCount[hand[0].palo] === 3) {
            let points = hand.reduce((acc, card) => acc + (card.numero >= 10 ? 0 : parseInt(card.numero)), 20);
            return { hasFlor: true, points: points };
        }
        return { hasFlor: false, points: 0 };
    }
};