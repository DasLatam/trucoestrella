// trucoestrella/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import GameLobby from './components/GameLobby'; // ¡Ahora importamos GameLobby!

const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com'; // ¡Confirma tu URL de Render!

function App() {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');
  const [socket, setSocket] = useState(null);
  const [currentPage, setCurrentPage] = useState('login'); // 'login' o 'gameLobby'

  // Para pasar los datos de la partida al GameLobby si se creó/unió desde el login
  const [initialGameData, setInitialGameData] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
    });

    // Cuando el servidor confirma que el jugador se unió a una sala (o la creó)
    newSocket.on('gameJoined', (data) => {
      console.log('Mensaje del servidor (gameJoined):', data);
      setInitialGameData({ // Guardar los datos para pasarlos al GameLobby
        playerName: playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode: gameMode,
        opponentType: opponentType,
        privateKey: privateKey,
        roomId: data.roomId // El ID de la sala que el backend nos da
      });
      setCurrentPage('gameLobby'); // ¡Cambiamos a la pantalla de lobby!
    });

    newSocket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      // Quedarse en la pantalla de login si hubo error
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
      setCurrentPage('login'); // Si se desconecta, volvemos a la pantalla de login
      setInitialGameData(null); // Limpiar datos de partida
    });

    return () => newSocket.disconnect();
  }, [playerName, pointsToWin, gameMode, opponentType, privateKey]); // Incluir dependencias necesarias

  const handleSubmit = (e) => {
    e.preventDefault();
    if (socket) {
      // Envía al backend para que maneje la lógica de crear/unir a sala
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
      {/* Renderizado condicional basado en el estado 'currentPage' */}
      {currentPage === 'login' && (
        <div className="app-container">
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
                {/* Agrega 3v3 cuando estemos listos */}
                {/* <option value="3v3">Tres contra tres</option> */}
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
          initialPrivateKey={initialGameData.privateKey} // Pasa la clave inicial si la hubo
        />
      )}
    </>
  );
}

export default App;