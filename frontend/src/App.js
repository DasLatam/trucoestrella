// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { socket, connectSocket } from './socket'; // Importamos desde nuestro nuevo módulo
import GameLobby from './GameLobby';
import WaitingRoom from './WaitingRoom';

// El contexto sigue siendo útil para pasar el estado, pero no el socket en sí.
const GameContext = createContext();
export const useGame = () => useContext(GameContext);

const AppContent = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('trucoPlayerName') || '');
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Nos conectamos explícitamente al montar el componente principal.
        connectSocket();

        function onConnect() {
            console.log('Socket conectado:', socket.id);
            setIsConnected(true);
        }
        function onDisconnect() {
            console.log('Socket desconectado.');
            setIsConnected(false);
        }
        function onGameCreated(gameData) {
            setGame(gameData);
            navigate(`/sala/${gameData.roomId}`);
        }
        function onUpdateRoom(gameData) {
            setGame(gameData);
            setError(''); // Limpiar errores en una actualización exitosa
        }
        function onErrorMessage(message) {
            setError(message);
            if (message.includes('cerrado')) {
                setGame(null);
                navigate('/');
            }
        }

        // Suscripciones a los eventos del socket
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('game-created', onGameCreated);
        socket.on('update-room', onUpdateRoom);
        socket.on('error-message', onErrorMessage);

        // Limpieza al desmontar el componente
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('game-created', onGameCreated);
            socket.off('update-room', onUpdateRoom);
            socket.off('error-message', onErrorMessage);
        };
    }, [navigate]);

    useEffect(() => {
        localStorage.setItem('trucoPlayerName', playerName);
    }, [playerName]);
    
    // Limpiar estado al volver al lobby
    useEffect(() => {
        if (location.pathname === '/') {
            setGame(null);
            setError('');
        }
    }, [location.pathname]);

    const value = {
        isConnected, playerName, setPlayerName,
        game, setGame, error, setError
    };

    return (
        <GameContext.Provider value={value}>
            <main className="container mx-auto p-4">
                <h1 className="text-4xl font-bold text-center text-yellow-400 mb-6">Truco Estrella 🌟</h1>
                <Routes>
                    <Route path="/" element={<GameLobby />} />
                    <Route path="/sala/:roomId" element={<WaitingRoom />} />
                </Routes>
            </main>
        </GameContext.Provider>
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
