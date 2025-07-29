import React, { useState, useEffect } from 'react'; // Importa useEffect también
import io from 'socket.io-client'; // Importa socket.io-client
import './App.css';

// *** Define la URL de tu backend aquí ***
// Por ahora, usamos localhost. ¡Luego la cambiaremos a la de tu servidor desplegado!
const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com'; // Asegúrate de que coincida con el puerto de tu backend

function App() {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');
  const [socket, setSocket] = useState(null); // Estado para guardar la conexión del socket

  // Efecto para inicializar la conexión de Socket.IO
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // Escuchar eventos del servidor (para depuración inicial)
    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
    });

    newSocket.on('gameJoined', (data) => {
      console.log('Mensaje del servidor (gameJoined):', data);
      alert(data.message); // Muestra el mensaje de bienvenida del servidor
      // Aquí podríamos navegar a la sala de espera
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
    });

    // Limpiar la conexión cuando el componente se desmonte
    return () => newSocket.disconnect();
  }, []); // Se ejecuta solo una vez al montar el componente

  const handleSubmit = (e) => {
    e.preventDefault();
    if (socket) {
      // Emitir el evento 'joinGame' al servidor con los datos del formulario
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin), // Convertir a número
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null, // Solo enviar si es 'users'
      });
      console.log('Enviando datos al servidor:', {
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
  );
}

export default App;