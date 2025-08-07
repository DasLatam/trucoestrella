// src/GameScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import { io } from 'socket.io-client';

// --- COMPONENTES VISUALES ---

const Card = ({ card, onClick, isPlayable }) => {
    const cardSymbol = { oro: '💰', copa: '🍷', espada: '⚔️', basto: '🌲' };
    const suitColor = (suit) => {
        switch (suit) {
            case 'oro': return 'text-yellow-500';
            case 'copa': return 'text-red-500';
            case 'espada': return 'text-blue-500';
            case 'basto': return 'text-green-600';
            default: return 'text-black';
        }
    };

    return (
        <div 
            onClick={onClick} 
            className={`w-24 h-36 bg-white border-2 border-gray-300 rounded-lg shadow-xl flex flex-col justify-between p-2 text-black transition-all duration-300 ${isPlayable ? 'cursor-pointer hover:scale-110 hover:-translate-y-4' : 'opacity-50'}`}
        >
            <span className={`text-2xl font-bold ${suitColor(card.suit)}`}>{card.number} {cardSymbol[card.suit]}</span>
            <span className={`text-2xl font-bold self-end transform rotate-180 ${suitColor(card.suit)}`}>{card.number} {cardSymbol[card.suit]}</span>
        </div>
    );
};

const CardPlaceholder = () => (
    <div className="w-24 h-36 bg-blue-900 border-2 border-blue-500 rounded-lg shadow-lg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-400 rounded-full opacity-50"></div>
    </div>
);

const PlayerUI = ({ player, cardsCount, position, isTurn }) => (
    <div className={`absolute ${position} flex flex-col items-center space-y-2`}>
        <div className={`flex space-x-[-40px]`}>
            {Array.from({ length: cardsCount }).map((_, i) => <CardPlaceholder key={i} />)}
        </div>
        <div className={`px-4 py-1 rounded-full text-white font-bold transition-all ${isTurn ? 'bg-yellow-500 scale-110' : 'bg-black bg-opacity-50'}`}>
            {player.name}
        </div>
    </div>
);

const GameChat = ({ messages, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = React.useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="absolute top-4 right-4 w-80 h-[calc(100vh-2rem)] bg-light-bg rounded-lg shadow-2xl border border-light-border flex flex-col p-2">
            <h3 className="text-lg font-semibold text-center text-gray-300 p-2 border-b border-light-border">Chat Mesa</h3>
            <div className="flex-grow p-2 overflow-y-auto">
                {messages.map(msg => (
                     <div key={msg.id} className="text-sm mb-2">
                        {msg.type === 'log' ? (
                            <p className="text-green-400 italic opacity-80">» {msg.text}</p>
                        ) : (
                            <p><span style={{color: msg.color}} className="font-bold">{msg.sender}:</span> <span className="text-gray-200 break-words">{msg.text}</span></p>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSend} className="flex p-1">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-grow bg-gray-800 p-2 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-truco-brown" />
                <button type="submit" className="bg-truco-brown text-white font-bold px-4 rounded-r-md">Enviar</button>
            </form>
        </div>
    );
};

// --- PANTALLA DE JUEGO PRINCIPAL ---
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
            navigate('/');
        }
    }, [roomId, user.id, navigate]);

    if (!gameState) {
        return <div className="text-center p-10"><h2 className="text-2xl text-truco-brown font-bold animate-pulse">Conectando a la partida...</h2></div>;
    }

    const myHand = gameState.hands[user.id] || [];
    const opponents = gameState.players.filter(p => p.team !== user.team);
    const partners = gameState.players.filter(p => p.team === user.team && p.id !== user.id);

    return (
        <div className="w-full h-screen bg-truco-green p-4 flex items-center justify-center relative overflow-hidden">
            {/* Mesa Ovalada */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[50vh] bg-truco-brown rounded-[50%] border-8 border-yellow-800 shadow-2xl">
                {/* Cartas jugadas en la mesa irían aquí */}
            </div>

            {/* Jugadores */}
            {opponents.map((opp, i) => (
                <PlayerUI key={opp.id} player={opp} cardsCount={3} position="top-8 left-1/2 -translate-x-1/2" isTurn={gameState.turn === opp.id} />
            ))}

            {/* Mi Mano y Acciones */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4">
                <div className="flex justify-center space-x-4">
                    {myHand.map((card) => <Card key={card.id} card={card} isPlayable={gameState.turn === user.id} />)}
                </div>
                <div className="flex space-x-4">
                    <button className="bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg disabled:bg-gray-500">Envido</button>
                    <button className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg disabled:bg-gray-500">Truco</button>
                    <button className="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg">Ir al Mazo</button>
                </div>
            </div>

            {/* Chat de Partida */}
            <GameChat messages={gameState.chat} onSendMessage={(text) => gameSocket.emit('send-game-message', { roomId, message: { sender: user.name, text, color: user.color }})} />
        </div>
    );
}

export default GameScreen;