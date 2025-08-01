import React, { useState, useEffect, useRef } from 'react';
import './GameLobby.css';

function GameLobby({ socket }) {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');
  const [playWithFlor, setPlayWithFlor] = useState('no');

  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [chatLog, setChatLog] = useState([]);
  const [publicChatLog, setPublicChatLog] = useState([]);
  const chatMessagesEndRef = useRef(null);
  const publicChatMessagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('requestAvailableRooms');

    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      setAvailableRooms(rooms.filter(room => !(currentRoom && room.id === currentRoom.id)));
    });

    socket.on('roomUpdate', (roomData) => {
      console.log('Actualización de mi sala recibida en GameLobby:', roomData);
      setCurrentRoom(roomData);
      setIsLoading(false);
      setAvailableRooms(prevRooms => prevRooms.filter(room => !(roomData && room.id === roomData.id)));
      addRoomLogMessage(`[Sala ${roomData.roomId}] ${roomData.message}`);
    });

    socket.on('gameStarted', (gameData) => {
      console.log('¡Partida iniciada!', gameData);
      alert(gameData.message);
      setCurrentRoom(gameData);
      setIsLoading(false);
      addRoomLogMessage(`[Sala ${gameData.roomId}] ${gameData.message}`);
    });

    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      setCurrentRoom(null);
      setIsLoading(false);
      setChatLog([]);
      addPublicLogMessage(`[Error] ${error.message}`);
    });

    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      setCurrentRoom(null);
      setIsLoading(false);
      setChatLog([]);
      addPublicLogMessage(`[Sistema] ${data.message}`);
      socket.emit('requestAvailableRooms');
    });

    socket.on('chatMessage', (message) => {
      addRoomLogMessage(`${message.senderName}: ${message.text}`);
    });

    socket.on('publicChatMessage', (message) => {
      addPublicLogMessage(`${message.senderName}: ${message.text}`);
    });


    let intervalId;
    if (!currentRoom) {
      intervalId = setInterval(() => {
        socket.emit('requestAvailableRooms');
      }, 3000);
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
  }, [socket, currentRoom]);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog]);

  useEffect(() => {
    if (publicChatMessagesEndRef.current) {
      publicChatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [publicChatLog]);


  const addRoomLogMessage = (message) => {
    setChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString('es-AR')} - ${message}`];
      return newLog.slice(-50);
    });
  };

  const addPublicLogMessage = (message) => {
    setPublicChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString('es-AR')} - ${message}`];
      return newLog.slice(-50);
    });
  };

  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (socket && chatInput.trim()) {
      socket.emit('sendMessage', {
        senderName: playerName,
        text: chatInput.trim()
      });
      setChatInput('');
    }
  };


  const handleCreateOrJoinFromForm = (e) => {
    e.preventDefault();
    if (socket) {
      setIsLoading(true);
      setCurrentRoom(null);
      setChatLog([]);
      addPublicLogMessage(`Intentando crear/unirse como ${playerName}...`);
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null,
        playWithFlor: playWithFlor === 'si',
      });
    }
  };

  const handleJoinRoomFromList = (roomData) => {
    if (socket) {
      let key = null;
      if (roomData.privateKey) {
        key = prompt('Esta sala es privada. Ingresa la clave:');
        if (!key) {
            setIsLoading(false);
            return;
        }
      }
      setIsLoading(true);
      setCurrentRoom(null);
      setChatLog([]);
      addPublicLogMessage(`Intentando unirse a sala ${roomData.id} como ${playerName}...`);
      socket.emit('joinGame', {
        playerName,
        pointsToWin: roomData.pointsToWin,
        gameMode: roomData.gameMode,
        opponentType: roomData.opponentType,
        privateKey: key || roomData.id,
        playWithFlor: roomData.playWithFlor,
      });
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      setIsLoading(true);
      socket.emit('leaveRoom');
      addRoomLogMessage(`Abandonando sala ${currentRoom.id}...`);
      setChatLog([]);
    }
  };

  if (isLoading) {
    return (
      <div className="game-lobby-container loading-screen">
        <h1>Truco Estrella</h1>
        <p>Cargando partida... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (currentRoom && (currentRoom.status === 'waiting' || currentRoom.opponentType === 'ai' || currentRoom.status === 'playing')) {
    const showShareLink = (currentRoom.status === 'waiting' && currentRoom.opponentType === 'users' && currentRoom.id) ||
                         (currentRoom.status === 'waiting' && currentRoom.opponentType === 'ai' && currentRoom.humanPlayersNeeded > 1 && currentRoom.id);
    const linkCompartir = showShareLink ? `https://trucoestrella.vercel.app/?room=${currentRoom.id}${currentRoom.privateKey ? `&key=${currentRoom.privateKey}` : ''}` : '';

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
                ) : (
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
                <option value="3v3">Tres contra tres</option>
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