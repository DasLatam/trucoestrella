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
        <div className="min-h-screen bg-dark-bg flex items-center justify-center">
            <div className="bg-light-bg p-10 rounded-xl shadow-2xl border border-light-border">
                <form onSubmit={handleSubmit}>
                    <h1 className="text-3xl font-bold mb-6 text-center text-truco-brown">Bienvenido a Truco Estrella</h1>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ingresa tu nombre para jugar</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-gray-800 rounded-md border border-light-border focus:outline-none focus:ring-2 focus:ring-truco-brown"
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
        setChatMessages(prev => [...prev, message]);
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
      const newUser = { name, id: socket.id };
      localStorage.setItem('trucoUser', JSON.stringify(newUser));
      setUser(newUser);
  };

  if (!user) {
      return <UserLogin onLogin={handleLogin} />;
  }

  const contextValue = { isConnected, user, availableGames, chatMessages, socket };

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
