// src/Lobby.js
import React, { useState, useEffect } from 'react';
import { useAppContext } from './App';
import CreateGameModal from './components/CreateGameModal';
import PublicChat from './components/PublicChat';
import JoinGameModal from './components/JoinGameModal';

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
        <span className="font-mono bg-gray-700 px-2 py-1 rounded">
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
    );
};

function Lobby() {
  const { availableGames, isConnected, user } = useAppContext();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [joiningGame, setJoiningGame] = useState(null);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-truco-brown">Truco Estrella</h1>
          <div className="text-right">
              <p className="font-semibold text-white">Bienvenido, {user.name}</p>
              <p className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? '● Conectado' : '● Desconectado'}
              </p>
          </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-light-bg p-6 rounded-lg shadow-lg border border-light-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-300">Partidas Disponibles</h2>
            <button onClick={() => setCreateModalOpen(true)} className="bg-truco-green text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-all">
                + Crear Partida
            </button>
          </div>
          <div className="space-y-3 pr-2 overflow-y-auto h-[65vh]">
            {availableGames.length > 0 ? availableGames.map(game => (
              <div key={game.roomId} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center border border-gray-700 hover:border-truco-brown transition-all">
                <div>
                  <p className="font-bold text-lg text-white">Partida de {game.creatorName}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-1 items-center">
                    <span>⚔️ {game.gameMode}</span>
                    <span>🏆 {game.points} Pts</span>
                    <span>{game.flor ? '🌺 Con Flor' : '🚫 Sin Flor'}</span>
                    {game.vsAI && <span title="Contra la IA">🤖 con IA</span>}
                    {game.password && <span title="Partida Privada">🔒 Privada</span>}
                  </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end mb-2">
                        <span className="text-sm mr-2 text-gray-300 font-bold">{game.players.length}/{game.maxPlayers}</span>
                        <button onClick={() => setJoiningGame(game)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
                          Unirse
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">Expira en <CountdownTimer expiryTimestamp={game.expiresAt} /></p>
                </div>
              </div>
            )) : (
                <div className="text-center flex items-center justify-center h-full text-gray-500">
                    <div><p>No hay partidas disponibles.</p><p>¡Crea una para empezar a jugar!</p></div>
                </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-1"><PublicChat /></div>
      </div>
      {isCreateModalOpen && <CreateGameModal onClose={() => setCreateModalOpen(false)} />}
      {joiningGame && <JoinGameModal game={joiningGame} onClose={() => setJoiningGame(null)} />}
    </div>
  );
}
export default Lobby;