// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import GameLobby from './GameLobby';
import WaitingRoom from './WaitingRoom';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

const AppContent = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('trucoPlayerName') || '');
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const newSocket = io('https://trucoestrella-backend.onrender.com', {
            transports: ['websocket', 'polling']
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Conectado al servidor con ID:', newSocket.id);
            setIsConnected(true);
        });
        newSocket.on('disconnect', () => setIsConnected(false));
        newSocket.on('game-created', (gameData) => {
            setGame(gameData);
            navigate(`/sala/${gameData.roomId}`);
        });
        newSocket.on('update-room', (gameData) => setGame(gameData));
        newSocket.on('error-message', (message) => {
            setError(message);
            if (message.includes('cerrado')) {
                setGame(null);
                navigate('/');
            }
        });

        return () => newSocket.disconnect();
    }, [navigate]);

    useEffect(() => {
        localStorage.setItem('trucoPlayerName', playerName);
    }, [playerName]);

    // Limpiar estado del juego al volver al lobby
    useEffect(() => {
        if (location.pathname === '/') {
            setGame(null);
            setError('');
        }
    }, [location.pathname]);

    const value = {
        socket, isConnected, playerName, setPlayerName,
        game, setGame, error, setError
    };

    return (
        <SocketContext.Provider value={value}>
            <main className="container mx-auto p-4">
                <h1 className="text-4xl font-bold text-center text-yellow-400 mb-6">Truco Estrella 🌟</h1>
                <Routes>
                    <Route path="/" element={<GameLobby />} />
                    <Route path="/sala/:roomId" element={<WaitingRoom />} />
                </Routes>
            </main>
        </SocketContext.Provider>
    );
};

function App() {
    return (
        <Router>
            <div className="bg-gray-900 text-white min-h-screen font-sans">
                <AppContent />
            </div>
        </Router>
    );
}

export default App;
