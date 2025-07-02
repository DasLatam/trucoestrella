// js/main.js

// Importar módulos necesarios
import { SUITS, CARD_VALUES, GAME_CONSTANTS, getTrucoValue, getEnvidoValue } from './config.js';
import { renderPlayerHand, renderIAHand, addMessageToHistory, updateScoreboardMessage, renderScore, createCardElement, clearPlayedCards, addCardToPlayedArea } from './ui.js';

// Versión actual de la aplicación (se toma de config.js ahora)
const APP_VERSION = GAME_CONSTANTS.VERSION;

// Estado global del juego
let gameState = {
    playerName: GAME_CONSTANTS.DEFAULT_PLAYER_NAME,
    gamePoints: GAME_CONSTANTS.DEFAULT_GAME_POINTS,
    playWithFlor: GAME_CONSTANTS.DEFAULT_PLAY_WITH_FLOR,
    playerHand: [],
    iaHand: [],
    deck: [],
    playerScore: 0,
    iaScore: 0,
    currentRound: 0, // 0 = no iniciada, 1 = primera, 2 = segunda, 3 = tercera
    playerTurn: false, // true si es turno del jugador, false si es de la IA
    cardsPlayedInRound: { // Guarda la carta jugada por cada jugador en la ronda actual
        player: null,
        ia: null
    },
    // Almacena las cartas jugadas en la mesa para cada ronda (para 1v1, solo 2 cartas por ronda)
    playedCardsOnTable: {
        round1: { player: null, ia: null },
        round2: { player: null, ia: null },
        round3: { player: null, ia: null }
    },
    playerRoundWins: 0, // Victorias del jugador en la mano actual
    iaRoundWins: 0,     // Victorias de la IA en la mano actual
    manoPlayerId: null // 'player' o 'ia', quien es "mano" en la mano actual (para desempates y alternancia de manos)
};

// Referencias del DOM (las obtenemos una vez al inicio)
const DOMElements = {};

// --- Funciones de Inicialización y Configuración ---

/**
 * Obtiene todas las referencias a los elementos del DOM.
 * Debe llamarse cuando el DOM esté completamente cargado.
 */
const getDOMElements = () => {
    DOMElements.startScreen = document.getElementById('start-screen');
    DOMElements.gameScreen = document.getElementById('game-screen');
    DOMElements.playerNameInput = document.getElementById('playerName');
    DOMElements.gamePointsRadios = document.querySelectorAll('input[name="gamePoints"]');
    DOMElements.playWithFlorCheckbox = document.getElementById('playWithFlor');
    DOMElements.startGameBtn = document.getElementById('startGameBtn');
    DOMElements.clearCacheBtn = document.getElementById('clearCacheBtn');
    DOMElements.appVersionSpan = document.getElementById('app-version');

    DOMElements.backToMenuBtn = document.getElementById('backToMenuBtn');
    DOMElements.playerNameText = document.getElementById('player-name-text');
    DOMElements.playerHandContainer = document.getElementById('player-hand');
    DOMElements.iaHandContainer = document.getElementById('ia-hand');
    DOMElements.iaPlayedCardsContainer = document.getElementById('ia-played-cards');
    DOMElements.playerPlayedCardsContainer = document.getElementById('player-played-cards');
    DOMElements.playerScoreMatchesContainer = document.getElementById('player-score-matches');
    DOMElements.opponentScoreMatchesContainer = document.getElementById('opponent-score-matches');
    DOMElements.historyContent = document.getElementById('history-content');
    DOMElements.gameControlButtons = document.querySelectorAll('#game-controls .game-btn');
};


/**
 * Carga la configuración del juego desde localStorage y actualiza la UI de inicio.
 */
const loadGameConfig = () => {
    const savedPlayerName = localStorage.getItem('trucoEstrellasPlayerName');
    const savedGamePoints = localStorage.getItem('trucoEstrellasGamePoints');
    const savedPlayWithFlor = localStorage.getItem('trucoEstrellasPlayWithFlor');

    if (savedPlayerName) {
        DOMElements.playerNameInput.value = savedPlayerName;
        gameState.playerName = savedPlayerName;
    }

    if (savedGamePoints) {
        DOMElements.gamePointsRadios.forEach(radio => {
            if (radio.value === savedGamePoints) {
                radio.checked = true;
            }
        });
        gameState.gamePoints = parseInt(savedGamePoints);
    }

    if (savedPlayWithFlor === 'true') {
        DOMElements.playWithFlorCheckbox.checked = true;
        gameState.playWithFlor = true;
    } else {
        DOMElements.playWithFlorCheckbox.checked = false;
        gameState.playWithFlor = false;
    }
    
    if (DOMElements.appVersionSpan) {
        DOMElements.appVersionSpan.textContent = `Versión: ${APP_VERSION}`;
    }
};

/**
 * Guarda la configuración actual del juego en localStorage.
 * @returns {object} La configuración actual del juego.
 */
const saveGameConfig = () => {
    const playerName = DOMElements.playerNameInput.value.trim();
    const gamePoints = document.querySelector('input[name="gamePoints"]:checked').value;
    const playWithFlor = DOMElements.playWithFlorCheckbox.checked;

    localStorage.setItem('trucoEstrellasPlayerName', playerName);
    localStorage.setItem('trucoEstrellasGamePoints', gamePoints);
    localStorage.setItem('trucoEstrellasPlayWithFlor', playWithFlor.toString());

    gameState.playerName = playerName;
    gameState.gamePoints = parseInt(gamePoints);
    gameState.playWithFlor = playWithFlor;

    return { playerName, gamePoints: parseInt(gamePoints), playWithFlor };
};

/**
 * Muestra la pantalla de inicio y oculta la pantalla de juego.
 */
const showStartScreen = () => {
    DOMElements.gameScreen.classList.add('hidden');
    DOMElements.startScreen.classList.remove('hidden');
    // Reiniciar estado del juego para una partida nueva
    Object.assign(gameState, {
        playerHand: [],
        iaHand: [],
        deck: [],
        playerScore: 0,
        iaScore: 0,
        currentRound: 0,
        playerTurn: false,
        cardsPlayedInRound: { player: null, ia: null },
        playedCardsOnTable: { round1: { player: null, ia: null }, round2: { player: null, ia: null }, round3: { player: null, ia: null } }, // Reiniciar también las cartas en mesa
        playerRoundWins: 0,
        iaRoundWins: 0,
        manoPlayerId: null // Se reinicia para que la primera mano sea aleatoria
    });
    // Limpiar UI al regresar al menú
    clearGameUI(); 
    DOMElements.historyContent.innerHTML = '<p class="text-gray-400">Bienvenido a TrucoEstrellas!</p>'; 
    console.log('Regresando a la pantalla de inicio...');
};

/**
 * Muestra la pantalla de juego y oculta la pantalla de inicio.
 * @param {object} config La configuración de la partida.
 */
const showGameScreen = (config) => {
    DOMElements.startScreen.classList.add('hidden');
    DOMElements.gameScreen.classList.remove('hidden');
    DOMElements.playerNameText.textContent = config.playerName;
    
    DOMElements.historyContent.innerHTML = ''; // Limpiar historial antes de iniciar una nueva partida
    addMessageToHistory('¡La partida ha comenzado!', 'system');
    initializeGame(); // Inicializar un nuevo juego
};

// --- Lógica del Juego ---

const createDeck = () => {
    const deck = [];
    for (const suit of Object.values(SUITS)) {
        for (const value of CARD_VALUES) {
            deck.push({ value, suit });
        }
    }
    return deck;
};

const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Intercambiar elementos
    }
    return deck;
};

const dealCards = (deck, numCards) => {
    const playerHand = [];
    const iaHand = [];

    for (let i = 0; i < numCards; i++) {
        playerHand.push(deck.pop());
        iaHand.push(deck.pop());
    }
    return { playerHand, iaHand, deck };
};

/**
 * Limpia la interfaz de usuario de las cartas en la mesa y el marcador.
 * Debe ser llamada al inicio de cada MANO.
 */
const clearGameUI = () => {
    DOMElements.playerHandContainer.innerHTML = '';
    DOMElements.iaHandContainer.innerHTML = '';
    clearPlayedCards(); // Limpiar visualmente las cartas de la mesa
    updateScoreboardMessage('top', '');
    updateScoreboardMessage('bottom', '');
    renderScore(gameState.playerScore, gameState.gamePoints, DOMElements.playerScoreMatchesContainer.id);
    renderScore(gameState.iaScore, gameState.gamePoints, DOMElements.opponentScoreMatchesContainer.id);
};

/**
 * Determina quién es la "mano" (el que empieza jugando la ronda).
 * En 1 vs 1, la mano se alterna. Para la primera ronda de la partida, es aleatorio.
 * Para las siguientes manos, alterna al anterior.
 * @returns {string} 'player' o 'ia'.
 */
const determineMano = () => {
    // Si es la primera mano de la PARTIDA, la mano es aleatoria
    if (gameState.manoPlayerId === null) {
        return Math.random() < 0.5 ? 'player' : 'ia';
    } else {
        // Para las siguientes manos, alterna la mano
        return gameState.manoPlayerId === 'player' ? 'ia' : 'player';
    }
};

/**
 * Habilita/deshabilita la interacción del jugador con sus cartas.
 * @param {boolean} enable Si es true, las cartas son clickables.
 */
const togglePlayerHandInteraction = (enable) => {
    DOMElements.playerHandContainer.querySelectorAll('.card').forEach(cardElement => {
        if (cardElement.dataset.cardPlayable === 'true') {
            if (enable) {
                cardElement.classList.add('cursor-pointer', 'hover:scale-105', 'transform', 'transition-transform', 'duration-100', 'active:scale-95');
                cardElement.addEventListener('click', handlePlayerCardPlay);
            } else {
                cardElement.classList.remove('cursor-pointer', 'hover:scale-105', 'transform', 'transition-transform', 'duration-100', 'active:scale-95');
                cardElement.removeEventListener('click', handlePlayerCardPlay);
            }
        }
    });
};

/**
 * Maneja la lógica cuando el jugador juega una carta.
 * @param {Event} event El evento de click en la carta.
 */
const handlePlayerCardPlay = (event) => {
    if (!gameState.playerTurn) return; // No es el turno del jugador

    const cardElement = event.currentTarget;
    const playedCard = {
        value: parseInt(cardElement.dataset.value),
        suit: cardElement.dataset.suit
    };

    // Quitar la carta de la mano del jugador
    gameState.playerHand = gameState.playerHand.filter(
        card => !(card.value === playedCard.value && card.suit === playedCard.suit)
    );

    // Guardar la carta jugada en el estado de la ronda
    gameState.cardsPlayedInRound.player = playedCard;
    gameState.playedCardsOnTable[`round${gameState.currentRound}`].player = playedCard;


    // Renderizar mano actualizada y añadir carta jugada a la mesa
    renderPlayerHand(gameState.playerHand, 'player-hand', false); // Mano ya no es jugable hasta el siguiente turno
    addCardToPlayedArea(playedCard, 'player', DOMElements.playerPlayedCardsContainer.id);
    addMessageToHistory(`${gameState.playerName} jugó el ${playedCard.value} de ${playedCard.suit}.`, 'player');

    togglePlayerHandInteraction(false); // Deshabilitar clic en cartas hasta que la IA responda
    gameState.playerTurn = false; // Ya no es el turno del jugador

    // Si la IA aún no ha jugado, es su turno.
    if (gameState.cardsPlayedInRound.ia === null) {
        setTimeout(playIACard, 1000); // IA juega después de 1 segundo
    } else {
        // Ambas cartas jugadas, determinar ganador (esto ocurre si la IA fue mano y jugó primero)
        determineRoundWinner();
    }
};

/**
 * La IA "TrucoEstrellas" juega una carta.
 * Lógica muy básica por ahora: juega una carta aleatoria.
 */
const playIACard = () => {
    if (gameState.iaHand.length === 0) return; // La IA no tiene cartas

    // Lógica básica: jugar una carta aleatoria
    const randomIndex = Math.floor(Math.random() * gameState.iaHand.length);
    const playedCard = gameState.iaHand[randomIndex];

    // Quitar la carta de la mano de la IA
    gameState.iaHand.splice(randomIndex, 1);

    // Guardar la carta jugada en el estado de la ronda
    gameState.cardsPlayedInRound.ia = playedCard;
    gameState.playedCardsOnTable[`round${gameState.currentRound}`].ia = playedCard;

    // Renderizar mano de IA (boca abajo) y añadir carta jugada a la mesa
    renderIAHand(gameState.iaHand.length, 'ia-hand');
    addCardToPlayedArea(playedCard, 'ia', DOMElements.iaPlayedCardsContainer.id);
    addMessageToHistory(`YO (TrucoEstrella) jugó el ${playedCard.value} de ${playedCard.suit}.`, 'ia');

    // Verificar si el jugador ya jugó su carta para esta ronda
    if (gameState.cardsPlayedInRound.player !== null) {
        determineRoundWinner();
    } else {
        // El jugador aún no ha jugado, es su turno.
        gameState.playerTurn = true;
        addMessageToHistory('Es tu turno.', 'system');
        togglePlayerHandInteraction(true);
    }
};

/**
 * Determina el ganador de la ronda actual.
 */
const determineRoundWinner = () => {
    const playerCard = gameState.cardsPlayedInRound.player;
    const iaCard = gameState.cardsPlayedInRound.ia;

    if (!playerCard || !iaCard) {
        console.error("Error: Una o ambas cartas no se han jugado para determinar el ganador de la ronda.");
        return;
    }

    const playerCardTrucoValue = getTrucoValue(playerCard);
    const iaCardTrucoValue = getTrucoValue(iaCard);

    let roundWinner = null;
    if (playerCardTrucoValue > iaCardTrucoValue) {
        roundWinner = 'player';
        gameState.playerRoundWins++;
        addMessageToHistory(`¡${gameState.playerName} gana la ronda ${gameState.currentRound}!`, 'system');
    } else if (iaCardTrucoValue > playerCardTrucoValue) {
        roundWinner = 'ia';
        gameState.iaRoundWins++;
        addMessageToHistory(`TrucoEstrella gana la ronda ${gameState.currentRound}.`, 'system');
    } else {
        roundWinner = 'parda';
        addMessageToHistory(`Ronda ${gameState.currentRound} fue parda.`, 'system');
    }
    
    // Las cartas permanecen en la mesa por ahora. La limpieza ocurre al final de la mano.

    // Llamar a endRound después de un breve retraso para que los jugadores vean el resultado
    setTimeout(() => {
        endRound(roundWinner);
    }, 1500); 
};

/**
 * Finaliza la ronda y prepara para la siguiente o para el fin de mano.
 * @param {string} winner 'player', 'ia', or 'parda' (ganador de la ronda actual)
 */
const endRound = (winner) => {
    gameState.currentRound++;
    gameState.cardsPlayedInRound = { player: null, ia: null }; // Resetear cartas jugadas en esta ronda (solo las de la ronda actual)

    console.log(`Ronda ${gameState.currentRound-1} finalizada. Ganador: ${winner}`);
    console.log(`Victorias - Jugador: ${gameState.playerRoundWins}, IA: ${gameState.iaRoundWins}`);

    // Determinar si la mano ha terminado (2 victorias de 3 rondas o 3 rondas jugadas)
    if (gameState.playerRoundWins >= 2 || gameState.iaRoundWins >= 2 || gameState.currentRound > GAME_CONSTANTS.CARDS_PER_PLAYER) {
        endHand(); // Termina la mano
    } else {
        // Continuar a la siguiente ronda
        addMessageToHistory(`Iniciando Ronda ${gameState.currentRound}.`, 'system');
        
        // Determinar quién es mano para la siguiente ronda (ganador de la anterior o mano original en parda)
        let nextTurnPlayer = null;
        if (winner === 'player') {
            nextTurnPlayer = 'player';
        } else if (winner === 'ia') {
            nextTurnPlayer = 'ia';
        } else { // Parda, la mano original de la mano actual sigue siendo mano
            nextTurnPlayer = gameState.manoPlayerId;
        }

        if (nextTurnPlayer === 'player') {
            gameState.playerTurn = true;
            addMessageToHistory('Es tu turno.', 'system');
            togglePlayerHandInteraction(true); // Re-habilitar interacción para el jugador
        } else {
            gameState.playerTurn = false;
            addMessageToHistory('Es el turno de TrucoEstrella.', 'system');
            setTimeout(playIACard, 1000);
        }
    }
};

/**
 * Finaliza la mano (conjunto de 3 rondas) y asigna puntos.
 */
const endHand = () => {
    let handWinner = null;
    if (gameState.playerRoundWins > gameState.iaRoundWins) {
        handWinner = 'player';
        gameState.playerScore += 1; // Asignar 1 punto por ganar la mano simple (sin trucos, envidos por ahora)
    } else if (gameState.iaRoundWins > gameState.playerRoundWins) {
        handWinner = 'ia';
        gameState.iaScore += 1; // Asignar 1 punto a la IA
    } else {
        // En caso de empate en rondas (ej. 1-1, y tercera parda), gana la mano inicial
        handWinner = gameState.manoPlayerId;
        if (handWinner === 'player') gameState.playerScore += 1;
        else gameState.iaScore += 1;
    }

    addMessageToHistory(`¡Fin de la mano! Ganador: ${handWinner === 'player' ? gameState.playerName : 'TrucoEstrella'}.`, 'system');
    addMessageToHistory(`Puntuación: ${gameState.playerName}: ${gameState.playerScore} - TrucoEstrella: ${gameState.iaScore}`, 'system');
    renderScore(gameState.playerScore, gameState.gamePoints, DOMElements.playerScoreMatchesContainer.id);
    renderScore(gameState.iaScore, gameState.gamePoints, DOMElements.opponentScoreMatchesContainer.id);

    // Verificar si alguien ganó la partida
    if (gameState.playerScore >= gameState.gamePoints) {
        addMessageToHistory(`¡${gameState.playerName} ha ganado la partida!`, 'player');
        alert(`¡Felicidades, ${gameState.playerName}! Has ganado la partida.`);
        showStartScreen(); // Volver al menú
        return; // Detener la ejecución para evitar iniciar otra mano
    } else if (gameState.iaScore >= gameState.gamePoints) {
        addMessageToHistory(`¡TrucoEstrella ha ganado la partida!`, 'ia');
        alert(`¡Oh no! TrucoEstrella ha ganado la partida.`);
        showStartScreen(); // Volver al menú
        return; // Detener la ejecución
    } 
    
    // Si nadie ganó la partida, iniciar nueva mano después de un breve retraso
    // Limpiar las cartas jugadas en la mesa (solo aquí al final de la mano)
    clearPlayedCards(); // Vuelve a limpiar ambos contenedores
    
    // Resetear estado de victorias de ronda para la próxima mano
    gameState.playerRoundWins = 0;
    gameState.iaRoundWins = 0;
    gameState.currentRound = 0; // Se reinicia para que initializeGame la ponga en 1
    gameState.cardsPlayedInRound = { player: null, ia: null };
    gameState.playedCardsOnTable = { round1: { player: null, ia: null }, round2: { player: null, ia: null }, round3: { player: null, ia: null } }; // Reiniciar cartas en mesa

    setTimeout(() => {
        addMessageToHistory('Comenzando nueva mano...', 'system');
        initializeGame();
    }, 2000);
};

/**
 * Función principal para inicializar una nueva mano (o juego al inicio).
 * Esta función se encarga del reparto, determinar la mano y empezar el turno.
 */
const initializeGame = () => {
    // Resetear las manos y el mazo para una nueva mano
    gameState.playerHand = [];
    gameState.iaHand = [];
    gameState.deck = shuffleDeck(createDeck());
    
    const { playerHand, iaHand, deck } = dealCards(gameState.deck, GAME_CONSTANTS.CARDS_PER_PLAYER);
    gameState.playerHand = playerHand;
    gameState.iaHand = iaHand;
    gameState.deck = deck;

    renderPlayerHand(gameState.playerHand, 'player-hand', true); // Las cartas son jugables al inicio de la mano
    renderIAHand(GAME_CONSTANTS.CARDS_PER_PLAYER, 'ia-hand');
    
    clearPlayedCards(); // Asegurarse de que la mesa esté limpia al inicio de cada mano

    // Determinar quién es la mano de la primera ronda de esta mano
    gameState.manoPlayerId = determineMano();
    gameState.currentRound = 1; // La primera ronda de la mano

    addMessageToHistory('Cartas repartidas.', 'system');
    addMessageToHistory(`Ronda 1. Mano: ${gameState.manoPlayerId === 'player' ? gameState.playerName : 'TrucoEstrella'}.`, 'system');

    // Empezar el turno
    if (gameState.manoPlayerId === 'player') {
        gameState.playerTurn = true;
        addMessageToHistory('Es tu turno.', 'system');
        togglePlayerHandInteraction(true);
    } else {
        gameState.playerTurn = false;
        addMessageToHistory('Es el turno de TrucoEstrella.', 'system');
        setTimeout(playIACard, 1000); // IA juega después de 1 segundo
    }
};

// --- Configuración Inicial de Event Listeners ---
// Esta función se asegura de que todos los listeners se configuren después de que el DOM esté listo
const setupEventListeners = () => {
    // Listener para el botón "Comenzar Partida"
    DOMElements.startGameBtn.addEventListener('click', () => {
        const config = saveGameConfig();
        showGameScreen(config);
    });

    // Listener para el botón "Limpiar Cache"
    DOMElements.clearCacheBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché y reiniciar el juego?')) {
            localStorage.clear();
            location.reload();
        }
    });

    // Listener para el botón "Volver al Menú" en la pantalla de juego
    DOMElements.backToMenuBtn.addEventListener('click', () => {
        showStartScreen();
    });

    // TODO: Event listeners para los botones de canto (Opciones)
    DOMElements.gameControlButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            console.log(`Botón de opción clicado: ${event.target.textContent}`);
            // Aquí se manejará la lógica de Truco, Envido, Flor, etc.
        });
    });

    document.getElementById('btn-mazo').addEventListener('click', () => {
        addMessageToHistory(`${gameState.playerName} se fue al mazo.`, 'player');
        // Lógica para terminar la mano y dar el punto al rival
        gameState.iaScore += 1;
        endHand();
    });
};

// --- Inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
    getDOMElements(); // Primero, obtener todas las referencias del DOM
    loadGameConfig(); // Luego, cargar la configuración inicial
    setupEventListeners(); // Finalmente, configurar todos los event listeners
});

// Estado de canto actual
let currentCanto = null;

// Manejo de cantos
const handleCanto = (canto) => {
    currentCanto = canto;
    addMessageToHistory(`${gameState.playerName} canta ${canto.toUpperCase()}!`, 'player');
    // Aquí se puede agregar lógica para respuesta de la IA o mostrar opciones de "Quiero/No quiero"
    if (canto === 'Envido') {
        // Mostrar popup de envido y calcular puntos
        showEnvidoPopup();
    }
    // Agregar lógica para otros cantos...
};

// Asignar listeners a los botones de canto
DOMElements.gameControlButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const canto = event.target.textContent.trim();
        handleCanto(canto);
    });
});

function showEnvidoPopup() {
    // Simulación de cálculo de envido
    const playerEnvido = calcularEnvido(gameState.playerHand);
    const iaEnvido = calcularEnvido(gameState.iaHand);
    let winner = playerEnvido > iaEnvido ? gameState.playerName : 'TrucoEstrella';
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
    }, 3000);
}

// Ejemplo de función para calcular envido (simplificada)
function calcularEnvido(mano) {
    // Lógica real de envido según reglas
    // Por ahora, suma los valores de las dos cartas más altas del mismo palo + 20
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

function showFinPartidaModal(winner) {
    document.getElementById('modal-fin-partida-content').textContent = `Ganador: ${winner}`;
    document.getElementById('modal-fin-partida').classList.remove('hidden');
}

document.getElementById('btn-revancha').addEventListener('click', () => {
    document.getElementById('modal-fin-partida').classList.add('hidden');
    initializeGame();
});

// Llamar showFinPartidaModal(winner) en endHand cuando termina la partida