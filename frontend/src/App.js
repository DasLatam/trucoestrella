import React, { useState } from 'react';
import './App.css'; // Asegúrate de crear este archivo para los estilos

function App() {
  const [playerName, setPlayerName] = useState('Jugador 1');
  const [pointsToWin, setPointsToWin] = useState('30');
  const [gameMode, setGameMode] = useState('1v1'); // '1v1', '2v2', '3v3'
  const [opponentType, setOpponentType] = useState('users'); // 'ai', 'users'
  const [privateKey, setPrivateKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí es donde enviaríamos esta información al backend para unirse o crear la sala
    console.log({
      playerName,
      pointsToWin,
      gameMode,
      opponentType,
      privateKey,
    });
    alert('Simulando ingreso a sala de espera...');
    // Luego, navegaríamos a la sala de espera
  };

  return (
    <div className="app-container">
      <h1>Truco Estrella</h1>
      <form onSubmit={handleSubmit} className="entry-form">
        <label>
          Tu Nombre:
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </label>

        <label>
          Puntos para ganar:
          <select value={pointsToWin} onChange={(e) => setPointsToWin(e.target.value)}>
            <option value="15">15 Puntos</option>
            <option value="30">30 Puntos</option>
          </select>
        </label>

        <label>
          Modo de juego:
          <select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
            <option value="1v1">Uno contra uno</option>
            <option value="2v2">Dos contra dos</option>
          </select>
        </label>

        <label>
          Jugar contra:
          <select value={opponentType} onChange={(e) => setOpponentType(e.target.value)}>
            <option value="ai">IA Truco Estrella</option>
            <option value="users">Todos Usuarios</option>
          </select>
        </label>

        {opponentType === 'users' && (
          <label>
            Clave de Sala (opcional):
            <input
              type="text"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value.toUpperCase())}
              maxLength="6"
              placeholder="Ej: ABC123"
            />
          </label>
        )}

        <button type="submit">¡Jugar!</button>
      </form>
    </div>
  );
}

export default App;