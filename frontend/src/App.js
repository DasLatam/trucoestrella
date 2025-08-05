// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Lobby from './Lobby';
import WaitingRoom from './WaitingRoom';

// --- CONTEXTO GLOBAL ---
const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// --- SOCKET ---
const socket = io('https://trucoestrella-backend.onrender.com');

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState({ name: 'Cacho', id: 'user1' }); // Usuario hardcodeado por ahora
  const [availableGames, setAvailableGames] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Escuchar actualizaciones de la lista de partidas
    socket.on('games-list-update', (games) => setAvailableGames(games));
    
    // Escuchar historial y nuevos mensajes del chat
    socket.on('chat-history', (history) => setChatMessages(history));
    socket.on('new-chat-message', (message) => {
        setChatMessages(prevMessages => [...prevMessages, message]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('games-list-update');
      socket.off('chat-history');
      socket.off('new-chat-message');
    };
  }, []);

  const contextValue = {
    isConnected,
    user,
    availableGames,
    chatMessages,
    socket,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/sala/:roomId" element={<WaitingRoom />} />
          </Routes>
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
