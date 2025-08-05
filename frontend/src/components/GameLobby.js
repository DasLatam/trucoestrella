// GameLobby.js
import React, { useState, useEffect } from 'react';
import { useGame } from './App';
import { socket } from './socket';

function GameLobby() {
    const { isConnected } = useGame();
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('trucoPlayerName') || '');
    const [gameMode, setGameMode] = useState('1v1');
    const [vsAI, setVsAI] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        localStorage.setItem('trucoPlayerName', playerName);
    }, [playerName]);

    const handleCreateGame = (e) => {
        e.preventDefault();
        if (!playerName.trim()) {
            setError('Por favor, ingresa tu nombre de jugador.');
            return;
        }
        if (isConnected) {
            console.log("FRONTEND: Emitiendo 'create-game'...");
            socket.emit('create-game', { playerName, gameMode, vsAI }, (response) => {
                console.log('FRONTEND: Acuse de recibo del servidor:', response);
            });
        } else {
            setError('Conectando al servidor...');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Crear Partida</h2>
            {error && <div className="bg-red-500 text-white p-3 rounded-md mb-4">{error}</div>}
            <form onSubmit={handleCreateGame}>
                {/* ... tu JSX para los inputs y select ... */}
                 <div className="mb-4">
                    <label htmlFor="playerName" className="block text-gray-300 mb-2">Tu Nombre</label>
                    <input type="text" id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 mb-2">Modo de Juego</label>
                    <select value={gameMode} onChange={(e) => setGameMode(e.target.value)} className="w-full p-3 bg-gray-700 rounded-md border border-gray-600">
                        <option value="1v1">1 vs 1</option><option value="2v2">2 vs 2</option><option value="3v3">3 vs 3</option>
                    </select>
                </div>
                <div className="mb-6"><label className="flex items-center"><input type="checkbox" checked={vsAI} onChange={(e) => setVsAI(e.target.checked)} className="form-checkbox h-5 w-5 text-yellow-500" /><span className="ml-3">Jugar contra la IA</span></label></div>
                <button type="submit" disabled={!isConnected} className={`w-full font-bold py-3 px-4 rounded-md ${!isConnected ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                    {isConnected ? 'Crear Sala' : 'Conectando...'}
                </button>
            </form>
        </div>
    );
}
export default GameLobby;
