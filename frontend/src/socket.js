// src/socket.js
import { io } from 'socket.io-client';

// La URL de tu backend.
const URL = 'https://trucoestrella-backend.onrender.com';

// Se crea una ÚNICA instancia del socket para toda la aplicación.
// La opción autoConnect: false es clave. No se conectará hasta que lo digamos.
export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

// Puedes exportar funciones que los componentes pueden llamar,
// manteniendo toda la lógica del socket aquí.
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
