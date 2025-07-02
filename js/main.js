// js/main.js

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
    const btnPlayVsIA = document.getElementById('btnPlayVsIA'); // Botón específico para 1 vs IA (por si se necesita lógicamente)

    // Elementos de la Pantalla de Juego
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const playerNameText = document.getElementById('player-name-text');


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
        }

        if (savedGamePoints) {
            gamePointsRadios.forEach(radio => {
                if (radio.value === savedGamePoints) {
                    radio.checked = true;
                }
            });
        }

        // playWithFlorCheckbox debe ser 'true' o 'false' como string en localStorage
        if (savedPlayWithFlor === 'true') {
            playWithFlorCheckbox.checked = true;
        } else {
            playWithFlorCheckbox.checked = false;
        }
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
        localStorage.setItem('trucoEstrellasPlayWithFlor', playWithFlor.toString()); // Guardar como string 'true' o 'false'

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
    };

    /**
     * Muestra la pantalla de juego y oculta la pantalla de inicio.
     * @param {object} config La configuración de la partida.
     */
    const showGameScreen = (config) => {
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        playerNameText.textContent = config.playerName; // Actualiza el nombre del jugador en la pantalla de juego
        console.log('--- Partida Iniciada ---');
        console.log('Configuración de la partida:', config);
        console.log('Nombre del jugador:', config.playerName);
        console.log('Puntos para ganar:', config.gamePoints);
        console.log('Jugar con Flor:', config.playWithFlor);
        console.log('¡El juego debería aparecer ahora en game-screen!');
        // TODO: Aquí se llamará a una función para inicializar el juego real
        // Por ejemplo: initializeGame(config);
    };

    // --- Event Listeners ---

    // Listener para el botón "Comenzar Partida"
    startGameBtn.addEventListener('click', () => {
        // En esta etapa, asumimos que siempre se jugará 1 vs IA ya que los otros están deshabilitados.
        const config = saveGameConfig(); // Guarda la configuración antes de iniciar
        showGameScreen(config); // Cambia a la pantalla de juego
    });

    // Listener para el botón "Limpiar Cache"
    clearCacheBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché y reiniciar el juego?')) {
            localStorage.clear(); // Limpia todo el localStorage
            location.reload(); // Recarga la página
        }
    });

    // Listener para el botón "Volver al Menú" en la pantalla de juego
    backToMenuBtn.addEventListener('click', () => {
        showStartScreen(); // Vuelve a la pantalla de inicio
    });

    // --- Inicialización ---
    loadGameConfig(); // Cargar la configuración al cargar la página
});