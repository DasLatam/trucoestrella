// WaitingRoom.js
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from './App';

function WaitingRoom() {
    const { game } = useGame();
    const { roomId } = useParams();

    if (!game || game.roomId !== roomId) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-yellow-400 animate-pulse">Cargando sala...</h2>
            </div>
        );
    }
    
    // ... El resto de tu JSX para mostrar la sala de espera ...
    const { players, maxPlayers, vsAI } = game;
    const humanPlayers = players.filter(p => !p.isAI);
    const requiredHumanPlayers = vsAI ? maxPlayers / 2 : maxPlayers;

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-2 text-center">Sala de Espera</h2>
            <p className="text-center text-gray-400 mb-6">ID: <span className="font-mono text-yellow-400">{roomId}</span></p>
            {/* ... Tu JSX para mostrar jugadores, etc. ... */}
             <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Jugadores ({humanPlayers.length}/{requiredHumanPlayers}){vsAI && ` (+ ${maxPlayers / 2} IA)`}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-800 rounded-md"><h4 className="font-bold text-red-500 mb-2">Equipo A</h4><ul>{players.filter(p => p.team === 'A').map(p => (<li key={p.id} className="flex items-center space-x-2 text-lg"><span>{p.isAI ? '🤖' : '👤'}</span><span>{p.name}</span></li>))}</ul></div>
                    <div className="p-3 bg-gray-800 rounded-md"><h4 className="font-bold text-blue-500 mb-2">Equipo B</h4><ul>{players.filter(p => p.team === 'B').map(p => (<li key={p.id} className="flex items-center space-x-2 text-lg"><span>{p.isAI ? '🤖' : '👤'}</span><span>{p.name}</span></li>))}</ul></div>
                </div>
            </div>
        </div>
    );
}

export default WaitingRoom;
