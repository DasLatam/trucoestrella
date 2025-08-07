// frontend/src/GameScreen.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

// Componente para mostrar una carta
const Card = ({ card, isFaceDown }) => {
    const cardSymbol = {
        oro: '💰',
        copa: '🍷',
        espada: '⚔️',
        basto: '🌲'
    };
    if (isFaceDown) {
        return <div className="w-24 h-36 bg-blue-800 border-2 border-blue-400 rounded-lg shadow-lg"></div>;
    }
    return (
        <div className="w-24 h-36 bg-white border-2 border-gray-300 rounded-lg shadow-lg flex flex-col justify-between p-2 text-black cursor-pointer hover:scale-105 transition-transform">
            <span className="text-xl font-bold">{card.number} {cardSymbol[card.suit]}</span>
            <span className="text-xl font-bold self-end transform rotate-180">{card.number} {cardSymbol[card.suit]}</span>
        </div>
    );
};

function GameScreen() {
    const { roomId } = useParams();
    const [gameSocket, setGameSocket] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // **CORRECCIÓN: Obtener el usuario del localStorage**
        const savedUser = localStorage.getItem('trucoUser');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }

        const gameServerUrl = sessionStorage.getItem('gameServerUrl');
        const currentGameId = sessionStorage.getItem('currentGameId');

        if (gameServerUrl && currentGameId === roomId) {
            const newSocket = io(gameServerUrl);
            setGameSocket(newSocket);

            newSocket.on('connect', () => {
                console.log(`Conectado al servidor de JUEGO en ${gameServerUrl}`);
                newSocket.emit('join-game-room', roomId);
            });
            
            newSocket.on('update-game-state', (newGameState) => {
                console.log("Estado del juego recibido:", newGameState);
                setGameState(newGameState);
            });

            return () => newSocket.disconnect();
        }
    }, [roomId]);

    if (!gameState || !user) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-truco-brown font-bold animate-pulse">Conectando a la partida...</h2>
            </div>
        );
    }
    
    const myHand = gameState.hands[user.id] || [];
    const opponents = gameState.players.filter(p => p.id !== user.id);

    return (
        <div className="w-full h-screen bg-truco-green p-4 flex flex-col">
            {/* Marcador y Oponentes (Arriba) */}
            <div className="flex justify-between items-start">
                <div className="bg-black bg-opacity-50 p-2 rounded-lg text-white">
                    <h3 className="font-bold">Equipo Truco: {gameState.scores.A}</h3>
                    <h3 className="font-bold">Equipo Estrella: {gameState.scores.B}</h3>
                </div>
                <div className="flex space-x-8">
                    {opponents.map(opp => (
                        <div key={opp.id} className="text-center">
                            <p className="text-white font-semibold">{opp.name}</p>
                            <div className="flex justify-center space-x-2 mt-1">
                                <Card isFaceDown={true} />
                                <Card isFaceDown={true} />
                                <Card isFaceDown={true} />
                            </div>
                        </div>
                    ))}
                </div>
                <Link to="/" className="bg-red-600 text-white font-bold py-2 px-4 rounded-md">Salir</Link>
            </div>

            {/* Mesa de Juego (Centro) */}
            <div className="flex-grow flex items-center justify-center">
                <div className="w-96 h-56 bg-truco-brown bg-opacity-50 rounded-full border-4 border-yellow-700">
                    {/* Aquí irán las cartas jugadas */}
                </div>
            </div>

            {/* Mi Mano y Acciones (Abajo) */}
            <div className="flex flex-col items-center">
                <p className="text-white font-bold text-lg mb-2">{user.name}</p>
                <div className="flex justify-center space-x-4 mb-4">
                    {myHand.map((card, index) => (
                        <Card key={index} card={card} />
                    ))}
                </div>
                <div className="flex space-x-4">
                    <button className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg">Jugar Carta</button>
                    <button className="bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg">Envido</button>
                    <button className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg">Truco</button>
                    <button className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg">Ir al Mazo</button>
                </div>
            </div>
        </div>
    );
}

export default GameScreen;