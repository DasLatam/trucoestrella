// src/App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Lobby from './Lobby';
import WaitingRoom from './WaitingRoom';

// --- CONTEXTO Y SOCKET (NO CAMBIA) ---
const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);
const socket = io('https://trucoestrella-backend.onrender.com');

// --- PANTALLA DE LOGIN (NO CAMBIA) ---
const UserLogin = ({ onLogin }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) onLogin(name.trim());
    };
    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
            <div className="bg-light-bg p-10 rounded-xl shadow-2xl border border-light-border w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <h1 className="text-3xl font-bold mb-6 text-center text-truco-brown">Bienvenido a Truco Estrella</h1>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ingresa tu apodo para jugar</label>
                    <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
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

const getRandomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 80%)`;

// --- COMPONENTE PRINCIPAL DE LA APLICACIÓN ---
function App() {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [user, setUser] = useState(null);
    const [availableGames, setAvailableGames] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentGame, setCurrentGame] = useState(null);
    
    // El hook de enrutamiento se usa aquí, en el componente principal que está envuelto por el Router.
    const location = useLocation();

    // Efecto para cargar usuario y conectar listeners del socket
    useEffect(() => {
        const savedUser = localStorage.getItem('trucoUser');
        if (savedUser) setUser(JSON.parse(savedUser));

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        const onGamesListUpdate = (games) => setAvailableGames(games);
        const onChatHistory = (history) => setChatMessages(history);
        const onNewChatMessage = (message) => setChatMessages(prev => [...prev, message].slice(-100));
        const onUpdateGameState = (gameState) => setCurrentGame(gameState);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('games-list-update', onGamesListUpdate);
        socket.on('chat-history', onChatHistory);
        socket.on('new-chat-message', onNewChatMessage);
        socket.on('update-game-state', onUpdateGameState);

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('games-list-update');
            socket.off('chat-history');
            socket.off('new-chat-message');
            socket.off('update-game-state');
        };
    }, []);
    
    // Efecto para limpiar el estado del juego al volver al lobby
    useEffect(() => {
        if (location.pathname === '/') {
            setCurrentGame(null);
        }
    }, [location.pathname]);

    const handleLogin = (name) => {
        const newUser = { name, id: socket.id, color: getRandomColor() };
        localStorage.setItem('trucoUser', JSON.stringify(newUser));
        setUser(newUser);
    };

    // La condición de login se maneja aquí. Si no hay usuario, se muestra el login.
    if (!user) {
        return <UserLogin onLogin={handleLogin} />;
    }

    // El valor del contexto que se pasa a los componentes hijos
    const contextValue = { 
        isConnected, user, availableGames, chatMessages, currentGame, socket,
        setCurrentGame, handleLogin
    };

    // Si hay usuario, se renderiza la aplicación principal
    return (
        <AppContext.Provider value={contextValue}>
            <div className="bg-dark-bg text-gray-200 min-h-screen font-sans">
                <Routes>
                    <Route path="/" element={<Lobby />} />
                    <Route path="/sala/:roomId" element={<WaitingRoom />} />
                </Routes>
            </div>
        </AppContext.Provider>
    );
}

export default App;
