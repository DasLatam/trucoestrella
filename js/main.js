// =================================================================================
// ARCHIVO PRINCIPAL (main.js)
// Orquesta todo el juego, maneja el estado y los eventos.
// =================================================================================

// --- Variables de Estado Globales ---
let marcador, jugadorHumano, jugadorCPU, manoActual, manosGanadas, resultadosManos, turnoDelHumano, estadoEnvido, estadoTruco, cantoActual, tieneFlor, manoDeLaRonda, jugadorMano, cartaJugadaPorLider, juegoPausado;
let PUNTOS_PARA_GANAR, JUGAR_CON_FLOR;

// --- Objeto de Botones y Elementos del DOM ---
let botones; 

// --- **NUEVO: Funciones de Pausa que faltaban** ---
function pausarJuego() { 
    juegoPausado = true; 
    console.log("Juego Pausado");
}
function reanudarJuego() { 
    juegoPausado = false; 
    console.log("Juego Reanudado");
}

// --- Lógica de Juego Principal ---
function comenzarPartida() {
    PUNTOS_PARA_GANAR = parseInt(document.querySelector('input[name="puntos-partida"]:checked').value);
    JUGAR_CON_FLOR = document.getElementById('con-flor').checked;
    const nombreJugador = document.getElementById('nombre-jugador').value || 'Jugador';
    
    jugadorHumano = { nombre: nombreJugador, mano: [] };
    jugadorCPU = { nombre: 'TrucoEstrella', mano: [] };

    document.getElementById('marcador-humano-nombre').textContent = jugadorHumano.nombre;
    document.getElementById('marcador-cpu-nombre').textContent = jugadorCPU.nombre;
    document.getElementById('nombre-mano-humano').textContent = `Mano de ${jugadorHumano.nombre}`;
    document.getElementById('cpu-titulo').textContent = `Mano de ${jugadorCPU.nombre}`;

    document.getElementById('pantalla-config').style.display = 'none';
    document.getElementById('area-juego-wrapper').style.display = 'block';
    
    manoDeLaRonda = 'cpu';
    iniciarPartida();
}

function iniciarPartida() {
    marcador = { humano: 0, cpu: 0 };
    manoDeLaRonda = (manoDeLaRonda === 'humano') ? 'cpu' : 'humano';
    if(botones.log) { botones.log.innerHTML = ''; }
    iniciarRonda();
}

function iniciarRonda() {
  manoActual = 1; manosGanadas = { humano: 0, cpu: 0 }; resultadosManos = [];
  estadoEnvido = { nivel: 0, respondido: false }; estadoTruco = 0; cantoActual = null; tieneFlor = { humano: false, cpu: false, respondido: false };
  jugadorMano = manoDeLaRonda; cartaJugadaPorLider = null; reanudarJuego();
  
  jugadorHumano.mano = []; 
  jugadorCPU.mano = [];
  
  actualizarMarcador(); 
  ocultarTodosLosControles(); 
  botones.nuevoJuego.style.display = 'none';
  
  for(let i=1; i<=3; i++) { 
      document.getElementById(`slot-humano-${i}`).innerHTML = ''; 
      document.getElementById(`slot-cpu-${i}`).innerHTML = ''; 
  }

  const baraja = crearBarajaTruco(); 
  barajar(baraja);

  for (let i = 0; i < 3; i++) { 
      jugadorHumano.mano.push(baraja.pop()); 
      jugadorCPU.mano.push(baraja.pop()); 
  }
  
  if(JUGAR_CON_FLOR) { 
      tieneFlor.humano = detectarFlor(jugadorHumano.mano); 
      tieneFlor.cpu = detectarFlor(jugadorCPU.mano); 
  }

  dibujarManoCPU(true); 
  dibujarMano();

  if (tieneFlor.humano) { 
      botones.flor.style.display = 'block'; 
      actualizarInfo(`¡Tienes Flor! Debes cantarla.`); 
  } else if (tieneFlor.cpu) { 
      agregarAlLog(jugadorCPU.nombre, "¡FLOR!"); 
      finalizarRonda(null, {tipo: 'flor', ganador: 'cpu'});
  } else { 
      prepararSiguienteMano(); 
  }
}

function prepararSiguienteMano() {
    if(juegoPausado) return;
    if(manoActual > 1) { 
        const ganadorManoAnterior = resultadosManos[manoActual - 2]; 
        if (ganadorManoAnterior !== 'empate') jugadorMano = ganadorManoAnterior; 
    }
    turnoDelHumano = (jugadorMano === 'humano');
    dibujarMano();
    if (turnoDelHumano) { 
        actualizarInfo(`Mano ${manoActual}. Eres mano, te toca jugar.`); 
        mostrarBotonesDeCantoInicial(); 
    } else { 
        actualizarInfo(`Mano ${manoActual}. Juega ${jugadorCPU.nombre}.`); 
        mostrarBotonesDeCantoInicial(); 
        setTimeout(jugarTurnoCPU, 1500); 
    }
}

function jugarCarta(cartaJugada) {
    if (!turnoDelHumano || juegoPausado) return;
    if(tieneFlor.humano && !tieneFlor.respondido) { 
        actualizarInfo("No puedes jugar, debes cantar la Flor."); 
        return; 
    }
    
    pausarJuego();
    ocultarTodosLosControles(true);
    
    jugadorHumano.mano = jugadorHumano.mano.filter(c => c.id !== cartaJugada.id);
    dibujarMano();
    document.getElementById(`slot-humano-${manoActual}`).appendChild(crearElementoCarta(cartaJugada));
    agregarAlLog(jugadorHumano.nombre, `juega ${cartaJugada.nombre}`);

    if (cartaJugadaPorLider) { // El humano está respondiendo
        setTimeout(() => evaluarMano(cartaJugadaPorLider, cartaJugada), 500);
    } else { // El humano es mano
        cartaJugadaPorLider = cartaJugada; 
        actualizarInfo(`Esperando jugada...`); 
        setTimeout(jugarTurnoCPU, 1500); 
    }
}

function evaluarMano(c1, c2) {
    const jugadorManoActualEsHumano = (jugadorMano === 'humano');
    const cartaHumano = jugadorManoActualEsHumano ? c1 : c2;
    const cartaCPU = jugadorManoActualEsHumano ? c2 : c1;
    const ganadorMano = compararCartas(cartaHumano, cartaCPU);
    
    resultadosManos.push(ganadorMano);
    if (ganadorMano !== 'empate') manosGanadas[ganadorMano]++;

    const elHumano = document.getElementById(`slot-humano-${manoActual}`).firstChild.querySelector('svg');
    const elCPU = document.getElementById(`slot-cpu-${manoActual}`).firstChild.querySelector('svg');

    if(ganadorMano === 'humano') elHumano.classList.add('carta-ganadora');
    else if (ganadorMano === 'cpu') elCPU.classList.add('carta-ganadora');
    
    actualizarInfo((ganadorMano === 'empate') ? 'Mano parda.' : `Gana la mano ${ganadorMano === 'humano' ? jugadorHumano.nombre : jugadorCPU.nombre}.`);
    cartaJugadaPorLider = null;
    setTimeout(revisarFinDeRonda, 2000);
}

function revisarFinDeRonda() {
    const ganoYEmpardoHumano = manosGanadas.humano === 1 && resultadosManos.length >= 2 && resultadosManos[0] === 'humano' && resultadosManos[1] === 'empate';
    const ganoYEmpardoCPU = manosGanadas.cpu === 1 && resultadosManos.length >= 2 && resultadosManos[0] === 'cpu' && resultadosManos[1] === 'empate';
    const ganadorPorDosManos = manosGanadas.humano === 2 || manosGanadas.cpu === 2;

    if (ganadorPorDosManos || ganoYEmpardoHumano || ganoYEmpardoCPU || manoActual === 3) {
        finalizarRonda();
    } else { 
        manoActual++; 
        reanudarJuego(); 
        prepararSiguienteMano(); 
    }
}

function finalizarRonda(ganadorPorNoQuerer, configFlor = null) {
    pausarJuego(); 
    ocultarTodosLosControles(); 
    let ganadorFinal, puntos;

    if(configFlor) {
        puntos = 3;
        ganadorFinal = configFlor.ganador;
    } else if (ganadorPorNoQuerer) {
        ganadorFinal = (ganadorPorNoQuerer === 'humano') ? 'humano' : 'cpu';
        let puntosNoQuerido = { truco: estadoTruco === 0 ? 1 : estadoTruco, envido: [0,1,2,3][estadoEnvido.nivel] };
        puntos = puntosNoQuerido[cantoActual] || 1;
    } else {
        puntos = [1, 2, 3, 4][estadoTruco] || 1;
        if (manosGanadas.humano === manosGanadas.cpu) {
            ganadorFinal = resultadosManos[0] === 'empate' ? manoDeLaRonda : resultadosManos[0];
        } else {
            ganadorFinal = manosGanadas.humano > manosGanadas.cpu ? 'humano' : 'cpu';
        }
    }

    marcador[ganadorFinal] += puntos;
    actualizarMarcador();
    const nombreGanador = (ganadorFinal === 'humano') ? jugadorHumano.nombre : jugadorCPU.nombre;
    actualizarInfo(`🏆 ¡${nombreGanador} gana la ronda y se lleva ${puntos} ${puntos > 1 ? 'puntos' : 'punto'}! 🏆`);
    
    setTimeout(() => {
        if (marcador.humano >= PUNTOS_PARA_GANAR) {
            actualizarInfo(`🎉 ¡FELICIDADES, ${jugadorHumano.nombre.toUpperCase()}, HAS GANADO LA PARTIDA! 🎉`);
            botones.nuevoJuego.style.display = 'block';
        } else if (marcador.cpu >= PUNTOS_PARA_GANAR) {
            actualizarInfo(`Gana ${jugadorCPU.nombre}. ¡Mejor suerte la próxima!`);
            botones.nuevoJuego.style.display = 'block';
        } else {
            iniciarPartida();
        }
    }, 3000);
}

function manejarCantoFlor() { if (!tieneFlor.humano) return; pausarJuego(); ocultarTodosLosControles(); tieneFlor.respondido = true; agregarAlLog(jugadorHumano.nombre, "¡FLOR!"); let mensaje = "¡FLOR! "; marcador.humano += 3; if (tieneFlor.cpu) { marcador.cpu += 3; mensaje += `${jugadorCPU.nombre} también tiene Flor. Son 3 puntos para cada uno.`; agregarAlLog(jugadorCPU.nombre, "¡FLOR!");} else { mensaje += `Son 3 puntos para ti.`; } actualizarInfo(mensaje); actualizarMarcador(); setTimeout(() => { reanudarJuego(); if(marcador.humano < PUNTOS_PARA_GANAR && marcador.cpu < PUNTOS_PARA_GANAR) { prepararSiguienteMano(); } else { finalizarRonda(); } }, 2000); }
function manejarCantoTruco(quienCanta) { if(quienCanta === 'humano') { pausarJuego(); ocultarTodosLosControles(true); cantoActual = 'truco'; estadoTruco = 1; agregarAlLog(jugadorHumano.nombre, "Truco"); actualizarInfo(`¡TRUCO! Esperando respuesta...`); setTimeout(() => decisionCPU('truco'), 1500); } }
function manejarCantoEnvido(quienCanta, nivel) { pausarJuego(); estadoEnvido.nivel = nivel; cantoActual = 'envido'; ocultarTodosLosControles(); const nombres = {1: 'Envido', 2: 'Real Envido', 3: 'Falta Envido'}; if (quienCanta === 'humano') { agregarAlLog(jugadorHumano.nombre, nombres[nivel]); actualizarInfo(`¡${nombres[nivel].toUpperCase()}! Esperando respuesta...`); setTimeout(() => decisionCPU('envido'), 1500); } else { agregarAlLog(jugadorCPU.nombre, nombres[nivel]); actualizarInfo(`${jugadorCPU.nombre} canta: ¡${nombres[nivel].toUpperCase()}!`); mostrarBotonesRespuesta('humano', 'envido'); } }
function manejarRespuesta(quienResponde, respuesta) { pausarJuego(); ocultarTodosLosControles(true); if (quienResponde === 'humano') { let canto = respuesta.replace(/-/g, ' '); canto = canto.charAt(0).toUpperCase() + canto.slice(1); agregarAlLog(jugadorHumano.nombre, canto); if (respuesta === 'quiero') { if (cantoActual === 'envido') { resolverEnvido(); } else { estadoTruco++; actualizarInfo(`¡QUIERO! La ronda vale ${[1,2,3,4][estadoTruco]} puntos.`); reanudarJuego(); prepararSiguienteMano(); } } else if (respuesta === 'no-quiero') { finalizarRonda('cpu'); } else { cantoActual = 'truco'; if(respuesta === 're-truco') estadoTruco = 2; if(respuesta === 'vale-cuatro') estadoTruco = 3; actualizarInfo(`¡${canto.toUpperCase()}! Esperando respuesta...`); setTimeout(() => decisionCPU('truco'), 1500); } } }
function resolverEnvido() { estadoEnvido.respondido = true; const puntosH = calcularEnvido(jugadorHumano.mano); const puntosC = calcularEnvido(jugadorCPU.mano); const puntosMap = {1: 2, 2: 3, 3: PUNTOS_PARA_GANAR - Math.max(marcador.humano, marcador.cpu)}; const puntosEnDisputa = puntosMap[estadoEnvido.nivel] || 2; let ganadorEnvido; if (puntosH >= puntosC) { ganadorEnvido = 'humano'; } else { ganadorEnvido = 'cpu'; } marcador[ganadorEnvido] += puntosEnDisputa; let mensaje = `${ganadorEnvido === 'humano' ? 'Ganas' : 'Gana'} el envido con ${Math.max(puntosH, puntosC)} tantos.`; actualizarInfo(mensaje); agregarAlLog(jugadorHumano.nombre, `${puntosH} tantos.`); agregarAlLog(jugadorCPU.nombre, `${puntosC} tantos.`); actualizarMarcador(); setTimeout(() => { reanudarJuego(); mostrarBotonesDeCantoInicial(); prepararSiguienteMano(); }, 2000); }

// --- Ligar eventos a los botones ---
document.addEventListener('DOMContentLoaded', () => {
    botones = {
        log: document.getElementById('log-juego'),
        marcadorGrafico: document.getElementById('marcador-grafico'),
        info: document.getElementById('info-juego'),
        mano: document.getElementById('mano-humano'),
        manoCPU: document.getElementById('mano-cpu'),
        nuevoJuego: document.getElementById('btn-nuevo-juego'),
        flor: document.getElementById('btn-flor'),
        contraflor: document.getElementById('btn-contraflor'),
        contraflorResto: document.getElementById('btn-contraflor-resto'),
        envido: document.getElementById('btn-envido'),
        realEnvido: document.getElementById('btn-real-envido'),
        faltaEnvido: document.getElementById('btn-falta-envido'),
        truco: document.getElementById('btn-truco'),
        quiero: document.getElementById('btn-quiero'),
        noQuiero: document.getElementById('btn-no-quiero'),
        reTruco: document.getElementById('btn-re-truco'),
        valeCuatro: document.getElementById('btn-vale-cuatro')
    };

    document.getElementById('btn-comenzar').addEventListener('click', comenzarPartida);
    botones.nuevoJuego.addEventListener('click', iniciarPartida);
    botones.flor.addEventListener('click', manejarCantoFlor);
    botones.envido.addEventListener('click', () => manejarCantoEnvido('humano', 1));
    botones.realEnvido.addEventListener('click', () => manejarCantoEnvido('humano', 2));
    botones.faltaEnvido.addEventListener('click', () => manejarCantoEnvido('humano', 3));
    botones.truco.addEventListener('click', () => manejarCantoTruco('humano'));
    botones.quiero.addEventListener('click', () => manejarRespuesta('humano', 'quiero'));
    botones.noQuiero.addEventListener('click', () => manejarRespuesta('humano', 'no-quiero'));
    botones.reTruco.addEventListener('click', () => manejarRespuesta('humano', 're-truco'));
    botones.valeCuatro.addEventListener('click', () => manejarRespuesta('humano', 'vale-cuatro'));
});