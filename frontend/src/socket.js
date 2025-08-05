// src/socket.js
import { io } from 'socket.io-client';

const URL = 'https://trucoestrella-backend.onrender.com';

// Creamos una ÚNICA instancia del socket para toda la aplicación.
// autoConnect: false es clave. No se conectará hasta que lo indiquemos.
export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

// Funciones que los componentes pueden llamar.
export const connectSocket = () => {
  if (!socket.connected) {
    console.log("Intentando conectar el socket...");
    socket.connect();
  }
};
