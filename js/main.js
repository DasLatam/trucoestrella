import { GAME_CONSTANTS } from './config.js';
import { renderPlayerHand, renderIAHand, renderMesaRondas, renderMarcador, addMessageToHistory } from './ui.js';
import { iaElegirCarta, iaResponderCanto, iaCantarCanto } from './ia.js';

// --- Estado global del juego ---
export let gameState = {
    playerName: 'Vos',
    playerHand: [],
    iaHand: [],
    deck: [],
    playedCards: [],
    playerScore: 0,
    iaScore: 0,
    puntosMax: 30,
    flor: false,
    manoPlayerId: 'player',
    currentRound: 1,
    turno: 'player',
    rondaGanada: [],
    envidoCantado: false,
    florCantada: false,
    trucoCantado: false,
    cantoActual: null,
    iaCantoActual: null,
    partidaTerminada: false,
    rondaActual: 1
};

// --- Utilidades ---
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function createDeck() {
    let deck = [];
    for (let palo of GAME_CONSTANTS.PALOS) {
        for (let numero of GAME_CONSTANTS.CARTAS) {
            let valorTruco = getValorTruco(numero, palo);
            let valorEnvido = (numero >= 10) ? 0 : numero;
            deck.push({ numero, palo, valorTruco, valorEnvido, jugada: false });
        }
    }
    return deck;
}

function getValorTruco(numero, palo) {
    for (let [n, p, v] of GAME_CONSTANTS.CARTA_VALOR_TRUCO) {
        if (n === numero && (p === '' || p === palo)) return v;
    }
    return 0;
}

function dealCards(deck, cantidad) {
    let playerHand = deck.slice(0, cantidad).map(c => ({ ...c }));
    let iaHand = deck.slice(cantidad, cantidad * 2).map(c => ({ ...c }));
    let resto = deck.slice(cantidad * 2);
    return { playerHand, iaHand, deck: resto };
}

export function calcularEnvido(mano) {
    let palos = {};
    mano.forEach(carta => {
        if (!palos[carta.palo]) palos[carta.palo] = [];
        palos[carta.palo].push(carta.valorEnvido);
    });
    let max = 0;
    for (let palo in palos) {
        if (palos[palo].length >= 2) {
            let valores = palos[palo].sort((a, b) => b - a);
            max = Math.max(max, valores[0] + valores[1] + 20);
        } else {
            max = Math.max(max, palos[palo][0]);
        }
    }
    return max;
}

function tieneFlor(mano) {
    return mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo;
}

// --- Pantalla de inicio ---
function showStartScreen() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
}

// --- Pantalla de juego ---
function showGameScreen(config) {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    gameState.playerName = config.playerName;
    gameState.puntosMax = config.puntosMax;
    gameState.flor = config.flor;
    initializeGame();
}

// --- Inicializar nueva mano ---
function initializeGame() {
    gameState.deck = shuffleDeck(createDeck());
    const { playerHand, iaHand, deck } = dealCards(gameState.deck, GAME_CONSTANTS.CARDS_PER_PLAYER);
    gameState.playerHand = playerHand;
    gameState.iaHand = iaHand;
    gameState.deck = deck;
    gameState.playedCards = [];
    gameState.currentRound = 1;
    gameState.turno = gameState.manoPlayerId;
    gameState.rondaGanada = [];
    gameState.envidoCantado = false;
    gameState.florCantada = false;
    gameState.trucoCantado = false;
    gameState.cantoActual = null;
    gameState.iaCantoActual = null;
    gameState.partidaTerminada = false;
    gameState.rondaActual = 1;

    renderPlayerHand(gameState.playerHand, 'mesa-player', true, onPlayerCardClick);
    renderIAHand(gameState.iaHand, 'mesa-ia');
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    addMessageToHistory('Cartas repartidas.', 'system');
    addMessageToHistory(`Ronda 1. Mano: ${gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella'}.`, 'system');
    updateCantosUI();
    if (gameState.manoPlayerId === 'player') {
        addMessageToHistory('¡Tu turno!', 'system');
    } else {
        setTimeout(iaTurno, 1200);
    }
}

// --- Lógica de jugada de carta ---
function onPlayerCardClick(idx) {
    if (gameState.turno !== 'player' || gameState.partidaTerminada) return;
    let carta = gameState.playerHand[idx];
    if (carta.jugada) return;
    carta.jugada = true;
    gameState.playedCards.push({ jugador: gameState.playerName, carta, ronda: gameState.rondaActual });
    renderPlayerHand(gameState.playerHand, 'mesa-player', true, onPlayerCardClick);
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    addMessageToHistory(`${gameState.playerName} jugó ${carta.numero} ${carta.palo}`, 'player');
    gameState.turno = 'ia';
    checkFinRonda();
    if (!gameState.partidaTerminada) setTimeout(iaTurno, 1200);
}

function iaTurno() {
    if (gameState.turno !== 'ia' || gameState.partidaTerminada) return;
    // IA puede cantar envido/flor/truco si corresponde
    if (!gameState.envidoCantado && !gameState.florCantada && gameState.currentRound === 1) {
        let canto = iaCantarCanto(gameState);
        if (canto) {
            handleCanto(canto, true);
            return;
        }
    }
    let idx = iaElegirCarta(gameState.iaHand, gameState.playedCards);
    let carta = gameState.iaHand[idx];
    carta.jugada = true;
    gameState.playedCards.push({ jugador: 'TrucoEstrella', carta, ronda: gameState.rondaActual });
    renderIAHand(gameState.iaHand, 'mesa-ia');
    renderMesaRondas(gameState.playedCards, gameState.playerName);
    addMessageToHistory(`TrucoEstrella jugó ${carta.numero} ${carta.palo}`, 'ia');
    gameState.turno = 'player';
    checkFinRonda();
}

function checkFinRonda() {
    let jugadasRonda = gameState.playedCards.filter(pc => pc.ronda === gameState.rondaActual).length === 2;
    if (jugadasRonda) {
        // Determinar ganador de la ronda
        let jugadas = gameState.playedCards.filter(pc => pc.ronda === gameState.rondaActual);
        let carta1 = jugadas[0].carta;
        let carta2 = jugadas[1].carta;
        let ganador = null;
        if (carta1.valorTruco > carta2.valorTruco) ganador = jugadas[0].jugador;
        else if (carta2.valorTruco > carta1.valorTruco) ganador = jugadas[1].jugador;
        else ganador = 'parda';
        gameState.rondaGanada.push(ganador);
        addMessageToHistory(`Ganador de la ronda: ${ganador === 'parda' ? 'Empate' : ganador}`, 'system');
        if (gameState.rondaActual < 3) {
            gameState.rondaActual++;
        }
        if (gameState.rondaGanada.length === 2) {
            // Determinar ganador de la mano
            let manoGanador = determinarGanadorMano();
            sumarPuntosMano(manoGanador);
        }
    }
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
}

function determinarGanadorMano() {
    let [r1, r2] = gameState.rondaGanada;
    if (r1 === r2 && r1 !== 'parda') return r1;
    if (r1 !== 'parda' && r2 === 'parda') return r1;
    if (r2 !== 'parda' && r1 === 'parda') return r2;
    return gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella';
}

function sumarPuntosMano(ganador) {
    if (ganador === gameState.playerName) gameState.playerScore += 1;
    else if (ganador === 'TrucoEstrella') gameState.iaScore += 1;
    addMessageToHistory(`Punto para ${ganador}`, 'system');
    renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
    if (gameState.playerScore >= gameState.puntosMax || gameState.iaScore >= gameState.puntosMax) {
        gameState.partidaTerminada = true;
        showFinPartidaModal(gameState.playerScore >= gameState.puntosMax ? gameState.playerName : 'TrucoEstrella');
    } else {
        setTimeout(initializeGame, 2000);
    }
}

// --- Cantos y opciones dinámicas ---
function updateCantosUI() {
    const cantosCol = document.getElementById('cantos-col');
    cantosCol.innerHTML = '';
    let opciones = [];
    if (!gameState.trucoCantado && !gameState.envidoCantado && !gameState.florCantada && gameState.currentRound === 1) {
        opciones = ['Truco', 'Envido', 'Real Envido', 'Falta Envido'];
        if (gameState.flor) opciones.push('Flor');
    }
    if (gameState.florCantada && !gameState.envidoCantado) {
        opciones = ['Flor'];
        // Si ambos tienen flor, permitir Contra Flor y Contra Flor al Resto
        if (tieneFlor(gameState.playerHand) && tieneFlor(gameState.iaHand)) {
            opciones.push('Contra Flor', 'Contra Flor al Resto');
        }
    }
    if (gameState.trucoCantado) {
        opciones = ['ReTruco', 'Vale Cuatro'];
    }
    opciones.push('Ir al Mazo', 'Volver al Menú');
    opciones.forEach(canto => {
        const btn = document.createElement('button');
        btn.className = 'game-canto-btn bg-yellow-700 hover:bg-yellow-800 py-3 rounded text-lg font-bold mb-1';
        btn.textContent = canto;
        btn.setAttribute('data-canto', canto);
        btn.addEventListener('click', () => handleCanto(canto, false));
        cantosCol.appendChild(btn);
    });
}

function handleCanto(canto, esIA = false) {
    if (gameState.partidaTerminada) return;
    gameState.cantoActual = canto;
    addMessageToHistory(`${esIA ? 'TrucoEstrella' : gameState.playerName} canta ${canto.toUpperCase()}!`, esIA ? 'ia' : 'player');
    document.getElementById(esIA ? 'canto-ia' : 'canto-actual').textContent = canto.toUpperCase() + '!';
    if (['Envido', 'Real Envido', 'Falta Envido'].includes(canto)) {
        gameState.envidoCantado = true;
        showEnvidoPopup(canto, esIA);
    }
    if (['Flor', 'Contra Flor', 'Contra Flor al Resto'].includes(canto)) {
        gameState.florCantada = true;
        showFlorPopup(canto, esIA);
    }
    if (['Truco', 'ReTruco', 'Vale Cuatro'].includes(canto)) {
        gameState.trucoCantado = true;
        let respuesta = iaResponderCanto(canto, gameState);
        setTimeout(() => {
            addMessageToHistory(`TrucoEstrella responde: ${respuesta}`, 'ia');
            document.getElementById('canto-ia').textContent = respuesta;
            if (respuesta === 'No Quiero') {
                gameState.playerScore += 1;
                addMessageToHistory('¡Sumás 1 punto!', 'system');
                renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
                setTimeout(initializeGame, 2000);
            }
        }, 1000);
    }
    updateCantosUI();
}

// --- Popup Envido ---
function showEnvidoPopup(tipo, esIA) {
    const playerEnvido = calcularEnvido(gameState.playerHand);
    const iaEnvido = calcularEnvido(gameState.iaHand);
    let winner = playerEnvido > iaEnvido ? gameState.playerName : 'TrucoEstrella';
    let puntos = 2;
    if (tipo === 'Real Envido') puntos = 3;
    if (tipo === 'Falta Envido') puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    let html = `
        <div><b>${gameState.playerName}:</b> ${playerEnvido} puntos</div>
        <div><b>TrucoEstrella:</b> ${iaEnvido} puntos</div>
        <div class="mt-2 font-bold text-green-700">¡Gana ${winner}!</div>
    `;
    document.getElementById('popup-envido-title').textContent = 'Resultado Envido';
    document.getElementById('popup-envido-content').innerHTML = html;
    document.getElementById('popup-envido').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('popup-envido').classList.add('hidden');
        if (winner === gameState.playerName) gameState.playerScore += puntos;
        else gameState.iaScore += puntos;
        renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
        addMessageToHistory(`Envido: ${gameState.playerName} ${playerEnvido} - TrucoEstrella ${iaEnvido}. Gana ${winner} (+${puntos})`, 'system');
        // NO reiniciar la mano, seguir con el Truco
        updateCantosUI();
    }, 3000);
}

// --- Popup Flor ---
function showFlorPopup(tipo, esIA) {
    const playerFlor = tieneFlor(gameState.playerHand) ? calcularEnvido(gameState.playerHand) : 0;
    const iaFlor = tieneFlor(gameState.iaHand) ? calcularEnvido(gameState.iaHand) : 0;
    let winner = playerFlor > iaFlor ? gameState.playerName : 'TrucoEstrella';
    let puntos = 3;
    if (tipo === 'Contra Flor') puntos = 6;
    if (tipo === 'Contra Flor al Resto') puntos = gameState.puntosMax - Math.max(gameState.playerScore, gameState.iaScore);
    let html = `
        <div><b>${gameState.playerName}:</b> ${playerFlor ? playerFlor + ' (Flor)' : 'No tiene Flor'}</div>
        <div><b>TrucoEstrella:</b> ${iaFlor ? iaFlor + ' (Flor)' : 'No tiene Flor'}</div>
        <div class="mt-2 font-bold text-green-700">¡Gana ${winner}!</div>
    `;
    document.getElementById('popup-envido-title').textContent = 'Resultado Flor';
    document.getElementById('popup-envido-content').innerHTML = html;
    document.getElementById('popup-envido').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('popup-envido').classList.add('hidden');
        if (winner === gameState.playerName) gameState.playerScore += puntos;
        else gameState.iaScore += puntos;
        renderMarcador(gameState.playerScore, gameState.iaScore, gameState.puntosMax);
        addMessageToHistory(`Flor: ${gameState.playerName} ${playerFlor} - TrucoEstrella ${iaFlor}. Gana ${winner} (+${puntos})`, 'system');
        // NO reiniciar la mano, seguir con el Truco
        updateCantosUI();
    }, 3000);
}

// --- Modal Fin de Partida ---
function showFinPartidaModal(winner) {
    document.getElementById('modal-fin-partida-content').textContent = `Ganador: ${winner}`;
    document.getElementById('modal-fin-partida').classList.remove('hidden');
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('startGameBtn').addEventListener('click', () => {
        const config = {
            playerName: document.getElementById('playerName').value || 'Vos',
            puntosMax: parseInt(document.getElementById('gamePoints').value),
            flor: document.getElementById('florRule').checked
        };
        showGameScreen(config);
    });
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché y reiniciar el juego?')) {
            localStorage.clear();
            location.reload();
        }
    });
    document.getElementById('btn-revancha').addEventListener('click', () => {
        document.getElementById('modal-fin-partida').classList.add('hidden');
        initializeGame();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    showStartScreen();
    setupEventListeners();
});