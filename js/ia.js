import { calcularEnvido } from './main.js';

export function iaElegirCarta(mano, cartasJugadas) {
    let disponibles = mano.filter(c => !c.jugada);
    disponibles.sort((a, b) => a.valorTruco - b.valorTruco);
    return mano.indexOf(disponibles[0]);
}

export function iaResponderCanto(canto, gameState) {
    // IA mejorada para Envido/Flor
    if (canto === 'Envido' || canto === 'Real Envido' || canto === 'Falta Envido') {
        let envido = calcularEnvido(gameState.iaHand);
        if (envido >= 30) return (canto === 'Falta Envido') ? 'Quiero' : 'Falta Envido';
        if (envido >= 27) return (canto === 'Envido') ? 'Real Envido' : 'Quiero';
        if (envido >= 24) return 'Quiero';
        return 'No Quiero';
    }
    if (canto === 'Flor' || canto === 'Contra Flor' || canto === 'Contra Flor al Resto') {
        let flor = calcularEnvido(gameState.iaHand);
        if (flor >= 30) return (canto === 'Contra Flor al Resto') ? 'Quiero' : 'Contra Flor al Resto';
        if (flor >= 27) return (canto === 'Flor') ? 'Contra Flor' : 'Quiero';
        if (flor >= 24) return 'Quiero';
        return 'No Quiero';
    }
    if (canto === 'Truco') {
        if (gameState.iaScore >= gameState.playerScore) return 'Quiero';
        return 'No Quiero';
    }
    if (canto === 'ReTruco') {
        if (gameState.iaScore > gameState.playerScore) return 'Quiero';
        return 'No Quiero';
    }
    if (canto === 'Vale Cuatro') {
        if (gameState.iaScore > gameState.playerScore + 2) return 'Quiero';
        return 'No Quiero';
    }
    return 'No Quiero';
}

export function iaCantarCanto(gameState) {
    // IA decide si cantar Envido, Flor o Truco al inicio de la mano
    if (!gameState.envidoCantado && !gameState.florCantada && !gameState.trucoCantado && gameState.playedCards.length === 0) {
        let envido = calcularEnvido(gameState.iaHand);
        if (gameState.flor && tieneFlor(gameState.iaHand)) return 'Flor';
        if (envido >= 27) return 'Envido';
    }
    if (!gameState.trucoCantado) {
        return 'Truco';
    }
    return null;
}

function tieneFlor(mano) {
    return mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo;
}