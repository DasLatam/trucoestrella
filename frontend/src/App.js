// trucoestrella/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css'; // Mantenemos el CSS principal
import GameLobby from './components/GameLobby'; // Importamos GameLobby

const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com'; // ¡Confirma tu URL de Render!

function App() {
  const [socket, setSocket] = useState(null);
  const [playerConnected, setPlayerConnected] = useState(false); // Para saber si ya estamos conectados

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
      setPlayerConnected(true); // Marcamos que la conexión fue exitosa
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
      setPlayerConnected(false); // Marcamos que no estamos conectados
      // Podrías mostrar un mensaje al usuario aquí si quieres
    });

    // Limpiar la conexión cuando el componente se desmonte
    return () => newSocket.disconnect();
  }, []); // Se ejecuta solo una vez al montar

  if (!playerConnected) {
    return (
      <div className="app-container">
        <h1>Truco Estrella</h1>
        <p>Conectando al servidor... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Una vez conectado, renderizamos el GameLobby
  return (
    <GameLobby socket={socket} />
  );
}

export default App;