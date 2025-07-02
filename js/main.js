// js/main.js

// Importar módulos necesarios
import { SUITS, CARD_VALUES, GAME_CONSTANTS, getTrucoValue, getEnvidoValue } from './config.js';
import { renderPlayerHand, renderIAHand, addMessageToHistory, updateScoreboardMessage, renderScore } from './ui.js';

// Estado global del juego (lo iremos expandiendo)
let gameState = {
    playerName: GAME_CONSTANTS.DEFAULT_PLAYER_NAME,
    gamePoints: GAME_CONSTANTS.DEFAULT_GAME_POINTS,
    playWithFlor: GAME_CONSTANTS.DEFAULT_PLAY_WITH_FLOR,
    playerHand: [],
    iaHand: [],
    deck: [],
    playerScore: 0,
    iaScore: 0,
    // ... más estados (turno, ronda, cartas jugadas, etc.)
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener referencias a los elementos del DOM de ambas pantallas
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');

    // Elementos de la Pantalla de Inicio
    const playerNameInput = document.getElementById('playerName');
    const gamePointsRadios = document.querySelectorAll('input[name="gamePoints"]');
    const playWithFlorCheckbox = document.getElementById('playWithFlor');
    const startGameBtn = document.getElementById('startGameBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const appVersionSpan = document.getElementById('app-version'); // Referencia al span de la versión

    // Elementos de la Pantalla de Juego
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const playerNameText = document.getElementById('player-name-text');
    const playerHandContainer = document.getElementById('player-hand');
    const iaHandContainer = document.getElementById('ia-hand');
    const playerScoreMatchesContainer = document.getElementById('player-score-matches');
    const opponentScoreMatchesContainer = document.getElementById('opponent-score-matches');


    // --- Funciones para manejar la configuración y UI ---

    /**
     * Carga la configuración del juego desde localStorage y actualiza la UI de inicio.
     */
    const loadGameConfig = () => {
        const savedPlayerName = localStorage.getItem('trucoEstrellasPlayerName');
        const savedGamePoints = localStorage.getItem('trucoEstrellasGamePoints');
        const savedPlayWithFlor = localStorage.getItem('trucoEstrellasPlayWithFlor');

        if (savedPlayerName) {
            playerNameInput.value = savedPlayerName;
            gameState.playerName = savedPlayerName;
        }

        if (savedGamePoints) {
            gamePointsRadios.forEach(radio => {
                if (radio.value === savedGamePoints) {
                    radio.checked = true;
                }
            });
            gameState.gamePoints = parseInt(savedGamePoints);
        }

        if (savedPlayWithFlor === 'true') {
            playWithFlorCheckbox.checked = true;
            gameState.playWithFlor = true;
        } else {
            playWithFlorCheckbox.checked = false;
            gameState.playWithFlor = false;
        }
        
        // Actualizar la versión visible
        appVersionSpan.textContent = `Versión: ${GAME_CONSTANTS.VERSION}`;
    };

    /**
     * Guarda la configuración actual del juego en localStorage.
     * @returns {object} La configuración actual del juego.
     */
    const saveGameConfig = () => {
        const playerName = playerNameInput.value.trim();
        const gamePoints = document.querySelector('input[name="gamePoints"]:checked').value;
        const playWithFlor = playWithFlorCheckbox.checked;

        localStorage.setItem('trucoEstrellasPlayerName', playerName);
        localStorage.setItem('trucoEstrellasGamePoints', gamePoints);
        localStorage.setItem('trucoEstrellasPlayWithFlor', playWithFlor.toString());

        // Actualiza el estado global del juego
        gameState.playerName = playerName;
        gameState.gamePoints = parseInt(gamePoints);
        gameState.playWithFlor = playWithFlor;

        return { playerName, gamePoints: parseInt(gamePoints), playWithFlor };
    };

    /**
     * Muestra la pantalla de inicio y oculta la pantalla de juego.
     */
    const showStartScreen = () => {
        gameScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        // Aquí podrías resetear el estado del juego si existiera una partida activa
        console.log('Regresando a la pantalla de inicio...');
        // Limpiar manos y mesa al volver al menú
        playerHandContainer.innerHTML = '';
        iaHandContainer.innerHTML = ''; // Limpiar IA hand
        document.getElementById('ia-played-cards').innerHTML = ''; // Limpiar cartas jugadas IA
        document.getElementById('player-played-cards').innerHTML = ''; // Limpiar cartas jugadas jugador
        document.getElementById('history-content').innerHTML = '<p class="text-gray-400">Bienvenido a TrucoEstrellas!</p>'; // Resetear historial
        updateScoreboardMessage('top', '');
        updateScoreboardMessage('bottom', '');
        renderScore(0, gameState.gamePoints, playerScoreMatchesContainer.id);
        renderScore(0, gameState.gamePoints, opponentScoreMatchesContainer.id);
        
    };

    /**
     * Muestra la pantalla de juego y oculta la pantalla de inicio.
     * @param {object} config La configuración de la partida.
     */
    const showGameScreen = (config) => {
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        playerNameText.textContent = config.playerName; // Actualiza el nombre del jugador en la pantalla de juego
        
        addMessageToHistory('¡La partida ha comenzado!', 'system');
        
        // Inicializar un nuevo juego
        initializeGame(config);
    };

    // --- Lógica del Juego ---

    /**
     * Inicializa un nuevo mazo de cartas.
     * @returns {Array} Un array de objetos carta {value, suit}.
     */
    const createDeck = () => {
        const deck = [];
        for (const suit of Object.values(SUITS)) {
            for (const value of CARD_VALUES) {
                deck.push({ value, suit });
            }
        }
        return deck;
    };

    /**
     * Baraja un mazo de cartas utilizando el algoritmo Fisher-Yates.
     * @param {Array} deck El mazo a barajar.
     * @returns {Array} El mazo barajado.
     */
    const shuffleDeck = (deck) => {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]]; // Intercambiar elementos
        }
        return deck;
    };

    /**
     * Reparte cartas a los jugadores.
     * @param {Array} deck El mazo barajado.
     * @param {number} numCards La cantidad de cartas a repartir por jugador.
     * @returns {object} Objeto con las manos del jugador y la IA, y el mazo restante.
     */
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
     * Función principal para inicializar una nueva mano (o juego al inicio).
     * @param {object} config La configuración actual de la partida.
     */
    const initializeGame = (config) => {
        gameState.deck = shuffleDeck(createDeck()); // Crear y barajar el mazo
        
        const { playerHand, iaHand, deck } = dealCards(gameState.deck, GAME_CONSTANTS.CARDS_PER_PLAYER);
        gameState.playerHand = playerHand;
        gameState.iaHand = iaHand;
        gameState.deck = deck; // Actualizar el mazo restante

        console.log('Mano del Jugador:', gameState.playerHand);
        console.log('Mano de la IA:', gameState.iaHand);

        // Renderizar las manos en la UI
        renderPlayerHand(gameState.playerHand, 'player-hand');
        renderIAHand(GAME_CONSTANTS.CARDS_PER_PLAYER, 'ia-hand');

        // Renderizar el marcador inicial (0 puntos)
        renderScore(gameState.playerScore, gameState.gamePoints, playerScoreMatchesContainer.id);
        renderScore(gameState.iaScore, gameState.gamePoints, opponentScoreMatchesContainer.id);

        addMessageToHistory('Cartas repartidas. Es tu turno.', 'system');
        // TODO: Determinar quién es "mano" (primero en jugar) y establecer el turno.
    };

    // --- Event Listeners ---

    // Listener para el botón "Comenzar Partida"
    startGameBtn.addEventListener('click', () => {
        const config = saveGameConfig();
        showGameScreen(config);
    });

    // Listener para el botón "Limpiar Cache"
    clearCacheBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché y reiniciar el juego?')) {
            localStorage.clear();
            location.reload();
        }
    });

    // Listener para el botón "Volver al Menú" en la pantalla de juego
    backToMenuBtn.addEventListener('click', () => {
        showStartScreen();
    });

    // --- Inicialización al cargar el DOM ---
    loadGameConfig(); // Cargar la configuración al cargar la página
});