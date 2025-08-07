// src/WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import JoinGameModal from './components/JoinGameModal';

const CountdownTimer = ({ expiryTimestamp }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(expiryTimestamp) - +new Date();
        if (difference <= 0) return { minutes: 0, seconds: 0 };
        return {
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    useEffect(() => {
        const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearTimeout(timer);
    });
    return (
        <span className="font-mono text-2xl text-truco-brown">
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
    );
};

function WaitingRoom() {
    const { socket, user } = useAppContext();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        const handleUpdate = (gameState) => {
            if (gameState && gameState.roomId === roomId) {
                setGame(gameState);
            }
        };
        const handleExpiry = (message) => {
            alert(message);
            navigate('/');
        };
        const handleError = (message) => setError(message);

        socket.on('update-game-state', handleUpdate);
        socket.on('room-expired', handleExpiry);
        socket.on('error-message', handleError);
        
        socket.emit('get-game-state', roomId);

        return () => {
            socket.off('update-game-state', handleUpdate);
            socket.off('room-expired', handleExpiry);
            socket.off('error-message', handleError);
        };
    }, [roomId, socket, navigate]);

    const handleCloseRoom = () => {
        if (window.confirm('¿Estás seguro de que quieres cerrar esta sala para todos?')) {
            socket.emit('close-room', { roomId, userId: user.id });
        }
    };
    
    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

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
                    <div><p className="text-gray-500 text-sm">⚔️ MODO</p><p className="font-bold text-lg">{game.gameMode}</p></div>
                    <div><p className="text-gray-500 text-sm">🏆 PUNTOS</p><p className="font-bold text-lg">{game.points}</p></div>
                    <div><p className="text-gray-500 text-sm">🌺 FLOR</p><p className="font-bold text-lg">{game.flor ? 'Sí' : 'No'}</p></div>
                    <div><p className="text-gray-500 text-sm">🤖 vs. IA</p><p className="font-bold text-lg">{game.vsAI ? 'Sí' : 'No'}</p></div>
                </div>
                
                <div className="mb-6 space-y-4">
                    <div className="text-center">
                        <label className="block text-gray-400 mb-2">Compartir enlace de la sala:</label>
                        <div className="flex justify-center">
                            <input type="text" readOnly value={window.location.href} className="w-full max-w-sm p-2 bg-gray-800 rounded-l-md border border-gray-700 text-gray-400"/>
                            <button onClick={() => copyToClipboard(window.location.href, 'link')} className="bg-truco-brown text-white font-bold px-4 rounded-r-md">
                                {copied === 'link' ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>
                    {game.password && (
                        <div className="text-center">
                            <label className="block text-gray-400 mb-2">Clave de Partida Privada:</label>
                            <div className="flex justify-center">
                                <p className="font-mono text-xl bg-gray-800 px-4 py-2 rounded-l-md border border-gray-700">{game.password}</p>
                                <button onClick={() => copyToClipboard(game.password, 'key')} className="bg-truco-brown text-white font-bold px-4 rounded-r-md">
                                    {copied === 'key' ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

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