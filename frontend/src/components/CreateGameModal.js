// src/components/CreateGameModal.js
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
    isPrivate: false, // Nueva opción
  });
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

  const inputStyle = "w-full p-3 bg-gray-700 rounded-md mt-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-truco-brown transition-all text-white";
  const labelStyle = "block text-sm font-medium text-gray-400";
  const checkboxLabelStyle = "flex items-center justify-between bg-gray-800 p-4 rounded-md";
  const checkboxStyle = "h-6 w-6 rounded text-truco-green bg-gray-600 border-gray-500 focus:ring-truco-green";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-light-bg p-8 rounded-xl shadow-2xl w-full max-w-lg border border-light-border">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Crear Nueva Partida</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="space-y-6">
            <div>
                <label className={labelStyle}>Modo de Juego</label>
                <select value={options.gameMode} onChange={e => setOptions({...options, gameMode: e.target.value})} className={inputStyle}>
                    <option value="1v1">1 vs 1</option>
                    <option value="2v2">2 vs 2</option>
                    <option value="3v3">3 vs 3</option>
                </select>
            </div>
             <div>
                <label className={labelStyle}>Puntos para ganar</label>
                <select value={options.points} onChange={e => setOptions({...options, points: parseInt(e.target.value)})} className={inputStyle}>
                    <option value={15}>15 Puntos (Partida corta)</option>
                    <option value={30}>30 Puntos (Partida completa)</option>
                </select>
            </div>
            <div className="space-y-3">
                <div className={checkboxLabelStyle}>
                    <label className="text-gray-300 font-medium">Jugar con flor</label>
                    <input type="checkbox" checked={options.flor} onChange={e => setOptions({...options, flor: e.target.checked})} className={checkboxStyle}/>
                </div>
                <div className={checkboxLabelStyle}>
                    <label className="text-gray-300 font-medium">Partida Privada (solo con link)</label>
                    <input type="checkbox" checked={options.isPrivate} onChange={e => setOptions({...options, isPrivate: e.target.checked})} className={checkboxStyle}/>
                </div>
                <div className={checkboxLabelStyle}>
                    <label className="text-gray-300 font-medium">Jugar con IA</label>
                    <input type="checkbox" checked={options.vsAI} onChange={e => setOptions({...options, vsAI: e.target.checked})} className={checkboxStyle}/>
                </div>
            </div>
        </div>
        <div className="flex justify-end space-x-4 mt-8">
          <button onClick={onClose} className="py-2 px-6 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-all">Cancelar</button>
          <button onClick={handleCreate} className="py-2 px-6 rounded-md bg-truco-green hover:bg-opacity-90 text-white font-bold shadow-lg transition-all">Crear</button>
        </div>
      </div>
    </div>
  );
}
