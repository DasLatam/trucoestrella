// =================================================================================
// ARCHIVO PRINCIPAL (main.js)
// Contiene el flujo principal del juego, el manejo de estado y los eventos.
// =================================================================================

// --- Variables de Estado Globales ---
// Estas variables guardan toda la información sobre la partida en curso.
let marcador, jugadorHumano, jugadorCPU, manoActual, manosGanadas, resultadosManos, turnoDelHumano, estadoEnvido, estadoTruco, cantoActual, tieneFlor, manoDeLaRonda, jugadorMano, cartaJugadaPorLider, juegoPausado;

// Objeto que contendrá las referencias a los elementos del DOM
let botones; 

// --- Lógica de Juego Principal ---

function comenzarPartida() {
    // Leer la configuración inicial
    PUNTOS_PARA_GANAR = parseInt(document.querySelector('input[name="puntos-partida"]:checked').value);
    JUGAR_CON_FLOR = document.getElementById('con-flor').checked;
    const nombreJugador = document.getElementById('nombre-jugador').value || 'Jugador';
    
    // Configurar jugadores y la interfaz
    jugadorHumano = { nombre: nombreJugador };
    jugadorCPU = { nombre: 'TrucoEstrella' };

    document.getElementById('marcador-humano-nombre').textContent = jugadorHumano.nombre;
    document.getElementById('marcador-cpu-nombre').textContent = jugadorCPU.nombre;
    document.getElementById('nombre-mano-humano').textContent = `Mano de ${jugadorHumano.nombre}`;
    document.getElementById('cpu-titulo').textContent = `Mano de ${jugadorCPU.nombre}`;

    document.getElementById('pantalla-config').style.display = 'none';
    document.getElementById('area-juego-wrapper').style.display = 'block';
    
    // Iniciar la primera partida
    manoDeLaRonda = 'cpu';
    iniciarPartida();
}

function iniciarPartida() {
    marcador = { humano: 0, cpu: 0 };
    manoDeLaRonda = (manoDeLaRonda === 'humano') ? 'cpu' : 'humano'; // Alternar quién empieza
    if(botones.log) { botones.log.innerHTML = ''; }
    iniciarRonda();
}

function iniciarRonda() {
  // Reiniciar todas las variables de la ronda
  manoActual = 1; manosGanadas = { humano: 0, cpu: 0 }; resultadosManos = [];
  estadoEnvido = { nivel: 0, respondido: false }; estadoTruco = 0; cantoActual = null; tieneFlor = { humano: false, cpu: false, respondido: false };
  jugadorMano = manoDeLaRonda; cartaJugadaPorLider = null; reanudarJuego();
  
  jugadorHumano.mano = []; 
  jugadorCPU.mano = [];
  
  actualizarMarcador(); 
  ocultarTodosLosControles(); 
  botones.nuevoJuego.style.display = 'none';
  
  // Limpiar la mesa
  for(let i=1; i<=3; i++) { 
      document.getElementById(`slot-humano-${i}`).innerHTML = ''; 
      document.getElementById(`slot-cpu-${i}`).innerHTML = ''; 
  }

  // Repartir cartas
  const baraja = crearBarajaTruco(); 
  barajar(baraja);
  for (let i = 0; i < 3; i++) { 
      jugadorHumano.mano.push(baraja.pop()); 
      jugadorCPU.mano.push(baraja.pop()); 
  }
  
  // Verificar si hay flor
  if(JUGAR_CON_FLOR) { 
      tieneFlor.humano = detectarFlor(jugadorHumano.mano); 
      tieneFlor.cpu = detectarFlor(jugadorCPU.mano); 
  }

  // Dibujar las manos en la UI
  dibujarManoCPU(true); 
  dibujarMano();

  // Decidir el primer paso de la ronda
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
    
    // Determinar quién es mano para esta jugada
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
        if (manosGanadas.humano === manosGanadas.cpu) { // Cubre empates
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

// --- Ligar eventos a los botones ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el objeto 'botones' después de que el DOM esté cargado.
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

    // Asignar los eventos a los botones usando addEventListener
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