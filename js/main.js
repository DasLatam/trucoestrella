// js/main.js

// Importar módulos necesarios
import { SUITS, CARD_VALUES, GAME_CONSTANTS, getTrucoValue, getEnvidoValue } from './config.js';
import { renderPlayerHand, renderIAHand, addMessageToHistory, updateScoreboardMessage, renderScore, createCardElement, clearPlayedCards, addCardToPlayedArea } from './ui.js';

// Versión actual de la aplicación
const APP_VERSION = 'Beta 1.0';

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
    handWinner: null, // 'player', 'ia', 'parda'
    cardsPlayedInRound: {
        player: null,
        ia: null
    },
    playerRoundWins: 0,
    iaRoundWins: 0,
    manoPlayerId: null // 'player' o 'ia', quien es "mano" en la ronda actual (empieza jugando)
};

// Referencias del DOM (para no buscarlas múltiples veces)
const DOMElements = {};

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias del DOM
    DOMElements.startScreen = document.getElementById('start-screen');
    DOMElements.gameScreen = document.getElementById('game-screen');
    DOMElements.playerNameInput = document.getElementById('playerName');
    DOMElements.gamePointsRadios = document.querySelectorAll('input[name="gamePoints"]');
    DOMElements.playWithFlorCheckbox = document.getElementById('playWithFlor');
    DOMElements.startGameBtn = document.getElementById('startGameBtn');
    DOMElements.clearCacheBtn = document.getElementById('clearCacheBtn');
    DOMElements.appVersionSpan = document.getElementById('app-version'); // Para mostrar la versión

    DOMElements.backToMenuBtn = document.getElementById('backToMenuBtn');
    DOMElements.playerNameText = document.getElementById('player-name-text');
    DOMElements.playerHandContainer = document.getElementById('player-hand');
    DOMElements.iaHandContainer = document.getElementById('ia-hand');
    DOMElements.iaPlayedCardsContainer = document.getElementById('ia-played-cards');
    DOMElements.playerPlayedCardsContainer = document.getElementById('player-played-cards');
    DOMElements.playerScoreMatchesContainer = document.getElementById('player-score-matches');
    DOMElements.opponentScoreMatchesContainer = document.getElementById('opponent-score-matches');
    DOMElements.historyContent = document.getElementById('history-content');


    // --- Funciones de Utilidad y Configuración ---

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

        DOMElements.appVersionSpan.textContent = `Versión: ${APP_VERSION}`;
    };

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

    const showStartScreen = () => {
        DOMElements.gameScreen.classList.add('hidden');
        DOMElements.startScreen.classList.remove('hidden');
        addMessageToHistory('Bienvenido a TrucoEstrellas!', 'system'); // Reiniciar historial al volver
        clearGameUI(); // Limpiar UI al regresar al menú
        console.log('Regresando a la pantalla de inicio...');
        // Reiniciar estado del juego
        Object.assign(gameState, {
            playerHand: [],
            iaHand: [],
            deck: [],
            playerScore: 0,
            iaScore: 0,
            currentRound: 0,
            playerTurn: false,
            handWinner: null,
            cardsPlayedInRound: { player: null, ia: null },
            playerRoundWins: 0,
            iaRoundWins: 0,
            manoPlayerId: null
        });
    };

    const showGameScreen = (config) => {
        DOMElements.startScreen.classList.add('hidden');
        DOMElements.gameScreen.classList.remove('hidden');
        DOMElements.playerNameText.textContent = config.playerName;
        
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
            [deck[i], deck[j]] = [deck[j], deck[i]];
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
     * Limpia la interfaz de usuario de las cartas y el marcador.
     */
    const clearGameUI = () => {
        DOMElements.playerHandContainer.innerHTML = '';
        DOMElements.iaHandContainer.innerHTML = '';
        clearPlayedCards(); // Función de ui.js
        updateScoreboardMessage('top', '');
        updateScoreboardMessage('bottom', '');
        renderScore(0, gameState.gamePoints, DOMElements.playerScoreMatchesContainer.id);
        renderScore(0, gameState.gamePoints, DOMElements.opponentScoreMatchesContainer.id);
        // Dejar el historial inicial para no vaciarlo completamente
        DOMElements.historyContent.innerHTML = '<p class="text-gray-400">Bienvenido a TrucoEstrellas!</p>'; 
    };

    /**
     * Determina quién es la "mano" (el que empieza jugando la ronda).
     * En 1 vs 1, la mano se alterna. Para la primera ronda, es aleatorio.
     * @returns {string} 'player' o 'ia'.
     */
    const determineMano = () => {
        // En un 1v1, alternamos la mano. Para la primera partida, es aleatorio.
        if (gameState.manoPlayerId === null) {
            return Math.random() < 0.5 ? 'player' : 'ia';
        } else {
            // Alternar mano para la siguiente ronda/mano
            return gameState.manoPlayerId === 'player' ? 'ia' : 'player';
        }
    };

    /**
     * Habilita/deshabilita la interacción del jugador con sus cartas.
     * @param {boolean} enable Si es true, las cartas son clickables.
     */
    const togglePlayerHandInteraction = (enable) => {
        DOMElements.playerHandContainer.querySelectorAll('.card').forEach(cardElement => {
            if (enable) {
                cardElement.classList.add('cursor-pointer', 'hover:scale-105', 'transform', 'transition-transform', 'duration-100', 'active:scale-95');
                cardElement.addEventListener('click', handlePlayerCardPlay);
            } else {
                cardElement.classList.remove('cursor-pointer', 'hover:scale-105', 'transform', 'transition-transform', 'duration-100', 'active:scale-95');
                cardElement.removeEventListener('click', handlePlayerCardPlay);
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
        addCardToPlayedArea(playedCard, 'player', 'player-played-cards');
        addMessageToHistory(`${gameState.playerName} jugó el ${playedCard.value} de ${playedCard.suit}.`, 'player');

        togglePlayerHandInteraction(false); // Deshabilitar clic en cartas hasta que la IA responda
        gameState.playerTurn = false; // Ya no es el turno del jugador

        // Si la IA aún no ha jugado, es su turno.
        // Si la IA ya jugó (en el caso de que la IA fuera mano), se determina el ganador de la ronda.
        if (gameState.cardsPlayedInRound.ia === null) {
            // Simular un pequeño retraso para la IA
            setTimeout(playIACard, 1000);
        } else {
            // Ambas cartas jugadas, determinar ganador
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
        addCardToPlayedArea(playedCard, 'ia', 'ia-played-cards');
        addMessageToHistory(`YO (TrucoEstrella) jugó el ${playedCard.value} de ${playedCard.suit}.`, 'ia');

        // Ambas cartas jugadas, determinar ganador
        determineRoundWinner();
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
        
        // Limpiar cartas de la mesa después de un breve retraso para que se vean
        setTimeout(() => {
            clearPlayedCards();
            endRound(roundWinner);
        }, 1500); // Esperar 1.5 segundos antes de limpiar y avanzar
    };

    /**
     * Finaliza la ronda y prepara para la siguiente o para el fin de mano.
     * @param {string} winner 'player', 'ia', or 'parda'
     */
    const endRound = (winner) => {
        gameState.currentRound++;
        gameState.cardsPlayedInRound = { player: null, ia: null }; // Resetear cartas jugadas en esta ronda

        console.log(`Ronda ${gameState.currentRound-1} finalizada. Ganador: ${winner}`);
        console.log(`Victorias - Jugador: ${gameState.playerRoundWins}, IA: ${gameState.iaRoundWins}`);

        // Determinar si la mano ha terminado
        if (gameState.playerRoundWins >= 2 || gameState.iaRoundWins >= 2 || gameState.currentRound > 3) {
            endHand(); // Termina la mano
        } else {
            // Continuar a la siguiente ronda
            addMessageToHistory(`Iniciando Ronda ${gameState.currentRound}.`, 'system');
            
            // Determinar quién es mano para la siguiente ronda (ganador de la anterior)
            if (winner === 'player') {
                gameState.playerTurn = true;
                addMessageToHistory('Es tu turno.', 'system');
                togglePlayerHandInteraction(true);
            } else if (winner === 'ia') {
                gameState.playerTurn = false;
                addMessageToHistory('Es el turno de TrucoEstrella.', 'system');
                setTimeout(playIACard, 1000);
            } else { // Parda
                // Si la primera ronda fue parda, la segunda la empieza la mano original.
                // Si la segunda fue parda, la tercera la empieza la mano original.
                if (gameState.manoPlayerId === 'player') {
                    gameState.playerTurn = true;
                    addMessageToHistory('Es tu turno (parda).', 'system');
                    togglePlayerHandInteraction(true);
                } else {
                    gameState.playerTurn = false;
                    addMessageToHistory('Es el turno de TrucoEstrella (parda).', 'system');
                    setTimeout(playIACard, 1000);
                }
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

        // Resetear estado para la próxima mano
        gameState.playerRoundWins = 0;
        gameState.iaRoundWins = 0;
        gameState.currentRound = 0;
        gameState.cardsPlayedInRound = { player: null, ia: null };

        // Verificar si alguien ganó la partida
        if (gameState.playerScore >= gameState.gamePoints) {
            addMessageToHistory(`¡${gameState.playerName} ha ganado la partida!`, 'system');
            alert(`¡Felicidades, ${gameState.playerName}! Has ganado la partida.`);
            showStartScreen(); // Volver al menú
        } else if (gameState.iaScore >= gameState.gamePoints) {
            addMessageToHistory(`¡TrucoEstrella ha ganado la partida!`, 'system');
            alert(`¡Oh no! TrucoEstrella ha ganado la partida.`);
            showStartScreen(); // Volver al menú
        } else {
            // Iniciar nueva mano
            setTimeout(() => {
                addMessageToHistory('Comenzando nueva mano...', 'system');
                initializeGame();
            }, 2000);
        }
    };

    /**
     * Función principal para inicializar una nueva mano (o juego al inicio).
     * Esta función se encarga del reparto, determinar la mano y empezar el turno.
     */
    const initializeGame = () => {
        gameState.deck = shuffleDeck(createDeck());
        
        const { playerHand, iaHand, deck } = dealCards(gameState.deck, GAME_CONSTANTS.CARDS_PER_PLAYER);
        gameState.playerHand = playerHand;
        gameState.iaHand = iaHand;
        gameState.deck = deck;

        renderPlayerHand(gameState.playerHand, 'player-hand', true); // Las cartas son jugables al inicio de la mano
        renderIAHand(GAME_CONSTANTS.CARDS_PER_PLAYER, 'ia-hand');
        
        clearPlayedCards(); // Asegurarse de que la mesa esté limpia

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

    // --- Inicialización al cargar el DOM ---
    loadGameConfig(); // Cargar la configuración al cargar la página
});