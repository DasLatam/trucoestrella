// trucoestrella/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css'; // Este archivo CSS se usa para estilos generales, como la pantalla de "Conectando..."
import GameLobby from './components/GameLobby'; // Importa el componente principal del juego

// URL de tu backend desplegado en Render.com
// ¡IMPORTANTE!: Confirma que esta URL es la correcta y exacta de tu backend en Render.
const SOCKET_SERVER_URL = 'https://trucoestrella-backend.onrender.com';

function App() {
  // Estado para almacenar la instancia del socket
  const [socket, setSocket] = useState(null);
  // Estado para controlar si el jugador está conectado al servidor
  const [playerConnected, setPlayerConnected] = useState(false);

  // useEffect se ejecuta al montar el componente para establecer la conexión
  useEffect(() => {
    // Crea una nueva conexión de socket utilizando la URL del backend
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket); // Guarda la instancia del socket en el estado

    // Define qué hacer cuando el socket se conecta
    newSocket.on('connect', () => {
      console.log('Conectado al servidor de Socket.IO'); // Mensaje en consola al conectar
      setPlayerConnected(true); // Actualiza el estado a 'conectado'
    });

    // Define qué hacer cuando el socket se desconecta
    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor de Socket.IO'); // Mensaje en consola al desconectar
      setPlayerConnected(false); // Actualiza el estado a 'desconectado'
    });

    // Función de limpieza: se ejecuta cuando el componente se desmonta
    // Esto es crucial para cerrar la conexión del socket y evitar fugas de memoria
    return () => newSocket.disconnect();
  }, []); // El array vacío de dependencias asegura que este efecto se ejecute solo una vez al montar

  // Si el jugador aún no está conectado, muestra una pantalla de carga
  if (!playerConnected) {
    return (
      <div className="app-container">
        <h1>Truco Estrella</h1>
        <p>Conectando al servidor... ¡Por favor, espera!</p>
        <div className="loading-spinner"></div> {/* Muestra un spinner de carga */}
      </div>
    );
  }

  // Una vez que el jugador está conectado, renderiza el GameLobby
  // Le pasa la instancia del socket como una prop para que GameLobby pueda comunicarse con el servidor
  return (
    <GameLobby socket={socket} />
  );
}

export default App;