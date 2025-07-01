// --- LÓGICA PRINCIPAL Y FLUJO DEL JUEGO ---

// --- Variables de Estado del Juego ---
let marcador, jugadorHumano, jugadorCPU, manoActual, manosGanadas, resultadosManos, turnoDelHumano, estadoEnvido, estadoTruco, cantoActual, tieneFlor, manoDeLaRonda, jugadorMano, cartaJugadaPorLider, juegoPausado = false;

// --- Funciones de Lógica de Juego Principal ---
function comenzarPartida() {
    PUNTOS_PARA_GANAR = parseInt(document.querySelector('input[name="puntos-partida"]:checked').value);
    JUGAR_CON_FLOR = document.getElementById('con-flor').checked;
    const nombreJugador = document.getElementById('nombre-jugador').value || 'Jugador';
    
    jugadorHumano = { nombre: nombreJugador };
    jugadorCPU = { nombre: 'TrucoEstrella' };

    document.getElementById('marcador-humano-nombre').textContent = jugadorHumano.nombre;
    document.getElementById('marcador-cpu-nombre').textContent = jugadorCPU.nombre;
    document.getElementById('nombre-mano-humano').textContent = `Mano de ${jugadorHumano.nombre}`;
    document.getElementById('cpu-titulo').textContent = `Mano de ${jugadorCPU.nombre}`;

    document.getElementById('pantalla-config').style.display = 'none';
    document.getElementById('area-juego-wrapper').style.display = 'block';
    
    manoDeLaRonda = 'cpu'; // Para que la primera ronda la empiece el humano
    iniciarPartida();
}

function iniciarPartida() {
    marcador = { humano: 0, cpu: 0 };
    manoDeLaRonda = (manoDeLaRonda === 'humano') ? 'cpu' : 'humano'; // Alternar quién empieza
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

// --- Ligar eventos a los botones ---
document.addEventListener('DOMContentLoaded', () => {
    // El juego ahora espera a que se haga clic en "Comenzar Partida" para iniciar
    document.getElementById('btn-comenzar').addEventListener('click', comenzarPartida);
});