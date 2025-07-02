// js/ui.js

// Función para crear un elemento de carta HTML
export function createCardElement(card, isFaceDown = false, isPlayable = false) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add(
        'card',
        'bg-white', 'border', 'border-gray-400', 'rounded-lg',
        'w-20', 'h-28', 'flex', 'flex-col', 'justify-between', 'p-1',
        'shadow-md', 'select-none' // select-none para evitar selección de texto
    );

    if (isPlayable) {
        cardDiv.classList.add('cursor-pointer', 'hover:scale-105', 'transform', 'transition-transform', 'duration-100', 'active:scale-95');
    }

    if (isFaceDown) {
        cardDiv.classList.add('bg-blue-900', 'border-blue-700', 'text-white', 'text-5xl', 'flex', 'items-center', 'justify-center', 'font-bold');
        cardDiv.textContent = '?';
    } else {
        const textColor = (card.suit === '♠️' || card.suit === '♣️') ? 'text-gray-900' : 'text-red-600'; // Negro para espadas/bastos, Rojo para oros/copas

        cardDiv.innerHTML = `
            <span class="text-sm font-bold text-left ${textColor}">${card.value}</span>
            <span class="text-4xl text-center ${textColor}">${card.suit}</span>
            <span class="text-sm font-bold text-right rotate-180 ${textColor}">${card.value}</span>
        `;
    }

    cardDiv.dataset.suit = card.suit;
    cardDiv.dataset.value = card.value;

    return cardDiv;
}

// Función para renderizar la mano del jugador
export function renderPlayerHand(hand, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Contenedor con ID "${containerId}" no encontrado.`);
        return;
    }
    container.innerHTML = ''; // Limpiar mano anterior
    hand.forEach(card => {
        const cardElement = createCardElement(card, false, true); // Cartas del jugador son jugables
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
        const cardElement = createCardElement({value:0, suit:''}, true, false); // No hay carta real, es boca abajo, no jugable
        container.appendChild(cardElement);
    }
}

// Función para añadir un mensaje al historial/chat
export function addMessageToHistory(message, playerType = 'system') { // 'system', 'player', 'ia'
    const historyContent = document.getElementById('history-content');
    if (!historyContent) return;

    const messageElement = document.createElement('p');
    let textColorClass = 'text-gray-400'; // Default for system messages

    if (playerType === 'player') {
        textColorClass = 'text-green-300'; // Color para el jugador humano
    } else if (playerType === 'ia') {
        textColorClass = 'text-blue-300'; // Color para la IA
    }

    messageElement.classList.add(textColorClass);
    messageElement.textContent = message;
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
    const squareContainerClass = 'relative w-4 h-4 mr-1 mb-1'; // Contenedor para cada cuadrado de 5

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

    // Opcional: Mostrar línea divisoria a los 15 puntos (visual, no funcional aquí)
    // if (maxPoints === 30 && containerId.includes('player-score-matches') || containerId.includes('opponent-score-matches')) {
    //     // Esto se manejaría mejor en el HTML o con CSS de Tailwind condicional
    // }
}