import React from 'react';
import './WaitingRoom.css'; // Crearemos este archivo CSS a continuación

function WaitingRoom({ playerName, gameMode, pointsToWin, opponentType }) {
  // Mensaje para el tipo de oponente
  const opponentMessage = opponentType === 'ai' ? 'la IA Truco Estrella' : 'otros jugadores';

  // Mensaje para el modo de juego
  let gameModeMessage = '';
  switch (gameMode) {
    case '1v1':
      gameModeMessage = 'uno contra uno';
      break;
    case '2v2':
      gameModeMessage = 'dos contra dos';
      break;
    case '3v3':
      gameModeMessage = 'tres contra tres';
      break;
    default:
      gameModeMessage = 'modo de juego desconocido';
  }

  return (
    <div className="waiting-room-container">
      <h1>Truco Estrella</h1>
      <h2>Sala de Espera</h2>
      <p>Hola **{playerName}**!</p>
      <p>Estás esperando para jugar **{gameModeMessage}** contra **{opponentMessage}** a **{pointsToWin}** puntos.</p>
      <p>Buscando jugadores... ¡Por favor, espera!</p>
      <div className="loading-spinner"></div> {/* Para un efecto visual de carga */}
    </div>
  );
}

export default WaitingRoom;