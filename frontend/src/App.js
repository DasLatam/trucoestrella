// trucoestrella/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';
import GameLobby from './components/GameLobby';
import WaitingRoom from './components/WaitingRoom';

// URL de tu backend desplegado en Render.com
const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com';

const AppWrapper = () => {
  const [socket, setSocket] = useState(null);
  const [playerConnected, setPlayerConnected] = useState(false);
  const navigate = useNavigate();
  const { roomId, key } = useParams();

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
      setPlayerConnected(true);

      // Si hay un roomId en la URL, intenta unirse a la sala
      if (roomId) {
        newSocket.emit('joinGame', {
          playerName: 'Jugador Web', // Nombre por defecto para la unión por URL
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
    
    newSocket.on('roomJoined', (roomData) => {
      navigate(`/sala/${roomData.roomId}`);
    });
    
    newSocket.on('roomAbandoned', () => {
      navigate('/');
    });

    return () => newSocket.disconnect();
  }, [roomId, key, navigate]);

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
      <Route path="/" element={<GameLobby socket={socket} />} />
      <Route path="/sala/:roomId" element={<WaitingRoom socket={socket} />} />
    </Routes>
  );
};

const App = () => (
  <Router>
    <AppWrapper />
  </Router>
);

export default App;