// src/GameScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import { io } from 'socket.io-client';

// --- COMPONENTES VISUALES ---
const Card = ({ card, onClick, isPlayable }) => { /* ... (código sin cambios) ... */ };
const CardPlaceholder = () => { /* ... (código sin cambios) ... */ };
const PlayerUI = ({ player, cardsCount, position, isTurn }) => { /* ... (código sin cambios) ... */ };
const GameChat = ({ messages, onSendMessage }) => { /* ... (código sin cambios) ... */ };

const TrucoChantNotification = ({ chant, onResponse }) => {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 p-8 rounded-xl shadow-2xl z-20 text-center">
            <p className="text-3xl font-bold text-yellow-400 mb-6">El oponente ha cantado ¡TRUCO!</p>
            <div className="flex space-x-4">
                <button onClick={() => onResponse('quiero')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-xl">QUIERO</button>
                <button onClick={() => onResponse('no-quiero')} className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg text-xl">NO QUIERO</button>
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

    const handleSendMessage = (text) => { /* ... (código sin cambios) ... */ };

    const handleChantTruco = () => {
        gameSocket.emit('chant-truco', { roomId, userId: user.id });
    };

    const handleRespondTruco = (response) => {
        gameSocket.emit('respond-truco', { roomId, userId: user.id, response });
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

                {opponents.map((opp) => (
                    <PlayerUI key={opp.id} player={opp} cardsCount={gameState.hands[opp.id]?.length || 0} position="top-4 left-1/2 -translate-x-1/2" isTurn={gameState.turn === opp.id} />
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
                
                {isMyTurnToRespond && <TrucoChantNotification onResponse={handleRespondTruco} />}

                <div className="absolute bottom-4 left-0 right-0 flex justify-between items-end px-4">
                    <div className="w-1/3 flex justify-center">
                        <div className="flex flex-col items-center space-y-2">
                            <div className="flex space-x-2">
                                <button className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg disabled:bg-gray-500 text-sm">Envido</button>
                                <button onClick={handleChantTruco} disabled={!isMyTurnToPlay} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg disabled:bg-gray-500 text-sm">Truco</button>
                            </div>
                            <button className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm w-full">Ir al Mazo</button>
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