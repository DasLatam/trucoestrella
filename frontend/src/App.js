import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';
import GameLobby from './components/GameLobby';
import WaitingRoom from './components/WaitingRoom';
import AppWrapper from './components/AppWrapper'; // Importamos el nuevo componente wrapper

// URL de tu backend desplegado en Render.com
const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com';

const App = () => {
  const [socket, setSocket] = useState(null);
  const [playerConnected, setPlayerConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
      setPlayerConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
      setPlayerConnected(false);
    });

    return () => newSocket.disconnect();
  }, []);

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
    <Router>
      <Routes>
        <Route path="/" element={<AppWrapper socket={socket} component={GameLobby} />} />
        <Route path="/sala/:roomId" element={<AppWrapper socket={socket} component={WaitingRoom} />} />
      </Routes>
    </Router>
  );
};

export default App;