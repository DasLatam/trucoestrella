// src/GameScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import { io } from 'socket.io-client';

// --- COMPONENTES VISUALES ---
const Card = ({ card, onClick, isPlayable }) => {
    const cardSymbol = { oro: '💰', copa: '🍷', espada: '⚔️', basto: '🌲' };
    return (
        <div 
            onClick={onClick} 
            className={`w-24 h-36 bg-white border-2 border-gray-300 rounded-lg shadow-xl flex flex-col justify-between p-2 text-black transition-all duration-200 ${isPlayable ? 'cursor-pointer hover:scale-110 hover:-translate-y-4' : 'opacity-60'}`}
        >
            <span className="text-2xl font-bold">{card.number} {cardSymbol[card.suit]}</span>
            <span className="text-2xl font-bold self-end transform rotate-180">{card.number} {cardSymbol[card.suit]}</span>
        </div>
    );
};

const CardPlaceholder = () => (
    <div className="w-20 h-28 bg-blue-900 border-2 border-blue-500 rounded-lg shadow-lg" />
);

const PlayerUI = ({ player, cardsCount, position, isTurn }) => (
    <div className={`absolute ${position} flex flex-col items-center space-y-2 transition-all duration-500 z-10`}>
        <div className="flex space-x-[-50px]">
            {Array.from({ length: cardsCount }).map((_, i) => <CardPlaceholder key={i} />)}
        </div>
        <div className={`px-4 py-1 rounded-full text-white font-bold transition-all ${isTurn ? 'bg-yellow-500 scale-110 shadow-lg' : 'bg-black bg-opacity-50'}`}>
            {player.name}
        </div>
    </div>
);

const GameChat = ({ messages, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = React.useRef(null);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };
    return (
        <div className="w-full h-full bg-light-bg flex flex-col p-2">
            <h3 className="text-lg font-semibold text-center text-gray-300 p-2 border-b border-light-border flex-shrink-0">Chat Mesa</h3>
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
            <form onSubmit={handleSend} className="flex p-1 mt-2 flex-shrink-0">
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
    const [chatMessages, setChatMessages] = useState([]);

    const playedCardsByRound = useMemo(() => {
        if (!gameState) return [[], [], []];
        const rounds = [[], [], []];
        const players = gameState.players;
        for(let i = 0; i < gameState.table.length; i++) {
            const roundIndex = Math.floor(i / players.length);
            if(rounds[roundIndex]) {
                rounds[roundIndex].push(gameState.table[i]);
            }
        }
        return rounds;
    }, [gameState]);

    useEffect(() => {
        const gameServerUrl = sessionStorage.getItem('gameServerUrl');
        if (gameServerUrl) {
            const newSocket = io(gameServerUrl);
            setGameSocket(newSocket);
            newSocket.on('connect', () => {
                newSocket.emit('join-game-room', { roomId, userId: user.id });
            });
            newSocket.on('update-game-state', (state) => {
                setGameState(state);
                setChatMessages(state.chat || []);
            });
            newSocket.on('new-game-message', (message) => {
                setChatMessages(prev => [...prev, message]);
            });
            return () => newSocket.disconnect();
        } else {
            navigate('/');
        }
    }, [roomId, user.id, navigate]);

    const handlePlayCard = (cardId) => {
        if (gameState && gameState.turn === user.id) {
            gameSocket.emit('play-card', { roomId, userId: user.id, cardId });
        }
    };

    const handleSendMessage = (text) => {
        if(gameSocket) {
            gameSocket.emit('send-game-message', {
                roomId,
                message: { sender: user.name, text, color: user.color }
            });
        }
    };

    if (!gameState) {
        return <div className="text-center p-10"><h2 className="text-2xl text-truco-brown font-bold animate-pulse">Conectando a la partida...</h2></div>;
    }

    const myHand = gameState.hands[user.id] || [];
    const opponents = gameState.players.filter(p => p.id !== user.id);

    return (
        <div className="w-full h-screen bg-truco-green flex overflow-hidden">
            {/* Área de Juego Principal */}
            <div className="flex-grow relative p-4 flex flex-col">
                {/* Marcador y Salir */}
                <div className="absolute top-4 left-4 z-20">
                    <div className="bg-black bg-opacity-50 p-3 rounded-lg text-white text-lg">
                        <h3 className="font-bold text-red-400">Equipo Truco: {gameState.scores.A}</h3>
                        <h3 className="font-bold text-blue-400">Equipo Estrella: {gameState.scores.B}</h3>
                    </div>
                    <Link to="/" className="bg-red-600 text-white font-bold py-2 px-4 rounded-md mt-4 inline-block">Salir</Link>
                </div>

                {/* Jugadores Oponentes */}
                {opponents.map((opp) => (
                    <PlayerUI key={opp.id} player={opp} cardsCount={gameState.hands[opp.id]?.length || 0} position="top-4 left-1/2 -translate-x-1/2" isTurn={gameState.turn === opp.id} />
                ))}

                {/* Mesa Ovalada */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vw] h-[55vh] bg-truco-brown rounded-[50%] border-8 border-yellow-800 shadow-2xl flex items-center">
                    {/* **DISEÑO MEJORADO: Slots fijos para las rondas** */}
                    <div className="w-1/3 h-full flex flex-col justify-between items-center py-12">
                        {playedCardsByRound[0].find(c => c.playedBy !== user.id) && <Card card={playedCardsByRound[0].find(c => c.playedBy !== user.id)} />}
                        {playedCardsByRound[0].find(c => c.playedBy === user.id) && <Card card={playedCardsByRound[0].find(c => c.playedBy === user.id)} />}
                    </div>
                    <div className="w-1/3 h-full flex flex-col justify-between items-center py-12">
                        {playedCardsByRound[1].find(c => c.playedBy !== user.id) && <Card card={playedCardsByRound[1].find(c => c.playedBy !== user.id)} />}
                        {playedCardsByRound[1].find(c => c.playedBy === user.id) && <Card card={playedCardsByRound[1].find(c => c.playedBy === user.id)} />}
                    </div>
                    <div className="w-1/3 h-full flex flex-col justify-between items-center py-12">
                        {playedCardsByRound[2].find(c => c.playedBy !== user.id) && <Card card={playedCardsByRound[2].find(c => c.playedBy !== user.id)} />}
                        {playedCardsByRound[2].find(c => c.playedBy === user.id) && <Card card={playedCardsByRound[2].find(c => c.playedBy === user.id)} />}
                    </div>
                </div>

                {/* Mi Área (Abajo) */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-end px-4">
                    <div className="flex-1"></div> {/* Espacio a la izquierda */}
                    
                    {/* Mi Mano */}
                    <div className="flex justify-center space-x-4 h-36">
                        {myHand.map((card) => <Card key={card.id} card={card} isPlayable={gameState.turn === user.id} onClick={() => handlePlayCard(card.id)} />)}
                    </div>

                    {/* **DISEÑO MEJORADO: Mi Nombre y Acciones a la derecha** */}
                    <div className="flex-1 flex justify-center">
                         <div className="flex flex-col items-center space-y-4">
                            <div className={`px-4 py-1 rounded-full text-white font-bold transition-all ${gameState.turn === user.id ? 'bg-yellow-500 scale-110 shadow-lg' : 'bg-black bg-opacity-50'}`}>
                                {user.name} (Tú)
                            </div>
                            <div className="flex space-x-2">
                                <button className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg disabled:bg-gray-500 text-sm">Envido</button>
                                <button className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg disabled:bg-gray-500 text-sm">Truco</button>
                                <button className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">Ir al Mazo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Área del Chat */}
            <div className="w-80 flex-shrink-0 border-l-4 border-yellow-800">
                <GameChat messages={chatMessages} onSendMessage={handleSendMessage} />
            </div>
        </div>
    );
}

export default GameScreen;