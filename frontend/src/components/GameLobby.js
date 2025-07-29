// trucoestrella/frontend/src/components/GameLobby.js
import React, { useState, useEffect } from 'react';
import './GameLobby.css';

function GameLobby({ socket, playerName, gameMode, pointsToWin, opponentType, initialPrivateKey, initialRoomId }) { // Agrega initialRoomId
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // La sala a la que el jugador está unido/creó

  useEffect(() => {
    if (!socket) return;

    // Si venimos de crear/unirnos a una sala, establecerla como la currentRoom
    if (initialRoomId && !currentRoom) {
        // Pedimos los detalles de nuestra sala al servidor si es necesario, o la construimos
        // Por ahora, asumimos que el backend enviará un roomUpdate para nuestra sala al conectar
        console.log("Intentando inicializar currentRoom con:", initialRoomId);
    }

    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      // Filtrar para no mostrar la propia sala si ya estoy unido y es privada
      setAvailableRooms(rooms.filter(room => !(currentRoom && room.id === currentRoom.id && room.privateKey)));
    });

    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala recibida en GameLobby:', roomData);
      setCurrentRoom(roomData);
      // Actualizar también la lista de disponibles, para que la sala actual no aparezca
      setAvailableRooms(prevRooms => prevRooms.filter(room => room.id !== roomData.id));
    });

    // Evento que se dispara si la partida inicia desde el backend
    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message); // Por ahora un alert
      // Aquí iría la lógica para pasar a la pantalla de juego
      // setCurrentPage('game'); // Por ejemplo
    });

    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null); // Asegurarse de que no estamos en una sala si hubo error
    });

    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null); // Volver a la pantalla de lista de salas
      socket.emit('requestAvailableRooms'); // Solicitar la lista actualizada
    });

    // Cuando el componente GameLobby se monta, pedimos la lista de salas disponibles
    // y el estado de nuestra sala si es que ya estamos en una.
    socket.emit('requestAvailableRooms'); // Asegurarse de tener la lista inicial

    return () => {
      socket.off('availableRooms');
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('joinError');
      socket.off('roomAbandoned');
    };
  }, [socket, initialRoomId, currentRoom]); // Agregar currentRoom a las dependencias

  // Resto del componente (handleJoinRoom, handleLeaveRoom, renderizado condicional)
  // ... (Mantén el resto del código como está)
  const handleJoinRoom = (roomIdToJoin, key = null) => {
    if (socket) {
      socket.emit('joinGame', {
        playerName, // Usamos el playerName actual del estado
        pointsToWin: pointsToWin, // Usamos los puntos actuales del estado (mejor tomar de la sala real)
        gameMode: gameMode, // Usamos el modo actual del estado (mejor tomar de la sala real)
        opponentType: 'users',
        privateKey: key || null, // Asegurarse de que sea null si no hay clave
      });
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leaveRoom');
      setCurrentRoom(null); // Resetea el estado local para volver a la lista
    }
  };

  if (currentRoom && currentRoom.status === 'waiting' && currentRoom.opponentType === 'users') {
    const creatorName = currentRoom.players[0]?.name || 'Creador';
    const linkCompartir = `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}`;

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
      return (
          <div className="game-lobby-container ai-game">
              <h1>Truco Estrella</h1>
              <h2>Partida contra IA</h2>
              <p>Iniciando partida **{gameMode}** a **{pointsToWin}** puntos contra la IA Truco Estrella...</p>
              <div className="loading-spinner"></div>
          </div>
      );
  } else {
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
        <button onClick={() => window.location.reload()} className="back-to-login">Crear Nueva Partida</button>
      </div>
    );
  }
}

export default GameLobby;