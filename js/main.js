// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener referencias a los elementos del DOM
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const playerNameInput = document.getElementById('playerName');
    const gamePointsRadios = document.querySelectorAll('input[name="gamePoints"]');
    const playWithFlorCheckbox = document.getElementById('playWithFlor');
    const startGameBtn = document.getElementById('startGameBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const btnPlayVsIA = document.getElementById('btnPlayVsIA'); // Botón específico para 1 vs IA

    // --- Funciones para manejar la configuración ---

    /**
     * Carga la configuración del juego desde localStorage.
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

        if (savedPlayWithFlor === 'true') {
            playWithFlorCheckbox.checked = true;
        } else {
            playWithFlorCheckbox.checked = false; // Asegura que esté desmarcado si no hay valor o es 'false'
        }
    };

    /**
     * Guarda la configuración actual del juego en localStorage.
     */
    const saveGameConfig = () => {
        const playerName = playerNameInput.value.trim();
        const gamePoints = document.querySelector('input[name="gamePoints"]:checked').value;
        const playWithFlor = playWithFlorCheckbox.checked;

        localStorage.setItem('trucoEstrellasPlayerName', playerName);
        localStorage.setItem('trucoEstrellasGamePoints', gamePoints);
        localStorage.setItem('trucoEstrellasPlayWithFlor', playWithFlor);

        return { playerName, gamePoints: parseInt(gamePoints), playWithFlor };
    };

    // --- Event Listeners ---

    // Listener para el botón "Comenzar Partida"
    startGameBtn.addEventListener('click', () => {
        // Solo permitimos iniciar partidas contra la IA por ahora
        if (btnPlayVsIA.disabled) { // Si el botón 1 vs IA está deshabilitado (lo cual no debería ocurrir si es el único funcional)
            alert('Por favor, selecciona un modo de juego funcional para comenzar.');
            return;
        }

        const config = saveGameConfig(); // Guarda la configuración antes de iniciar

        // Ocultar pantalla de inicio y mostrar pantalla de juego
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        // Aquí es donde en el futuro se llamaría a una función para iniciar el juego con la IA
        console.log('--- Partida Iniciada ---');
        console.log('Configuración de la partida:', config);
        console.log('Nombre del jugador:', config.playerName);
        console.log('Puntos para ganar:', config.gamePoints);
        console.log('Jugar con Flor:', config.playWithFlor);
        console.log('¡El juego debería aparecer ahora en game-screen!');

        // TODO: En la próxima etapa, aquí se llamará a una función para inicializar el juego real
        // Por ejemplo: initializeGame(config);
    });

    // Listener para el botón "Limpiar Cache"
    clearCacheBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché y reiniciar el juego?')) {
            localStorage.clear(); // Limpia todo el localStorage
            location.reload(); // Recarga la página
        }
    });

    // Listener específico para el botón "Retar a TrucoEstrella (1 vs IA)"
    // Esto asegura que solo este modo sea "seleccionable" para iniciar la partida.
    // Aunque otros botones están deshabilitados, este listener refuerza que solo este es funcional.
    btnPlayVsIA.addEventListener('click', () => {
        // En este prototipo inicial, solo el botón "1 vs IA" es funcional para iniciar.
        // Otros botones como "Uno a Uno", "Dos a Dos", etc., están disabled en HTML.
        // No hay necesidad de manejar la selección de modo si solo uno es interactivo.
        // Si en el futuro hubiera más opciones habilitadas, aquí se gestionaría la selección activa.
    });


    // --- Inicialización ---
    loadGameConfig(); // Cargar la configuración al cargar la página
});