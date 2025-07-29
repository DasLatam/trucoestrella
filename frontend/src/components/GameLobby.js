// trucoestrella/frontend/src/components/GameLobby.js
import React, { useState, useEffect } from 'react';
import './GameLobby.css'; // Usaremos los mismos estilos

function GameLobby({ socket }) { // Ahora solo recibe el socket
  // Estado para los campos del formulario de creación/unión
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');

  // Estados para la lógica de la sala
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // La sala a la que el jugador está unido/creó

  useEffect(() => {
    if (!socket) return;

    // Escuchar la lista de salas disponibles
    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      // Filtrar para no mostrar la propia sala si ya estoy unido
      setAvailableRooms(rooms.filter(room => !(currentRoom && room.id === currentRoom.id)));
    });

    // Escuchar actualizaciones de mi sala (si ya estoy en una)
    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala recibida en GameLobby:', roomData);
      setCurrentRoom(roomData);
      // Actualizar también la lista de disponibles, para que la sala actual no aparezca
      setAvailableRooms(prevRooms => prevRooms.filter(room => room.id !== roomData.id));
    });

    // Escuchar cuando una partida inicia
    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message); // Por ahora un alert, luego pasaremos a la pantalla de juego
      setCurrentRoom(gameData); // Asegurarnos de que el currentRoom refleja la partida iniciada
    });

    // Escuchar errores al unirse
    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null); // Si hubo un error, no estamos en ninguna sala
    });

    // Escuchar si la sala fue abandonada o eliminada
    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null); // Si la sala se abandona/elimina, no estamos en ninguna sala
      socket.emit('requestAvailableRooms'); // Solicitar la lista actualizada
    });

    // Al montar el componente, solicitar la lista de salas disponibles
    socket.emit('requestAvailableRooms');

    return () => {
      socket.off('availableRooms');
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('joinError');
      socket.off('roomAbandoned');
    };
  }, [socket, currentRoom]); // currentRoom se añade para que el filtro de rooms funcione al actualizar

  const handleCreateOrJoinFromForm = (e) => {
    e.preventDefault();
    if (socket) {
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null,
      });
      console.log('Enviando datos al servidor para crear/unirse desde formulario:', {
        playerName, pointsToWin, gameMode, opponentType, privateKey
      });
    }
  };

  const handleJoinRoomFromList = (roomIdToJoin, keyRequired) => {
    if (socket) {
      let key = null;
      if (keyRequired) {
        key = prompt('Esta sala es privada. Ingresa la clave:');
        if (!key) return; // Si el usuario cancela
      }
      socket.emit('joinGame', {
        playerName, // Usamos el nombre actual del jugador
        pointsToWin: null, // No se necesita, la sala ya tiene estos datos
        gameMode: null,    // No se necesita
        opponentType: 'users', // Siempre 'users' al unirse a una lista
        privateKey: key || roomIdToJoin, // Usamos el ID o la clave ingresada
      });
      console.log(`Intentando unirse a sala ${roomIdToJoin} con clave: ${key}`);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leaveRoom');
      setCurrentRoom(null); // Resetea el estado local para volver a la lista
    }
  };

  // --- Renderizado Condicional del Lobby ---
  // Si el jugador está en una sala esperando o la partida de IA se inició
  if (currentRoom && (currentRoom.status === 'waiting' || currentRoom.opponentType === 'ai' || currentRoom.status === 'playing')) {
    const creatorName = currentRoom.players[0]?.name || 'Creador';
    const linkCompartir = `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}`;

    return (
      <div className="game-lobby-container my-room">
        <h1>Truco Estrella</h1>
        {currentRoom.opponentType === 'ai' ? (
          <h2>Partida contra IA: {currentRoom.id}</h2>
        ) : (
          <h2>Mi Sala: {currentRoom.id} {currentRoom.privateKey ? '(Privada)' : '(Pública)'}</h2>
        )}
        
        <p>Hola **{playerName}**!</p>

        {currentRoom.opponentType === 'ai' ? (
            <p>Iniciando partida **{currentRoom.gameMode}** a **{currentRoom.pointsToWin}** puntos contra la IA Truco Estrella...</p>
        ) : (
            <>
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
                {currentRoom.status === 'waiting' && (
                    <>
                        <p>Esperando más jugadores... ¡Por favor, comparte el enlace!</p>
                        <div className="share-link-container">
                        <input type="text" value={linkCompartir} readOnly />
                        <button onClick={() => navigator.clipboard.writeText(linkCompartir)}>Copiar Link</button>
                        </div>
                    </>
                )}
            </>
        )}
        
        {currentRoom.status === 'waiting' && currentRoom.opponentType !== 'ai' && (
             <button onClick={handleLeaveRoom} className="leave-button">Abandonar Sala</button>
        )}
        {currentRoom.status === 'playing' && <p>¡La partida ha comenzado!</p>}
      </div>
    );
  } else {
    // Vista de "Crear Partida" y "Salas Disponibles"
    return (
      <div className="game-lobby-container main-lobby">
        <h1>Truco Estrella</h1>

        {/* Sección para Crear Partida */}
        <div className="create-game-section">
          <h2>Crear Partida</h2>
          <form onSubmit={handleCreateOrJoinFromForm} className="entry-form">
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
            <button type="submit">¡Crear Partida!</button>
          </form>
        </div>

        {/* Sección de Salas Disponibles */}
        <div className="available-rooms-section">
          <h2>Salas Disponibles</h2>
          {availableRooms.length === 0 ? (
            <p>No hay partidas creadas en este momento.</p>
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
                  <button onClick={() => handleJoinRoomFromList(room.id, room.privateKey)}>
                    Unirme
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default GameLobby;