// ui.js

function mostrarMano(jugadorId, mano, ocultar, callback) {
  const contenedor = document.getElementById(jugadorId === "jugador" ? "mano-jugador" : "mano-ia");
  contenedor.innerHTML = "";
  mano.forEach((carta, index) => {
    const div = document.createElement("div");
    div.className = "carta";
    div.innerText = ocultar ? "🂠" : `${carta.numero} ${carta.palo}`;
    if (!ocultar && jugadorId === "jugador") {
      div.classList.add("jugador");
      div.addEventListener("click", () => callback(index));
    }
    contenedor.appendChild(div);
  });
}

function mostrarCartaEnMesa(jugadorId, carta) {
  const contenedor = document.getElementById("mesa");
  const div = document.createElement("div");
  div.className = "carta mesa";
  div.innerText = `${carta.numero} ${carta.palo}`;
  contenedor.appendChild(div);
}

function limpiarMesa() {
  document.getElementById("mesa").innerHTML = "";
}

function actualizarPorotos(jugadorId, puntos) {
  const contenedor = document.getElementById(`porotos-${jugadorId}`);
  contenedor.innerHTML = "";
  for (let i = 0; i < puntos; i++) {
    const poroto = document.createElement("div");
    poroto.className = "poroto";
    contenedor.appendChild(poroto);
  }
}

function logHistorial(texto) {
  const historial = document.getElementById("historial");
  const p = document.createElement("p");
  p.textContent = texto;
  historial.appendChild(p);
  historial.scrollTop = historial.scrollHeight;
}

function mostrarBotonesCanto(visible) {
  document.getElementById("botones-canto").style.display = visible ? "flex" : "none";
}

function ocultarBotonesCanto() {
  mostrarBotonesCanto(false);
}

function mostrarModalVictoria(nombreGanador) {
  const modal = document.getElementById("modal-victoria");
  modal.style.display = "block";
  document.getElementById("ganador").textContent = nombreGanador;
}

function mostrarOpcionesEnvido(tipo, callback) {
  // por ahora simplificado
  callback("quiero");
}

function mostrarOpcionesTruco(tipo, callback) {
  // por ahora simplificado
  callback("quiero");
}

function mostrarRespuestaCanto(tipo, callback) {
  // por ahora simplificado
  const aceptar = confirm(`${tipo.toUpperCase()}: ¿Querés aceptar?`);
  callback(aceptar ? "quiero" : "no quiero");
}

function bloquearCartas() {
  const cartas = document.querySelectorAll(".carta.jugador");
  cartas.forEach(carta => carta.classList.add("bloqueada"));
}

function desbloquearCartas() {
  const cartas = document.querySelectorAll(".carta.jugador");
  cartas.forEach(carta => carta.classList.remove("bloqueada"));
}

export {
  mostrarMano,
  mostrarCartaEnMesa,
  limpiarMesa,
  actualizarPorotos,
  logHistorial,
  mostrarBotonesCanto,
  ocultarBotonesCanto,
  mostrarModalVictoria,
  mostrarOpcionesEnvido,
  mostrarOpcionesTruco,
  mostrarRespuestaCanto,
  bloquearCartas,
  desbloquearCartas
};
