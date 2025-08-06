// src/WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';
import { JoinGameModal } from './components/JoinGameModal';

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
                {/* ... (resto del JSX sin cambios) ... */}
            </div>
        </div>
    );
}
export default WaitingRoom;