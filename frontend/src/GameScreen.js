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
        <div className={`px-4 py-1 rounded-full text-white font-bold transition-all ${isTurn ? 'bg-yellow-500 scale-110 shadow-lg' : 'bg-black bg-opacity-50'}`}>
            {player.name}
        </div>
        <div className="flex space-x-[-50px]">
            {Array.from({ length: cardsCount }).map((_, i) => <CardPlaceholder key={i} />)}
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
        <div className="absolute top-4 right-4 w-80 h-[calc(100vh-2rem)] bg-light-bg rounded-lg shadow-2xl border border-light-border flex flex-col p-2">
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

const ChantNotification = ({ trucoState, onResponse }) => {
    const chantLevel = trucoState.level;
    const chantText = chantLevel === 2 ? "TRUCO" : chantLevel === 3 ? "RETRUCO" : "VALE CUATRO";

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 p-8 rounded-xl shadow-2xl z-20 text-center">
            <p className="text-3xl font-bold text-yellow-400 mb-6">¡El oponente cantó {chantText}!</p>
            <div className="flex space-x-4">
                <button onClick={() => onResponse('quiero')} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg">QUIERO</button>
                {chantLevel === 2 && <button onClick={() => onResponse('retruco')} className="bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg">RETRUCO</button>}
                {chantLevel === 3 && <button onClick={() => onResponse('vale-cuatro')} className="bg-red-800 text-white font-bold py-3 px-6 rounded-lg text-lg">VALE CUATRO</button>}
                <button onClick={() => onResponse('no-quiero')} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg">NO QUIERO</button>
            </div>
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
        if (gameState && gameState.turn === user.id && !gameState.truco.responseTurn) {
            gameSocket.emit('play-card', { roomId, userId: user.id, cardId });
        }
    };

    const handleChant = (chant) => {
        gameSocket.emit('chant', { roomId, userId: user.id, chant });
    };

    const handleResponse = (response) => {
        gameSocket.emit('respond-chant', { roomId, userId: user.id, response });
    };

    const handleGoToMazo = () => {
        if (window.confirm('¿Estás seguro de que quieres irte al mazo?')) {
            gameSocket.emit('go-to-mazo', { roomId, userId: user.id });
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

    const playedCardsByRound = useMemo(() => {
        const rounds = { 1: [], 2: [], 3: [] };
        if (gameState) {
            gameState.table.forEach(card => {
                if(rounds[card.round]) rounds[card.round].push(card);
            });
        }
        return rounds;
    }, [gameState]);

    if (!gameState) {
        return <div className="text-center p-10"><h2 className="text-2xl text-truco-brown font-bold animate-pulse">Conectando a la partida...</h2></div>;
    }

    const myHand = gameState.hands[user.id] || [];
    const opponents = gameState.players.filter(p => p.id !== user.id);
    const teamAPlayers = gameState.teams.A.map(p => p.name).join(' y ');
    const teamBPlayers = gameState.teams.B.map(p => p.name).join(' y ');

    const isMyTurnToPlay = gameState.turn === user.id && !gameState.truco.responseTurn;
    const isMyTurnToRespond = gameState.truco.responseTurn === user.id;
    const canChantTruco = gameState.truco.level === 1;
    const canChantRetruco = gameState.truco.level === 2 && gameState.truco.lastChanter === user.id;
    const canChantValeCuatro = gameState.truco.level === 3 && gameState.truco.lastChanter === user.id;

    return (
        <div className="w-full h-screen bg-truco-green flex overflow-hidden">
            <div className="flex-grow relative p-4 flex flex-col">
                <div className="absolute top-4 left-4 z-20">
                    <div className="bg-black bg-opacity-50 p-3 rounded-lg text-white text-base w-56">
                        <h3 className="font-bold text-red-400 truncate">{teamAPlayers}: {gameState.scores.A}</h3>
                        <h3 className="font-bold text-blue-400 truncate">{teamBPlayers}: {gameState.scores.B}</h3>
                    </div>
                    <Link to="/" className="bg-red-600 text-white font-bold py-2 px-4 rounded-md mt-4 inline-block">Abandonar</Link>
                </div>

                {/* **LA CORRECCIÓN: Se cambia la posición del oponente a la esquina superior derecha** */}
                {opponents.map((opp) => (
                    <PlayerUI key={opp.id} player={opp} cardsCount={gameState.hands[opp.id]?.length || 0} position="top-4 right-4" isTurn={gameState.turn === opp.id} />
                ))}

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vw] h-[55vh] bg-truco-brown rounded-[50%] border-8 border-yellow-800 shadow-2xl flex justify-around items-center px-10">
                    {[1, 2, 3].map(roundNum => (
                        <div key={roundNum} className="flex flex-col justify-between h-full py-10">
                            <div>
                                {playedCardsByRound[roundNum].find(c => c.playedBy !== user.id) && <Card card={playedCardsByRound[roundNum].find(c => c.playedBy !== user.id)} />}
                            </div>
                            <div>
                                {playedCardsByRound[roundNum].find(c => c.playedBy === user.id) && <Card card={playedCardsByRound[roundNum].find(c => c.playedBy === user.id)} />}
                            </div>
                        </div>
                    ))}
                </div>
                
                {isMyTurnToRespond && <ChantNotification trucoState={gameState.truco} onResponse={handleResponse} />}

                <div className="absolute bottom-4 left-0 right-0 flex justify-between items-end px-4">
                    <div className="w-1/3 flex justify-center">
                        <div className="flex flex-col items-center space-y-2">
                            {isMyTurnToPlay && (
                                <div className="flex space-x-2">
                                    {canChantTruco && <button onClick={() => handleChant('truco')} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">TRUCO</button>}
                                    {canChantRetruco && <button onClick={() => handleChant('retruco')} className="bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">RETRUCO</button>}
                                    {canChantValeCuatro && <button onClick={() => handleChant('vale-cuatro')} className="bg-red-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">VALE CUATRO</button>}
                                </div>
                            )}
                            <button onClick={handleGoToMazo} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm w-full">Ir al Mazo</button>
                        </div>
                    </div>
                    
                    <div className="flex justify-center space-x-4 h-36">
                        {myHand.map((card) => <Card key={card.id} card={card} isPlayable={isMyTurnToPlay} onClick={() => handlePlayCard(card.id)} />)}
                    </div>

                    <div className="w-1/3 flex justify-center">
                         <div className={`px-4 py-1 rounded-full text-white font-bold transition-all ${gameState.turn === user.id ? 'bg-yellow-500 scale-110 shadow-lg' : 'bg-black bg-opacity-50'}`}>
                            {user.name} (Tú)
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-80 flex-shrink-0 border-l-4 border-yellow-800">
                <GameChat messages={chatMessages} onSendMessage={handleSendMessage} />
            </div>
        </div>
    );
}

export default GameScreen;