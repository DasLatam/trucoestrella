// src/WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';

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
    const { socket, user, currentGame, setCurrentGame } = useAppContext();
    const { roomId } = useParams();
    const navigate = useNavigate();
    
    useEffect(() => {
        const handleExpiry = () => {
            alert("La sala de espera ha expirado.");
            navigate('/');
        };
        socket.on('room-expired', handleExpiry);
        
        if (!currentGame || currentGame.roomId !== roomId) {
            socket.emit('get-game-state', roomId);
        }
        
        return () => {
            socket.off('room-expired', handleExpiry);
        };
    }, [roomId, socket, navigate, currentGame]);

    if (!currentGame || currentGame.roomId !== roomId) {
        return (
            <div className="text-center p-10"><h2 className="text-2xl text-truco-brown font-bold animate-pulse">Cargando sala...</h2></div>
        );
    }

    const isHost = currentGame.hostId === user.id;
    const canStart = isHost && currentGame.status === 'ready';

    return (
        <div className="container mx-auto p-4 max-w-4xl">
             <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-truco-brown">Sala: #{currentGame.roomId}</h1>
                    <p className="text-gray-400">Partida de {currentGame.creatorName}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400">La sala expira en</p>
                    <CountdownTimer expiryTimestamp={currentGame.expiresAt} />
                </div>
            </header>
            <div className="bg-light-bg p-6 rounded-lg shadow-lg border border-light-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-red-500 text-xl mb-3 text-center">Equipo 1</h3>
                        <ul className="space-y-2 min-h-[100px]">
                            {currentGame.teams.A.map(p => <li key={p.id} className="text-white text-center text-lg">{p.isAI ? '🤖' : '👤'} {p.name}</li>)}
                        </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-blue-500 text-xl mb-3 text-center">Equipo 2</h3>
                         <ul className="space-y-2 min-h-[100px]">
                            {currentGame.teams.B.map(p => <li key={p.id} className="text-white text-center text-lg">{p.isAI ? '🤖' : '👤'} {p.name}</li>)}
                        </ul>
                    </div>
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