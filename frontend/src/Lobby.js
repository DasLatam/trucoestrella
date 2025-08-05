// Lobby.js
import React, { useState } from 'react';
import { useAppContext } from './App';
import { CreateGameModal } from './components/CreateGameModal';
import { PublicChat } from './components/PublicChat';

function Lobby() {
  const { availableGames, isConnected } = useAppContext();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-[#C87941]">Truco Estrella</h1>
        <div className="text-right">
            <p className="font-semibold">Bienvenido, Cacho</p>
            <p className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? '● Conectado' : '● Desconectado'}
            </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna de Partidas */}
        <div className="lg:col-span-2 bg-[#000000] bg-opacity-30 p-6 rounded-lg shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-300">Partidas Disponibles</h2>
            <button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#346751] text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-all duration-300 shadow-md">
                + Crear Partida
            </button>
          </div>
          <div className="space-y-3 pr-2 overflow-y-auto h-[65vh]">
            {availableGames.length > 0 ? availableGames.map(game => (
              <div key={game.roomId} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center border border-gray-600 hover:border-[#C87941] transition-all">
                <div>
                  <p className="font-bold text-lg text-white">Partida de {game.creatorName}</p>
                  <div className="flex space-x-4 text-sm text-gray-400 mt-1">
                    <span>⚔️ {game.gameMode}</span>
                    <span>🏆 {game.points} Pts</span>
                    <span>{game.flor ? '🌺 Con Flor' : '🚫 Sin Flor'}</span>
                  </div>
                </div>
                <button className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
                  Unirse
                </button>
              </div>
            )) : (
                <div className="text-center py-10 text-gray-500">
                    <p>No hay partidas disponibles.</p>
                    <p>¡Crea una para empezar a jugar!</p>
                </div>
            )}
          </div>
        </div>

        {/* Columna de Chat */}
        <div className="lg:col-span-1">
            <PublicChat />
        </div>
      </div>

      {isCreateModalOpen && <CreateGameModal onClose={() => setCreateModalOpen(false)} />}
    </div>
  );
}

export default Lobby;
