// src/components/JoinGameModal.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';

export function JoinGameModal({ game, onClose }) {
    const { socket, user } = useAppContext();
    const navigate = useNavigate();
    const [selectedTeam, setSelectedTeam] = useState('A');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleJoin = () => {
        // Limpiar errores anteriores
        setError('');

        socket.emit('join-room', { 
            roomId: game.roomId, 
            playerName: user.name, 
            team: selectedTeam, 
            password 
        }, (response) => {
            if (response.success) {
                onClose();
                // La navegación se maneja en WaitingRoom, aquí solo cerramos el modal
            } else {
                setError(response.message);
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-light-bg p-8 rounded-xl shadow-2xl w-full max-w-lg border border-light-border">
                <h2 className="text-2xl font-bold mb-2 text-center text-white">Unirse a la Partida</h2>
                <p className="text-center text-gray-400 mb-6">de {game.creatorName}</p>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                
                {game.password && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400">Clave de la Partida</label>
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-800 rounded-md border border-light-border focus:outline-none focus:ring-2 focus:ring-truco-brown mt-1"
                            placeholder="Ingresa la clave..."
                        />
                    </div>
                )}

                <p className="text-center text-gray-400 mb-2">Elige tu equipo:</p>
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border-2 cursor-pointer ${selectedTeam === 'A' ? 'border-red-500' : 'border-gray-700'}`} onClick={() => setSelectedTeam('A')}>
                        <h3 className="font-bold text-red-500 text-lg mb-2">Equipo 1</h3>
                        <ul className="text-sm text-gray-300 min-h-[50px]">{game.teams.A.map(p => <li key={p.id}>- {p.name}</li>)}</ul>
                    </div>
                    <div className={`p-4 rounded-lg border-2 cursor-pointer ${selectedTeam === 'B' ? 'border-blue-500' : 'border-gray-700'}`} onClick={() => setSelectedTeam('B')}>
                        <h3 className="font-bold text-blue-500 text-lg mb-2">Equipo 2</h3>
                        <ul className="text-sm text-gray-300 min-h-[50px]">{game.teams.B.map(p => <li key={p.id}>- {p.name}</li>)}</ul>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="py-2 px-6 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancelar</button>
                    <button onClick={handleJoin} className="py-2 px-6 rounded-md bg-truco-green hover:bg-opacity-90 text-white font-bold">Unirse</button>
                </div>
            </div>
        </div>
    );
}