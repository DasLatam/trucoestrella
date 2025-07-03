import { calcularEnvido, tieneFlor } from './main.js';

export function iaElegirCarta(mano, cartasJugadas) {
    let disponibles = mano.filter(c => !c.jugada);
    disponibles.sort((a, b) => a.valorTruco - b.valorTruco);
    return mano.indexOf(disponibles[0]);
}

export function iaResponderCanto(canto, gameState) {
    if (canto === 'Envido' || canto === 'Real Envido' || canto === 'Falta Envido') {
        let envido = calcularEnvido(gameState.iaHand);
        if (envido >= 30) return (canto === 'Falta Envido') ? 'Quiero' : 'Falta Envido';
        if (envido >= 27) return (canto === 'Envido') ? 'Real Envido' : 'Quiero';
        if (envido >= 24) return 'Quiero';
        return 'No Quiero';
    }
    if (canto === 'Flor' || canto === 'Contra Flor' || canto === 'Contra Flor al Resto') {
        if (tieneFlor(gameState.iaHand)) return 'Flor';
        return null;
    }
    if (canto === 'Truco') {
        return 'Quiero';
    }
    if (canto === 'ReTruco') {
        return 'Quiero';
    }
    if (canto === 'Vale Cuatro') {
        return 'No Quiero';
    }
    return null;
}

export function iaCantarCanto(gameState) {
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