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
    // Los contenedores de cartas jugadas se limpian al inicio de cada mano,
    // y luego se añaden las cartas jugadas en cada ronda.
    DOMElements.iaPlayedCardsContainer.innerHTML = '';
    DOMElements.playerPlayedCardsContainer.innerHTML = '';
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
    // Si es la primera mano de la partida, la mano es aleatoria
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
    // Asegurarse de que las cartas solo sean clickables si no están ya jugadas
    DOMElements.playerHandContainer.querySelectorAll('.card').forEach(cardElement => {
        // Solo aplicar el listener si la carta NO es la que está boca abajo (IA) y es jugable
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

    // Añadir la carta a las cartas jugadas en la ronda
    gameState.cardsPlayedInRound.player = playedCard;

    // Renderizar mano actualizada y carta jugada en mesa
    renderPlayerHand(gameState.playerHand, 'player-hand', false); // Mano ya no es jugable hasta el siguiente turno
    addCardToPlayedArea(playedCard, 'player', DOMElements.playerPlayedCardsContainer.id);
    addMessageToHistory(`${gameState.playerName} jugó el ${playedCard.value} de ${playedCard.suit}.`, 'player');

    togglePlayerHandInteraction(false); // Deshabilitar clic en cartas hasta que la IA responda
    gameState.playerTurn = false; // Ya no es el turno del jugador

    // Si la IA aún no ha jugado, es su turno.
    if (gameState.cardsPlayedInRound.ia === null) {
        setTimeout(playIACard, 1000); // IA juega después de 1 segundo
    } else {
        // Ambas cartas jugadas, determinar ganador (esto ocurre si la IA fue mano)
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

    // Añadir la carta a las cartas jugadas en la ronda
    gameState.cardsPlayedInRound.ia = playedCard;

    // Renderizar mano de IA (boca abajo) y carta jugada en mesa
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
    
    // Las cartas permanecen en la mesa por ahora, solo limpiamos los contenedores de jugadas.
    // En futuras versiones, quizás animemos el "recojo" o las deshabilitamos.

    // Llamar a endRound sin limpiar visualmente las cartas de la mesa inmediatamente
    setTimeout(() => {
        // Aquí no llamamos a clearPlayedCards(), las cartas se quedan.
        endRound(roundWinner);
    }, 1500); // Esperar 1.5 segundos para que los jugadores vean el resultado
};

/**
 * Finaliza la ronda y prepara para la siguiente o para el fin de mano.
 * @param {string} winner 'player', 'ia', or 'parda' (ganador de la ronda actual)
 */
const endRound = (winner) => {
    gameState.currentRound++;
    gameState.cardsPlayedInRound = { player: null, ia: null }; // Resetear cartas jugadas en esta ronda

    console.log(`Ronda ${gameState.currentRound-1} finalizada. Ganador: ${winner}`);
    console.log(`Victorias - Jugador: ${gameState.playerRoundWins}, IA: ${gameState.iaRoundWins}`);

    // Determinar si la mano ha terminado (2 victorias de 3 rondas o 3 rondas jugadas)
    if (gameState.playerRoundWins >= 2 || gameState.iaRoundWins >= 2 || gameState.currentRound > GAME_CONSTANTS.CARDS_PER_PLAYER) {
        endHand(); // Termina la mano
    } else {
        // Continuar a la siguiente ronda
        addMessageToHistory(`Iniciando Ronda ${gameState.currentRound}.`, 'system');
        
        // Determinar quién es mano para la siguiente ronda (ganador de la anterior o mano original en parda)
        let nextManoTurn = null;
        if (winner === 'player') {
            nextManoTurn = 'player';
        } else if (winner === 'ia') {
            nextManoTurn = 'ia';
        } else { // Parda, la mano original de la mano actual sigue siendo mano
            nextManoTurn = gameState.manoPlayerId;
        }

        if (nextManoTurn === 'player') {
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
    // Limpiar las cartas jugadas en la mesa (se hace aquí al final de la mano)
    DOMElements.iaPlayedCardsContainer.innerHTML = ''; // Limpiar cartas jugadas IA
    DOMElements.playerPlayedCardsContainer.innerHTML = ''; // Limpiar cartas jugadas jugador
    
    // Resetear estado de victorias de ronda para la próxima mano
    gameState.playerRoundWins = 0;
    gameState.iaRoundWins = 0;
    // gameState.currentRound se reinicia en initializeGame
    gameState.cardsPlayedInRound = { player: null, ia: null };

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
    
    // IMPORTANTE: clearPlayedCards() se llama ahora en endHand() para limpiar la mesa antes de la nueva mano
    // y también en showStartScreen() al volver al menú.

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
};

// --- Inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
    getDOMElements(); // Primero, obtener todas las referencias del DOM
    loadGameConfig(); // Luego, cargar la configuración inicial
    setupEventListeners(); // Finalmente, configurar todos los event listeners
});