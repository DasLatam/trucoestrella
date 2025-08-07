// src/WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import JoinGameModal from './components/JoinGameModal';

const CountdownTimer = ({ expiryTimestamp }) => { /* ... (código sin cambios) ... */ };

function WaitingRoom() {
    const { socket, user } = useAppContext();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleUpdate = (gameState) => {
            if (gameState && gameState.roomId === roomId) setGame(gameState);
        };
        const handleError = (message) => setError(message);
        const handleExpiry = (message) => {
            alert(message);
            navigate('/');
        };

        socket.on('update-game-state', handleUpdate);
        socket.on('error-message', handleError);
        socket.on('room-expired', handleExpiry);
        
        socket.emit('get-game-state', roomId);

        return () => {
            socket.off('update-game-state', handleUpdate);
            socket.off('error-message', handleError);
            socket.off('room-expired', handleExpiry);
        };
    }, [roomId, socket, navigate]);

    // **LÓGICA DE AUTO-JOIN**
    useEffect(() => {
        if (game && !game.players.some(p => p.id === user.id) && !game.password) {
            socket.emit('join-room', { roomId, playerName: user.name });
        }
    }, [game, user, roomId, socket]);

    if (!game) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-truco-brown font-bold animate-pulse">Cargando sala...</h2>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        );
    }

    const isPlayerInGame = game.players.some(p => p.id === user.id);
    if (!isPlayerInGame) {
        return <JoinGameModal game={game} onClose={() => navigate('/')} />;
    }

    const handleSwitchTeam = () => {
        socket.emit('switch-team', { roomId });
    };

    const isHost = game.hostId === user.id;
    const canStart = isHost && game.status === 'ready';

    return (
        <div className="container mx-auto p-4 max-w-4xl">
             <header className="flex justify-between items-center mb-6">
                {/* ... (header sin cambios) ... */}
            </header>
            <div className="bg-light-bg p-6 rounded-lg shadow-lg border border-light-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-red-500 text-xl mb-3 text-center">Equipo Truco</h3>
                        <ul className="space-y-2 min-h-[100px]">
                            {game.teams.A.map(p => <li key={p.id} className="text-white text-center text-lg">{p.isAI ? '🤖' : '👤'} {p.name}</li>)}
                        </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-blue-500 text-xl mb-3 text-center">Equipo Estrella</h3>
                         <ul className="space-y-2 min-h-[100px]">
                            {game.teams.B.map(p => <li key={p.id} className="text-white text-center text-lg">{p.isAI ? '🤖' : '👤'} {p.name}</li>)}
                        </ul>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <button onClick={handleSwitchTeam} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
                        Cambiar de Equipo
                    </button>
                </div>
                <div className="mt-8 flex justify-between items-center">
                    <Link to="/" className="text-gray-400 hover:text-white">← Salir al Lobby</Link>
                    <button disabled={!canStart}
                        className={`font-bold py-3 px-8 rounded-md text-lg transition-all ${canStart ? 'bg-truco-green text-white hover:bg-opacity-80' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
                        {isHost ? (canStart ? '¡Empezar Partida!' : 'Esperando jugadores...') : 'Esperando al host...'}
                    </button>
                </div>
            </div>
        </div>
    );
}
export default WaitingRoom;