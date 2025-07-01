// =================================================================================
// ARCHIVO DE INTELIGENCIA ARTIFICIAL (IA)
// Contiene toda la lógica de decisiones de la CPU.
// =================================================================================

function elegirCartaCPU() {
    const manoCPU = jugadorCPU.mano;
    if (manoCPU.length === 0) {
        return null;
    }

    // Ordenar la mano de la CPU de la peor a la mejor carta para facilitar la estrategia
    manoCPU.sort((a, b) => b.rankingTruco - a.rankingTruco);

    // Si la CPU es mano (no hay carta del oponente en la mesa)
    if (!cartaJugadaPorLider) {
        // Juega su carta más baja para ver qué hace el oponente.
        return manoCPU.shift();
    } else { // Si la CPU está respondiendo a una carta
        // Busca las cartas que le ganarían a la del oponente
        const cartasGanadoras = manoCPU.filter(c => compararCartas(c, cartaJugadaPorLider) === 'cpu');

        let cartaParaJugar;
        if (cartasGanadoras.length > 0) {
            // Si tiene cartas para ganar, elige la de menor valor entre las ganadoras
            // (La primera del array ordenado de peor a mejor)
            cartaParaJugar = cartasGanadoras[0];
        } else {
            // Si no puede ganar, tira su carta más alta para "perder por más" y guardar las bajas
            // que podrían empatar o ganar una segunda/tercera mano.
            manoCPU.sort((a,b) => a.rankingTruco - b.rankingTruco);
            cartaParaJugar = manoCPU[0];
        }
        
        // Quita la carta elegida de la mano de la CPU y la devuelve
        jugadorCPU.mano = jugadorCPU.mano.filter(c => c.id !== cartaParaJugar.id);
        return cartaParaJugar;
    }
}

function decisionCPU(tipoCanto) {
    reanudarJuego();

    if (tipoCanto === 'truco') {
        // La CPU revisa su mejor carta para decidir
        const mejorCartaCPU = jugadorCPU.mano.reduce((mejor, actual) => (actual.rankingTruco < mejor.rankingTruco) ? actual : mejor, { rankingTruco: 15 });
        
        // Estrategia para responder al truco
        if (mejorCartaCPU.rankingTruco <= 5 && estadoTruco < 3) { // Si tiene una carta muy buena, sube la apuesta
            estadoTruco++;
            const canto = estadoTruco === 2 ? "Re-Truco" : "Vale Cuatro";
            agregarAlLog(jugadorCPU.nombre, `Quiero ${canto}`);
            actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO ${canto.toUpperCase()}!`);
            mostrarBotonesRespuesta('humano', 'truco');
        } else if (mejorCartaCPU.rankingTruco <= 10) { // Si tiene una carta decente, acepta
            estadoTruco++;
            agregarAlLog(jugadorCPU.nombre, "Quiero");
            actualizarInfo(`${jugadorCPU.nombre}: ¡QUIERO!`);
            prepararSiguienteMano();
        } else { // Si tiene malas cartas, se va
            agregarAlLog(jugadorCPU.nombre, "No Quiero");
            actualizarInfo(`${jugadorCPU.nombre}: No quiero.`);
            finalizarRonda('humano', 'truco');
        }
    } else { // Lógica para el Envido
        const misPuntos = calcularEnvido(jugadorCPU.mano);

        // Estrategia para responder al envido
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