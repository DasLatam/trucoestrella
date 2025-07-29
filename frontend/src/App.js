// trucoestrella/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import GameLobby from './components/GameLobby';

const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com'; // ¡Confirma tu URL de Render!

function App() {
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
    <GameLobby socket={socket} />
  );
}

export default App;