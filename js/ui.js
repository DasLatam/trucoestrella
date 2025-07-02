// js/ui.js

// Función para crear un elemento de carta HTML
export function createCardElement(card, isFaceDown = false, isPlayable = false) {
    const cardDiv = document.createElement('div');
    // Clases base para la apariencia de una carta de baraja española
    cardDiv.classList.add(
        'card',
        'bg-white', 'border', 'border-gray-400', 'rounded-lg',
        'w-20', 'h-28', 'flex', 'flex-col', 'justify-between', 'p-1',
        'shadow-md', 'select-none', // select-none para evitar selección de texto
        'text-gray-900', // Color base para los elementos de la carta
        'relative', // Para posicionar los números correctamente
        'overflow-hidden' // Para asegurar que los números no se salgan
    );

    // Si la carta está boca abajo
    if (isFaceDown) {
        cardDiv.classList.add('bg-blue-900', 'border-blue-700', 'text-white', 'text-5xl', 'flex', 'items-center', 'justify-center', 'font-bold');
        cardDiv.textContent = '?';
    } else {
        // Colores para los palos (Negro para Espadas/Bastos, Rojo para Oros/Copas)
        let textColor = 'text-gray-900'; // Default para Espadas y Bastos
        if (card.suit === '💰' || card.suit === '🍷') { // Oros o Copas
            textColor = 'text-red-600';
        }

        // Estructura interna de la carta con número y palo en las esquinas y centro
        cardDiv.innerHTML = `
            <span class="absolute top-1 left-1 text-sm font-bold ${textColor}">${card.value}</span>
            <span class="absolute bottom-1 right-1 text-sm font-bold ${textColor} rotate-180">${card.value}</span>
            <span class="text-4xl text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${textColor}">${card.suit}</span>
        `;

        // Si la carta es jugable (mano del jugador)
        if (isPlayable) {
            cardDiv.classList.add('cursor-pointer', 'hover:scale-105', 'transform', 'transition-transform', 'duration-100', 'active:scale-95');
            cardDiv.setAttribute('data-card-playable', 'true'); // Marca para facilitar selección
        }
    }

    // Datos para la lógica del juego
    cardDiv.dataset.suit = card.suit;
    cardDiv.dataset.value = card.value;
    // Esto es importante para identificar la carta cuando se haga clic
    cardDiv.dataset.cardId = `${card.value}-${card.suit}`; 

    return cardDiv;
}

// Función para renderizar la mano del jugador
export function renderPlayerHand(hand, containerId, playable = true) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Contenedor con ID "${containerId}" no encontrado.`);
        return;
    }
    container.innerHTML = ''; // Limpiar mano anterior
    hand.forEach(card => {
        const cardElement = createCardElement(card, false, playable);
        container.appendChild(cardElement);
    });
}

// Función para renderizar la mano de la IA (boca abajo)
export function renderIAHand(numCards, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Contenedor con ID "${containerId}" no encontrado.`);
        return;
    }
    container.innerHTML = ''; // Limpiar mano anterior
    for (let i = 0; i < numCards; i++) {
        const cardElement = createCardElement({value:0, suit:''}, true, false); // Carta boca abajo, no jugable
        container.appendChild(cardElement);
    }
}

// Función para añadir un mensaje al historial/chat
export function addMessageToHistory(message, playerType = 'system') { // 'system', 'player', 'ia'
    const historyContent = document.getElementById('history-content');
    if (!historyContent) return;

    const messageElement = document.createElement('p');
    let textColorClass = 'text-gray-400'; // Default for system messages
    let playerNamePrefix = '';

    if (playerType === 'player') {
        textColorClass = 'text-green-300'; // Color para el jugador humano
        playerNamePrefix = 'VOS: ';
    } else if (playerType === 'ia') {
        textColorClass = 'text-blue-300'; // Color para la IA
        playerNamePrefix = 'YO (TrucoEstrella): ';
    }

    messageElement.classList.add(textColorClass, 'text-sm'); // Añadir clase de tamaño de texto
    messageElement.innerHTML = `<span class="font-bold">${playerNamePrefix}</span>${message}`; // Usar innerHTML para el span

    historyContent.appendChild(messageElement);

    // Hacer scroll al final
    historyContent.scrollTop = historyContent.scrollHeight;
}

// Función para actualizar los mensajes de canto en el marcador
export function updateScoreboardMessage(type, message) { // 'top' para IA, 'bottom' para jugador
    const targetElement = type === 'top' ? document.getElementById('top-message') : document.getElementById('bottom-message');
    if (targetElement) {
        targetElement.textContent = message;
        // Limpiar el mensaje después de un tiempo, si es un canto temporal
        if (message) {
            setTimeout(() => {
                targetElement.textContent = '';
            }, 3000); // Mensaje visible por 3 segundos
        }
    }
}

// Función para dibujar los fósforos del marcador
export function renderScore(score, maxPoints, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Limpiar fósforos anteriores

    // Aseguramos que los fósforos sean pequeños y estéticos
    const stickClass = 'bg-white w-0.5 h-3 rounded-sm absolute'; // Clase base para un palito
    const squareContainerClass = 'relative w-4 h-4 mr-1 mb-1 flex-shrink-0'; // Contenedor para cada cuadrado de 5

    for (let i = 0; i < score; i++) {
        // Cada 5 puntos se forma un "cuadrado"
        if (i % 5 === 0) {
            const squareDiv = document.createElement('div');
            squareDiv.className = `flex items-center justify-center ${squareContainerClass} border border-gray-600 rounded-sm`;
            container.appendChild(squareDiv);
        }
        const currentSquare = container.lastChild; // El cuadrado actual

        const stick = document.createElement('div');
        stick.className = stickClass;

        const remainder = i % 5;
        switch (remainder) {
            case 0: // Palito izquierdo
                stick.style.left = '1px';
                stick.style.top = '2px';
                break;
            case 1: // Palito superior
                stick.style.left = '2px';
                stick.style.top = '1px';
                stick.style.transform = 'rotate(90deg)';
                stick.style.transformOrigin = 'top left';
                break;
            case 2: // Palito derecho
                stick.style.right = '1px';
                stick.style.top = '2px';
                break;
            case 3: // Palito inferior
                stick.style.left = '2px';
                stick.style.bottom = '1px';
                stick.style.transform = 'rotate(90deg)';
                stick.style.transformOrigin = 'bottom left';
                break;
            case 4: // Palito cruzado (de abajo izquierda a arriba derecha)
                stick.style.width = '16px'; // Para que cruce diagonalmente
                stick.style.height = '1px'; // Delgado para la diagonal
                stick.style.left = '0px';
                stick.style.bottom = '0px';
                stick.style.transform = 'rotate(-45deg)'; // Ajuste para que cruce
                stick.style.transformOrigin = 'bottom left';
                break;
        }
        currentSquare.appendChild(stick);
    }
}

// Función para limpiar las cartas jugadas en la mesa
export function clearPlayedCards() {
    const iaPlayedCardsContainer = document.getElementById('ia-played-cards');
    const playerPlayedCardsContainer = document.getElementById('player-played-cards');
    if (iaPlayedCardsContainer) iaPlayedCardsContainer.innerHTML = '';
    if (playerPlayedCardsContainer) playerPlayedCardsContainer.innerHTML = '';
}

// Función para añadir una carta a la mesa
export function addCardToPlayedArea(card, playerType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cardElement = createCardElement(card, false, false); // No jugable una vez en mesa
    
    // Añadir clase para posicionamiento relativo a su contenedor
    cardElement.classList.add('relative', 'z-0');

    // Animación básica de entrada (opcional, puede ajustarse)
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'translateY(20px)';
    setTimeout(() => {
        cardElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        cardElement.style.opacity = '1';
        cardElement.style.transform = 'translateY(0)';
    }, 50); // Pequeño retraso para la animación

    container.appendChild(cardElement);
}