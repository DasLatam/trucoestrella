// src/components/CreateGameModal.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';

const OptionButton = ({ label, value, selectedValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${selectedValue === value ? 'bg-truco-brown text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
    >
        {label}
    </button>
);

export function CreateGameModal({ onClose }) {
  const { socket, user } = useAppContext();
  const navigate = useNavigate();
  const [options, setOptions] = useState({ points: 30, flor: true, gameMode: '2v2', vsAI: false, isPrivate: false });
  const [error, setError] = useState('');

  const handleCreate = () => {
    const gameOptions = { ...options, creatorName: user.name };
    socket.emit('create-game', gameOptions, (response) => {
      if (response.success) {
        onClose();
        navigate(`/sala/${response.roomId}`);
      } else {
        setError(response.message || 'No se pudo crear la partida.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-light-bg p-8 rounded-xl shadow-2xl w-full max-w-lg border border-light-border">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Crear Nueva Partida</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Modo de Juego</label>
                <div className="flex space-x-2">
                    <OptionButton label="1 vs 1" value="1v1" selectedValue={options.gameMode} onClick={(v) => setOptions({...options, gameMode: v})} />
                    <OptionButton label="2 vs 2" value="2v2" selectedValue={options.gameMode} onClick={(v) => setOptions({...options, gameMode: v})} />
                    <OptionButton label="3 vs 3" value="3v3" selectedValue={options.gameMode} onClick={(v) => setOptions({...options, gameMode: v})} />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Puntos</label>
                <div className="flex space-x-2">
                    <OptionButton label="15 Puntos" value={15} selectedValue={options.points} onClick={(v) => setOptions({...options, points: v})} />
                    <OptionButton label="30 Puntos" value={30} selectedValue={options.points} onClick={(v) => setOptions({...options, points: v})} />
                </div>
            </div>
            <div className="space-y-3">
                <OptionButton label={options.flor ? 'Con Flor 🌺' : 'Sin Flor 🚫'} value={!options.flor} selectedValue={false} onClick={(v) => setOptions({...options, flor: v})} />
                <OptionButton label={options.isPrivate ? 'Partida Privada 🔒' : 'Partida Pública 🌐'} value={!options.isPrivate} selectedValue={false} onClick={(v) => setOptions({...options, isPrivate: v})} />
                <OptionButton label={options.vsAI ? 'Con IA 🤖' : 'Sin IA 👤'} value={!options.vsAI} selectedValue={false} onClick={(v) => setOptions({...options, vsAI: v})} />
            </div>
        </div>
        <div className="flex justify-end space-x-4 mt-8">
          <button onClick={onClose} className="py-2 px-6 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancelar</button>
          <button onClick={handleCreate} className="py-2 px-6 rounded-md bg-truco-green hover:bg-opacity-90 text-white font-bold">Crear</button>
        </div>
      </div>
    </div>
  );
}
