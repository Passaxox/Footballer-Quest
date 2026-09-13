// Data-driven Miniboss system for Footballer Quest Run Structure 2.0.
// Minibosses represent strong regional squads and patrol leaders at segment terminals.

export const MINIBOSS_POOLS = [
  {
    id: "royal-patrol",
    team: "Pattuglia d'Élite Royal",
    captainId: "david",
    scenarioIds: ["royal-academy", "urban", "raimon-training"],
    routeThemes: ["campo-allenamento", "stadio-prestigio", "area-metropolitana"],
    minWave: 3,
    maxWave: 15,
    intro: "Una pattuglia selezionata della Royal Academy mette alla prova la vostra tenuta difensiva!",
    ids: ["david:base", "daniel-hatch:royal", "ben-simmons:royal"],
    rewardItem: "tenuta",
    bonusExpMultiplier: 1.25,
  },
  {
    id: "gemini-vanguard",
    team: "Avanguardia Gemini",
    captainId: "pat-box",
    scenarioIds: ["gemini-crash-site", "gemini-field", "urban"],
    routeThemes: ["zona-alius", "percorso-rapido"],
    minWave: 3,
    maxWave: 16,
    intro: "L'avanguardia della Gemini Storm si materializza con velocità extraterrestre!",
    ids: ["pat-box:gemini-ie2", "gregory-saturn:gemini-ie2", "izzy-jupiter:gemini-ie2"],
    rewardItem: "grinta",
    bonusExpMultiplier: 1.25,
  },
  {
    id: "alpine-defense",
    team: "Muro Difensivo Alpine",
    captainId: "kerry-bootgaiter",
    scenarioIds: ["alpine-snow", "urban"],
    routeThemes: ["strada-montana", "campo-allenamento"],
    minWave: 3,
    maxWave: 18,
    intro: "La celebre linea difensiva dell'Alpine Jr. High sbarra il passo con freddezza glaciale!",
    ids: ["kerry-bootgaiter:alpine-ie2", "adam-ropes:alpine-ie2", "joaquine:alpine-ie2"],
    rewardItem: "equilibrio",
    bonusExpMultiplier: 1.25,
  },
  {
    id: "regional-allstars",
    team: "Stelle del Circuito Regionale",
    captainId: "caleb",
    scenarioIds: ["urban", "raimon-training"],
    routeThemes: ["area-metropolitana", "quartiere-commerciale", "stadio-prestigio"],
    minWave: 4,
    maxWave: 25,
    intro: "I fuoriclasse emergenti delle squadre regionali formano un blocco unito per fermarvi!",
    ids: ["caleb:base", "hurley:base", "scotty:base"],
    rewardItem: "tessera",
    bonusExpMultiplier: 1.3,
  },
  {
    id: "epsilon-strike",
    team: "Pattuglia d'Assalto Epsilon",
    captainId: "zell",
    scenarioIds: ["epsilon-lab", "epsilon-base", "urban"],
    routeThemes: ["zona-alius", "percorso-rapido"],
    minWave: 11,
    maxWave: 32,
    intro: "L'unità d'attacco dell'Epsilon scende in campo con potenza distruttiva potenziata!",
    ids: ["zell:epsilon-ie2", "tytan:epsilon-ie2", "krypto:epsilon-ie2"],
    rewardItem: "sigillo",
    bonusExpMultiplier: 1.3,
  },
  {
    id: "diamond-vanguard",
    team: "Avanguardia dei Ghiacci",
    captainId: "beluga",
    scenarioIds: ["diamond-dust-glacier", "alpine-snow"],
    routeThemes: ["strada-montana", "zona-alius"],
    minWave: 12,
    maxWave: 35,
    intro: "I difensori della Diamond Dust creano una barriera impenetrabile di ghiaccio perenne!",
    ids: ["beluga:diamond-dust-ie2", "clara:diamond-dust-ie2", "gokka:diamond-dust-ie2"],
    rewardItem: "borraccia",
    bonusExpMultiplier: 1.3,
  },
  {
    id: "prominence-flame",
    team: "Fronte Infuocato Prominence",
    captainId: "heat",
    scenarioIds: ["prominence-crater", "urban"],
    routeThemes: ["zona-alius", "stadio-prestigio"],
    minWave: 13,
    maxWave: 36,
    intro: "I cannonieri della Prominence accendono il campo con tiri incandescenti!",
    ids: ["heat:prominence-ie2", "bomber:prominence-ie2", "baller:prominence-ie2"],
    rewardItem: "grinta",
    bonusExpMultiplier: 1.3,
  },
  {
    id: "international-trio",
    team: "Rappresentativa Mondiale",
    captainId: "paolo",
    scenarioIds: ["international", "urban"],
    routeThemes: ["stadio-prestigio", "campo-allenamento"],
    minWave: 21,
    maxWave: 50,
    intro: "Una selezione di talenti internazionali vi sfida in un test match di altissimo livello!",
    ids: ["paolo:base", "erik:base", "bobby:base"],
    rewardItem: "stendardo",
    bonusExpMultiplier: 1.35,
  },
  {
    id: "genesis-recon",
    team: "Ricognizione Genesis",
    captainId: "nero",
    scenarioIds: ["genesis-dome", "chaos-stadium"],
    routeThemes: ["zona-alius", "stadio-prestigio"],
    minWave: 25,
    maxWave: 50,
    intro: "La squadra di supporto della Genesis analizza ogni vostro schema in tempo reale!",
    ids: ["nero:genesis-ie2", "gele:genesis-ie2", "zohen:genesis-ie2"],
    rewardItem: "sigillo",
    bonusExpMultiplier: 1.4,
  },
];

export function selectMiniboss(run, wave, rng = Math.random) {
  const eligible = MINIBOSS_POOLS.filter(m => wave >= m.minWave && (m.maxWave == null || wave <= m.maxWave));
  if (!eligible.length) return MINIBOSS_POOLS[0];

  const scenarioId = run?.scenarioState?.id;
  const routeTheme = run?.segmentState?.theme;

  // History repeat protection: penalize recently encountered minibosses
  const recentMinibosses = (run?.routeHistory || [])
    .slice(-15)
    .map(entry => entry.minibossId || entry.teamName)
    .filter(Boolean);

  const weightedRows = eligible.map(m => {
    let weight = 10;
    if (m.scenarioIds && m.scenarioIds.includes(scenarioId)) weight += 15;
    if (m.routeThemes && m.routeThemes.includes(routeTheme)) weight += 15;
    // Repeat penalty: reduce weight by 80% if faced recently
    if (recentMinibosses.includes(m.id) || recentMinibosses.includes(m.team)) {
      weight *= 0.2;
    }
    return { miniboss: m, weight: Math.max(1, weight) };
  });

  let totalWeight = weightedRows.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng() * totalWeight;
  for (const row of weightedRows) {
    roll -= row.weight;
    if (roll < 0) return row.miniboss;
  }
  return weightedRows[0]?.miniboss || MINIBOSS_POOLS[0];
}
