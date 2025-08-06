// src/App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Lobby from './Lobby';
import WaitingRoom from './WaitingRoom';

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

const socket = io('https://trucoestrella-backend.onrender.com');

const UserLogin = ({ onLogin }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onLogin(name.trim());
        }
    };
    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
            <div className="bg-light-bg p-10 rounded-xl shadow-2xl border border-light-border w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <h1 className="text-3xl font-bold mb-6 text-center text-truco-brown">Bienvenido a Truco Estrella</h1>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ingresa tu apodo para jugar</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-gray-800 rounded-md border border-light-border focus:outline-none focus:ring-2 focus:ring-truco-brown text-white"
                        autoFocus
                    />
                    <button type="submit" className="w-full mt-6 bg-truco-green text-white font-bold py-3 rounded-md hover:bg-opacity-90 transition-all">
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

// Función para generar un color pastel aleatorio
const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [availableGames, setAvailableGames] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('trucoUser');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    }

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('games-list-update', setAvailableGames);
    socket.on('chat-history', setChatMessages);
    socket.on('new-chat-message', (message) => {
        setChatMessages(prev => [...prev, message].slice(-100)); // Mantener últimos 100 mensajes
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('games-list-update');
      socket.off('chat-history');
      socket.off('new-chat-message');
    };
  }, []);

  const handleLogin = (name) => {
      const newUser = { 
          name, 
          id: socket.id,
          color: getRandomColor() // Asignar color al hacer login
      };
      localStorage.setItem('trucoUser', JSON.stringify(newUser));
      setUser(newUser);
  };
  
  useEffect(() => {
      if (user && socket.id && user.id !== socket.id) {
          const updatedUser = { ...user, id: socket.id };
          localStorage.setItem('trucoUser', JSON.stringify(updatedUser));
          setUser(updatedUser);
      }
  }, [socket.id, user]);

  if (!user) {
      return <UserLogin onLogin={handleLogin} />;
  }

  const contextValue = { isConnected, user, setUser, availableGames, chatMessages, socket };

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <div className="bg-dark-bg text-gray-200 min-h-screen font-sans">
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
