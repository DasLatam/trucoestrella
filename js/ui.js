// ui.js

import { SIMBOLOS_PALOS } from "./config.js";

export function renderCarta(carta, bocaAbajo = false) {
  const div = document.createElement("div");
  div.className = "carta";

  if (bocaAbajo) {
    div.textContent = "🂠";
    div.style.backgroundColor = "#aaa";
  } else {
    div.textContent = `${carta.numero} ${SIMBOLOS_PALOS[carta.palo]}`;
    div.dataset.numero = carta.numero;
    div.dataset.palo = carta.palo;
  }

  return div;
}

export function mostrarMano(jugador, cartas, bocaAbajo = false, clickHandler = null) {
  const contenedor = document.getElementById(jugador === "ia" ? "mano-ia" : "mano-jugador");
  contenedor.innerHTML = "";

  cartas.forEach((carta, index) => {
    const el = renderCarta(carta, bocaAbajo);
    if (clickHandler && !bocaAbajo) {
      el.addEventListener("click", () => clickHandler(carta, index));
      el.classList.add("clickable");
    }
    contenedor.appendChild(el);
  });
}

export function mostrarCartaEnMesa(jugador, carta) {
  const div = renderCarta(carta);
  const slot = document.createElement("div");
  slot.appendChild(div);
  slot.className = `slot slot-${jugador}`;
  document.getElementById("mesa").appendChild(slot);
}

export function limpiarMesa() {
  document.getElementById("mesa").innerHTML = "";
}

export function actualizarPorotos(jugador, puntos) {
  const contenedor = document.getElementById(
    jugador === "ia" ? "porotos-ia" : "porotos-jugador"
  );
  contenedor.innerHTML = "";
  for (let i = 0; i < puntos; i++) {
    const p = document.createElement("div");
    p.className = "poroto";
    contenedor.appendChild(p);
    if ((i + 1) % 5 === 0) contenedor.appendChild(document.createElement("br"));
  }
}

export function logHistorial(texto) {
  const log = document.getElementById("log");
  log.innerText += texto + "\n";
  log.scrollTop = log.scrollHeight;
}
