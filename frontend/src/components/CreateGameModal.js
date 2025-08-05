// /components/CreateGameModal.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';

export function CreateGameModal({ onClose }) {
  const { socket, user } = useAppContext();
  const navigate = useNavigate();
  
  const [options, setOptions] = useState({
    points: 30,
    flor: true,
    gameMode: '2v2',
    vsAI: false,
    password: ''
  });

  const handleCreate = () => {
    const gameOptions = { ...options, creatorName: user.name };
    socket.emit('create-game', gameOptions, (response) => {
      if (response.success) {
        navigate(`/sala/${response.roomId}`);
      } else {
        alert(response.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-white">Crear Nueva Partida</h2>
        {/* Aquí irían los inputs y selects para las opciones */}
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-400">Modo de Juego</label>
                <select value={options.gameMode} onChange={e => setOptions({...options, gameMode: e.target.value})} className="w-full p-2 bg-gray-700 rounded-md mt-1">
                    <option>1v1</option>
                    <option>2v2</option>
                    <option>3v3</option>
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-400">Puntos</label>
                <select value={options.points} onChange={e => setOptions({...options, points: parseInt(e.target.value)})} className="w-full p-2 bg-gray-700 rounded-md mt-1">
                    <option>15</option>
                    <option>30</option>
                </select>
            </div>
            <div className="flex items-center justify-between">
                <label className="text-gray-400">Jugar con flor</label>
                <input type="checkbox" checked={options.flor} onChange={e => setOptions({...options, flor: e.target.checked})} className="h-6 w-6 rounded"/>
            </div>
        </div>
        <div className="flex justify-end space-x-4 mt-8">
          <button onClick={onClose} className="py-2 px-4 rounded-md bg-gray-600 hover:bg-gray-500">Cancelar</button>
          <button onClick={handleCreate} className="py-2 px-4 rounded-md bg-[#346751] text-white font-bold">Crear</button>
        </div>
      </div>
    </div>
  );
}