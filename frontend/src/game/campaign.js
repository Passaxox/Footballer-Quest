import { POOL_BY_ID, PHASE_POOLS } from "./bossPools";

// Campaign: macro-scenario (act) → area (lane) → location (scenario pool) → node.
const RAIMON = "raimon-training";

export const ACTS = [
  { id: "act1", index: 1, fromWave: 1, toWave: 10, palette: "act1", title: "Raimon e Tokyo", macro: "Football Frontier",
    where: "Inazuma Town, Tokyo. Il vecchio campo della Raimon, la Torre di Ferro e l'argine del fiume.",
    who: "Rivali di Tokyo e del primo Football Frontier: chi vi aspetta cambia a ogni run.",
    why: "Una squadra senza nome deve guadagnarsi il rispetto: superare {mini} e poi battere {boss} apre le porte del Football Frontier.",
    lanes: [
      { id: "campo", name: "Campo Raimon", scenarioId: RAIMON, env: "Campi Raimon", weights: { battle: 4, training: 3, recruit: 2, event: 1, shop: 1 }, hint: "Allenamenti e compagni di scuola" },
      { id: "argine", name: "Argine del fiume", scenarioId: "riverside", env: "Lungofiume", weights: { battle: 4, recruit: 3, event: 2, shop: 1, training: 1 }, hint: "Talenti di strada da reclutare" },
      { id: "torre", name: "Torre di Ferro", scenarioId: "iron-tower", env: "Torre di Ferro", weights: { battle: 5, training: 2, event: 2, recruit: 1, shop: 1 }, hint: "Sfide dure, più esperienza" },
      { id: "citta", name: "Inazuma Town", scenarioId: "urban", env: "Quartiere", weights: { battle: 4, shop: 3, recruit: 2, event: 2, training: 1 }, hint: "Negozi ed eventi in città" },
    ],
    rival: { teamName: "Royal Academy", teamId: "royal-academy", count: 2, pool: ["jude:royal", "david", "joseph", "herman-waldon:royal", "daniel-hatch:royal", "peter-drent:royal", "ben-simmons:royal", "alan-master:royal", "gus-martin:royal"],
      intro: "Gli esploratori della Royal Academy vi osservano da bordo campo. «Vediamo se meritate la nostra attenzione.»" },
    consequence: { title: "Accesso al Football Frontier", text: "La vittoria su {boss} fa il giro di Tokyo: la vostra squadra è iscritta al Football Frontier. Jude Sharp, che vi osservava dalla tribuna, lascia la Royal e sceglie la Raimon.",
      unlock: "jude:base", unlockText: "Jude Sharp (Raimon) è disponibile nello scouting." } },
  { id: "act2", index: 2, fromWave: 11, toWave: 20, palette: "act2", title: "Football Frontier", macro: "Football Frontier",
    where: "Il torneo nazionale: gironi, tribune piene e trasferte tra gli stadi.",
    who: "Le squadre del Football Frontier: il tabellone e la finale cambiano a ogni edizione.",
    why: "Il tabellone cambia a ogni edizione: {mini} vi aspetta a metà torneo, {boss} in finale.",
    lanes: [
      { id: "gironi", name: "Gironi del torneo", scenarioId: "ff-qualifiers", env: "Stadi del torneo", weights: { battle: 5, recruit: 2, event: 1, shop: 1, training: 1 }, hint: "Più partite, più reclute" },
      { id: "rivincita", name: "Rivincita Royal", scenarioId: "royal-academy", env: "Territorio Royal", weights: { battle: 5, training: 2, event: 1, shop: 1, recruit: 1 }, hint: "La Royal cerca vendetta" },
      { id: "olimpo", name: "Ombre di Zeus", scenarioId: "zeus", env: "Stadio Zeus", weights: { battle: 4, event: 2, training: 2, shop: 1, recruit: 1 }, hint: "Studia gli dèi prima della finale" },
      { id: "tifosi", name: "Città dei tifosi", scenarioId: "urban", env: "Quartiere", weights: { battle: 3, shop: 3, recruit: 2, event: 2, training: 1 }, hint: "Rifornimenti e incontri" },
    ],
    rival: { teamName: "Zeus", teamId: "zeus", count: 2, pool: ["poseidon:zeus", "apollon:zeus", "hephais:zeus", "ares:zeus", "dio:zeus", "artemis:zeus", "hermes:zeus", "athena:zeus", "hera:zeus"],
      intro: "Due giocatori della Zeus vi bloccano il corridoio dello stadio. «Gli dèi vogliono misurarvi.»" },
    consequence: { title: "Campioni del Football Frontier", text: "{boss} cade e la coppa è vostra. Ma durante la festa, un pallone nero squarcia il cielo: l'Accademia Alius dichiara guerra al calcio giapponese.",
      unlock: "byron:base", unlockText: "Byron Love si unisce alla resistenza: disponibile nello scouting." } },
  { id: "act3", index: 3, fromWave: 21, toWave: 30, palette: "act3", title: "Alius, la risposta", macro: "Accademia Alius",
    where: "In viaggio con la Carovana Inazuma tra Nara, Osaka e Hokkaido.",
    who: "L'Accademia Alius: Epsilon, Prominence e i capitani del Ghiaccio. Il ramo scelto decide il checkpoint.",
    why: "Ogni tappa cambia chi incontri e chi puoi reclutare. Dopo {mini}, il ramo scelto decide se alla W30 affronterete {boss}.",
    lanes: [
      { id: "hokkaido", name: "Hokkaido", scenarioId: "hokkaido", env: "Neve di Hokkaido", weights: { recruit: 4, battle: 4, event: 1, training: 1, shop: 1 }, hint: "Scouting locale: Shawn e Aiden Froste", boss: ["A"] },
      { id: "nara", name: "Nara", scenarioId: "nara", env: "Templi di Nara", weights: { battle: 5, event: 2, recruit: 1, training: 1, shop: 1 }, hint: "Gemini Storm all'attacco", boss: ["A", "B"] },
      { id: "osaka", name: "Osaka", scenarioId: "osaka", env: "Strade di Osaka", weights: { training: 3, shop: 3, battle: 3, event: 1, recruit: 1 }, hint: "Preparazione e sfida diversa", boss: ["B"] },
      { id: "carovana", name: "Carovana Inazuma", scenarioId: RAIMON, env: "Carovana", weights: { training: 3, battle: 3, event: 2, shop: 2, recruit: 1 }, hint: "Allenati in viaggio", boss: ["A", "B"] },
    ],
    rival: { teamName: "Gemini Storm", teamId: null, count: 1, pool: ["jordan"],
      intro: "Jordan Greenway, capitano della Gemini Storm, atterra in un lampo di luce. «Il vostro calcio è primitivo.»" },
    consequence: { title: "La prima crepa nell'Alius", text: "{boss} esce sconfitta. Il suo capitano vi guarda in silenzio, poi se ne va. Il suo orgoglio è ferito: forse un giorno giocherete dalla stessa parte.",
      unlockText: "Il capitano sconfitto è disponibile nello scouting." } },
  { id: "act4", index: 4, fromWave: 31, toWave: 40, palette: "act4", title: "Alius, resa dei conti", macro: "Accademia Alius",
    where: "Dalla Foresta di Jukai alle rovine di Tokyo, fino alla base dell'Alius sul Monte Fuji.",
    who: "Il rango supremo dell'Alius o una nazionale già in viaggio verso il mondiale.",
    why: "Superare {mini} e poi {boss} significa la convocazione per il mondiale.",
    lanes: [
      { id: "fuji", name: "Base Alius · Monte Fuji", scenarioId: "alius-base", env: "Base Alius", weights: { battle: 5, event: 2, training: 1, shop: 1, recruit: 1 }, hint: "Avversari Alius ovunque" },
      { id: "epsilon", name: "Rivincita Epsilon", scenarioId: "epsilon-rematch", env: "Campo Epsilon", weights: { battle: 5, training: 2, recruit: 1, event: 1, shop: 1 }, hint: "Epsilon vuole la rivincita" },
      { id: "jukai", name: "Foresta di Jukai", scenarioId: "jukai", env: "Foresta di Jukai", weights: { battle: 3, event: 3, recruit: 2, training: 1, shop: 1 }, hint: "Sentieri nascosti ed eventi" },
      { id: "rovine", name: "Tokyo devastata", scenarioId: "urban", env: "Rovine di Tokyo", weights: { shop: 3, battle: 3, recruit: 2, training: 2, event: 1 }, hint: "Ricostruisci e preparati" },
    ],
    rival: { teamName: "Epsilon", teamId: "epsilon", count: 2, pool: ["dvalin:epsilon-ie2", "tytan:epsilon-ie2", "krypto:epsilon-ie2", "zell:epsilon-ie2"],
      intro: "Dvalin e i suoi compagni di Epsilon vi aspettano. «Questa volta non ci saranno sorprese.»" },
    consequence: { title: "Convocazione per il FFI", text: "Dopo {boss}, l'Alius si arrende al vostro calcio. Pochi giorni dopo arriva la lettera: siete convocati per il Football Frontier International.",
      unlock: "xavier:base", unlockText: "Xavier Foster si unisce alla selezione: disponibile nello scouting." } },
  { id: "act5", index: 5, fromWave: 41, toWave: 50, palette: "act5", title: "Football Frontier International", macro: "FFI",
    where: "Liocott Island: campus delle nazionali, stadi e quartieri a tema.",
    who: "Le nazionali del FFI e, in finale, i Piccoli Giganti di Rococo Urupa.",
    why: "Ogni campus ha il suo stile di gioco: dopo {mini}, la finale contro {boss} vale il titolo mondiale.",
    lanes: [
      { id: "europa", name: "Campus europei", scenarioId: "ffi-europe", env: "Campus europei", weights: { battle: 5, recruit: 2, training: 1, event: 1, shop: 1 }, hint: "Orpheus, Knights of Queen, The Empire" },
      { id: "usa", name: "Campus Unicorn", scenarioId: "ffi-unicorn", env: "Campus USA", weights: { battle: 4, recruit: 3, shop: 1, event: 1, training: 1 }, hint: "Velocità americana" },
      { id: "corea", name: "Campus Fire Dragon", scenarioId: "ffi-dragon", env: "Campus Corea", weights: { battle: 4, training: 2, event: 2, recruit: 1, shop: 1 }, hint: "Fuoco e ghiaccio coreani" },
      { id: "cotarl", name: "Isola Cotarl", scenarioId: "ffi-gigant", env: "Isola Cotarl", weights: { battle: 3, shop: 2, event: 2, training: 2, recruit: 1 }, hint: "Il regno di Little Gigant" },
    ],
    rival: { teamName: "Unicorn", teamId: "unicorn", count: 2, pool: ["kruger", "dylan"],
      intro: "Mark Kruger e Dylan Keith vi sfidano davanti al campus americano. «Vediamo cosa sa fare il Giappone.»" },
    consequence: null },
];

// Story-locked versions stay out of fresh pools until their act is cleared.
export const STORY_LOCKS = { "jude:base": 1, "byron:base": 2, "gazelle:base": 3, "torch:base": 3, "xavier:base": 4 };

export const actForWave = (wave) => ACTS.find((a) => wave >= a.fromWave && wave <= a.toWave) || ACTS.at(-1);

export function seededRandom(seed, key) {
  let state = Number(seed) >>> 0;
  for (const char of key) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const weightedPick = (weights, rng, avoid) => {
  const rows = Object.entries(weights).filter(([t]) => t !== avoid);
  let n = rng() * rows.reduce((s, [, w]) => s + w, 0);
  return (rows.find(([, w]) => (n -= w) < 0) || rows.at(-1))[0];
};

const shuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Anomaly placement is decided once per run seed; acts 2-4 always get one, others sometimes.
const anomalyActs = (seed) => {
  const rng = seededRandom(seed, "anomaly-acts");
  const sure = 2 + Math.floor(rng() * 3);
  return ACTS.filter((a) => a.index === sure || (a.index > 1 && rng() < 0.35)).map((a) => a.index);
};

// Seeded identities for W5..W50 (boss/miniboss), avoiding repeats of earlier picks.
const planCache = new Map();
export function runPlan(seed) {
  if (planCache.has(seed)) return planCache.get(seed);
  const used = new Set(), plan = {};
  // Bosses first (exclusive identities), then minibosses avoid them when possible.
  for (const wave of Object.keys(PHASE_POOLS).map(Number).sort((a, b) => (PHASE_POOLS[a].kind === PHASE_POOLS[b].kind ? a - b : PHASE_POOLS[a].kind === "boss" ? -1 : 1))) {
    const { pool, branches = 1 } = PHASE_POOLS[wave];
    const rng = seededRandom(seed, `plan:${wave}`);
    const fresh = pool.filter((id) => !used.has(id));
    // Never the same team twice in one act (miniboss vs that act's boss), even when the pool runs dry.
    const sameAct = PHASE_POOLS[wave].kind === "miniboss" ? plan[wave + 5] || [] : [];
    const fallback = pool.filter((id) => !sameAct.includes(id));
    const picks = shuffle(fresh.filter((id) => !sameAct.includes(id)).length >= branches ? fresh.filter((id) => !sameAct.includes(id)) : fallback, rng).slice(0, branches);
    picks.forEach((id) => used.add(id));
    plan[wave] = picks;
  }
  planCache.set(seed, plan);
  return plan;
}
export const actBosses = (seed, act) => runPlan(seed)[act.toWave].map((id) => POOL_BY_ID[id]);
export const actMiniboss = (seed, act) => POOL_BY_ID[runPlan(seed)[act.fromWave + 4][0]];

// Pure, deterministic per (seed, act): never stored, so saves only hold choices.
export function actMap(seed, act) {
  const rng = seededRandom(seed, `map:${act.id}`);
  const lanes = shuffle(act.lanes, rng).slice(0, 3);
  const rows = act.toWave - act.fromWave;
  const rivalRows = lanes.map(() => 5 + Math.floor(rng() * 3));
  const MINI_ROW = 4;
  let anomaly = anomalyActs(seed).includes(act.index) ? { row: [1, 2, 3, 5, 6, 7][Math.floor(rng() * 6)], lane: Math.floor(rng() * 3) } : null;
  if (anomaly && act.rival && anomaly.row === rivalRows[anomaly.lane]) anomaly = { ...anomaly, row: anomaly.row === 5 ? 3 : anomaly.row - 1 };
  const mini = actMiniboss(seed, act);
  const nodes = [];
  lanes.forEach((lane, li) => {
    let prev = null;
    for (let r = 0; r < rows; r++) {
      const wave = act.fromWave + r;
      let type = r === 0 ? "battle" : r === rows - 1 ? (rng() < 0.5 ? "training" : "shop") : weightedPick(lane.weights, rng, prev === "battle" ? null : prev);
      if (act.rival && r === rivalRows[li]) type = "rival";
      if (anomaly && anomaly.row === r && anomaly.lane === li) type = "anomaly";
      if (r === MINI_ROW) type = "miniboss";
      prev = type;
      nodes.push({ nodeId: `${act.id}:${wave}:${li}`, actId: act.id, wave, row: r, lane: li, type, laneId: lane.id, laneName: lane.name,
        locationId: lane.scenarioId, environment: lane.env, jitter: Math.round((rng() - 0.5) * 10), ...(type === "miniboss" ? { bossId: mini.id } : {}) });
    }
  });
  const planned = actBosses(seed, act);
  const branchOf = (i) => (planned.length === 1 ? null : ["A", "B"][i]);
  const bossLanes = (i) => [0, 1, 2].filter((li) => planned.length === 1 || (lanes[li].boss || []).includes(branchOf(i)));
  const bosses = planned.map((b, i) => ({ b, i })).filter(({ i }) => bossLanes(i).length).map(({ b, i }, k, all) => ({ nodeId: `${act.id}:boss:${b.id}`, actId: act.id, wave: act.toWave, row: rows,
    lane: all.length === 1 ? 1 : k === 0 ? 0.5 : 1.5, type: "boss", bossId: b.id, laneName: b.team, locationId: lanes[bossLanes(i)[0]].scenarioId,
    environment: b.team, fromLanes: bossLanes(i), jitter: 0 }));
  return { act, lanes, nodes: [...nodes, ...bosses] };
}

// Pokelike-style: every row you can stay on your lane or move to a neighbouring one.
export const edgesFrom = (map, node) => {
  if (node.type === "boss") return [];
  if (node.row === map.act.toWave - map.act.fromWave - 1) return map.nodes.filter((n) => n.type === "boss" && n.fromLanes.includes(node.lane));
  return map.nodes.filter((n) => n.row === node.row + 1 && n.type !== "boss"
    && Math.abs(n.lane - node.lane) <= 1);
};

export const findNode = (seed, nodeId) => {
  const act = ACTS.find((a) => nodeId?.startsWith(`${a.id}:`));
  return act ? actMap(seed, act).nodes.find((n) => n.nodeId === nodeId) || null : null;
};

export const bossDef = (_actId, bossId) => POOL_BY_ID[bossId] || null;
