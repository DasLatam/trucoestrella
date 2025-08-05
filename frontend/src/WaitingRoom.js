// WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from './App';

function WaitingRoom() {
    const { socket, user } = useAppContext();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);

    useEffect(() => {
        socket.on('update-game-state', (gameState) => {
            setGame(gameState);
        });

        // Pedir el estado actual de la partida al entrar
        socket.emit('get-game-state', roomId);

        return () => {
            socket.off('update-game-state');
        };
    }, [roomId, socket]);

    if (!game) {
        return <div className="text-center text-2xl p-10">Cargando sala...</div>;
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold text-[#C87941]">Sala de Espera: #{game.roomId}</h1>
                <p className="text-gray-400">Partida de {game.creatorName}</p>
            </header>

            <div className="bg-[#000000] bg-opacity-30 p-6 rounded-lg shadow-lg border border-gray-700">
                <div className="grid grid-cols-2 gap-6 text-center mb-6">
                    <div><p className="text-gray-500">Modo</p><p className="font-bold text-lg">{game.gameMode}</p></div>
                    <div><p className="text-gray-500">Puntos</p><p className="font-bold text-lg">{game.points}</p></div>
                    <div><p className="text-gray-500">Flor</p><p className="font-bold text-lg">{game.flor ? 'Sí' : 'No'}</p></div>
                    <div><p className="text-gray-500">vs. IA</p><p className="font-bold text-lg">{game.vsAI ? 'Sí' : 'No'}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Equipo A */}
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                        <h3 className="font-bold text-red-500 text-xl mb-3">Equipo 1</h3>
                        <ul className="space-y-2">
                            {game.teams.A.map(p => <li key={p.id} className="text-white">👤 {p.name}</li>)}
                        </ul>
                    </div>
                    {/* Equipo B */}
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                        <h3 className="font-bold text-blue-500 text-xl mb-3">Equipo 2</h3>
                         <ul className="space-y-2">
                            {game.teams.B.map(p => <li key={p.id} className="text-white">👤 {p.name}</li>)}
                        </ul>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button className="bg-[#346751] text-white font-bold py-2 px-6 rounded-md hover:bg-opacity-80 transition-all">
                        ¡Empezar Partida!
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WaitingRoom;
