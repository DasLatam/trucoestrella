// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import GameLobby from './GameLobby';
import WaitingRoom from './WaitingRoom';

// --- Contexto para Socket y Estado del Juego ---
const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

// --- Componente Proveedor de Contexto ---
const AppProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [playerName, setPlayerName] = useState(localStorage.getItem('trucoPlayerName') || '');
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Efecto para la conexión del Socket
    useEffect(() => {
        const newSocket = io('https://trucoestrella-backend.onrender.com', {
            transports: ['websocket', 'polling']
        });
        setSocket(newSocket);

        // --- Listeners de Socket ---
        newSocket.on('connect', () => {
            console.log('Conectado al servidor de sockets con ID:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`Desconectado del servidor. Razón: ${reason}`);
            setIsConnected(false);
        });

        newSocket.on('game-created', (gameData) => {
            setGame(gameData);
            navigate(`/sala/${gameData.roomId}`);
        });

        newSocket.on('update-room', (gameData) => {
            setGame(gameData);
            setError('');
        });

        newSocket.on('error-message', (message) => {
            console.error('Error del servidor:', message);
            setError(message);
            if (message.includes('no existe') || message.includes('El host ha abandonado')) {
                setGame(null);
                navigate('/');
            }
        });

        return () => newSocket.disconnect();
    }, [navigate]);

    // Efecto para guardar el nombre del jugador en localStorage
    useEffect(() => {
        localStorage.setItem('trucoPlayerName', playerName);
    }, [playerName]);

    const value = {
        socket,
        isConnected,
        playerName,
        setPlayerName,
        game,
        setGame,
        error,
        setError
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

// --- Componente Principal de la Aplicación ---
function App() {
    return (
        <Router>
            <AppProvider>
                <div className="bg-gray-900 text-white min-h-screen font-sans">
                    <main className="container mx-auto p-4">
                        <h1 className="text-4xl font-bold text-center text-yellow-400 mb-6">Truco Estrella 🌟</h1>
                        <Routes>
                            <Route path="/" element={<GameLobby />} />
                            <Route path="/sala/:roomId" element={<WaitingRoom />} />
                        </Routes>
                    </main>
                </div>
            </AppProvider>
        </Router>
    );
}

export default App;
