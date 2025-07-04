const IA = {
    makeDecision: (gameState) => {
        // Lógica de decisión principal de la IA
        console.log("IA está pensando...", gameState);
        
        // Simular un pequeño retraso para una sensación más humana
        setTimeout(() => {
            // Por ahora, la IA solo jugará una carta.
            // Lógica simple: jugar la carta más alta que tenga.
            const playableCards = gameState.hands.ia;
            if (playableCards.length > 0) {
                // Ordenar cartas de mayor a menor valor para la mano actual
                playableCards.sort((a, b) => b.valor - a.valor);
                const cardToPlay = playableCards[0];
                main.playCard(cardToPlay.id, true); // Jugar la carta como IA
            }
        }, 1000);
    },

    respondToChant: (chant) => {
        // Lógica para responder a un canto del jugador
        // TODO: Implementar lógica más compleja (dependiendo del puntaje, cartas, etc.)
        switch(chant) {
            case 'TRUCO':
                // Simple: si tiene una carta buena, acepta.
                const hasGoodCard = main.gameState.hands.ia.some(c => c.valor > 10);
                if (hasGoodCard) {
                    return 'QUIERO';
                }
                return 'NO QUIERO';
            case 'ENVIDO':
                // Simple: si tiene 27+ de envido, acepta.
                const envidoPoints = IA.calculateEnvido(main.gameState.hands.ia);
                 if (envidoPoints >= 27) {
                    return 'QUIERO';
                }
                return 'NO QUIERO';
            default:
                return 'QUIERO'; // Aceptar por defecto por ahora
        }
    },

    calculateEnvido: (hand) => {
        // Lógica para calcular los puntos de envido de una mano
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

        if (maxEnvido === 0) { // Si no hay dos del mismo palo, es el valor de la carta más alta
            let singleCardValues = hand.map(c => c.numero >=10 ? 0 : parseInt(c.numero));
            maxEnvido = Math.max(...singleCardValues);
        }
        return maxEnvido;
    }
};