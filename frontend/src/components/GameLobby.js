// trucoestrella/frontend/src/components/GameLobby.js
import React, { useState, useEffect } from 'react';
import './GameLobby.css'; // Crearemos este archivo CSS

function GameLobby({ socket, playerName, gameMode, pointsToWin, opponentType, initialPrivateKey }) {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // La sala a la que el jugador está unido/creó

  useEffect(() => {
    if (!socket) return;

    // Escuchar la lista de salas disponibles
    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      setAvailableRooms(rooms);
    });

    // Escuchar actualizaciones de mi sala (si ya estoy en una)
    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala:', roomData);
      setCurrentRoom(roomData);
    });

    // Escuchar cuando una partida inicia
    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message); // Por ahora un alert, luego pasaremos a la pantalla de juego
      // Aquí se navegaría a la interfaz de juego
    });

    // Escuchar errores al unirse
    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null); // Asegurarse de que no estamos en una sala
    });

    // Escuchar si la sala fue abandonada o eliminada
    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null); // Volver a la pantalla de lista de salas/login
    });

    // Cuando el componente se carga, pedimos la lista de salas (aunque el backend ya la envía al conectar)
    socket.emit('requestAvailableRooms'); // Podríamos tener un evento para esto si el backend no lo envia al conectar

    // Si el jugador ya creó una partida al entrar, enviamos la información al backend
    // Esto es para que el backend lo maneje como una creación de sala
    // Nota: La lógica de `joinGame` ya maneja la creación si `privateKey` está vacío o no existe
    if (!initialPrivateKey && opponentType === 'users') {
        socket.emit('joinGame', {
            playerName,
            pointsToWin: parseInt(pointsToWin),
            gameMode,
            opponentType,
            privateKey: initialPrivateKey,
        });
    }

    return () => {
      socket.off('availableRooms');
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('joinError');
      socket.off('roomAbandoned');
    };
  }, [socket, playerName, pointsToWin, gameMode, opponentType, initialPrivateKey]); // Dependencias para el useEffect

  const handleJoinRoom = (roomIdToJoin, key = null) => {
    if (socket) {
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin), // Esto se podría tomar de la sala, pero por ahora se re-envía
        gameMode, // Esto también
        opponentType: 'users', // Siempre 'users' al unirse a una sala listada
        privateKey: key || roomIdToJoin, // Usamos el ID de la sala como clave si no hay clave privada explícita
      });
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leaveRoom');
      setCurrentRoom(null); // Resetea el estado local
    }
  };

  // Renderizado condicional: si estoy en una sala o viendo la lista
  if (currentRoom && currentRoom.status === 'waiting' && currentRoom.opponentType === 'users') {
    // Vista de "Mi Sala de Espera"
    const creatorName = currentRoom.players[0]?.name || 'Creador';
    const linkCompartir = `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}`; // Genera el link

    return (
      <div className="game-lobby-container my-room">
        <h1>Truco Estrella</h1>
        <h2>Mi Sala: {currentRoom.id} {currentRoom.privateKey ? '(Privada)' : '(Pública)'}</h2>
        <p>Hola **{playerName}**!</p>
        <p>Has creado esta partida **{currentRoom.gameMode}** a **{currentRoom.pointsToWin}** puntos.</p>
        <p>Participantes: **{currentRoom.currentPlayers}** de **{currentRoom.maxPlayers}**</p>
        
        {currentRoom.players.length > 0 && (
          <div className="player-list">
            <h3>Jugadores en sala:</h3>
            <ul>
              {currentRoom.players.map(player => (
                <li key={player.id}>{player.name}</li>
              ))}
            </ul>
          </div>
        )}

        <p>Esperando más jugadores... ¡Por favor, comparte el enlace!</p>
        <div className="share-link-container">
          <input type="text" value={linkCompartir} readOnly />
          <button onClick={() => navigator.clipboard.writeText(linkCompartir)}>Copiar Link</button>
        </div>
        <button onClick={handleLeaveRoom} className="leave-button">Abandonar Sala</button>
      </div>
    );
  } else if (opponentType === 'ai') {
      // Vista para partida contra IA (directo a juego, por ahora un mensaje)
      return (
          <div className="game-lobby-container ai-game">
              <h1>Truco Estrella</h1>
              <h2>Partida contra IA</h2>
              <p>Iniciando partida **{gameMode}** a **{pointsToWin}** puntos contra la IA Truco Estrella...</p>
              <div className="loading-spinner"></div>
              {/* Aquí luego se renderizará el componente de juego */}
          </div>
      );
  } else {
    // Vista de "Lista de Salas Disponibles"
    return (
      <div className="game-lobby-container available-rooms">
        <h1>Truco Estrella</h1>
        <h2>Salas Disponibles</h2>
        {availableRooms.length === 0 ? (
          <p>No hay partidas disponibles en este momento. ¡Crea una nueva!</p>
        ) : (
          <div className="rooms-list">
            {availableRooms.map((room) => (
              <div key={room.id} className="room-item">
                <p>
                  Creador: **{room.creatorName}** - Modo: **{room.gameMode}** - Puntos: **{room.pointsToWin}**
                </p>
                <p>
                  Participantes: **{room.currentPlayers}** de **{room.maxPlayers}** {room.privateKey && '(Privada)'}
                </p>
                {room.timeRemaining > 0 && (
                  <p className="time-remaining">Tiempo restante: {Math.ceil(room.timeRemaining / 60000)} min</p>
                )}
                <button onClick={() => handleJoinRoom(room.id, room.privateKey ? prompt('Ingresa la clave de la sala:') : null)}>
                  Unirme
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Aquí podríamos añadir un botón para volver al login y crear una nueva */}
        <button onClick={() => window.location.reload()} className="back-to-login">Crear Nueva Partida</button>
      </div>
    );
  }
}

export default GameLobby;