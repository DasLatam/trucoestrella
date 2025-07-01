// =================================================================================
// ARCHIVO DE INTELIGENCIA ARTIFICIAL (IA)
// =================================================================================

function elegirCartaCPU() {
    const manoCPU = jugadorCPU.mano;
    if (manoCPU.length === 0) return null;

    // Ordenar mano de peor a mejor para facilitar la estrategia
    manoCPU.sort((a, b) => b.rankingTruco - a.rankingTruco);

    if (!cartaJugadaPorLider) { // Si la CPU es mano
        // Juega su carta más baja (la peor)
        return manoCPU.shift();
    } else { // Si la CPU está respondiendo
        // Busca las cartas que le ganarían a la del oponente
        const cartasGanadoras = manoCPU.filter(c => compararCartas(c, cartaJugadaPorLider) === 'cpu');
        
        let cartaParaJugar;
        if (cartasGanadoras.length > 0) {
            // Si tiene cartas para ganar, usa la de menor valor entre las ganadoras
            cartaParaJugar = cartasGanadoras[0];
        } else {
            // Si no puede ganar, entrega la carta más alta (la de menor valor) para no perder por tanto
            manoCPU.sort((a, b) => a.rankingTruco - b.rankingTruco);
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
        if (mejorCartaCPU.rankingTruco <= 5 && estadoTruco < 3) {
            estadoTruco++;
            const canto = estadoTruco === 2 ? "Re-Truco" : "Vale Cuatro";
            agregarAlLog(jugadorCPU.nombre, `Quiero ${canto}`);
            actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO ${canto.toUpperCase()}!`);
            mostrarBotonesRespuesta('humano', 'truco');
        } else if (mejorCartaCPU.rankingTruco <= 10) {
            estadoTruco++;
            agregarAlLog(jugadorCPU.nombre, "Quiero");
            actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`);
            prepararSiguienteMano();
        } else {
            agregarAlLog(jugadorCPU.nombre, "No Quiero");
            actualizarInfo(`${jugadorCPU.nombre}: No quiero.`);
            finalizarRonda('humano', 'truco');
        }
    } else { // Envido
        const misPuntos = calcularEnvido(jugadorCPU.mano);
        if (misPuntos >= 30 && estadoEnvido.nivel < 3) {
            estadoEnvido.nivel++;
            const nombres = {1: 'Envido', 2: 'Real Envido', 3: 'Falta Envido'};
            agregarAlLog(jugadorCPU.nombre, nombres[estadoEnvido.nivel]);
            actualizarInfo(`${jugadorCPU.nombre} canta: ¡${nombres[estadoEnvido.nivel].toUpperCase()}!`);
            mostrarBotonesRespuesta('humano', 'envido');
        } else if (misPuntos >= 27) {
            agregarAlLog(jugadorCPU.nombre, "Quiero");
            actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`);
            resolverEnvido();
        } else {
            agregarAlLog(jugadorCPU.nombre, "No Quiero");
            actualizarInfo(`${jugadorCPU.nombre}: No quiero.`);
            estadoEnvido.respondido = true;
            marcador.humano += estadoEnvido.nivel || 1;
            actualizarMarcador();
            setTimeout(() => {
                reanudarJuego();
                mostrarBotonesDeCantoInicial();
                prepararSiguienteMano();
            }, 2000);
        }
    }
}