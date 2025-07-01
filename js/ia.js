import { CARD_HIERARCHY } from './config.js';

function getCardValue(card) {
    return [10, 11, 12].includes(card.number) ? 0 : card.number;
}

function calculateEnvido(hand) {
    let bestEnvido = 0;
    const suitCounts = {};
    hand.forEach(card => {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });

    // Check for flor
    const hasFlor = Object.values(suitCounts).some(count => count === 3);
    if (hasFlor) {
        const florSuit = Object.keys(suitCounts).find(suit => suitCounts[suit] === 3);
        const florCards = hand.filter(card => card.suit === florSuit);
        bestEnvido = 20 + getCardValue(florCards[0]) + getCardValue(florCards[1]) + getCardValue(florCards[2]);
        return { points: bestEnvido, isFlor: true };
    }

    // Check for envido (2 cards of the same suit)
    for (const suit in suitCounts) {
        if (suitCounts[suit] >= 2) {
            const suitCards = hand.filter(card => card.suit === suit);
            const envidoPoints = 20 + getCardValue(suitCards[0]) + getCardValue(suitCards[1]);
            if (envidoPoints > bestEnvido) {
                bestEnvido = envidoPoints;
            }
        }
    }

    // If no pairs, get highest card value
    if (bestEnvido === 0) {
        bestEnvido = Math.max(...hand.map(getCardValue));
    }

    return { points: bestEnvido, isFlor: false };
}

function getCardByRank(rank) {
    return CARD_HIERARCHY.find(c => c.rank === rank);
}

export const TrucoEstrella = {
    _hand: [],
    _envidoPoints: 0,
    _hasFlor: false,

    newHand(hand) {
        this._hand = [...hand];
        const { points, isFlor } = calculateEnvido(this._hand);
        this._envidoPoints = points;
        this._hasFlor = isFlor;
    },

    getEnvidoPoints() {
        return { points: this._envidoPoints, isFlor: this._hasFlor };
    },

    // --- DECISIONES DE CANTO ---
    decideInitialCanto(gameState) {
        // Flor es obligatoria
        if (gameState.withFlor && this._hasFlor) {
            return 'FLOR';
        }
        
        if (gameState.isMano) {
            if (this._envidoPoints >= 30) return 'REAL_ENVIDO';
            if (this._envidoPoints >= 27) return 'ENVIDO';
        }
        return null;
    },

    decideEnvidoResponse(canto, gameState) {
        const playerCanto = canto.level;
        
        // Prioridad a Flor
        if (gameState.withFlor && this._hasFlor) return 'FLOR';
        
        switch (playerCanto) {
            case 'ENVIDO':
                if (this._envidoPoints >= 30) return 'FALTA_ENVIDO';
                if (this._envidoPoints >= 27) return 'REAL_ENVIDO';
                if (this._envidoPoints >= 26) return 'QUIERO';
                return 'NO_QUIERO';
            case 'REAL_ENVIDO':
                if (this._envidoPoints >= 30) return 'FALTA_ENVIDO';
                if (this._envidoPoints >= 28) return 'QUIERO';
                return 'NO_QUIERO';
            case 'FALTA_ENVIDO':
                if (this._envidoPoints >= 30) return 'QUIERO';
                return 'NO_QUIERO';
            default: // ENVIDO_ENVIDO, etc
                 if (this._envidoPoints >= 29) return 'QUIERO';
                 return 'NO_QUIERO';
        }
    },

    decideFlorResponse(canto) {
        const playerCanto = canto.level;
        if (playerCanto === 'FLOR') {
            if (this._envidoPoints > 33) return 'CONTRAFLOR_AL_RESTO';
            if (this._envidoPoints > 30) return 'CONTRAFLOR';
        }
        return 'QUIERO'; // Siempre quiere a la flor o contraflor si no puede superar
    },

    decideTruco(gameState) {
        const avgRank = this._hand.reduce((sum, card) => sum + card.rank, 0) / this._hand.length;
        const hasHighCard = this._hand.some(c => c.rank >= 12); // 7 de espada o mejor
        
        // Si ganó la primera y tiene una carta decente para la segunda
        if (gameState.roundHistory[0]?.winner === 'ia' && this._hand.some(c => c.rank >= 9)) {
            return 'TRUCO';
        }
        
        // Si es mano y tiene buenas cartas
        if (gameState.isMano && hasHighCard && avgRank > 8) {
             return 'TRUCO';
        }

        return null;
    },

    decideTrucoResponse(canto, gameState) {
        const level = canto.level;
        const avgRank = this._hand.reduce((sum, card) => sum + card.rank, 0) / this._hand.length;
        const hasHighCard = this._hand.some(c => c.rank >= 12);
        const hasGoodCard = this._hand.some(c => c.rank >= 10);

        if (level === 'TRUCO') {
            if (hasHighCard) return 'RETRUCO';
            if (hasGoodCard && avgRank > 7) return 'QUIERO';
            if (avgRank > 6) return 'QUIERO';
        }
        if (level === 'RETRUCO') {
             if (hasHighCard && avgRank > 9) return 'VALE_CUATRO';
             if (hasGoodCard || avgRank > 8) return 'QUIERO';
        }
        if (level === 'VALE_CUATRO') {
            if (hasHighCard || avgRank > 10) return 'QUIERO';
        }

        return 'NO_QUIERO';
    },

    // --- DECISIÓN DE JUGADA ---
    playCard(gameState) {
        const { table, roundNumber } = gameState;
        const playerCard = table.player[roundNumber - 1];
        let cardToPlay;

        // Ordenar cartas de la mano de menor a mayor ranking
        const sortedHand = [...this._hand].sort((a, b) => a.rank - b.rank);

        if (!playerCard) { // IA es mano en esta vuelta
            // 1ra mano: Jugar la más alta para asegurar, a menos que tenga flor/envido para mentir
            // 2da/3ra mano: Depende del resultado anterior
            if (gameState.roundHistory[0]?.winner === 'ia') {
                 // Ganó la 1ra, juega la más baja para tentar
                 cardToPlay = sortedHand[0];
            } else {
                 // Perdió o empató la 1ra, o es la 1ra, juega la más alta
                 cardToPlay = sortedHand[sortedHand.length - 1];
            }
        } else { // IA responde a la jugada del jugador
            const winningCards = sortedHand.filter(c => c.rank > playerCard.rank);
            const tiedCards = sortedHand.filter(c => c.rank === playerCard.rank);
            const losingCards = sortedHand.filter(c => c.rank < playerCard.rank);

            if (winningCards.length > 0) {
                // Ganar con la carta más baja posible
                cardToPlay = winningCards[0];
            } else {
                // No puede ganar, tirar la más baja de todas.
                cardToPlay = sortedHand[0];
            }
        }
        
        // Si no se decidió una carta (caso raro), jugar la primera disponible
        if (!cardToPlay) {
            cardToPlay = this._hand[0];
        }

        // Remover la carta de la mano interna de la IA
        this._hand = this._hand.filter(c => !(c.number === cardToPlay.number && c.suit === cardToPlay.suit));

        return cardToPlay;
    }
};