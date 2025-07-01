// =================================================================================
// ARCHIVO DE CONFIGURACIÓN Y DATOS BASE (Módulo)
// =================================================================================

export const PALOS = ['oros', 'copas', 'espadas', 'bastos'];
export const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export const JERARQUIA_TRUCO = {
    '1-espadas': 1, '1-bastos': 2, '7-espadas': 3, '7-oros': 4,
    '3-espadas': 5, '3-oros': 5, '3-copas': 5, '3-bastos': 5,
    '2-espadas': 6, '2-oros': 6, '2-copas': 6, '2-bastos': 6,
    '1-oros': 7, '1-copas': 7,
    '12-espadas': 8, '12-oros': 8, '12-copas': 8, '12-bastos': 8,
    '11-espadas': 9, '11-oros': 9, '11-copas': 9, '11-bastos': 9,
    '10-espadas': 10, '10-oros': 10, '10-copas': 10, '10-bastos': 10,
    '7-copas': 11, '7-bastos': 11,
    '6-espadas': 12, '6-oros': 12, '6-copas': 12, '6-bastos': 12,
    '5-espadas': 13, '5-oros': 13, '5-copas': 13, '5-bastos': 13,
    '4-espadas': 14, '4-oros': 14, '4-copas': 14, '4-bastos': 14
};

export const SVG_ICONS = {
    oros: `<g transform="translate(21, 40) scale(0.4)"><circle cx="50" cy="50" r="45" fill="#FFD700" stroke="#DAA520" stroke-width="5"/></g>`,
    copas: `<g transform="translate(16, 18) scale(0.6)"><path d="M 25,5 C 45,5 45,25 25,25 C 5,25 5,5 25,5 M 15,22 C 15,35 35,35 35,22 L 32 60 L 18 60 Z M 10 60 L 40 60 L 35 65 L 15 65 Z" fill="#B71C1C" stroke="#7f0000" stroke-width="2"/></g>`,
    espadas: `<g transform="translate(18, 15) scale(0.6)"><path d="M 25 65 L 25 45 C 20 45, 20 40, 15 40 L 35 40 C 30 40, 30 45, 25 45 M 25 65 L 15 70 L 35 70 Z M 25 5 L 25 40" stroke="black" stroke-width="4" fill="none" /><path d="M25 5 L 35 15 L 15 15 Z" fill="#87CEEB"/></g>`,
    bastos: `<g transform="translate(20, 15) scale(0.6)"><path d="M20,65 C30,55 30,40 20,30 C10,40 10,55 20,65 M20,5 L20,65" stroke="#388E3C" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M20,15 L30,20 L20,25 L10,20Z" fill="#A5D6A7"/></g>`
};

export const SVG_LOMO_CARTA = `<svg viewbox="0 0 70 105" style="background-color: #4A148C; border: 2px solid black; border-radius: 5px; width: 100%; height: 100%;"><text x="35" y="55" font-size="12" font-weight="bold" fill="white" text-anchor="middle">Truco</text><text x="35" y="70" font-size="12" font-weight="bold" fill="#FFD700" text-anchor="middle">Estrella</text></svg>`;