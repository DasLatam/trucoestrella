import React, { useState, useEffect } from 'react';
import './GameLobby.css'; // Asegúrate de que este CSS esté actualizado también

function GameLobby({ socket }) {
  // Estado para los campos del formulario de creación/unión
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');

  // Estados para la lógica de la sala
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // La sala a la que el jugador está unido/creó
  const [isLoading, setIsLoading] = useState(false); // Estado general de carga para operaciones

  // Nuevo estado para el log/chat
  const [chatLog, setChatLog] = useState([]);

  // useEffect para manejar eventos del socket
  useEffect(() => {
    if (!socket) return;

    // Pedir la lista de salas disponibles al conectar, para evitar pantalla vacía
    socket.emit('requestAvailableRooms');

    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      setAvailableRooms(rooms.filter(room => !(currentRoom && room.id === currentRoom.id)));
    });

    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala recibida en GameLobby:', roomData);
      setCurrentRoom(roomData);
      setIsLoading(false); // Terminar la carga
      setAvailableRooms(prevRooms => prevRooms.filter(room => room.id !== roomData.id)); // Filtra la propia sala
      addLogMessage(`[Sala ${roomData.roomId}] ${roomData.message}`); // Agregar a log
    });

    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message); // Por ahora un alert
      setCurrentRoom(gameData); // Asegurarnos de que el currentRoom refleja la partida iniciada
      setIsLoading(false); // Terminar la carga
      addLogMessage(`[Sala ${gameData.roomId}] ${gameData.message}`); // Agregar a log
      // Aquí se navegaría a la interfaz de juego real
    });

    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null); // Si hubo un error, no estamos en ninguna sala
      setIsLoading(false); // Terminar la carga
      addLogMessage(`[Error] ${error.message}`); // Agregar a log
    });

    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null); // Si la sala se abandona/elimina, no estamos en ninguna sala
      setIsLoading(false); // Terminar la carga
      addLogMessage(`[Sistema] ${data.message}`); // Agregar a log
      socket.emit('requestAvailableRooms'); // Solicitar la lista actualizada
    });

    // Polling para la lista de salas disponibles si no estás en una sala específica
    let intervalId;
    if (!currentRoom) { // Solo si no estamos en una sala activa
      intervalId = setInterval(() => {
        socket.emit('requestAvailableRooms');
      }, 3000); // Poll cada 3 segundos
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

  // Función para añadir mensajes al log
  const addLogMessage = (message) => {
    setChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString()} - ${message}`];
      // Mantener un número limitado de mensajes para evitar que crezca demasiado
      return newLog.slice(-50); // Mantiene los últimos 50 mensajes
    });
  };


  const handleCreateOrJoinFromForm = (e) => {
    e.preventDefault();
    if (socket) {
      setIsLoading(true); // Iniciar el efecto de carga
      setCurrentRoom(null); // Limpiar cualquier sala anterior para una transición limpia
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null,
      });
      addLogMessage(`Intentando crear/unirse como ${playerName}...`);
    }
  };

  const handleJoinRoomFromList = (roomData, keyRequired) => { // Recibe roomData completa
    if (socket) {
      let key = null;
      if (keyRequired) {
        key = prompt('Esta sala es privada. Ingresa la clave:');
        if (!key) {
            setIsLoading(false); // Si cancela, detener carga
            return; // Si el usuario cancela, no hacemos nada
        }
      }
      setIsLoading(true); // Iniciar el efecto de carga
      setCurrentRoom(null); // Limpiar cualquier sala anterior
      socket.emit('joinGame', {
        playerName,
        pointsToWin: roomData.pointsToWin, // Usar los puntos de la sala
        gameMode: roomData.gameMode,    // Usar el modo de la sala
        opponentType: 'users',
        privateKey: key || roomData.id, // Usamos el ID o la clave ingresada
      });
      addLogMessage(`Intentando unirse a sala ${roomData.id} como ${playerName}...`);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      setIsLoading(true); // Muestra cargando al abandonar
      socket.emit('leaveRoom');
      addLogMessage(`Abandonando sala ${currentRoom.id}...`);
      // setCurrentRoom(null) y setIsLoading(false) se harán cuando reciba roomAbandoned/disconnect
    }
  };

  // --- Renderizado Principal del Lobby ---

  // Vista de carga
  if (isLoading) {
    return (
      <div className="game-lobby-container loading-screen">
        <h1>Truco Estrella</h1>
        <p>Cargando partida... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Vista de "Mi Sala" (cuando el jugador está dentro de una sala)
  if (currentRoom && (currentRoom.status === 'waiting' || currentRoom.opponentType === 'ai' || currentRoom.status === 'playing')) {
    const linkCompartir = currentRoom.id ? `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}` : '';

    return (
      <div className="game-lobby-container my-room-view"> {/* Nueva clase para esta vista */}
        <div className="header-row">
            <h1>Truco Estrella</h1>
        </div>
        <div className="main-content-row">
            <div className="my-room-details">
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

                        {currentRoom.status === 'waiting' && currentRoom.id && ( /* Mostrar link solo si ID existe y sala esperando */
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
                {currentRoom.status === 'playing' && <p className="game-started-message">¡La partida ha comenzado!</p>}
            </div>
            <div className="chat-log-box"> {/* Caja del chat/log */}
                <h2>Registro de Eventos</h2>
                <div className="chat-messages">
                    {chatLog.map((msg, index) => (
                        <p key={index}>{msg}</p>
                    ))}
                </div>
                {/* Aquí iría el input para chatear si lo implementamos más adelante */}
            </div>
        </div>
      </div>
    );
  } else {
    // Vista del Lobby Principal (Crear Partida y Salas Disponibles + Chat)
    return (
      <div className="game-lobby-container main-lobby-grid-layout"> {/* Nuevo grid para el lobby principal */}
        <div className="header-row grid-full-width"> {/* Ocupa todo el ancho de la primera fila */}
            <h1>Truco Estrella</h1>
        </div>

        <div className="available-rooms-section grid-col-left"> {/* Columna izquierda */}
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
                  <button onClick={() => handleJoinRoomFromList(room, room.privateKey)}> {/* Pasa room completa */}
                    Unirme
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="create-game-section grid-col-middle"> {/* Columna central */}
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

        <div className="chat-log-box grid-col-right"> {/* Columna derecha */}
            <h2>Registro de Eventos</h2>
            <div className="chat-messages">
                {chatLog.map((msg, index) => (
                    <p key={index}>{msg}</p>
                ))}
            </div>
            {/* Aquí iría el input para chatear si lo implementamos más adelante */}
        </div>
      </div>
    );
  }
}

export default GameLobby;