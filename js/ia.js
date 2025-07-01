// =================================================================================
// ARCHIVO DE INTELIGENCIA ARTIFICIAL (IA) (Módulo)
// Contiene toda la lógica de decisiones de la CPU.
// =================================================================================

// Exportamos cada función para que main.js pueda usarla.

// Esta función implementa la estrategia de la CPU para elegir qué carta jugar.
export function elegirCartaCPU(manoCPU, cartaOponente) {
    if (manoCPU.length === 0) {
        return null;
    }

    // Ordenar la mano de la CPU de la peor a la mejor carta para facilitar la estrategia
    manoCPU.sort((a, b) => b.rankingTruco - a.rankingTruco);

    // Si la CPU es mano (no hay carta del oponente en la mesa)
    if (!cartaOponente) {
        // Juega su carta más baja (la peor).
        return manoCPU.shift();
    } else { // Si la CPU está respondiendo a una carta
        // Busca las cartas que le ganarían a la del oponente
        const cartasGanadoras = manoCPU.filter(c => compararCartas(c, cartaOponente) === 'cpu');

        let cartaParaJugar;
        if (cartasGanadoras.length > 0) {
            // Si tiene cartas para ganar, usa la de menor valor entre las ganadoras
            // (La primera del array ordenado de peor a mejor)
            cartaParaJugar = cartasGanadoras[0];
        } else {
            // Si no puede ganar, entrega la carta más alta (la de menor valor) para no perder por tanto en caso de parda.
            manoCPU.sort((a, b) => a.rankingTruco - b.rankingTruco);
            cartaParaJugar = manoCPU[0];
        }
        
        // Quita la carta elegida de la mano de la CPU y la devuelve
        jugadorCPU.mano = jugadorCPU.mano.filter(c => c.id !== cartaParaJugar.id);
        return cartaParaJugar;
    }
}

// Esta función decide cómo responde la CPU a los cantos del jugador.
export function decisionCPU(tipoCanto) {
    reanudarJuego();

    if (tipoCanto === 'truco') {
        const mejorCartaCPU = jugadorCPU.mano.reduce((mejor, actual) => (actual.rankingTruco < mejor.rankingTruco) ? actual : mejor, { rankingTruco: 15 });
        
        if (mejorCartaCPU.rankingTruco <= 5 && estadoTruco < 3) {
            estadoTruco++;
            const canto = estadoTruco === 2 ? "Re-Truco" : "Vale Cuatro";
            agregarAlLog(jugadorCPU.nombre, `Quiero ${canto}`);
            actualizarInfo(botones, `${jugadorCPU.nombre}: ¡QUIERO ${canto.toUpperCase()}!`);
            mostrarBotonesRespuesta('humano', 'truco');
        } else if (mejorCartaCPU.rankingTruco <= 10) {
            estadoTruco++;
            agregarAlLog(jugadorCPU.nombre, "Quiero");
            actualizarInfo(botones, `${jugadorCPU.nombre}: ¡QUIERO!`);
            prepararSiguienteMano();
        } else {
            agregarAlLog(jugadorCPU.nombre, "No Quiero");
            actualizarInfo(botones, `${jugadorCPU.nombre}: No quiero.`);
            finalizarRonda('humano', 'truco');
        }
    } else { // Lógica para el Envido
        const misPuntos = calcularEnvido(jugadorCPU.mano);

        if (misPuntos >= 30 && estadoEnvido.nivel < 3) {
            estadoEnvido.nivel++;
            const nombres = {1: 'Envido', 2: 'Real Envido', 3: 'Falta Envido'};
            agregarAlLog(jugadorCPU.nombre, nombres[estadoEnvido.nivel]);
            actualizarInfo(botones, `${jugadorCPU.nombre} canta: ¡${nombres[estadoEnvido.nivel].toUpperCase()}!`);
            mostrarBotonesRespuesta('humano', 'envido');
        } else if (misPuntos >= 27) {
            agregarAlLog(jugadorCPU.nombre, "Quiero");
            actualizarInfo(botones, `${jugadorCPU.nombre}: ¡QUIERO!`);
            resolverEnvido();
        } else {
            agregarAlLog(jugadorCPU.nombre, "No Quiero");
            actualizarInfo(botones, `${jugadorCPU.nombre}: No quiero.`);
            estadoEnvido.respondido = true;
            marcador.humano += estadoEnvido.nivel || 1;
            actualizarMarcador(botones, marcador, jugadorHumano, jugadorCPU);
            setTimeout(() => {
                reanudarJuego();
                mostrarBotonesDeCantoInicial();
                prepararSiguienteMano();
            }, 2000);
        }
    }
}