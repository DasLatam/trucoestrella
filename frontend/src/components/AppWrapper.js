import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AppWrapper = ({ socket, component: Component }) => {
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || 'Jugador 1');
  const navigate = useNavigate();
  const { roomId, key } = useParams();

  useEffect(() => {
    if (!socket) return;
    
    // Guardar el nombre del jugador en el localStorage
    localStorage.setItem('playerName', playerName);

    // Eventos de navegación
    socket.on('roomUpdate', (roomData) => {
      navigate(`/sala/${roomData.roomId}`, { state: roomData });
    });
    
    socket.on('gameStarted', (roomData) => {
        navigate(`/sala/${roomData.roomId}`, { state: roomData });
    });

    socket.on('roomAbandoned', () => {
      navigate('/');
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('roomAbandoned');
    };
  }, [socket, playerName, navigate]);

  return <Component socket={socket} playerName={playerName} setPlayerName={setPlayerName} />;
};

export default AppWrapper;