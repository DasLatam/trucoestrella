let reglasCantos = null;

export async function cargarReglasCantos() {
    if (!reglasCantos) {
        const resp = await fetch('json/cantos_reglas.json');
        reglasCantos = await resp.json();
    }
    return reglasCantos;
}

export function esCantoValido({ ronda, esMano, jugoCarta, subioApuesta }, canto) {
    if (!reglasCantos) return false;
    let rondaKey = ronda === 1 ? 'PRIMERA' : ronda === 2 ? 'SEGUNDA' : 'TERCERA';
    let estado = esMano
        ? (subioApuesta ? 'mano_subio' : (jugoCarta ? 'mano_jugo' : 'mano_no_jugo'))
        : (subioApuesta ? 'no_mano_subio' : (jugoCarta ? 'no_mano_jugo' : 'no_mano_no_jugo'));
    let valor = reglasCantos[rondaKey][estado][canto];
    if (typeof valor === 'string') {
        return valor.startsWith('SI');
    }
    return !!valor;
}