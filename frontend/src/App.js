// trucoestrella/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css'; // Asegúrate de tener este archivo CSS para estilos generales
import GameLobby from './components/GameLobby';

// URL de tu backend desplegado en Render.com
const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com'; // ¡CONFIRMA QUE ESTA ES TU URL REAL!

function App() {
  const [socket, setSocket] = useState(null);
  const [playerConnected, setPlayerConnected] = useState(false);

  useEffect(() => {
    // Crea una nueva conexión de socket
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // Maneja el evento de conexión exitosa
    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO');
      setPlayerConnected(true); // Actualiza el estado a conectado
    });

    // Maneja el evento de desconexión
    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO');
      setPlayerConnected(false); // Actualiza el estado a desconectado
    });

    // Función de limpieza que se ejecuta al desmontar el componente
    return () => newSocket.disconnect();
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez al montar

  // Muestra una pantalla de carga mientras se conecta al servidor
  if (!playerConnected) {
    return (
      <div className="app-container">
        <h1>Truco Estrella</h1>
        <p>Conectando al servidor... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div> {/* Puedes estilizar esto en App.css */}
      </div>
    );
  }

  // Una vez conectado, renderiza el componente GameLobby y le pasa la instancia del socket
  return (
    <GameLobby socket={socket} />
  );
}

export default App;