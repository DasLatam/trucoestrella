import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import GameLobby from './components/GameLobby';

const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com'; // ¡Confirma tu URL de Render!

function App() {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');
  const [socket, setSocket] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [initialGameData, setInitialGameData] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
    });

    // Este evento se dispara cuando el backend confirma que te uniste/creaste una sala (PvP)
    newSocket.on('roomUpdate', (roomData) => {
      console.log('Actualización de sala recibida en App.js (roomUpdate):', roomData);
      setInitialGameData({
        playerName: playerName,
        pointsToWin: roomData.pointsToWin,
        gameMode: roomData.gameMode,
        opponentType: roomData.opponentType,
        privateKey: roomData.privateKey,
        roomId: roomData.id
      });
      setCurrentPage('gameLobby'); // Cambia a la pantalla de lobby
    });

    // Este evento se dispara cuando una partida se inicia (ej. AI o PvP llena)
    newSocket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      setInitialGameData({ // También guardamos los datos para GameLobby
        playerName: playerName,
        pointsToWin: gameData.pointsToWin || pointsToWin, // Puede venir o no del gameData
        gameMode: gameData.gameMode || gameMode,
        opponentType: gameData.opponentType || 'ai', // Si viene de gameStarted, es IA o PvP iniciado
        privateKey: gameData.privateKey || privateKey,
        roomId: gameData.roomId
      });
      setCurrentPage('gameLobby'); // ¡Cambiamos a la pantalla de lobby para ambos casos!
    });

    newSocket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentPage('login');
      setInitialGameData(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
      setCurrentPage('login');
      setInitialGameData(null);
    });

    return () => newSocket.disconnect();
  }, [playerName, pointsToWin, gameMode, opponentType, privateKey]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (socket) {
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null,
      });
      console.log('Enviando datos al servidor para unirse/crear partida:', {
        playerName,
        pointsToWin,
        gameMode,
        opponentType,
        privateKey,
      });
    } else {
      console.error('Socket no está conectado.');
      alert('Error: No se pudo conectar al servidor. Intenta de nuevo más tarde.');
    }
  };

  return (
    <>
      {currentPage === 'login' && (
        <div className="app-container">
          {/* Contenido de la pantalla de login */}
          <h1>Truco Estrella</h1>
          <form onSubmit={handleSubmit} className="entry-form">
            <label>
              Tu Nombre:
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </label>
            <label>
              Puntos para ganar:
              <select value={pointsToWin} onChange={(e) => setPointsToWin(e.target.value)}>
                <option value="15">15 Puntos</option>
                <option value="30">30 Puntos</option>
              </select>
            </label>
            <label>
              Modo de juego:
              <select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
                <option value="1v1">Uno contra uno</option>
                <option value="2v2">Dos contra dos</option>
              </select>
            </label>
            <label>
              Jugar contra:
              <select value={opponentType} onChange={(e) => setOpponentType(e.target.value)}>
                <option value="ai">IA Truco Estrella</option>
                <option value="users">Todos Usuarios</option>
              </select>
            </label>
            {opponentType === 'users' && (
              <label>
                Clave de Sala (opcional):
                <input
                  type="text"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value.toUpperCase())}
                  maxLength="6"
                  placeholder="Ej: ABC123"
                />
              </label>
            )}
            <button type="submit">¡Jugar!</button>
          </form>
        </div>
      )}

      {currentPage === 'gameLobby' && socket && initialGameData && (
        <GameLobby
          socket={socket}
          playerName={initialGameData.playerName}
          pointsToWin={initialGameData.pointsToWin}
          gameMode={initialGameData.gameMode}
          opponentType={initialGameData.opponentType}
          initialPrivateKey={initialGameData.privateKey}
          initialRoomId={initialGameData.roomId}
        />
      )}
    </>
  );
}

export default App;