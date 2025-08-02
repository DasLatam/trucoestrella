import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GameLobby.css';

function WaitingRoom({ socket, playerName }) {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatMessagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { roomId } = useParams();

  useEffect(() => {
    if (!socket || !roomId) {
        navigate('/');
        return;
    }
    
    socket.emit('requestRoomData', { roomId });

    socket.on('roomData', (roomData) => {
        if (roomData) {
            setCurrentRoom(roomData);
        } else {
            navigate('/');
        }
    });

    socket.on('roomUpdate', (roomData) => {
      setCurrentRoom(roomData);
    });

    socket.on('gameStarted', (gameData) => {
      setCurrentRoom(gameData);
      alert(gameData.message);
    });

    socket.on('chatMessage', (message) => {
      addRoomLogMessage(`${message.senderName}: ${message.text}`);
    });

    socket.on('roomAbandoned', (data) => {
      alert(`Mensaje del sistema: ${data.message}`);
      navigate('/');
    });

    return () => {
      socket.off('roomData');
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('chatMessage');
      socket.off('roomAbandoned');
    };
  }, [socket, roomId, navigate]);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog]);

  const addRoomLogMessage = (message) => {
    setChatLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString('es-AR')} - ${message}`];
      return newLog.slice(-50);
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (socket && chatInput.trim()) {
      socket.emit('sendMessage', {
        senderName: playerName,
        text: chatInput.trim(),
      });
      setChatInput('');
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leaveRoom');
      setChatLog([]);
      navigate('/');
    }
  };

  if (!currentRoom || currentRoom.id !== roomId) {
    return (
      <div className="game-lobby-container my-room-view">
        <div className="header-row grid-full-width"><h1>Truco Estrella</h1></div>
        <div className="main-content-row">
          <div className="my-room-details">
            <h2>Cargando sala...</h2>
            <p>Por favor, espera...</p>
          </div>
        </div>
      </div>
    );
  }

  const showShareLink = currentRoom.status === 'waiting' && currentRoom.id;
  const linkCompartir = showShareLink ? `${window.location.origin}/sala/${currentRoom.id}${currentRoom.privateKey ? `?key=${currentRoom.privateKey}` : ''}` : '';
  const displayCurrentPlayers = currentRoom.opponentType === 'ai' ? currentRoom.currentHumanPlayers : currentRoom.currentPlayers;
  const displayMaxPlayers = currentRoom.opponentType === 'ai' ? currentRoom.humanPlayersNeeded : currentRoom.maxPlayers;
  const roomCreatedByMe = currentRoom.players.some(player => player.name === playerName);

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

                      {showShareLink && roomCreatedByMe && (
                          <>
                              <p>Esperando más jugadores... ¡Por favor, comparte el enlace!</p>
                              <div className="share-link-container">
                                  <p className="share-link-text">{linkCompartir}</p>
                                  <button onClick={() => navigator.clipboard.writeText(linkCompartir)} className="copy-link-button">Copiar Link</button>
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
}

export default WaitingRoom;