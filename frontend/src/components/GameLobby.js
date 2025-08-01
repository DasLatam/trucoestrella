// trucoestrella/frontend/src/components/GameLobby.js
import React, { useState, useEffect, useRef } from 'react';
import './GameLobby.css';
import { useNavigate } from 'react-router-dom';

function GameLobby({ socket }) {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1');
  const [opponentType, setOpponentType] = useState('users');
  const [privateKey, setPrivateKey] = useState('');
  const [playWithFlor, setPlayWithFlor] = useState('no');

  const [availableRooms, setAvailableRooms] = useState([]);
  const [publicChatLog, setPublicChatLog] = useState([]);
  const publicChatMessagesEndRef = useRef(null);
  const [chatInput, setChatInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    socket.emit('requestAvailableRooms');

    socket.on('availableRooms', (rooms) => {
      console.log('Salas disponibles recibidas:', rooms);
      setAvailableRooms(rooms);
    });
    
    socket.on('roomUpdate', (roomData) => {
        // En lugar de cambiar de vista, ahora navegamos a la página de la sala
        navigate(`/sala/${roomData.roomId}`);
    });
    
    socket.on('gameStarted', (roomData) => {
        navigate(`/sala/${roomData.roomId}`);
    });

    socket.on('joinError', (error) => {
      alert(`Error al unirse: ${error.message}`);
      addPublicLogMessage(`[Error] ${error.message}`);
    });
    
    socket.on('publicChatMessage', (message) => {
      addPublicLogMessage(`${message.senderName}: ${message.text}`);
    });

    let intervalId = setInterval(() => {
        socket.emit('requestAvailableRooms');
    }, 3000);

    return () => {
      socket.off('availableRooms');
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('joinError');
      socket.off('publicChatMessage');
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, navigate]);

  useEffect(() => {
    if (publicChatMessagesEndRef.current) {
      publicChatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [publicChatLog]);

  const addPublicLogMessage = (message) => {
    setPublicChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString('es-AR')} - ${message}`];
      return newLog.slice(-50);
    });
  };

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
      socket.emit('joinGame', {
        playerName,
        pointsToWin: parseInt(pointsToWin),
        gameMode,
        opponentType,
        privateKey: opponentType === 'users' ? privateKey : null,
        playWithFlor: playWithFlor === 'si',
      });
      addPublicLogMessage(`Intentando crear/unirse como ${playerName}...`);
    }
  };

  const handleJoinRoomFromList = (roomData) => {
    if (socket) {
      let key = null;
      if (roomData.privateKey) {
        key = prompt('Esta sala es privada. Ingresa la clave:');
        if (!key) return;
      }
      socket.emit('joinGame', {
        playerName,
        pointsToWin: roomData.pointsToWin,
        gameMode: roomData.gameMode,
        opponentType: roomData.opponentType,
        privateKey: key || roomData.id,
        playWithFlor: roomData.playWithFlor,
      });
      addPublicLogMessage(`Intentando unirse a sala ${roomData.id} como ${playerName}...`);
    }
  };

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

export default GameLobby;