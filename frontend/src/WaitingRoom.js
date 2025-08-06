// src/WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import { JoinGameModal } from './components/JoinGameModal';

const CountdownTimer = ({ expiryTimestamp }) => { /* ... (código sin cambios) ... */ };

function WaitingRoom() {
    const { socket, user } = useAppContext();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const [needsToJoin, setNeedsToJoin] = useState(false);

    useEffect(() => {
        const handleUpdate = (gameState) => {
            if (gameState && gameState.roomId === roomId) {
                setGame(gameState);
                // Si el usuario no está en la lista de jugadores, necesita unirse
                if (!gameState.players.some(p => p.id === user.id)) {
                    setNeedsToJoin(true);
                }
            }
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
    }, [roomId, socket, navigate, user.id]);

    const handleCloseRoom = () => {
        if (window.confirm('¿Estás seguro de que quieres cerrar esta sala para todos?')) {
            socket.emit('close-room', { roomId, userId: user.id });
        }
    };

    if (!game) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-truco-brown font-bold animate-pulse">Cargando sala...</h2>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        );
    }
    
    if (needsToJoin) {
        return <JoinGameModal game={game} onClose={() => navigate('/')} />;
    }

    const isHost = game.hostId === user.id;
    const canStart = isHost && game.status === 'ready';

    return (
        <div className="container mx-auto p-4 max-w-4xl">
             <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-truco-brown">Sala: #{game.roomId}</h1>
                    <p className="text-gray-400">Partida de {game.creatorName}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400">La sala expira en</p>
                    <CountdownTimer expiryTimestamp={game.expiresAt} />
                </div>
            </header>
            <div className="bg-light-bg p-6 rounded-lg shadow-lg border border-light-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6 border-b border-light-border pb-6">
                    <div><p className="text-gray-500 text-sm">MODO</p><p className="font-bold text-lg">{game.gameMode}</p></div>
                    <div><p className="text-gray-500 text-sm">PUNTOS</p><p className="font-bold text-lg">{game.points}</p></div>
                    <div><p className="text-gray-500 text-sm">FLOR</p><p className="font-bold text-lg">{game.flor ? 'Sí' : 'No'}</p></div>
                    <div><p className="text-gray-500 text-sm">vs. IA</p><p className="font-bold text-lg">{game.vsAI ? 'Sí' : 'No'}</p></div>
                </div>
                {game.password && ( /* ... (JSX sin cambios) ... */ )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ... (JSX de equipos sin cambios) ... */}
                </div>
                <div className="mt-8 flex justify-between items-center">
                    <Link to="/" className="text-gray-400 hover:text-white">← Salir al Lobby</Link>
                    <div>
                        {isHost && (
                            <button onClick={handleCloseRoom} className="text-red-500 hover:text-red-400 font-semibold mr-4">Cerrar Sala</button>
                        )}
                        <button disabled={!canStart}
                            className={`font-bold py-3 px-8 rounded-md text-lg transition-all ${canStart ? 'bg-truco-green text-white hover:bg-opacity-80' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
                            {isHost ? (canStart ? '¡Empezar Partida!' : 'Esperando jugadores...') : 'Esperando al host...'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default WaitingRoom;