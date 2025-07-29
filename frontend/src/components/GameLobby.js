import React, { useState, useEffect, useRef } from 'react';
import './GameLobby.css';

function GameLobby({ socket }) {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');
  const [playWithFlor, setPlayWithFlor] = useState('no'); // Nuevo estado para "Flor"

  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [chatLog, setChatLog] = useState([]); // Log para el chat de la sala
  const [publicChatLog, setPublicChatLog] = useState([]); // Log para el chat público
  const chatMessagesEndRef = useRef(null); // Ref para hacer scroll automático en chat de sala
  const publicChatMessagesEndRef = useRef(null); // Ref para hacer scroll automático en chat público

  // useEffect para manejar eventos del socket
  useEffect(() => {
    if (!socket) return;

    // Pedir la lista de salas disponibles al conectar
    socket.emit('requestAvailableRooms');

    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      // Filtra la propia sala si el currentRoom está definido (para evitar mostrarla si ya estoy unido)
      setAvailableRooms(rooms.filter(room => !(currentRoom && room.id === currentRoom.id)));
    });

    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala recibida en GameLobby:', roomData);
      setCurrentRoom(roomData);
      setIsLoading(false); // Terminar la carga
      // Filtra la propia sala de la lista de disponibles
      setAvailableRooms(prevRooms => prevRooms.filter(room => !(roomData && room.id === roomData.id)));
      addRoomLogMessage(`[Sala ${roomData.roomId}] ${roomData.message}`); // Agregar a log de sala
    });

    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message);
      setCurrentRoom(gameData);
      setIsLoading(false);
      addRoomLogMessage(`[Sala ${gameData.roomId}] ${gameData.message}`); // Agregar a log de sala
    });

    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null); // Si hubo un error, no estamos en ninguna sala
      setIsLoading(false);
      setChatLog([]); // Limpiar log de sala si hubo un error al unirse/crear
      addPublicLogMessage(`[Error] ${error.message}`); // Agrega el error al chat público
    });

    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null); // Si la sala se abandona/elimina, no estamos en ninguna sala
      setIsLoading(false);
      setChatLog([]); // Limpiar log de sala
      addPublicLogMessage(`[Sistema] ${data.message}`); // Agrega a log público
      socket.emit('requestAvailableRooms'); // Solicitar la lista actualizada
    });

    // Recibir mensajes de chat de la SALA (privado)
    socket.on('chatMessage', (message) => {
      addRoomLogMessage(`${message.senderName}: ${message.text}`);
    });

    // Recibir mensajes de chat del LOBBY (público)
    socket.on('publicChatMessage', (message) => {
      addPublicLogMessage(`${message.senderName}: ${message.text}`);
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
      socket.off('chatMessage');
      socket.off('publicChatMessage');
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, currentRoom]); // currentRoom como dependencia para re-evaluar el polling

  // useEffect para hacer scroll automático en el chat de sala
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog]);

  // useEffect para hacer scroll automático en el chat público
  useEffect(() => {
    if (publicChatMessagesEndRef.current) {
      publicChatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [publicChatLog]);


  // Función para añadir mensajes al log de la sala
  const addRoomLogMessage = (message) => {
    setChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString('es-AR')} - ${message}`];
      return newLog.slice(-50); // Mantener solo los últimos 50 mensajes
    });
  };

  // Función para añadir mensajes al log público
  const addPublicLogMessage = (message) => {
    setPublicChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString('es-AR')} - ${message}`];
      return newLog.slice(-50); // Mantener solo los últimos 50 mensajes
    });
  };

  // Estado para el input de chat
  const [chatInput, setChatInput] = useState('');

  // Función para enviar mensaje de chat
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (socket && chatInput.trim()) {
      socket.emit('sendMessage', {
        senderName: playerName, // Se obtiene del estado local de GameLobby
        text: chatInput.trim()
      });
      setChatInput(''); // Limpiar el input
    }
  };


  const handleCreateOrJoinFromForm = (e) => {
    e.preventDefault();
    if (socket) {
      setIsLoading(true);
      setCurrentRoom(null); // Limpiar cualquier sala anterior para una transición limpia
      setChatLog([]); // Limpiar log de sala al intentar unirse/crear
      addPublicLogMessage(`Intentando crear/unirse como ${playerName}...`);
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null,
        playWithFlor: playWithFlor === 'si', // Enviar como booleano
      });
    }
  };

  const handleJoinRoomFromList = (roomData) => { // Eliminado 'keyRequired' ya que roomData.privateKey lo indica
    if (socket) {
      let key = null;
      if (roomData.privateKey) { // Usamos roomData.privateKey directamente para determinar si pide clave
        key = prompt('Esta sala es privada. Ingresa la clave:');
        if (!key) {
            setIsLoading(false);
            return;
        }
      }
      setIsLoading(true);
      setCurrentRoom(null);
      setChatLog([]); // Limpiar log de sala al intentar unirse
      addPublicLogMessage(`Intentando unirse a sala ${roomData.id} como ${playerName}...`);
      socket.emit('joinGame', {
        playerName, // Usamos el nombre actual del jugador
        pointsToWin: roomData.pointsToWin, // Usar los puntos de la sala
        gameMode: roomData.gameMode,    // Usar el modo de la sala
        opponentType: roomData.opponentType, // El tipo de oponente de la sala existente
        privateKey: key || roomData.id, // Usamos el ID o la clave ingresada
        playWithFlor: roomData.playWithFlor, // Usar la opción de Flor de la sala
      });
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      setIsLoading(true);
      socket.emit('leaveRoom');
      addRoomLogMessage(`Abandonando sala ${currentRoom.id}...`); // Agrega al log de sala
      setChatLog([]); // Limpiar el log de sala inmediatamente al abandonar
      // currentRoom se seteará a null cuando el servidor emita roomAbandoned o disconnect
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

  // Vista de "Mi Sala" (cuando el jugador está dentro de una sala específica)
  if (currentRoom && (currentRoom.status === 'waiting' || currentRoom.opponentType === 'ai' || currentRoom.status === 'playing')) {
    // Generar link solo si la sala es de usuarios y está esperando, O si es IA esperando compañeros
    const showShareLink = (currentRoom.status === 'waiting' && currentRoom.opponentType === 'users' && currentRoom.id) ||
                         (currentRoom.status === 'waiting' && currentRoom.opponentType === 'ai' && currentRoom.humanPlayersNeeded > 1);
    const linkCompartir = showShareLink ? `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}` : '';

    // Determinar participantes mostrados para IA vs PvP
    const displayCurrentPlayers = currentRoom.opponentType === 'ai' ? currentRoom.currentHumanPlayers : currentRoom.currentPlayers;
    const displayMaxPlayers = currentRoom.opponentType === 'ai' ? currentRoom.humanPlayersNeeded : currentRoom.maxPlayers;

    return (
      <div className="game-lobby-container my-room-view">
        <div className="header-row grid-full-width">
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
                <p>Puntos para ganar: **{currentRoom.pointsToWin}** - Se juega con Flor: **{currentRoom.playWithFlor ? 'Sí' : 'No'}**</p>


                {currentRoom.opponentType === 'ai' ? (
                    currentRoom.status === 'playing' ? (
                        <p>Partida **{currentRoom.gameMode}** contra la IA Truco Estrella ha comenzado!</p>
                    ) : (
                        <>
                            <p>Has creado una partida **{currentRoom.gameMode}** contra la IA Truco Estrella.</p>
                            <p>Participantes en tu equipo: **{displayCurrentPlayers}** de **{displayMaxPlayers}**</p>
                            {displayCurrentPlayers < displayMaxPlayers && <p>Esperando compañeros para tu equipo...</p>}
                        </>
                    )
                ) : ( // Lógica para partidas PvP (users)
                    <>
                        <p>Has creado esta partida **{currentRoom.gameMode}**.</p>
                        <p>Participantes: **{displayCurrentPlayers}** de **{displayMaxPlayers}**</p>
                        
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

                        {/* Mostrar el link solo si showShareLink es true */}
                        {showShareLink && (
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
                
                {/* Botón de Abandonar Sala: visible si está en estado 'waiting' (PvP o IA esperando) */}
                {currentRoom.status === 'waiting' && (
                     <button onClick={handleLeaveRoom} className="leave-button">Abandonar Sala</button>
                )}
                {currentRoom.status === 'playing' && <p className="game-started-message">¡La partida ha comenzado!</p>}
            </div>
            <div className="chat-log-box">
                <h2>Chat de Sala</h2>
                <div className="chat-messages">
                    {chatLog.map((msg, index) => (
                        <p key={index}>{msg}</p>
                    ))}
                    <div ref={chatMessagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="chat-input-form">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        disabled={!socket}
                    />
                    <button type="submit" disabled={!socket}>Enviar</button>
                </form>
            </div>
        </div>
      </div>
    );
  } else {
    // Vista del Lobby Principal
    return (
      <div className="game-lobby-container main-lobby-grid-layout">
        <div className="header-row grid-full-width">
            <h1>Truco Estrella</h1>
        </div>

        <div className="available-rooms-section grid-col-left">
          <h2>Salas Disponibles</h2>
          {availableRooms.length === 0 ? (
            <p>No hay partidas creadas en este momento.</p>
          ) : (
            <div className="rooms-list">
              {availableRooms.map((room) => (
                <div key={room.id} className="room-item">
                  <p>
                    Creador: **{room.creatorName}** - Modo: **{room.gameMode}** - Puntos: **{room.pointsToWin}** - Flor: **{room.playWithFlor ? 'Sí' : 'No'}**
                  </p>
                  <p>
                    Participantes: **{room.currentPlayers}** de **{room.maxPlayers}** {room.privateKey && '(Privada)'}
                  </p>
                  {room.timeRemaining > 0 && (
                    <p className="time-remaining">Tiempo restante: {Math.ceil(room.timeRemaining / 60000)} min</p>
                  )}
                  <button onClick={() => handleJoinRoomFromList(room)}>
                    Unirme
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="create-game-section grid-col-middle">
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
              Se juega con Flor:
              <select value={playWithFlor} onChange={(e) => setPlayWithFlor(e.target.value)}>
                <option value="no">NO</option>
                <option value="si">SI</option>
              </select>
            </label>
            <label>
              Modo de juego:
              <select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
                <option value="1v1">Uno contra uno</option>
                <option value="2v2">Dos contra dos</option>
                <option value="3v3">Tres contra tres</option> {/* Nueva opción */}
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

        <div className="chat-log-box grid-col-right">
            <h2>Chat Público</h2>
            <div className="chat-messages">
                {publicChatLog.map((msg, index) => (
                    <p key={index}>{msg}</p>
                ))}
                <div ref={publicChatMessagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    disabled={!socket}
                />
                <button type="submit" disabled={!socket}>Enviar</button>
            </form>
        </div>
      </div>
    );
  }
}

export default GameLobby;