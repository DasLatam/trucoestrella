// frontend/src/GameScreen.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from './App';
import { io } from 'socket.io-client';

// Componente para mostrar una carta
const Card = ({ card, isFaceDown }) => { /* ... (código sin cambios) ... */ };

function GameScreen() {
    const { user } = useAppContext();
    const { roomId } = useParams();
    const [gameSocket, setGameSocket] = useState(null);
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        const gameServerUrl = sessionStorage.getItem('gameServerUrl');
        const currentGameId = sessionStorage.getItem('currentGameId');

        if (gameServerUrl && currentGameId === roomId) {
            const newSocket = io(gameServerUrl);
            setGameSocket(newSocket);

            newSocket.on('connect', () => {
                console.log(`Conectado al servidor de JUEGO en ${gameServerUrl}`);
                newSocket.emit('join-game-room', roomId);
            });

            newSocket.on('welcome-to-game', (data) => {
                console.log('Mensaje del servidor de juego:', data.message);
                // Aquí recibiremos el estado inicial del juego (con las cartas)
            });
            
            newSocket.on('update-game-state', (newGameState) => {
                setGameState(newGameState);
            });

            return () => newSocket.disconnect();
        }
    }, [roomId]);

    if (!gameState) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-truco-brown font-bold animate-pulse">Conectando a la partida...</h2>
            </div>
        );
    }
    
    const myHand = gameState.hands[user.id] || [];

    return (
        <div className="w-full h-screen bg-truco-green p-4 flex flex-col">
            {/* ... (resto del JSX de la mesa de juego sin cambios) ... */}
        </div>
    );
}

export default GameScreen;