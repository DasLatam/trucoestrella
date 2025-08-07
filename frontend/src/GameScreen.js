// src/GameScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import { io } from 'socket.io-client';

// --- COMPONENTES INTERNOS ---
const Card = ({ card, onClick }) => {
    const cardSymbol = { oro: '💰', copa: '🍷', espada: '⚔️', basto: '🌲' };
    return (
        <div onClick={onClick} className="w-20 h-28 bg-white border-2 border-gray-300 rounded-lg shadow-lg flex flex-col justify-between p-1 text-black cursor-pointer hover:scale-110 hover:-translate-y-2 transition-transform">
            <span className="text-lg font-bold">{card.number} {cardSymbol[card.suit]}</span>
            <span className="text-lg font-bold self-end transform rotate-180">{card.number} {cardSymbol[card.suit]}</span>
        </div>
    );
};

const PlayerSpot = ({ player, position, isTurn }) => (
    <div className={`absolute ${position} text-center`}>
        <div className={`p-2 rounded-lg ${isTurn ? 'bg-yellow-500 shadow-lg' : 'bg-black bg-opacity-50'}`}>
            <p className="font-bold text-white">{player.name}</p>
            <p className="text-sm text-gray-400">{player.team === 'A' ? 'Equipo Truco' : 'Equipo Estrella'}</p>
        </div>
    </div>
);

const InGameChat = ({ messages, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };
    return (
        <div className="absolute bottom-4 left-4 w-80 h-1/2 bg-black bg-opacity-60 rounded-lg p-2 flex flex-col">
            <div className="flex-grow overflow-y-auto text-sm p-1">
                {messages.map(msg => (
                    <div key={msg.id}>
                        {msg.type === 'log' ? (
                            <p className="text-green-400 italic">» {msg.text}</p>
                        ) : (
                            <p><span style={{color: msg.color}} className="font-bold">{msg.sender}:</span> {msg.text}</p>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSend} className="flex mt-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-grow bg-gray-700 p-2 rounded-l-md text-xs"/>
                <button type="submit" className="bg-truco-brown text-white font-bold px-3 rounded-r-md text-xs">Enviar</button>
            </form>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PANTALLA DE JUEGO ---
function GameScreen() {
    const { user } = useAppContext();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [gameSocket, setGameSocket] = useState(null);
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        const gameServerUrl = sessionStorage.getItem('gameServerUrl');
        if (gameServerUrl) {
            const newSocket = io(gameServerUrl);
            setGameSocket(newSocket);
            newSocket.on('connect', () => {
                newSocket.emit('join-game-room', { roomId, userId: user.id });
            });
            newSocket.on('update-game-state', (state) => setGameState(state));
            return () => newSocket.disconnect();
        } else {
            navigate('/'); // Si no hay URL, volver al lobby
        }
    }, [roomId, user.id, navigate]);

    const handleSendMessage = (text) => {
        gameSocket.emit('send-game-message', {
            roomId,
            message: { sender: user.name, text, color: user.color }
        });
    };

    const playerPositions = useMemo(() => {
        if (!gameState) return {};
        const positions = {};
        const myIndex = gameState.players.findIndex(p => p.id === user.id);
        const totalPlayers = gameState.players.length;

        gameState.players.forEach((player, index) => {
            const relativeIndex = (index - myIndex + totalPlayers) % totalPlayers;
            if (totalPlayers === 2) { // 1 vs 1
                if (relativeIndex === 1) positions[player.id] = 'top-1/2 -translate-y-1/2 left-4'; // Oponente
            }
            if (totalPlayers === 4) { // 2 vs 2
                if (relativeIndex === 1) positions[player.id] = 'top-1/2 -translate-y-1/2 left-4'; // Izquierda
                if (relativeIndex === 2) positions[player.id] = 'top-4 left-1/2 -translate-x-1/2'; // Compañero (arriba)
                if (relativeIndex === 3) positions[player.id] = 'top-1/2 -translate-y-1/2 right-4'; // Derecha
            }
            // Lógica para 3v3 se puede añadir aquí
        });
        return positions;
    }, [gameState, user.id]);

    if (!gameState) {
        return <div className="text-center p-10"><h2 className="text-2xl text-truco-brown font-bold animate-pulse">Conectando a la partida...</h2></div>;
    }

    const myHand = gameState.hands[user.id] || [];

    return (
        <div className="w-full h-screen bg-truco-green p-4 flex flex-col relative overflow-hidden">
            {/* Jugadores */}
            {gameState.players.filter(p => p.id !== user.id).map(player => (
                <PlayerSpot key={player.id} player={player} position={playerPositions[player.id]} isTurn={gameState.turn === player.id} />
            ))}
            
            {/* Mesa Central */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-[40vw] h-[30vh] bg-truco-brown bg-opacity-50 rounded-full border-4 border-yellow-700 flex items-center justify-center space-x-4">
                    {/* Cartas jugadas en la mesa */}
                </div>
            </div>

            {/* Mi Posición y Cartas */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <div className="flex justify-center space-x-4 mb-4">
                    {myHand.map((card) => <Card key={card.id} card={card} />)}
                </div>
                <div className={`p-2 rounded-lg ${gameState.turn === user.id ? 'bg-yellow-500 shadow-lg' : 'bg-black bg-opacity-50'}`}>
                    <p className="font-bold text-white">{user.name} (Tú)</p>
                </div>
            </div>

            {/* Botonera de Acciones */}
            <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                <button className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg disabled:bg-gray-500">Envido</button>
                <button className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg disabled:bg-gray-500">Truco</button>
                <button className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg">Ir al Mazo</button>
            </div>

            {/* Chat de Partida */}
            <InGameChat messages={gameState.chat} onSendMessage={handleSendMessage} />
        </div>
    );
}

export default GameScreen;