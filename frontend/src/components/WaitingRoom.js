// WaitingRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from './App';

function WaitingRoom() {
    const { socket, game, playerName, setPlayerName, error, setError } = useSocket();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // La lógica clave: Si tenemos un socket conectado, SIEMPRE
        // intentamos unirnos o pedir los datos de la sala.
        if (socket) {
            // Comprobamos si el jugador ya está en la lista de la sala.
            // Si es así, no es necesario volver a unirse.
            const isPlayerAlreadyInGame = game?.players.some(p => p.id === socket.id);
            if (isPlayerAlreadyInGame) {
                return; // Ya estamos dentro, no hacer nada.
            }

            // Si llegamos aquí, es porque somos un nuevo jugador o necesitamos sincronizar.
            if (!playerName) {
                const name = prompt("Por favor, ingresa tu nombre para unirte a la partida:");
                if (name) {
                    setPlayerName(name);
                    // Emitimos con el nuevo nombre.
                    socket.emit('join-room', { roomId, playerName: name });
                } else {
                    navigate('/'); // Si el usuario cancela, lo enviamos al lobby.
                }
            } else {
                // Si ya tenemos un nombre, lo usamos para unirnos.
                socket.emit('join-room', { roomId, playerName });
            }
        }
    }, [socket, roomId, playerName, setPlayerName, navigate, game]); // Se añade 'game' a las dependencias

    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // La pantalla de carga ahora es más inteligente.
    // Solo se muestra si no tenemos datos del juego O si los datos no coinciden con la sala actual.
    if (!game || game.roomId !== roomId) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-yellow-400 animate-pulse">Sincronizando sala...</h2>
                <p className="text-gray-400 mt-2">Obteniendo información de la partida {roomId}.</p>
                {error && <div className="bg-red-500 text-white p-3 rounded-md mt-4">{error}</div>}
            </div>
        );
    }
    
    const { players, maxPlayers, vsAI } = game;
    const humanPlayers = players.filter(p => !p.isAI);
    const requiredHumanPlayers = vsAI ? maxPlayers / 2 : maxPlayers;

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-2 text-center">Sala de Espera</h2>
            <p className="text-center text-gray-400 mb-6">ID de la Sala: <span className="font-mono text-yellow-400">{roomId}</span></p>

            {error && <div className="bg-red-500 text-white p-3 rounded-md mb-4 text-center">{error}</div>}

            <div className="mb-6">
                <label className="block text-gray-300 mb-2">Enlace para compartir:</label>
                <div className="flex">
                    <input
                        type="text"
                        readOnly
                        value={window.location.href}
                        className="w-full p-3 bg-gray-700 rounded-l-md border border-gray-600 text-gray-400"
                    />
                    <button
                        onClick={copyLinkToClipboard}
                        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-r-md transition duration-300"
                    >
                        {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">
                    Jugadores ({humanPlayers.length}/{requiredHumanPlayers})
                    {vsAI && ` (+ ${maxPlayers / 2} IA)`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Equipo A */}
                    <div className="p-3 bg-gray-800 rounded-md">
                        <h4 className="font-bold text-red-500 mb-2">Equipo A</h4>
                        <ul>
                            {players.filter(p => p.team === 'A').map(p => (
                                <li key={p.id} className="flex items-center space-x-2 text-lg">
                                    <span>{p.isAI ? '🤖' : '👤'}</span>
                                    <span>{p.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Equipo B */}
                    <div className="p-3 bg-gray-800 rounded-md">
                        <h4 className="font-bold text-blue-500 mb-2">Equipo B</h4>
                        <ul>
                            {players.filter(p => p.team === 'B').map(p => (
                                <li key={p.id} className="flex items-center space-x-2 text-lg">
                                    <span>{p.isAI ? '🤖' : '👤'}</span>
                                    <span>{p.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {game.status === 'ready' ? (
                 <button className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md transition duration-300">
                    ¡Empezar Partida!
                </button>
            ) : (
                <p className="text-center mt-6 text-yellow-400 animate-pulse">
                    Esperando a que se unan más jugadores...
                </p>
            )}
        </div>
    );
}

export default WaitingRoom;
