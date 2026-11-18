// Campaign: macro-scenario (act) → area (lane) → location (scenario pool) → node.
const RAIMON = "raimon-training";

export const ACTS = [
  { id: "act1", index: 1, fromWave: 1, toWave: 10, palette: "act1", title: "Raimon e Tokyo", macro: "Football Frontier",
    where: "Inazuma Town, Tokyo. Il vecchio campo della Raimon, la Torre di Ferro e l'argine del fiume.",
    who: "La Royal Academy di Ray Dark, capitanata da Jude Sharp.",
    why: "Una squadra senza nome deve guadagnarsi il rispetto: battere la Royal apre le porte del Football Frontier.",
    lanes: [
      { id: "campo", name: "Campo Raimon", scenarioId: RAIMON, env: "Campi Raimon", weights: { battle: 4, training: 3, recruit: 2, event: 1, shop: 1 }, hint: "Allenamenti e compagni di scuola" },
      { id: "argine", name: "Argine del fiume", scenarioId: "riverside", env: "Lungofiume", weights: { battle: 4, recruit: 3, event: 2, shop: 1, training: 1 }, hint: "Talenti di strada da reclutare" },
      { id: "torre", name: "Torre di Ferro", scenarioId: "iron-tower", env: "Torre di Ferro", weights: { battle: 5, training: 2, event: 2, recruit: 1, shop: 1 }, hint: "Sfide dure, più esperienza" },
      { id: "citta", name: "Inazuma Town", scenarioId: "urban", env: "Quartiere", weights: { battle: 4, shop: 3, recruit: 2, event: 2, training: 1 }, hint: "Negozi ed eventi in città" },
    ],
    rival: { teamName: "Royal Academy", teamId: "royal-academy", count: 2, pool: ["jude:royal", "david", "joseph", "herman-waldon:royal", "daniel-hatch:royal", "peter-drent:royal", "ben-simmons:royal", "alan-master:royal", "gus-martin:royal"],
      intro: "Gli esploratori della Royal Academy vi osservano da bordo campo. «Vediamo se meritate la nostra attenzione.»" },
    bosses: [{ id: "royal", team: "Royal Academy", teamId: "royal-academy", encounterType: "canonical-team", ids: ["jude:royal", "herman-waldon:royal", "daniel-hatch:royal"], leader: "jude:royal",
      intro: "La Royal Academy vi sbarra la strada. Il Preside Ray Dark osserva dalla tribuna...",
      dialogue: [{ who: "rival", text: "Siete arrivati fin qui per caso. La Royal non lascia spazio al caso." }, { who: "captain", text: "Allora ve lo dimostreremo in campo, Jude!" }, { who: "rival", text: "Mostratemi il vostro calcio." }] }],
    consequence: { title: "Accesso al Football Frontier", text: "La vittoria sulla Royal fa il giro di Tokyo: la vostra squadra è iscritta al Football Frontier. Jude Sharp lascia la Royal e sceglie la Raimon.",
      unlock: "jude:base", unlockText: "Jude Sharp (Raimon) è disponibile nello scouting." } },
  { id: "act2", index: 2, fromWave: 11, toWave: 20, palette: "act2", title: "Football Frontier", macro: "Football Frontier",
    where: "Il torneo nazionale: gironi, tribune piene e trasferte tra gli stadi.",
    who: "La Zeus di Byron Love, la squadra degli dèi, aspetta in finale.",
    why: "Il tabellone cambia a ogni edizione: la strada per la finale dipende dalle sfide che scegliete.",
    lanes: [
      { id: "gironi", name: "Gironi del torneo", scenarioId: "ff-qualifiers", env: "Stadi del torneo", weights: { battle: 5, recruit: 2, event: 1, shop: 1, training: 1 }, hint: "Più partite, più reclute" },
      { id: "rivincita", name: "Rivincita Royal", scenarioId: "royal-academy", env: "Territorio Royal", weights: { battle: 5, training: 2, event: 1, shop: 1, recruit: 1 }, hint: "La Royal cerca vendetta" },
      { id: "olimpo", name: "Ombre di Zeus", scenarioId: "zeus", env: "Stadio Zeus", weights: { battle: 4, event: 2, training: 2, shop: 1, recruit: 1 }, hint: "Studia gli dèi prima della finale" },
      { id: "tifosi", name: "Città dei tifosi", scenarioId: "urban", env: "Quartiere", weights: { battle: 3, shop: 3, recruit: 2, event: 2, training: 1 }, hint: "Rifornimenti e incontri" },
    ],
    rival: { teamName: "Zeus", teamId: "zeus", count: 2, pool: ["poseidon:zeus", "apollon:zeus", "hephais:zeus", "ares:zeus", "dio:zeus", "artemis:zeus", "hermes:zeus", "athena:zeus", "hera:zeus"],
      intro: "Due giocatori della Zeus vi bloccano il corridoio dello stadio. «Gli dèi vogliono misurarvi.»" },
    bosses: [{ id: "zeus", team: "Zeus", teamId: "zeus", encounterType: "canonical-team", ids: ["poseidon:zeus", "athena:zeus", "byron"], leader: "byron",
      intro: "Gli dèi dello stadio scendono in campo. Byron Love sorride con aria di superiorità.",
      dialogue: [{ who: "rival", text: "Gli umani non possono battere un dio. È solo matematica." }, { who: "captain", text: "Il calcio non è matematica. È cuore!" }, { who: "rival", text: "Allora fatemi vedere questo cuore." }] }],
    consequence: { title: "Campioni del Football Frontier", text: "La Zeus cade e la coppa è vostra. Ma durante la festa, un pallone nero squarcia il cielo: l'Accademia Alius dichiara guerra al calcio giapponese.",
      unlock: "byron:base", unlockText: "Byron Love si unisce alla resistenza: disponibile nello scouting." } },
  { id: "act3", index: 3, fromWave: 21, toWave: 30, palette: "act3", title: "Alius, la risposta", macro: "Accademia Alius",
    where: "In viaggio con la Carovana Inazuma tra Nara, Osaka e Hokkaido.",
    who: "Gemini Storm guida l'attacco; dietro di lei, Epsilon e i capitani di Fuoco e Ghiaccio.",
    why: "Ogni tappa cambia chi incontri e chi puoi reclutare. Il ramo scelto decide quale capitano Alius affronterete alla wave 30.",
    lanes: [
      { id: "hokkaido", name: "Hokkaido", scenarioId: "hokkaido", env: "Neve di Hokkaido", weights: { recruit: 4, battle: 4, event: 1, training: 1, shop: 1 }, hint: "Scouting locale: Shawn e Aiden Froste", boss: ["ghiaccio"] },
      { id: "nara", name: "Nara", scenarioId: "nara", env: "Templi di Nara", weights: { battle: 5, event: 2, recruit: 1, training: 1, shop: 1 }, hint: "Gemini Storm all'attacco", boss: ["ghiaccio", "fuoco"] },
      { id: "osaka", name: "Osaka", scenarioId: "osaka", env: "Strade di Osaka", weights: { training: 3, shop: 3, battle: 3, event: 1, recruit: 1 }, hint: "Preparazione e sfida diversa", boss: ["fuoco"] },
      { id: "carovana", name: "Carovana Inazuma", scenarioId: RAIMON, env: "Carovana", weights: { training: 3, battle: 3, event: 2, shop: 2, recruit: 1 }, hint: "Allenati in viaggio", boss: ["ghiaccio", "fuoco"] },
    ],
    rival: { teamName: "Gemini Storm", teamId: null, count: 1, pool: ["jordan"],
      intro: "Jordan Greenway, capitano della Gemini Storm, atterra in un lampo di luce. «Il vostro calcio è primitivo.»" },
    bosses: [
      { id: "ghiaccio", team: "Selezione Alius · Ghiaccio", teamId: null, encounterType: "special", ids: ["gazelle", "krypto:epsilon-ie2", "zell:epsilon-ie2"], leader: "gazelle",
        intro: "Checkpoint Alius: Gazelle guida una selezione di rivali del Ghiaccio.", unlock: "gazelle:base",
        dialogue: [{ who: "rival", text: "Il fuoco della vostra passione si spegnerà nel ghiaccio." }, { who: "captain", text: "Allora lo scioglieremo!" }] },
      { id: "fuoco", team: "Selezione Alius · Fuoco", teamId: null, encounterType: "special", ids: ["torch", "tytan:epsilon-ie2", "dvalin"], leader: "torch",
        intro: "Checkpoint Alius: Torch guida una selezione di rivali del Fuoco.", unlock: "torch:base",
        dialogue: [{ who: "rival", text: "Vi brucerò fino all'ultima scintilla!" }, { who: "captain", text: "Le nostre fiamme sono più calde delle tue!" }] },
    ],
    consequence: { title: "La prima crepa nell'Alius", text: "Il capitano Alius sconfitto vi guarda in silenzio, poi se ne va. Il suo orgoglio è ferito: forse un giorno giocherete dalla stessa parte.",
      unlockText: "Il capitano sconfitto è disponibile nello scouting." } },
  { id: "act4", index: 4, fromWave: 31, toWave: 40, palette: "act4", title: "Alius, resa dei conti", macro: "Accademia Alius",
    where: "Dalla Foresta di Jukai alle rovine di Tokyo, fino alla base dell'Alius sul Monte Fuji.",
    who: "Epsilon cerca la rivincita; Xavier Foster raduna i migliori rivali Alius.",
    why: "Le scelte dell'atto precedente tornano a bussare. Vincere significa la convocazione per il mondiale.",
    lanes: [
      { id: "fuji", name: "Base Alius · Monte Fuji", scenarioId: "alius-base", env: "Base Alius", weights: { battle: 5, event: 2, training: 1, shop: 1, recruit: 1 }, hint: "Avversari Alius ovunque" },
      { id: "epsilon", name: "Rivincita Epsilon", scenarioId: "epsilon-rematch", env: "Campo Epsilon", weights: { battle: 5, training: 2, recruit: 1, event: 1, shop: 1 }, hint: "Epsilon vuole la rivincita" },
      { id: "jukai", name: "Foresta di Jukai", scenarioId: "jukai", env: "Foresta di Jukai", weights: { battle: 3, event: 3, recruit: 2, training: 1, shop: 1 }, hint: "Sentieri nascosti ed eventi" },
      { id: "rovine", name: "Tokyo devastata", scenarioId: "urban", env: "Rovine di Tokyo", weights: { shop: 3, battle: 3, recruit: 2, training: 2, event: 1 }, hint: "Ricostruisci e preparati" },
    ],
    rival: { teamName: "Epsilon", teamId: "epsilon", count: 2, pool: ["dvalin:epsilon-ie2", "tytan:epsilon-ie2", "krypto:epsilon-ie2", "zell:epsilon-ie2"],
      intro: "Dvalin e i suoi compagni di Epsilon vi aspettano. «Questa volta non ci saranno sorprese.»" },
    bosses: [{ id: "alius", team: "Selezione Alius", teamId: null, encounterType: "special", ids: ["jordan", "dvalin", "xavier"], leader: "xavier",
      intro: "Selezione di rivali Alius: Jordan, Dvalin e Xavier Foster uniscono le forze.",
      dialogue: [{ who: "rival", text: "Questa è una selezione dei migliori dell'Alius. Siete pronti alla Genesi?" }, { who: "captain", text: "Siamo pronti a tutto, Xavier!" }, { who: "rival", text: "Allora giochiamo." }] }],
    consequence: { title: "Convocazione per il FFI", text: "L'Alius si arrende al vostro calcio. Pochi giorni dopo arriva la lettera: siete convocati per il Football Frontier International.",
      unlock: "xavier:base", unlockText: "Xavier Foster si unisce alla selezione: disponibile nello scouting." } },
  { id: "act5", index: 5, fromWave: 41, toWave: 50, palette: "act5", title: "Football Frontier International", macro: "FFI",
    where: "Liocott Island: campus delle nazionali, stadi e quartieri a tema.",
    who: "Le migliori nazionali del mondo e una selezione All-Stars in finale.",
    why: "Ogni campus ha il suo stile di gioco. Arrivare in fondo significa diventare campioni del mondo.",
    lanes: [
      { id: "europa", name: "Campus europei", scenarioId: "ffi-europe", env: "Campus europei", weights: { battle: 5, recruit: 2, training: 1, event: 1, shop: 1 }, hint: "Orpheus, Knights of Queen, The Empire" },
      { id: "usa", name: "Campus Unicorn", scenarioId: "ffi-unicorn", env: "Campus USA", weights: { battle: 4, recruit: 3, shop: 1, event: 1, training: 1 }, hint: "Velocità americana" },
      { id: "corea", name: "Campus Fire Dragon", scenarioId: "ffi-dragon", env: "Campus Corea", weights: { battle: 4, training: 2, event: 2, recruit: 1, shop: 1 }, hint: "Fuoco e ghiaccio coreani" },
      { id: "cotarl", name: "Isola Cotarl", scenarioId: "ffi-gigant", env: "Isola Cotarl", weights: { battle: 3, shop: 2, event: 2, training: 2, recruit: 1 }, hint: "Il regno di Little Gigant" },
    ],
    rival: { teamName: "Unicorn", teamId: "unicorn", count: 2, pool: ["kruger", "dylan"],
      intro: "Mark Kruger e Dylan Keith vi sfidano davanti al campus americano. «Vediamo cosa sa fare il Giappone.»" },
    bosses: [{ id: "allstars", team: "All-Stars internazionali", teamId: null, encounterType: "special", ids: ["fidio", "kruger", "rococo"], leader: "rococo",
      intro: "Finale del FFI contro una selezione All-Stars dichiarata: Fidio, Kruger e Rococo Urupa.",
      dialogue: [{ who: "rival", text: "Il mondo intero è qui per vedere chi è il più forte." }, { who: "captain", text: "Il nostro viaggio è iniziato su un campetto. Finisce qui, con la coppa!" }] }],
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

// Pure, deterministic per (seed, act): never stored, so saves only hold choices.
export function actMap(seed, act) {
  const rng = seededRandom(seed, `map:${act.id}`);
  const lanes = shuffle(act.lanes, rng).slice(0, 3);
  const rows = act.toWave - act.fromWave;
  const junctions = new Set(shuffle([2, 3, 4, 5, 6, 7], rng).slice(0, 3));
  const rivalRows = lanes.map(() => 4 + Math.floor(rng() * 4));
  const anomaly = anomalyActs(seed).includes(act.index) ? { row: 2 + Math.floor(rng() * 5), lane: Math.floor(rng() * 3) } : null;
  const nodes = [];
  lanes.forEach((lane, li) => {
    let prev = null;
    for (let r = 0; r < rows; r++) {
      const wave = act.fromWave + r;
      let type = r === 0 ? "battle" : r === rows - 1 ? (rng() < 0.5 ? "training" : "shop") : weightedPick(lane.weights, rng, prev === "battle" ? null : prev);
      if (act.rival && r === rivalRows[li]) type = "rival";
      if (anomaly && anomaly.row === r && anomaly.lane === li && type !== "rival") type = "anomaly";
      prev = type;
      nodes.push({ nodeId: `${act.id}:${wave}:${li}`, actId: act.id, wave, row: r, lane: li, type, laneId: lane.id, laneName: lane.name,
        locationId: lane.scenarioId, environment: lane.env, jitter: Math.round((rng() - 0.5) * 10) });
    }
  });
  const bossLanes = (b) => [0, 1, 2].filter((li) => act.bosses.length === 1 || (lanes[li].boss || []).includes(b.id));
  const bosses = act.bosses.filter((b) => bossLanes(b).length).map((b, i, all) => ({ nodeId: `${act.id}:boss:${b.id}`, actId: act.id, wave: act.toWave, row: rows,
    lane: all.length === 1 ? 1 : i === 0 ? 0.5 : 1.5, type: "boss", bossId: b.id, laneName: b.team, locationId: lanes[bossLanes(b)[0]].scenarioId,
    environment: b.team, fromLanes: bossLanes(b), jitter: 0 }));
  return { act, lanes, junctions: [...junctions], nodes: [...nodes, ...bosses] };
}

// Lanes connect straight; at junction rows they also cross to neighbours.
export const edgesFrom = (map, node) => {
  if (node.type === "boss") return [];
  if (node.row === map.act.toWave - map.act.fromWave - 1) return map.nodes.filter((n) => n.type === "boss" && n.fromLanes.includes(node.lane));
  return map.nodes.filter((n) => n.row === node.row + 1 && n.type !== "boss"
    && (n.lane === node.lane || (map.junctions.includes(node.row + 1) && Math.abs(n.lane - node.lane) === 1)));
};

export const findNode = (seed, nodeId) => {
  const act = ACTS.find((a) => nodeId?.startsWith(`${a.id}:`));
  return act ? actMap(seed, act).nodes.find((n) => n.nodeId === nodeId) || null : null;
};

export const bossDef = (actId, bossId) => ACTS.find((a) => a.id === actId)?.bosses.find((b) => b.id === bossId) || null;
