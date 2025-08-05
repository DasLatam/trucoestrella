// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { socket, connectSocket } from './socket';
import GameLobby from './GameLobby';
import WaitingRoom from './WaitingRoom';

const GameContext = createContext();
export const useGame = () => useContext(GameContext);

const AppContent = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [game, setGame] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        connectSocket();
        function onConnect() { setIsConnected(true); }
        function onDisconnect() { setIsConnected(false); }
        function onGameCreated(gameData) {
            setGame(gameData);
            navigate(`/sala/${gameData.roomId}`);
        }
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('game-created', onGameCreated);
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('game-created', onGameCreated);
        };
    }, [navigate]);

    const value = { isConnected, game, setGame };

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
