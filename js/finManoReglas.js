let reglasFinMano = null;

export async function cargarReglasFinMano() {
    if (!reglasFinMano) {
        const resp = await fetch('json/fin_mano.json');
        reglasFinMano = await resp.json();
    }
    return reglasFinMano;
}

export function esFinDeMano(evento, resultado, ronda) {
    if (!reglasFinMano) return false;
    return reglasFinMano.fin_mano.some(regla => {
        const eventoOk = regla.evento === evento;
        const rondaOk = regla.ronda === "Todas" || regla.ronda === ronda || regla.ronda === String(ronda);
        const positivoOk = regla.cuando_positivo === "Siempre" || regla.cuando_positivo === resultado;
        const negativoOk = regla.cuando_negativo === "Siempre" || regla.cuando_negativo === resultado || regla.cuando_negativo === "No Aplica";
        return eventoOk && rondaOk && (positivoOk || negativoOk);
    });
}