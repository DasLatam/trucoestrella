import { calcularEnvido } from './main.js';

export function iaElegirCarta(mano, cartasJugadas) {
    // IA simple: juega la carta más baja disponible
    let disponibles = mano.filter(c => !c.jugada);
    disponibles.sort((a, b) => a.valorTruco - b.valorTruco);
    return mano.indexOf(disponibles[0]);
}

export function iaResponderCanto(canto, gameState) {
    // IA básica: acepta Envido si tiene 27+, Truco si va ganando, rechaza si va perdiendo mucho
    if (canto === 'Envido') {
        let envido = calcularEnvido(gameState.iaHand);
        if (envido >= 27) return 'Quiero';
        return 'No Quiero';
    }
    if (canto === 'Truco') {
        if (gameState.iaScore >= gameState.playerScore) return 'Quiero';
        return 'No Quiero';
    }
    // Por defecto, rechaza
    return 'No Quiero';
}