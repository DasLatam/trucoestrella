import * as config from './config.js';

// --- Variables de Estado Globales ---
let PUNTOS_PARA_GANAR, JUGAR_CON_FLOR;
let marcador, jugadorHumano, jugadorCPU, manoActual, manosGanadas, resultadosManos, turnoDelHumano, estadoEnvido, estadoTruco, cantoActual, tieneFlor, manoDeLaRonda, jugadorMano, cartaJugadaPorLider, juegoPausado;
let botones; // Se inicializará cuando el DOM esté listo

// --- Funciones de Lógica Pura (sin DOM) ---
function crearBarajaTruco() { const b = []; for (const p of config.PALOS) for (const n of config.NUMEROS) b.push({ numero: n, palo: p, valorEnvido: n < 10 ? n : 0, rankingTruco: config.JERARQUIA_TRUCO[`${n}-${p}`], nombre: `${n} de ${p}`, id: `${n}-${p}` }); return b; }
function barajar(b) { for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; } }
function compararCartas(c1, c2) { if(!c1 || !c2) return 'empate'; if (c1.rankingTruco < c2.rankingTruco) return 'humano'; if (c2.rankingTruco < c1.rankingTruco) return 'cpu'; return 'empate'; }
function calcularEnvido(mano) { if(JUGAR_CON_FLOR && detectarFlor(mano)) return 0; const palos = {}; for (const carta of mano) { if (!palos[carta.palo]) { palos[carta.palo] = []; } palos[carta.palo].push(carta.valorEnvido); } let mejorPuntaje = 0; for (const palo in palos) { const cartasDelPalo = palos[palo]; if (cartasDelPalo.length >= 2) { cartasDelPalo.sort((a, b) => b - a); const puntaje = 20 + cartasDelPalo[0] + cartasDelPalo[1]; if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; } } } if (mejorPuntaje === 0) { const valores = mano.map(carta => carta.valorEnvido); mejorPuntaje = Math.max(...valores); } return mejorPuntaje; }
function detectarFlor(mano) { return mano.every(c => c.palo === mano[0].palo); }

// --- Funciones de IA ---
function elegirCartaCPU() {
    const manoCPU = jugadorCPU.mano;
    if (manoCPU.length === 0) return null;
    manoCPU.sort((a,b) => b.rankingTruco - a.rankingTruco); // Ordena de peor a mejor
    if (!cartaJugadaPorLider) { // Si es mano, juega la peor
        return manoCPU.shift();
    } else { // Si responde
        const cartasGanadoras = manoCPU.filter(c => compararCartas(c, cartaJugadaPorLider) === 'cpu');
        let cartaParaJugar;
        if (cartasGanadoras.length > 0) { // Si puede ganar, usa la más baja de las ganadoras
            cartaParaJugar = cartasGanadoras[0];
        } else { // Si no puede ganar, entrega la más alta
            manoCPU.sort((a,b) => a.rankingTruco - b.rankingTruco);
            cartaParaJugar = manoCPU[0];
        }
        jugadorCPU.mano = jugadorCPU.mano.filter(c => c.id !== cartaParaJugar.id);
        return cartaParaJugar;
    }
}
function decisionCPU(tipoCanto) {
    reanudarJuego();
    if (tipoCanto === 'truco') {
        const mejorCartaCPU = jugadorCPU.mano.reduce((mejor, actual) => (actual.rankingTruco < mejor.rankingTruco) ? actual : mejor, { rankingTruco: 15 });
        if (mejorCartaCPU.rankingTruco <= 5 && estadoTruco < 3) { estadoTruco++; const canto = estadoTruco === 2 ? "Re-Truco" : "Vale Cuatro"; agregarAlLog(jugadorCPU.nombre, `Quiero ${canto}`); actualizarInfo(`La CPU canta: ¡QUIERO ${canto.toUpperCase()}!`); mostrarBotonesRespuesta('humano', 'truco'); }
        else if (mejorCartaCPU.rankingTruco <= 10) { estadoTruco++; agregarAlLog(jugadorCPU.nombre, "Quiero"); actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`); prepararSiguienteMano(); }
        else { agregarAlLog(jugadorCPU.nombre, "No Quiero"); actualizarInfo(`${jugadorCPU.nombre}: No quiero.`); finalizarRonda('humano', 'truco'); }
    } else { // Envido
        const misPuntos = calcularEnvido(jugadorCPU.mano);
        if (misPuntos >= 30 && estadoEnvido.nivel < 3) { estadoEnvido.nivel++; const nombres = {1: 'Envido', 2: 'Real Envido', 3: 'Falta Envido'}; agregarAlLog(jugadorCPU.nombre, nombres[estadoEnvido.nivel]); actualizarInfo(`${jugadorCPU.nombre} canta: ¡${nombres[estadoEnvido.nivel].toUpperCase()}!`); mostrarBotonesRespuesta('humano', 'envido'); }
        else if (misPuntos >= 27) { agregarAlLog(jugadorCPU.nombre, "Quiero"); actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`); resolverEnvido(); }
        else { agregarAlLog(jugadorCPU.nombre, "No Quiero"); actualizarInfo(`${jugadorCPU.nombre}: No quiero.`); estadoEnvido.respondido = true; marcador.humano += estadoEnvido.nivel || 1; actualizarMarcador(); setTimeout(() => { reanudarJuego(); mostrarBotonesDeCantoInicial(); prepararSiguienteMano(); }, 2000); }
    }
}

// --- Funciones de UI (Manejo del DOM) ---
function agregarAlLog(autor, mensaje) { const p = document.createElement('p'); p.innerHTML = `<strong>${autor}:</strong> ${mensaje}`; botones.log.appendChild(p); botones.log.scrollTop = botones.log.scrollHeight; }
function actualizarInfo(mensaje) { botones.info.innerHTML = mensaje; }
function actualizarMarcador() { dibujarMarcadorGrafico(); if(botones.marcadorDigital) botones.marcadorDigital.textContent = `${jugadorHumano.nombre}: ${marcador.humano} - ${jugadorCPU.nombre}: ${marcador.cpu}`; }
function dibujarMarcadorGrafico() {
    if(!jugadorHumano) return;
    document.getElementById('marcador-humano-nombre').textContent = jugadorHumano.nombre;
    document.getElementById('marcador-cpu-nombre').textContent = jugadorCPU.nombre;
    const porotosHumano = document.getElementById('marcador-humano-porotos');
    const porotosCPU = document.getElementById('marcador-cpu-porotos');
    porotosHumano.innerHTML = ''; porotosCPU.innerHTML = '';
    let htmlHumano = '', htmlCPU = '';
    for(let i = 1; i <= marcador.humano; i++) { htmlHumano += `<div class="poroto-grupo"><div class="poroto ${i % 5 === 0 ? 'quinto' : ''}"></div></div>`; if(i === 15) htmlHumano += '<div class="linea-buenas"></div>'; }
    for(let i = 1; i <= marcador.cpu; i++) { htmlCPU += `<div class="poroto-grupo"><div class="poroto ${i % 5 === 0 ? 'quinto' : ''}"></div></div>`; if(i === 15) htmlCPU += '<div class="linea-buenas"></div>'; }
    porotosHumano.innerHTML = htmlHumano; porotosCPU.innerHTML = htmlCPU;
}
function crearElementoCarta(carta, esLomo = false) { if (esLomo) { const lomo = document.createElement('div'); lomo.className = 'carta'; lomo.innerHTML = config.SVG_LOMO_CARTA; return lomo; } const color = (carta.palo === 'oros' || carta.palo === 'copas') ? '#B71C1C' : 'black'; const svgCarta = `<svg viewbox="0 0 85 125" style="background-color: white; border: 2px solid black; border-radius: 8px; width: 100%; height: 100%;"><text x="5" y="18" font-size="16" font-weight="bold" fill="${color}">${carta.numero}</text><g transform="scale(0.8) translate(5, 5)">${config.SVG_ICONS[carta.palo]}</g><text x="42.5" y="118" font-size="9" text-anchor="middle" fill="#424242">${carta.palo.charAt(0).toUpperCase() + carta.palo.slice(1)}</text><text x="80" y="110" font-size="16" font-weight="bold" fill="${color}" transform="rotate(180, 42.5, 62.5)">${carta.numero}</text></svg>`; const el = document.createElement('div'); el.className = 'carta'; el.innerHTML = svgCarta; return el; }
function dibujarMano() { botones.mano.innerHTML = ''; jugadorHumano.mano.forEach(c => { const el = crearElementoCarta(c); el.addEventListener('click', () => jugarCarta(c)); botones.mano.appendChild(el); }); actualizarEstadoBotonesMano(); }
function dibujarManoCPU(inicial = false) { if(inicial) { botones.manoCPU.innerHTML = ''; for(let i = 0; i < 3; i++) { botones.manoCPU.appendChild(crearElementoCarta(null, true)); } } else { if(botones.manoCPU.firstChild) botones.manoCPU.removeChild(botones.manoCPU.firstChild); } }
function actualizarEstadoBotonesMano(){ const cartasEnMano = botones.mano.querySelectorAll('.carta'); cartasEnMano.forEach(cartaEl => { cartaEl.disabled = !turnoDelHumano || juegoPausado; }); }
function ocultarTodosLosControles(dejarTruco = false) { for (const key in botones) { if (botones[key] && typeof botones[key].style !== 'undefined') { if (!['marcadorDigital', 'marcadorGrafico', 'info', 'mano', 'nuevoJuego', 'log', 'manoCPU'].includes(key)) { if(dejarTruco && key === 'truco' && estadoTruco < 1) continue; botones[key].style.display = 'none'; } } } }
function mostrarBotonesRespuesta(turno, tipoCanto) { pausarJuego(); if(turno === 'humano') { botones.quiero.style.display = 'block'; botones.noQuiero.style.display = 'block'; if (tipoCanto === 'truco') { if(estadoTruco === 1) botones.reTruco.style.display = 'block'; if(estadoTruco === 2) botones.valeCuatro.style.display = 'block'; } else { if(estadoEnvido.nivel < 2) botones.realEnvido.style.display = 'block'; if(estadoEnvido.nivel < 3) botones.faltaEnvido.style.display = 'block'; } } }
function mostrarBotonesDeCantoInicial() { if(juegoPausado || !turnoDelHumano) { ocultarTodosLosControles(); return; }; if(manoActual === 1 && !estadoEnvido.respondido) { if(tieneFlor.humano) { botones.flor.style.display = 'block'; } else if(!tieneFlor.cpu) { botones.envido.style.display = 'block'; botones.realEnvido.style.display = 'block'; botones.faltaEnvido.style.display = 'block';} } if(estadoTruco < 1) { botones.truco.style.display = 'block'; } }

// --- Flujo Principal y Lógica de Cantos ---
function pausarJuego() { juegoPausado = true; }
function reanudarJuego() { juegoPausado = false; }
function iniciarPartida() { 
    marcador = { humano: 0, cpu: 0 }; 
    // Inicializar jugadores si no existen
    if (!jugadorHumano) jugadorHumano = { nombre: "Vos", mano: [] };
    if (!jugadorCPU) jugadorCPU = { nombre: "CPU", mano: [] };
    manoDeLaRonda = (manoDeLaRonda === 'humano') ? 'cpu' : 'humano'; 
    if(botones.log) { botones.log.innerHTML = ''; } 
    iniciarRonda(); 
}
function comenzarPartida() {
    document.getElementById('btn-comenzar').style.display = 'none';
    iniciarPartida();
}
window.comenzarPartida = comenzarPartida; // Hace la función global para el DOM

function iniciarRonda() {
    // Asegura que los jugadores existen (solución definitiva)
    if (!jugadorHumano) jugadorHumano = { nombre: "Vos", mano: [] };
    if (!jugadorCPU) jugadorCPU = { nombre: "CPU", mano: [] };

    manoActual = 1; 
    manosGanadas = { humano: 0, cpu: 0 }; 
    resultadosManos = [];
    estadoEnvido = { nivel: 0, respondido: false }; 
    estadoTruco = 0; 
    cantoActual = null; 
    tieneFlor = { humano: false, cpu: false, respondido: false };
    jugadorMano = manoDeLaRonda; 
    cartaJugadaPorLider = null; 
    reanudarJuego();
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
    }
    else if (tieneFlor.cpu) { 
        agregarAlLog(jugadorCPU.nombre, "¡FLOR!"); 
        finalizarRonda(null, {tipo: 'flor', ganador: 'cpu'}); 
    }
    else { 
        prepararSiguienteMano(); 
    }
}
function prepararSiguienteMano() {
    if(juegoPausado) return;
    if(manoActual > 1) { const ganadorManoAnterior = resultadosManos[manoActual - 2]; if (ganadorManoAnterior !== 'empate') jugadorMano = ganadorManoAnterior; }
    turnoDelHumano = (jugadorMano === 'humano');
    dibujarMano();
    if (turnoDelHumano) { actualizarInfo(`Mano ${manoActual}. Eres mano, te toca jugar.`); mostrarBotonesDeCantoInicial(); }
    else { actualizarInfo(`Mano ${manoActual}. Juega ${jugadorCPU.nombre}.`); mostrarBotonesDeCantoInicial(); setTimeout(jugarTurnoCPU, 1500); }
}
function jugarCarta(cartaJugada) {
    if (!turnoDelHumano || juegoPausado) return;
    if(tieneFlor.humano && !tieneFlor.respondido) { actualizarInfo("No puedes jugar, debes cantar la Flor."); return; }
    pausarJuego();
    ocultarTodosLosControles(true);
    jugadorHumano.mano = jugadorHumano.mano.filter(c => c.id !== cartaJugada.id);
    dibujarMano();
    document.getElementById(`slot-humano-${manoActual}`).appendChild(crearElementoCarta(cartaJugada));
    agregarAlLog(jugadorHumano.nombre, `juega ${cartaJugada.nombre}`);
    if (cartaJugadaPorLider) { setTimeout(() => evaluarMano(cartaJugadaPorLider, cartaJugada), 500); }
    else { cartaJugadaPorLider = cartaJugada; actualizarInfo(`Esperando jugada...`); setTimeout(jugarTurnoCPU, 1500); }
}
function jugarTurnoCPU() {
    if (juegoPausado) { setTimeout(jugarTurnoCPU, 500); return; }
    pausarJuego();
    if(manoActual === 1 && !estadoEnvido.respondido && !tieneFlor.cpu && jugadorMano === 'cpu') {
        const misPuntos = calcularEnvido(jugadorCPU.mano);
        if (misPuntos >= 30) { manejarCantoEnvido('cpu', 1); return; }
    }
    const cartaAJugar = elegirCartaCPU(cartaJugadaPorLider);
    if(!cartaAJugar) { reanudarJuego(); return; }
    dibujarManoCPU();
    document.getElementById(`slot-cpu-${manoActual}`).appendChild(crearElementoCarta(cartaAJugar));
    agregarAlLog(jugadorCPU.nombre, `juega ${cartaAJugar.nombre}`);
    if (cartaJugadaPorLider) { evaluarMano(cartaJugadaPorLider, cartaAJugar); }
    else { cartaJugadaPorLider = cartaAJugar; turnoDelHumano = true; dibujarMano(); actualizarInfo(`${jugadorCPU.nombre} jugó. Te toca responder.`); mostrarBotonesDeCantoInicial(); reanudarJuego(); }
}
function evaluarMano(c1, c2) { /* ... lógica sin cambios ... */ }
function revisarFinDeRonda() { /* ... lógica sin cambios ... */ }
function finalizarRonda(ganadorPorNoQuerer, configFlor = null) { /* ... lógica sin cambios ... */ }
function manejarCantoFlor() { /* ... lógica sin cambios ... */ }
function manejarCantoTruco(quienCanta) { /* ... lógica sin cambios ... */ }
function manejarCantoEnvido(quienCanta, nivel) { /* ... lógica sin cambios ... */ }
function manejarRespuesta(quienResponde, respuesta) { /* ... lógica sin cambios ... */ }
function resolverEnvido() { /* ... lógica sin cambios ... */ }

// --- Inicialización del Juego ---
document.addEventListener('DOMContentLoaded', () => {
    botones = {
        log: document.getElementById('log-juego'),
        marcadorDigital: document.getElementById('marcador-digital'),
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

// Se rellenan las funciones omitidas con su lógica completa para asegurar que no falte nada
evaluarMano = function(c1, c2) { const jugadorManoActualEsHumano = (jugadorMano === 'humano'); const cartaHumano = jugadorManoActualEsHumano ? c1 : c2; const cartaCPU = jugadorManoActualEsHumano ? c2 : c1; const ganadorMano = compararCartas(cartaHumano, cartaCPU); resultadosManos.push(ganadorMano); if (ganadorMano !== 'empate') manosGanadas[ganadorMano]++; const elHumano = document.getElementById(`slot-humano-${manoActual}`).firstChild.querySelector('svg'); const elCPU = document.getElementById(`slot-cpu-${manoActual}`).firstChild.querySelector('svg'); if(ganadorMano === 'humano') elHumano.classList.add('carta-ganadora'); else if (ganadorMano === 'cpu') elCPU.classList.add('carta-ganadora'); actualizarInfo((ganadorMano === 'empate') ? 'Mano parda.' : `Gana la mano ${ganadorMano === 'humano' ? jugadorHumano.nombre : jugadorCPU.nombre}.`); cartaJugadaPorLider = null; setTimeout(revisarFinDeRonda, 2000); };
revisarFinDeRonda = function() { const ganoYEmpardoHumano = manosGanadas.humano === 1 && resultadosManos.length >= 2 && resultadosManos[0] === 'humano' && resultadosManos[1] === 'empate'; const ganoYEmpardoCPU = manosGanadas.cpu === 1 && resultadosManos.length >= 2 && resultadosManos[0] === 'cpu' && resultadosManos[1] === 'empate'; const ganadorPorDosManos = manosGanadas.humano === 2 || manosGanadas.cpu === 2; if (ganadorPorDosManos || ganoYEmpardoHumano || ganoYEmpardoCPU || manoActual === 3) { finalizarRonda(); } else { manoActual++; reanudarJuego(); prepararSiguienteMano(); } };
finalizarRonda = function(ganadorPorNoQuerer, configFlor = null) { pausarJuego(); ocultarTodosLosControles(); let ganadorFinal, puntos; if(configFlor) { puntos = 3; ganadorFinal = configFlor.ganador; } else if (ganadorPorNoQuerer) { ganadorFinal = (ganadorPorNoQuerer === 'humano') ? 'humano' : 'cpu'; let puntosNoQuerido = { truco: estadoTruco === 0 ? 1 : estadoTruco, envido: [0,1,2,3][estadoEnvido.nivel] }; puntos = puntosNoQuerido[cantoActual] || 1; } else { puntos = [1, 2, 3, 4][estadoTruco] || 1; if (manosGanadas.humano === manosGanadas.cpu) { ganadorFinal = resultadosManos[0] === 'empate' ? manoDeLaRonda : resultadosManos[0]; } else { ganadorFinal = manosGanadas.humano > manosGanadas.cpu ? 'humano' : 'cpu'; } } marcador[ganadorFinal] += puntos; actualizarMarcador(); const nombreGanador = (ganadorFinal === 'humano') ? jugadorHumano.nombre : jugadorCPU.nombre; actualizarInfo(`🏆 ¡${nombreGanador} gana la ronda y se lleva ${puntos} ${puntos > 1 ? 'puntos' : 'punto'}! 🏆`); setTimeout(() => { if (marcador.humano >= PUNTOS_PARA_GANAR) { actualizarInfo(`🎉 ¡FELICIDADES, ${jugadorHumano.nombre.toUpperCASE()}, HAS GANADO LA PARTIDA! 🎉`); botones.nuevoJuego.style.display = 'block'; } else if (marcador.cpu >= PUNTOS_PARA_GANAR) { actualizarInfo(`Gana ${jugadorCPU.nombre}. ¡Mejor suerte la próxima!`); botones.nuevoJuego.style.display = 'block'; } else { iniciarPartida(); } }, 3000); };
manejarCantoFlor = function() { if (!tieneFlor.humano) return; pausarJuego(); ocultarTodosLosControles(); tieneFlor.respondido = true; agregarAlLog(jugadorHumano.nombre, "¡FLOR!"); let mensaje = "¡FLOR! "; marcador.humano += 3; if (tieneFlor.cpu) { marcador.cpu += 3; mensaje += `${jugadorCPU.nombre} también tiene Flor. Son 3 puntos para cada uno.`; agregarAlLog(jugadorCPU.nombre, "¡FLOR!");} else { mensaje += `Son 3 puntos para ti.`; } actualizarInfo(mensaje); actualizarMarcador(); setTimeout(() => { reanudarJuego(); if(marcador.humano < PUNTOS_PARA_GANAR && marcador.cpu < PUNTOS_PARA_GANAR) { prepararSiguienteMano(); } else { finalizarRonda(); } }, 2000); };
manejarCantoTruco = function(quienCanta) { if(quienCanta === 'humano') { pausarJuego(); ocultarTodosLosControles(true); cantoActual = 'truco'; estadoTruco = 1; agregarAlLog(jugadorHumano.nombre, "Truco"); actualizarInfo(`¡TRUCO! Esperando respuesta...`); setTimeout(() => decisionCPU('truco'), 1500); } };
manejarCantoEnvido = function(quienCanta, nivel) { pausarJuego(); estadoEnvido.nivel = nivel; cantoActual = 'envido'; ocultarTodosLosControles(); const nombres = {1: 'Envido', 2: 'Real Envido', 3: 'Falta Envido'}; if (quienCanta === 'humano') { agregarAlLog(jugadorHumano.nombre, nombres[nivel]); actualizarInfo(`¡${nombres[nivel].toUpperCase()}! Esperando respuesta...`); setTimeout(() => decisionCPU('envido'), 1500); } else { agregarAlLog(jugadorCPU.nombre, nombres[nivel]); actualizarInfo(`${jugadorCPU.nombre} canta: ¡${nombres[nivel].toUpperCase()}!`); mostrarBotonesRespuesta('humano', 'envido'); } };
manejarRespuesta = function(quienResponde, respuesta) { pausarJuego(); ocultarTodosLosControles(true); if (quienResponde === 'humano') { let canto = respuesta.replace(/-/g, ' '); canto = canto.charAt(0).toUpperCase() + canto.slice(1); agregarAlLog(jugadorHumano.nombre, canto); if (respuesta === 'quiero') { reanudarJuego(); if (cantoActual === 'envido') { resolverEnvido(); } else { estadoTruco++; actualizarInfo(`¡QUIERO! La ronda vale ${[1,2,3,4][estadoTruco]} puntos.`); prepararSiguienteMano(); } } else if (respuesta === 'no-quiero') { finalizarRonda('cpu', cantoActual); } else { cantoActual = 'truco'; if(respuesta === 're-truco') estadoTruco = 2; if(respuesta === 'vale-cuatro') estadoTruco = 3; actualizarInfo(`¡${canto.toUpperCase()}! Esperando respuesta...`); setTimeout(() => decisionCPU('truco'), 1500); } } };
decisionCPU = function(tipoCanto) { reanudarJuego(); if (tipoCanto === 'truco') { const mejorCartaCPU = jugadorCPU.mano.reduce((mejor, actual) => (actual.rankingTruco < mejor.rankingTruco) ? actual : mejor, {rankingTruco: 15}); if (mejorCartaCPU.rankingTruco <= 5 && estadoTruco < 3) { estadoTruco++; const canto = estadoTruco === 2 ? "Re-Truco" : "Vale Cuatro"; agregarAlLog(jugadorCPU.nombre, `Quiero ${canto}`); actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO ${canto.toUpperCase()}!`); mostrarBotonesRespuesta('humano', 'truco'); } else if (mejorCartaCPU.rankingTruco <= 10) { estadoTruco++; agregarAlLog(jugadorCPU.nombre, "Quiero"); actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`); prepararSiguienteMano(); } else { agregarAlLog(jugadorCPU.nombre, "No Quiero"); actualizarInfo(`${jugadorCPU.nombre}: No quiero.`); finalizarRonda('humano', 'truco'); } } else { const misPuntos = calcularEnvido(jugadorCPU.mano); if (misPuntos >= 30 && estadoEnvido.nivel < 3) { estadoEnvido.nivel++; const nombres = {1: 'Envido', 2: 'Real Envido', 3: 'Falta Envido'}; agregarAlLog(jugadorCPU.nombre, nombres[estadoEnvido.nivel]); actualizarInfo(`${jugadorCPU.nombre} canta: ¡${nombres[estadoEnvido.nivel].toUpperCase()}!`); mostrarBotonesRespuesta('humano', 'envido'); } else if (misPuntos >= 27) { agregarAlLog(jugadorCPU.nombre, "Quiero"); actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`); resolverEnvido(); } else { agregarAlLog(jugadorCPU.nombre, "No Quiero"); actualizarInfo(`${jugadorCPU.nombre}: No quiero.`); estadoEnvido.respondido = true; marcador.humano += estadoEnvido.nivel || 1; actualizarMarcador(); setTimeout(() => { reanudarJuego(); mostrarBotonesDeCantoInicial(); prepararSiguienteMano(); }, 2000); } } };
resolverEnvido = function() { estadoEnvido.respondido = true; const puntosH = calcularEnvido(jugadorHumano.mano); const puntosC = calcularEnvido(jugadorCPU.mano); const puntosMap = { 1: 2, 2: 3, 3: PUNTOS_PARA_GANAR - Math.max(marcador.humano, marcador.cpu) }; const puntosEnDisputa = puntosMap[estadoEnvido.nivel] || 2; let ganadorEnvido; if (puntosH >= puntosC) { ganadorEnvido = 'humano'; } else { ganadorEnvido = 'cpu'; } marcador[ganadorEnvido] += puntosEnDisputa; let mensaje = `${ganadorEnvido === 'humano' ? 'Ganas' : 'Gana'} el envido con ${Math.max(puntosH, puntosC)} tantos.`; actualizarInfo(mensaje); agregarAlLog(jugadorHumano.nombre, `${puntosH} tantos.`); agregarAlLog(jugadorCPU.nombre, `${puntosC} tantos.`); actualizarMarcador(); setTimeout(() => { reanudarJuego(); mostrarBotonesDeCantoInicial(); prepararSiguienteMano(); }, 2000); };