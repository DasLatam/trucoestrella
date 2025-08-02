import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';
import GameLobby from './components/GameLobby';
import WaitingRoom from './components/WaitingRoom';
import AppWrapper from './components/AppWrapper'; // Importamos el nuevo componente wrapper

// URL de tu backend desplegado en Render.com
const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com';

const AppWrapper = () => {
  const [socket, setSocket] = useState(null);
  const [playerConnected, setPlayerConnected] = useState(false);
  const navigate = useNavigate();
  const { roomId, key } = useParams();
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || 'Jugador 1');

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
      setPlayerConnected(true);

      if (roomId) {
        newSocket.emit('joinGame', {
          playerName: playerName,
          privateKey: key || roomId,
          pointsToWin: null,
          gameMode: null,
          opponentType: null,
          playWithFlor: null,
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
      setPlayerConnected(false);
    });
    
    newSocket.on('roomUpdate', (roomData) => {
      navigate(`/sala/${roomData.roomId}`, { state: roomData });
    });
    
    newSocket.on('roomAbandoned', () => {
      navigate('/');
    });

    return () => newSocket.disconnect();
  }, [roomId, key, navigate, playerName]);

  if (!playerConnected) {
    return (
      <div className="app-container">
        <h1>Truco Estrella</h1>
        <p>Conectando al servidor... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<GameLobby socket={socket} playerName={playerName} setPlayerName={setPlayerName} />} />
      <Route path="/sala/:roomId" element={<WaitingRoom socket={socket} playerName={playerName} />} />
    </Routes>
  );
};

const App = () => (
  <Router>
    <AppWrapper />
  </Router>
);

export default App;