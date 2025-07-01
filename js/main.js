// main.js
const menu = document.getElementById("menu-inicial");
const juego = document.getElementById("pantalla-juego");
const comenzarBtn = document.getElementById("comenzar-btn");
const limpiarCacheBtn = document.getElementById("limpiar-cache-btn");
const volverMenuBtn = document.getElementById("volver-menu-btn");

comenzarBtn.addEventListener("click", () => {
  const nombre = document.getElementById("nombre-jugador").value.trim();
  const puntos = document.querySelector('input[name="puntos"]:checked').value;
  const conFlor = document.getElementById("activar-flor").checked;

  if (nombre === "") {
    alert("Ingresá tu nombre para comenzar.");
    return;
  }

  // Guardar configuración en memoria (global temporal)
  window.configuracionPartida = {
    nombreJugador: nombre,
    puntosMaximos: parseInt(puntos, 10),
    flor: conFlor,
  };

  // Mostrar pantalla de juego
  document.getElementById("nombre-jugador-marcador").textContent = nombre;
  menu.classList.add("oculto");
  juego.classList.remove("oculto");

  // TODO: iniciar ronda
  console.log("Configuración:", window.configuracionPartida);
});

limpiarCacheBtn.addEventListener("click", () => {
  location.reload(true);
});

volverMenuBtn.addEventListener("click", () => {
  juego.classList.add("oculto");
  menu.classList.remove("oculto");
});
