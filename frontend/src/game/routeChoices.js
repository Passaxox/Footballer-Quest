// Route catalog and deterministic selection system for Footballer Quest Run Structure 2.0.

export const ROUTE_CATALOG = [
  {
    id: "strada-montana",
    name: "Sentiero Alpino",
    theme: "strada-montana",
    description: "Un cammino d'alta quota attraverso passi innevati. Ideale per allenare la resistenza e recuperare le energie.",
    tendency: "Allenamento & Recupero",
    risk: "basso",
    minWave: 1,
    maxWave: 50,
    modifierDesc: "Maggiori nodi Recupero e Allenamento",
    segmentLengthRange: [3, 4],
    archetypeWeights: { training: 2.2, recovery: 2.2, shop: 0.8, recruit: 0.8, battle: 0.8, elite: 0.6 },
  },
  {
    id: "zona-alius",
    name: "Zona d'Influenza Alius",
    theme: "zona-alius",
    description: "Area ad altissima intensità competitiva segnata dall'Accademia Alius. Nemici d'élite e ricompense eccezionali.",
    tendency: "Battaglie Élite & Esperienza",
    risk: "alto",
    minWave: 4,
    maxWave: 50,
    modifierDesc: "+15% Prestigio vittorie, alta densità Élite",
    segmentLengthRange: [3, 4],
    prestigeMultiplier: 1.15,
    archetypeWeights: { elite: 2.6, battle: 1.3, recruit: 0.7, shop: 0.7, training: 0.6, recovery: 0.5 },
  },
  {
    id: "quartiere-commerciale",
    name: "Distretto Commerciale",
    theme: "quartiere-commerciale",
    description: "Vie affollate piene di negozi di articoli sportivi e chioschi energetici dove fare scorta.",
    tendency: "Negozi & Rifornimenti",
    risk: "basso",
    minWave: 1,
    maxWave: 50,
    modifierDesc: "Frequenti Negozi e Nodi Recupero",
    segmentLengthRange: [3, 4],
    archetypeWeights: { shop: 2.5, recovery: 1.8, recruit: 1.0, training: 0.7, battle: 0.8, elite: 0.5 },
  },
  {
    id: "campi-federali",
    name: "Campi di Allenamento Federali",
    theme: "campo-allenamento",
    description: "Strutture all'avanguardia dove si radunano giovani promesse e tecnici del settore giovanile.",
    tendency: "Reclute & Allenamento",
    risk: "medio",
    minWave: 1,
    maxWave: 50,
    modifierDesc: "Più opportunità di Reclutamento e Allenamento",
    segmentLengthRange: [3, 4],
    archetypeWeights: { recruit: 2.2, training: 2.0, battle: 0.8, elite: 0.6, shop: 0.8, recovery: 1.0 },
  },
  {
    id: "circuito-prestigio",
    name: "Circuito dei Grandi Stadi",
    theme: "stadio-prestigio",
    description: "I campi ufficiali delle fasi finali. Sfide continue contro squadre agguerrite per il prestigio massimo.",
    tendency: "Battaglie & Sfide",
    risk: "alto",
    minWave: 7,
    maxWave: 50,
    modifierDesc: "Battaglie ad alto rendimento, sfide continue",
    segmentLengthRange: [3, 5],
    prestigeMultiplier: 1.2,
    archetypeWeights: { battle: 1.8, elite: 2.0, training: 0.8, recruit: 0.8, shop: 0.7, recovery: 0.6 },
  },
  {
    id: "percorso-rapido",
    name: "Linea Diretta Espresso",
    theme: "percorso-rapido",
    description: "Un percorso rapido e serrato che accorcia il tragitto verso il prossimo checkpoint.",
    tendency: "Segmento Breve (2-3 Passi)",
    risk: "medio",
    minWave: 1,
    maxWave: 50,
    modifierDesc: "Segmento più breve: meno passi prima del checkpoint",
    segmentLengthRange: [2, 3],
    archetypeWeights: { battle: 1.2, elite: 1.2, shop: 1.0, recruit: 1.0, training: 0.8, recovery: 0.8 },
  },
  {
    id: "area-metropolitana",
    name: "Area Metropolitana",
    theme: "area-metropolitana",
    description: "Le strade centrali della città. Percorso equilibrato tra sfide cittadine, chioschi e incontri casuali.",
    tendency: "Percorso Bilanciato",
    risk: "medio",
    minWave: 1,
    maxWave: 50,
    modifierDesc: "Distribuzione equilibrata di tutti i tipi di nodi",
    segmentLengthRange: [3, 4],
    archetypeWeights: { battle: 1.0, elite: 1.0, recruit: 1.0, shop: 1.0, training: 1.0, recovery: 1.0 },
  },
  {
    id: "zona-costiera",
    name: "Zona Costiera",
    theme: "campo-allenamento",
    description: "Aria di mare e ritmi rilassati. Ottimo per ricaricare le energie e individuare nuovi talenti locali.",
    tendency: "Recupero & Reclutamento",
    risk: "basso",
    minWave: 4,
    maxWave: 50,
    modifierDesc: "Alta presenza di Recupero e Reclute fresche",
    segmentLengthRange: [3, 4],
    archetypeWeights: { recovery: 2.2, recruit: 1.8, training: 1.0, shop: 1.0, battle: 0.7, elite: 0.5 },
  },
];

export function getRouteById(id) {
  return ROUTE_CATALOG.find(r => r.id === id) || ROUTE_CATALOG[6]; // default to area-metropolitana
}

export function generateRouteChoices(run, count = 3, rng = Math.random) {
  const wave = run?.wave || 1;
  const eligible = ROUTE_CATALOG.filter(r => wave >= r.minWave && (!r.maxWave || wave <= r.maxWave));
  if (eligible.length <= count) return eligible.map(r => ({ ...r }));

  // History repeat protection: penalize routes chosen recently
  const recentRouteIds = (run?.chosenRoutes || []).slice(-3);

  const weightedPool = eligible.map(r => {
    let weight = 10;
    if (recentRouteIds.includes(r.id)) {
      weight = 2; // substantial repeat penalty
    }
    return { route: r, weight };
  });

  const selected = [];
  const pool = [...weightedPool];

  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng() * totalWeight;
    let chosenIndex = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll < 0) {
        chosenIndex = i;
        break;
      }
    }
    selected.push({ ...pool[chosenIndex].route });
    pool.splice(chosenIndex, 1);
  }

  return selected;
}
