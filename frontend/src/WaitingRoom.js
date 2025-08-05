// src/WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from './App';

function WaitingRoom() {
    const { socket } = useAppContext();
    const { roomId } = useParams();
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleUpdate = (gameState) => {
            if (gameState.roomId === roomId) {
                setGame(gameState);
                setError('');
            }
        };
        const handleError = (message) => setError(message);

        socket.on('update-game-state', handleUpdate);
        socket.on('error-message', handleError);

        // Pedir el estado actual de la partida al entrar
        socket.emit('get-game-state', roomId);

        return () => {
            socket.off('update-game-state', handleUpdate);
            socket.off('error-message', handleError);
        };
    }, [roomId, socket]);

    if (error) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-red-500 font-bold">Error</h2>
                <p className="text-gray-400 mt-2">{error}</p>
                <Link to="/" className="inline-block mt-6 bg-truco-brown text-white font-bold py-2 px-6 rounded-md">Volver al Lobby</Link>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl text-truco-brown font-bold animate-pulse">Cargando sala...</h2>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold text-truco-brown">Sala de Espera: #{game.roomId}</h1>
                <p className="text-gray-400">Partida de {game.creatorName}</p>
            </header>

            <div className="bg-light-bg p-6 rounded-lg shadow-lg border border-light-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-6 border-b border-light-border pb-6">
                    <div><p className="text-gray-500 text-sm">MODO</p><p className="font-bold text-lg">{game.gameMode}</p></div>
                    <div><p className="text-gray-500 text-sm">PUNTOS</p><p className="font-bold text-lg">{game.points}</p></div>
                    <div><p className="text-gray-500 text-sm">FLOR</p><p className="font-bold text-lg">{game.flor ? 'Sí' : 'No'}</p></div>
                    <div><p className="text-gray-500 text-sm">vs. IA</p><p className="font-bold text-lg">{game.vsAI ? 'Sí' : 'No'}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-red-500 text-xl mb-3 text-center">Equipo 1</h3>
                        <ul className="space-y-2 min-h-[100px]">
                            {game.teams.A.map(p => <li key={p.id} className="text-white text-center text-lg">👤 {p.name}</li>)}
                        </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-blue-500 text-xl mb-3 text-center">Equipo 2</h3>
                         <ul className="space-y-2 min-h-[100px]">
                            {game.teams.B.map(p => <li key={p.id} className="text-white text-center text-lg">👤 {p.name}</li>)}
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                    <Link to="/" className="text-gray-400 hover:text-white">← Salir al Lobby</Link>
                    <button className="bg-truco-green text-white font-bold py-3 px-8 rounded-md hover:bg-opacity-80 transition-all text-lg">
                        ¡Empezar Partida!
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WaitingRoom;