import React, { useState, useEffect } from 'react';
import './GameLobby.css';

function GameLobby({ socket }) {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');

  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Pedir la lista de salas disponibles apenas se conecta el socket
    // Esto es para que la lista no aparezca vacía al cargar la página
    socket.emit('requestAvailableRooms');


    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      setAvailableRooms(rooms.filter(room => !(currentRoom && room.id === currentRoom.id)));
    });

    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala recibida en GameLobby:', roomData);
      setCurrentRoom(roomData);
      setIsLoadingRoom(false);
      setAvailableRooms(prevRooms => prevRooms.filter(room => room.id !== roomData.id));
    });

    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message);
      setCurrentRoom(gameData);
      setIsLoadingRoom(false);
    });

    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null);
      setIsLoadingRoom(false);
    });

    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null);
      setIsLoadingRoom(false);
      socket.emit('requestAvailableRooms');
    });

    // Polling para la lista de salas disponibles si no estás en una sala específica
    let intervalId;
    // Solo si currentRoom es null (estamos en la vista principal del lobby)
    if (!currentRoom) {
      intervalId = setInterval(() => {
        socket.emit('requestAvailableRooms');
      }, 3000); // Poll cada 3 segundos para una actualización más rápida
    }

    return () => {
      socket.off('availableRooms');
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('joinError');
      socket.off('roomAbandoned');
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, currentRoom]); // currentRoom como dependencia para activar/desactivar el polling


  const handleCreateOrJoinFromForm = (e) => {
    e.preventDefault();
    if (socket) {
      setIsLoadingRoom(true);
      setCurrentRoom(null);
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
        if (!key) return;
      }
      setIsLoadingRoom(true);
      setCurrentRoom(null);
      socket.emit('joinGame', {
        playerName,
        pointsToWin: null,
        gameMode: null,
        opponentType: 'users',
        privateKey: key || roomIdToJoin,
      });
      console.log(`Intentando unirse a sala ${roomIdToJoin} con clave: ${key}`);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      setIsLoadingRoom(true);
      socket.emit('leaveRoom');
      // currentRoom se seteará a null cuando el servidor emita roomAbandoned o disconnect
      // setIsLoadingRoom(false); // Quitar cargando (puede quitarse si el server envía roomAbandoned)
    }
  };

  // --- Renderizado Condicional del Lobby ---

  if (isLoadingRoom) {
    return (
      <div className="game-lobby-container loading-screen">
        <h1>Truco Estrella</h1>
        <p>Cargando partida... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (currentRoom && (currentRoom.status === 'waiting' || currentRoom.opponentType === 'ai' || currentRoom.status === 'playing')) {
    // CAMBIO CRÍTICO PARA EL LINK: Asegurarse de que currentRoom y currentRoom.id existen
    const linkCompartir = currentRoom.id ? `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}` : '';

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

                {/* Mostrar el link solo si el ID de la sala existe y está en estado de espera */}
                {currentRoom.status === 'waiting' && currentRoom.id && (
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
    return (
      <div className="game-lobby-container main-lobby-grid">
        <h1>Truco Estrella</h1>

        <div className="available-rooms-section"> {/* Mover la lista de salas a la izquierda por defecto */}
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

        <div className="create-game-section"> {/* Mover el formulario a la derecha por defecto */}
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
      </div>
    );
  }
}

export default GameLobby;