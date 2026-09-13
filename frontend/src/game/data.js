// Aria > Terra > Fuoco > Natura > Aria (Fu-Rin-Ka-Zan)
export const ELEMENTS = {
  fuoco: { id: "fuoco", label: "Fuoco", beats: "natura", color: "#ff3b30", text: "text-red-400", border: "border-red-500", bg: "bg-red-950" },
  aria: { id: "aria", label: "Aria", beats: "terra", color: "#00d2ff", text: "text-sky-300", border: "border-sky-400", bg: "bg-sky-950" },
  terra: { id: "terra", label: "Terra", beats: "fuoco", color: "#e6a100", text: "text-amber-400", border: "border-amber-500", bg: "bg-amber-950" },
  natura: { id: "natura", label: "Natura", beats: "aria", color: "#10b981", text: "text-emerald-400", border: "border-emerald-500", bg: "bg-emerald-950" },
};

export const ROLES = { P: "Portiere", D: "Difensore", C: "Centrocampista", A: "Attaccante" };

// effect: drain | burn | weaken | shatter | charge | guard | priority | crit | multi | recoil | heal
const M = (name, element, power, effect = null) => ({ name, element, power, effect });

// tier 1 = starter/common, 2 = uncommon, 3 = rare, 4 = boss/leggendario
export const ROSTER = [
  { id: "mark", name: "Mark Evans", element: "terra", role: "P", tier: 1, hp: 95, atk: 24, def: 40, spd: 22, move: M("Mano Magica", "terra", 55, "guard") },
  { id: "axel", name: "Axel Blaze", element: "fuoco", role: "A", tier: 1, hp: 70, atk: 42, def: 24, spd: 32, move: M("Tornado di Fuoco", "fuoco", 90) },
  { id: "jude", name: "Jude Sharp", element: "aria", role: "C", tier: 1, hp: 72, atk: 34, def: 30, spd: 34, move: M("Pinguino Imperatore N.2", "aria", 75, "weaken") },
  { id: "nathan", name: "Nathan Swift", element: "aria", role: "D", tier: 1, hp: 68, atk: 30, def: 28, spd: 46, move: M("Scatto Turbine", "aria", 65, "priority") },
  { id: "shawn", name: "Shawn Froste", element: "aria", role: "A", tier: 1, hp: 68, atk: 40, def: 24, spd: 38, move: M("Tempesta di Neve Eterna", "aria", 85, "crit") },
  { id: "jack", name: "Jack Wallside", element: "terra", role: "D", tier: 1, hp: 100, atk: 26, def: 44, spd: 14, move: M("La Muraglia", "terra", 50, "guard") },
  { id: "kevin", name: "Kevin Dragonfly", element: "natura", role: "A", tier: 1, hp: 78, atk: 38, def: 28, spd: 26, move: M("Schianto del Drago", "natura", 80, "recoil") },
  { id: "darren", name: "Darren LaChance", element: "natura", role: "P", tier: 2, hp: 88, atk: 22, def: 38, spd: 24, move: M("Mano Mugen", "natura", 50, "heal") },
  { id: "tod", name: "Tod Ironside", element: "natura", role: "D", tier: 1, hp: 80, atk: 28, def: 34, spd: 24, move: M("Placcaggio Killer", "natura", 60, "shatter") },
  { id: "sam", name: "Sam Kincaid", element: "natura", role: "C", tier: 1, hp: 70, atk: 30, def: 28, spd: 34, move: M("Passaggio Bomba", "natura", 60, "charge") },
  { id: "steve", name: "Steve Grim", element: "fuoco", role: "C", tier: 1, hp: 66, atk: 32, def: 26, spd: 32, move: M("Sfrecciata Elettrica", "fuoco", 65, "priority") },
  { id: "bobby", name: "Bobby Shearer", element: "aria", role: "D", tier: 1, hp: 74, atk: 26, def: 36, spd: 30, move: M("Contrattacco Rapido", "aria", 55, "guard") },
  { id: "maxwell", name: "Maxwell Carson", element: "terra", role: "C", tier: 1, hp: 72, atk: 32, def: 30, spd: 30, move: M("Slalom Misterioso", "terra", 60, "weaken") },
  { id: "tim", name: "Tim Saunders", element: "aria", role: "C", tier: 1, hp: 64, atk: 28, def: 26, spd: 40, move: M("Tornado Illusorio", "aria", 60, "multi") },
  { id: "willy", name: "Willy Glass", element: "natura", role: "C", tier: 1, hp: 62, atk: 26, def: 24, spd: 36, move: M("Occhio Analitico", "natura", 55, "shatter") },
  { id: "erik", name: "Erik Eagle", element: "aria", role: "A", tier: 2, hp: 70, atk: 40, def: 26, spd: 36, move: M("Tiro Aquila", "aria", 85) },
  { id: "austin", name: "Austin Hobbes", element: "fuoco", role: "A", tier: 2, hp: 72, atk: 42, def: 24, spd: 30, move: M("Tiro Fulmineo", "fuoco", 88) },
  { id: "caleb", name: "Caleb Stonewall", element: "terra", role: "C", tier: 2, hp: 74, atk: 36, def: 30, spd: 34, move: M("Pugno di Roccia", "terra", 75, "charge") },
  { id: "hurley", name: "Hurley Kane", element: "natura", role: "A", tier: 2, hp: 74, atk: 40, def: 26, spd: 30, move: M("Tsunami Boost", "natura", 85, "drain") },
  { id: "scotty", name: "Scotty Banyan", element: "natura", role: "C", tier: 2, hp: 70, atk: 34, def: 28, spd: 42, move: M("Corsa della Scimmia", "natura", 65, "multi") },
  { id: "thor", name: "Thor Stoutberg", element: "terra", role: "A", tier: 2, hp: 90, atk: 44, def: 32, spd: 18, move: M("Schianto del Gigante", "terra", 95, "recoil") },
  { id: "archer", name: "Archer Hawkins", element: "aria", role: "A", tier: 2, hp: 68, atk: 38, def: 24, spd: 40, move: M("Freccia Volante", "aria", 80, "crit") },
  { id: "joseph", name: "Joseph King", element: "fuoco", role: "P", tier: 3, hp: 76, atk: 44, def: 26, spd: 34, move: M("Pinguino Imperatore N.1", "fuoco", 95, "burn") },
  { id: "david", name: "David Samford", element: "fuoco", role: "C", tier: 3, hp: 74, atk: 36, def: 30, spd: 36, move: M("Twin Boost", "fuoco", 80, "multi") },
  { id: "byron", name: "Byron Love", element: "aria", role: "A", tier: 4, hp: 78, atk: 48, def: 28, spd: 46, move: M("Piuma Celeste", "aria", 96, "drain") },
  { id: "jonas", name: "Jonas Demetrius", element: "aria", role: "D", tier: 3, hp: 84, atk: 34, def: 38, spd: 34, move: M("Tridente di Poseidone", "aria", 75, "shatter") },
  { id: "xavier", name: "Xavier Foster", element: "fuoco", role: "A", tier: 4, hp: 80, atk: 50, def: 30, spd: 42, move: M("Meteora Ardente", "fuoco", 105, "burn") },
  { id: "jordan", name: "Jordan Greenway", element: "aria", role: "C", tier: 3, hp: 76, atk: 40, def: 30, spd: 44, move: M("Cerchio Astrale", "aria", 85, "weaken") },
  { id: "torch", name: "Torch", element: "fuoco", role: "A", tier: 4, hp: 78, atk: 52, def: 28, spd: 40, move: M("Atomic Flare", "fuoco", 110, "burn") },
  { id: "gazelle", name: "Gazelle", element: "aria", role: "A", tier: 4, hp: 76, atk: 48, def: 28, spd: 50, move: M("Tempesta di Ghiaccio", "aria", 100, "priority") },
  { id: "dvalin", name: "Dvalin", element: "aria", role: "P", tier: 3, hp: 96, atk: 34, def: 44, spd: 30, move: M("Guanto Rotante", "aria", 70, "guard") },
  { id: "rococo", name: "Rococo Urupa", element: "natura", role: "P", tier: 4, hp: 110, atk: 30, def: 50, spd: 30, move: M("Mano Divina X", "natura", 70, "guard") },
  { id: "canon", name: "Canon Evans", element: "terra", role: "C", tier: 3, hp: 78, atk: 42, def: 32, spd: 40, move: M("Vortice Temporale", "terra", 90, "priority") },
  { id: "paolo", name: "Paolo Bianchi", element: "fuoco", role: "A", tier: 3, hp: 74, atk: 44, def: 26, spd: 38, move: M("Colpo d'Odino", "fuoco", 95, "crit") },
  { id: "fidio", name: "Fidio Aldena", element: "natura", role: "A", tier: 3, hp: 76, atk: 44, def: 28, spd: 40, move: M("Fuoco Fatuo Divino", "natura", 92, "drain") },
  { id: "kruger", name: "Mark Kruger", element: "terra", role: "A", tier: 3, hp: 78, atk: 44, def: 30, spd: 36, move: M("Gungnir", "terra", 95) },
  { id: "dylan", name: "Dylan Keith", element: "natura", role: "A", tier: 2, hp: 70, atk: 40, def: 26, spd: 36, move: M("Fantasma Supernova", "natura", 82, "crit") },
  { id: "edgar", name: "Edgar Valtinas", element: "aria", role: "A", tier: 3, hp: 76, atk: 46, def: 30, spd: 38, move: M("Excalibur", "aria", 98) },
  { id: "teres", name: "Teres Tolue", element: "fuoco", role: "A", tier: 3, hp: 74, atk: 44, def: 26, spd: 40, move: M("Danza del Fuoco", "fuoco", 90, "burn") },
  { id: "chae", name: "Chae Chan-soo", element: "terra", role: "C", tier: 2, hp: 72, atk: 36, def: 32, spd: 36, move: M("Torre di Cristallo", "terra", 78, "multi") },
  { id: "malcolm", name: "Jim Wraith", element: "terra", role: "D", tier: 1, hp: 74, atk: 30, def: 34, spd: 30, move: M("Tiro Fantasma", "terra", 65, "weaken") },
  { id: "hector", name: "Rika Urabe", element: "natura", role: "C", tier: 2, hp: 70, atk: 36, def: 28, spd: 38, move: M("Anello Arcobaleno", "natura", 78, "charge") },
  { id: "silvia", name: "Silvia Woods", element: "natura", role: "C", tier: 1, hp: 60, atk: 22, def: 26, spd: 36, move: M("Incoraggiamento", "natura", 40, "heal") },
  { id: "aiden", name: "Aiden Frost", element: "aria", role: "A", tier: 2, hp: 72, atk: 40, def: 26, spd: 34, move: M("Tiro Rotante", "aria", 80, "shatter") },
];

export const STARTER_IDS = ["mark", "axel", "jude", "nathan", "shawn", "jack", "kevin", "tod"];

export const BOSS_POOLS = {
  10: [
    { id: "royal-academy", team: "Royal Academy", intro: "La Royal Academy vi sbarra la strada. Il Preside Ray Dark osserva dalla tribuna...", ids: ["jude", "david", "joseph"], captainId: "jude", scenarioId: "royal-academy", teamTags: ["royal-academy"] },
    { id: "alpine-snow", team: "Alpine Jr. High", intro: "Il vento gelido di Hokkaido accompagna la discesa della leggendaria Alpine!", ids: ["shawn:alpine-ie2", "adam-ropes:alpine-ie2", "joaquine:alpine-ie2"], captainId: "shawn", scenarioId: "alpine-snow", teamTags: ["alpine"] },
    { id: "gemini-field", team: "Gemini Storm", intro: "Una luce accecante precede l'arrivo della seconda squadra Alius: Gemini Storm!", ids: ["jordan", "pat-box:gemini-ie2", "gordon-star:gemini-ie2"], captainId: "jordan", scenarioId: "gemini-field", teamTags: ["gemini-storm", "alius"] },
  ],
  20: [
    { id: "zeus", team: "Zeus", intro: "Gli dèi dello stadio scendono in campo. Byron Love sorride con aria di superiorità.", ids: ["jonas", "byron"], captainId: "byron", scenarioId: "zeus", teamTags: ["zeus"] },
    { id: "prominence-crater", team: "Prominence", intro: "Fiamme ardenti avvolgono il campo: il capitano Torch guida la Prominence!", ids: ["torch:prominence-ie2", "grent:prominence-ie2", "neppten:prominence-ie2"], captainId: "torch", scenarioId: "prominence-crater", teamTags: ["prominence", "alius"] },
    { id: "diamond-dust-glacier", team: "Diamond Dust", intro: "I ghiacci perenni si infrangono: Gazelle e la Diamond Dust vi attendono!", ids: ["gazelle:diamond-dust-ie2", "beluga:diamond-dust-ie2", "clara:diamond-dust-ie2"], captainId: "gazelle", scenarioId: "diamond-dust-glacier", teamTags: ["diamond-dust", "alius"] },
    { id: "epsilon-base", team: "Epsilon", intro: "La squadra d'élite di primo rango: Dvalin vi sfida a superare la Trivella Spaziale!", ids: ["dvalin:epsilon-ie2", "tytan:epsilon-ie2", "zell:epsilon-ie2"], captainId: "dvalin", scenarioId: "epsilon-base", teamTags: ["epsilon", "alius"] },
  ],
  30: [
    { id: "chaos-stadium", team: "Chaos", intro: "Fuoco e ghiaccio: Torch e Gazelle uniscono le forze contro di voi!", ids: ["dvalin", "torch", "gazelle"], captainId: "torch", scenarioId: "chaos-stadium", teamTags: ["chaos", "alius"] },
    { id: "prominence-inferno", team: "Prominence Inferno", intro: "L'esplosione solare della Prominence al massimo potenziale!", ids: ["torch:prominence-ie2", "grent:prominence-ie2", "heat:prominence-ie2", "bomber:prominence-ie2"], captainId: "torch", scenarioId: "prominence-crater", teamTags: ["prominence", "alius"] },
    { id: "diamond-dust-elite", team: "Diamond Dust Elite", intro: "La bufera glaciale della Diamond Dust alla massima intensità!", ids: ["gazelle:diamond-dust-ie2", "beluga:diamond-dust-ie2", "gokka:diamond-dust-ie2", "clara:diamond-dust-ie2"], captainId: "gazelle", scenarioId: "diamond-dust-glacier", teamTags: ["diamond-dust", "alius"] },
    { id: "epsilon-plus", team: "Epsilon Plus", intro: "L'evoluzione suprema dell'Epsilon: Dvalin e i suoi compagni potenziati!", ids: ["dvalin:epsilon-ie2", "tytan:epsilon-ie2", "krypto:epsilon-ie2", "zell:epsilon-ie2"], captainId: "dvalin", scenarioId: "epsilon-base", teamTags: ["epsilon", "alius"] },
  ],
  40: [
    { id: "genesis-dome", team: "Genesis", intro: "L'Alius Academy schiera la sua squadra definitiva. Xavier Foster vi attende.", ids: ["jordan", "dvalin", "xavier"], captainId: "xavier", scenarioId: "genesis-dome", teamTags: ["genesis", "alius"] },
    { id: "chaos-prime", team: "Chaos Prime", intro: "La fusione titanica di fuoco e ghiaccio al culmine della potenza!", ids: ["torch:chaos-ie2", "gazelle:chaos-ie2", "grent:chaos-ie2", "gokka:chaos-ie2"], captainId: "torch", scenarioId: "chaos-stadium", teamTags: ["chaos", "alius"] },
    { id: "zeus-divine", team: "Zeus Divina", intro: "Byron Love e gli dei dello stadio rivelano il loro vero potere divino!", ids: ["byron", "jonas", "poseidon:zeus", "hera:zeus"], captainId: "byron", scenarioId: "zeus", teamTags: ["zeus"] },
    { id: "international-allstars", team: "All-Stars Internazionali", intro: "I migliori campioni del mondo si sono riuniti per sbarrarvi il passo!", ids: ["edgar", "teres", "fidio", "kruger"], captainId: "fidio", scenarioId: "international", teamTags: ["unicorn", "knights-of-queen", "the-empire"] },
  ],
  50: [
    { id: "little-gigant", team: "Little Gigant", intro: "La finale del Football Frontier International! Rococo Urupa para tutto... o quasi.", ids: ["fidio", "kruger", "rococo"], captainId: "rococo", scenarioId: "international", teamTags: ["little-gigant"] },
    { id: "genesis-supreme", team: "Genesis Supreme", intro: "La massima vetta della tecnologia Alius e i campioni del mondo uniti!", ids: ["xavier:genesis-ie2", "bellatrix:genesis-ie2", "nero:genesis-ie2", "rococo"], captainId: "xavier", scenarioId: "genesis-dome", teamTags: ["genesis", "alius"] },
  ],
};

export const BOSSES = Object.fromEntries(
  Object.entries(BOSS_POOLS).map(([wave, pool]) => [wave, pool[0]])
);

export const FINAL_WAVE = 50;

export const ITEM_CLASSES = {
  MANUAL: "manual",
  NODE: "node",
  TRIGGER: "trigger",
};

export const ITEM_FAMILIES = {
  INSTANT: "instant",
  SEGMENT: "segment",
  TRIGGER: "trigger",
  RESOURCE: "resource",
};

export const ITEM_FAMILY_PRESENTATION = {
  instant: {
    family: "instant",
    label: "IMMEDIATO",
    badgeClass: "border-sky-500 bg-sky-950/80 text-sky-300",
    description: "Effetto applicato subito alla squadra o a un calciatore.",
  },
  segment: {
    family: "segment",
    label: "FINO AL CHECKPOINT",
    badgeClass: "border-amber-500 bg-amber-950/80 text-amber-300",
    description: "Bonus attivo per l'intero segmento fino al checkpoint successivo.",
  },
  trigger: {
    family: "trigger",
    label: "AUTOMATICO",
    badgeClass: "border-violet-500 bg-violet-950/80 text-violet-300",
    description: "Si arma da solo e si attiva in lotta al verificarsi della condizione.",
  },
  resource: {
    family: "resource",
    label: "RISORSA",
    badgeClass: "border-pink-500 bg-pink-950/80 text-pink-300",
    description: "Risorsa persistente della run, utilizzabile fuori dal combattimento.",
  },
};

// Item rarity is presentation/frequency, not a power multiplier or player rarity.
export const ITEM_RARITIES = {
  COMMON: { label: "Comune", rewardWeight: 20, cardClass: "border-slate-500 bg-slate-900", accentClass: "text-slate-200" },
  UNCOMMON: { label: "Non comune", rewardWeight: 9, cardClass: "border-emerald-500 bg-emerald-950/40", accentClass: "text-emerald-300" },
  RARE: { label: "Raro", rewardWeight: 5, cardClass: "border-sky-500 bg-sky-950/40", accentClass: "text-sky-300" },
  EPIC: { label: "Epico", rewardWeight: 2, cardClass: "border-pink-500 bg-pink-950/40", accentClass: "text-pink-300" },
};
const itemDefinitions = {
  barretta: { id: "barretta", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "COMMON", shopWeight: 2, category: ITEM_CLASSES.MANUAL, name: "Barretta Energetica", desc: "Recupera il 50% degli HP di un giocatore non KO.", price: 40, battle: true, tags: ["recovery"] },
  bibita: { id: "bibita", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", dropFactor: 10/9, category: ITEM_CLASSES.MANUAL, name: "Bibita Inazuma", desc: "Recupera tutti gli HP e cura le condizioni. Solo giocatori non KO.", price: 90, battle: true, tags: ["recovery"] },
  pallone: { id: "pallone", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "RARE", category: ITEM_CLASSES.MANUAL, name: "Pallone d'Oro", desc: "Rianima un giocatore KO con metà HP e conferisce lo stato parata.", price: 150, battle: true, tags: ["recovery", "revive"] },
  cuneo: { id: "cuneo", family: ITEM_FAMILIES.RESOURCE, targetType: "run", rarity: "EPIC", category: ITEM_CLASSES.MANUAL, name: "Cuneo DNA", desc: "Fonde due giocatori in uno solo, più forte.", price: 300, battle: false },
  fascia: { id: "fascia", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Fascia del Capitano", desc: "+5 ATK permanente a un giocatore.", price: 120, battle: false, effect: { type: "permanentStat", stat: "atk", amount: 5 }, tags: ["training"] },
  guanti: { id: "guanti", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Guanti Rinforzati", desc: "+5 DIF permanente a un giocatore.", price: 120, battle: false, effect: { type: "permanentStat", stat: "def", amount: 5 }, tags: ["training"] },
  scarpini: { id: "scarpini", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Scarpini Turbo", desc: "+6 VEL permanente a un giocatore.", price: 120, battle: false, effect: { type: "permanentStat", stat: "spd", amount: 6 }, tags: ["training"] },
  proteine: { id: "proteine", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Proteine Kudo", desc: "+15 HP max permanente a un giocatore.", price: 120, battle: false, effect: { type: "permanentStat", stat: "hp", amount: 15 }, tags: ["training"] },
  trofeo: { id: "trofeo", family: ITEM_FAMILIES.INSTANT, targetType: "team", rarity: "UNCOMMON", dropFactor: 8/9, category: ITEM_CLASSES.MANUAL, name: "Mini Trofeo", desc: "Tutta la squadra guadagna esperienza.", price: 100, battle: false },
  fischietto: { id: "fischietto", family: ITEM_FAMILIES.INSTANT, targetType: "run", rarity: "RARE", dropFactor: 4/5, category: ITEM_CLASSES.MANUAL, name: "Fischietto d'Argento", desc: "Il prossimo avversario singolo si unirà a te se lo sconfiggi.", price: 200, battle: false },
  talismano: { id: "talismano", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "RARE", battleOnly: true, category: ITEM_CLASSES.MANUAL, name: "Talismano Elementale", desc: "In battaglia: la tua mossa colpisce sempre come superefficace per 1 turno.", price: 110, battle: true },
  impacco: { id: "impacco", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "COMMON", category: ITEM_CLASSES.MANUAL, name: "Impacco da Bordocampo", desc: "Ripristina il 25% degli HP, cura la bruciatura e prepara la parata. Solo giocatori non KO.", price: 35, battle: true, effect: { type: "recovery", hpShare: 0.25, cureBurn: true, guard: true }, tags: ["recovery"] },
  grinta: { id: "grinta", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "UNCOMMON", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Grinta in Bottiglia", desc: "Bonus Nodo: ATK +1 stadio (massimo +3) a tutta la squadra fino alla fine del nodo.", price: 55, battle: true, effect: { type: "stages", atk: 1, def: 0 }, tags: ["offense", "node"] },
  tenuta: { id: "tenuta", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "UNCOMMON", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Tenuta Difensiva", desc: "Bonus Nodo: DIF +1 stadio (massimo +3) a tutta la squadra fino alla fine del nodo.", price: 55, battle: true, effect: { type: "stages", atk: 0, def: 1 }, tags: ["defense", "node"] },
  buono: { id: "buono", family: ITEM_FAMILIES.INSTANT, targetType: "run", shopWeight: 0, rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Buono Sponsor", desc: "Si riscatta automaticamente quando viene ottenuto: +35 Prestigio. Non occupa spazio nello zaino.", price: 50, battle: false, effect: { type: "money", amount: 35 }, tags: ["economy", "auto-redeem"] },
  azzardo: { id: "azzardo", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "RARE", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Slancio Spericolato", desc: "Bonus Nodo: ATK +2 stadi e DIF -1 stadio (massimo +3, minimo -3) a tutta la squadra fino alla fine del nodo.", price: 70, battle: true, effect: { type: "stages", atk: 2, def: -1 }, tags: ["risk", "offense", "node"] },
  muro: { id: "muro", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "RARE", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Schema Catenaccio", desc: "Bonus Nodo: DIF +2 stadi e ATK -1 stadio (massimo +3, minimo -3) a tutta la squadra fino alla fine del nodo.", price: 75, battle: true, effect: { type: "stages", atk: -1, def: 2 }, tags: ["risk", "defense", "node"] },
  equilibrio: { id: "equilibrio", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "RARE", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Lavagna Equilibrata", desc: "Bonus Nodo: ATK +1 e DIF +1 stadio (massimo +3) a tutta la squadra fino alla fine del nodo.", price: 85, battle: true, effect: { type: "stages", atk: 1, def: 1 }, tags: ["offense", "defense", "node"] },
  pressing: { id: "pressing", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "UNCOMMON", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Pressing Coraggioso", desc: "Bonus Nodo: ATK +1 e DIF -1 stadio (massimo +3, minimo -3) a tutta la squadra fino alla fine del nodo.", price: 50, battle: true, effect: { type: "stages", atk: 1, def: -1 }, tags: ["risk", "node"] },
  ghiaccio: { id: "ghiaccio", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "COMMON", category: ITEM_CLASSES.MANUAL, name: "Ghiaccio Istantaneo", desc: "Rimedio rapido: recupera il 20% degli HP e cura la bruciatura. Solo su un giocatore non KO.", price: 30, battle: true, effect: { type: "recovery", hpShare: 0.2, cureBurn: true }, tags: ["recovery"] },
  borraccia: { id: "borraccia", family: ITEM_FAMILIES.INSTANT, targetType: "team", rarity: "COMMON", category: ITEM_CLASSES.MANUAL, name: "Borraccia Isotonica", desc: "Ristoro per tutta la squadra: recupera il 35% degli HP a tutti i compagni vivi non KO.", price: 38, battle: true, effect: { type: "recovery", hpShare: 0.35, team: true }, tags: ["recovery"] },
  defibrillatore: { id: "defibrillatore", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "RARE", category: ITEM_CLASSES.MANUAL, name: "Defibrillatore da Campo", desc: "Rianima un giocatore KO con il 25% degli HP.", price: 130, battle: true, effect: { type: "revive", hpShare: 0.25 }, tags: ["recovery", "revive"] },
  taccuino: { id: "taccuino", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Taccuino Tattico", desc: "+3 ATK permanente a un giocatore non KO.", price: 90, battle: false, effect: { type: "permanentStat", stat: "atk", amount: 3 }, tags: ["training"] },
  parastinchi: { id: "parastinchi", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Parastinchi Tecnici", desc: "+3 DIF permanente a un giocatore non KO.", price: 90, battle: false, effect: { type: "permanentStat", stat: "def", amount: 3 }, tags: ["training"] },
  cronometro: { id: "cronometro", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Cronometro da Scatto", desc: "+4 VEL permanente a un giocatore non KO.", price: 95, battle: false, effect: { type: "permanentStat", stat: "spd", amount: 4 }, tags: ["training"] },
  pasto: { id: "pasto", family: ITEM_FAMILIES.INSTANT, targetType: "player", rarity: "UNCOMMON", category: ITEM_CLASSES.MANUAL, name: "Pasto del Ritiro", desc: "+10 HP massimi permanenti e +10 HP attuali a un giocatore non KO.", price: 95, battle: false, effect: { type: "permanentStat", stat: "hp", amount: 10 }, tags: ["training", "recovery"] },
  cerotto: { id: "cerotto", family: ITEM_FAMILIES.TRIGGER, targetType: "trigger", rarity: "COMMON", category: ITEM_CLASSES.TRIGGER, name: "Cerotto d'Emergenza", desc: "Innesco automatico: se un compagno attivo scende sotto il 30% HP durante una lotta, si attiva ripristinando il 25% HP massimi.", price: 40, battle: true, effect: { type: "recovery", hpShare: 0.25, trigger: "lowHp" }, tags: ["trigger", "recovery"] },
  balsamo: { id: "balsamo", family: ITEM_FAMILIES.TRIGGER, targetType: "trigger", rarity: "COMMON", category: ITEM_CLASSES.TRIGGER, name: "Balsamo Rinfrescante", desc: "Innesco automatico: rimuove istantaneamente la prima bruciatura subita da un compagno durante la lotta.", price: 35, battle: true, effect: { type: "recovery", hpShare: 0, cureBurn: true, trigger: "cleanse" }, tags: ["trigger", "recovery"] },
  cavigliera: { id: "cavigliera", family: ITEM_FAMILIES.TRIGGER, targetType: "trigger", rarity: "RARE", category: ITEM_CLASSES.TRIGGER, name: "Cavigliera Protettiva", desc: "Innesco automatico: se un compagno subirebbe un colpo da KO, si attiva lasciandolo a 1 HP. Massimo una volta per lotta.", price: 110, battle: true, effect: { type: "revive", hpShare: 0, trigger: "endure" }, tags: ["trigger", "defense"] },
  stendardo: { id: "stendardo", family: ITEM_FAMILIES.TRIGGER, targetType: "trigger", rarity: "UNCOMMON", category: ITEM_CLASSES.TRIGGER, name: "Stendardo Tattico", desc: "Innesco automatico: il primo attacco offensivo sferrato dalla squadra in ogni lotta ottiene +20% potenza.", price: 65, battle: true, effect: { type: "legacy", trigger: "firstStrike" }, tags: ["trigger", "offense"] },
  tessera: { id: "tessera", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "UNCOMMON", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Tessera Scout", desc: "Bonus Nodo: si attiva automaticamente fino alla fine del nodo. Favorisce l'incontro con calciatori rari o di alto livello.", price: 75, battle: false, effect: { type: "stages", scoutBias: true }, tags: ["node", "scout"] },
  sigillo: { id: "sigillo", family: ITEM_FAMILIES.SEGMENT, targetType: "node", rarity: "RARE", battleOnly: true, category: ITEM_CLASSES.NODE, name: "Sigillo dello Sfidante", desc: "Bonus Nodo: si attiva automaticamente fino alla fine del nodo. Contro i Boss, la squadra riceve +10% danni inflitti e -10% subiti.", price: 85, battle: false, effect: { type: "stages", bossBonus: true }, tags: ["node", "boss"] },
};

// Legacy desc and pool exports remain adapters; inventories save IDs/counts only.
export const ITEMS = Object.fromEntries(Object.entries(itemDefinitions).map(([id, item]) => [id, {
  ...item, description: item.desc, itemClass: item.category || ITEM_CLASSES.MANUAL, tags: item.tags || [], effect: item.effect || { type: "legacy", handler: id },
  rewardWeight: ITEM_RARITIES[item.rarity].rewardWeight * (item.dropFactor ?? 1), shopWeight: item.shopWeight ?? 1,
}]));
export function validateItems(items = ITEMS) {
  const values = Object.values(items);
  const ids = values.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate item ID");
  for (const item of values) {
    if (!item.id || !item.name || !item.description || !ITEM_RARITIES[item.rarity] || !(item.price >= 0)) throw new Error(`Invalid item metadata: ${item.id || "missing"}`);
    if ((item.itemClass === ITEM_CLASSES.NODE || item.effect.type === "stages") && item.tags?.includes("node") && (!item.battleOnly || !item.description.includes("fine del nodo"))) {
      throw new Error(`Temporary item must declare node duration: ${item.id}`);
    }
  }
  return true;
}
validateItems();
export const itemPresentation = id => ITEM_RARITIES[ITEMS[id]?.rarity] || ITEM_RARITIES.COMMON;
export const itemFamilyPresentation = id => {
  const item = ITEMS[id];
  const familyKey = item?.family || (
    item?.itemClass === ITEM_CLASSES.NODE ? ITEM_FAMILIES.SEGMENT :
    item?.itemClass === ITEM_CLASSES.TRIGGER ? ITEM_FAMILIES.TRIGGER :
    id === "cuneo" ? ITEM_FAMILIES.RESOURCE :
    ITEM_FAMILIES.INSTANT
  );
  return ITEM_FAMILY_PRESENTATION[familyKey] || ITEM_FAMILY_PRESENTATION.instant;
};
export const isTargetItem = id => {
  const item = ITEMS[id];
  if (!item) return false;
  return item.targetType === "player" || (
    item.family === ITEM_FAMILIES.INSTANT && !["borraccia", "trofeo", "buono", "fischietto"].includes(id)
  );
};
export const SHOP_POOL = Object.values(ITEMS).flatMap(item => Array(item.shopWeight).fill(item.id));
export const REWARD_POOL = Object.values(ITEMS).map(item => ({ id: item.id, w: item.rewardWeight }));

// Kept only as a persisted-data fixture for old tests/saves; runtime events live in events.js.
export const LEGACY_EVENTS = [
  {
    id: "allenatore", title: "L'Allenatore Misterioso",
    text: "Un uomo con un cappello calato sugli occhi vi ferma: «Vedo del potenziale... ma anche paura. Volete allenarvi con me?»",
    choices: [
      { label: "Accetta l'allenamento", outcomes: [
        { chance: 70, text: "L'allenamento è brutale ma efficace! Il tuo capitano diventa più forte.", effects: [{ type: "stat", stat: "atk", amt: 4, target: "active" }, { type: "damage", pct: 20, target: "active" }] },
        { chance: 30, text: "Era un truffatore! Vi ha rubato dei Punti Prestigio mentre facevate piegamenti.", effects: [{ type: "money", amt: -60 }] },
      ] },
      { label: "Rifiuta educatamente", outcomes: [{ chance: 100, text: "L'uomo annuisce e vi lancia una barretta prima di sparire nella nebbia.", effects: [{ type: "item", id: "barretta" }] }] },
    ],
  },
  {
    id: "torre", title: "La Torre di Ferro",
    text: "Sotto la Torre di Ferro, Mark Evans si allenava con uno pneumatico. Ne trovate uno abbandonato.",
    choices: [
      { label: "Allenati con lo pneumatico (tutta la squadra)", outcomes: [{ chance: 100, text: "Un pomeriggio di sudore. Tutti guadagnano esperienza!", effects: [{ type: "xp", amt: 25, target: "all" }] }] },
      { label: "Cerca il quaderno del nonno Evans", outcomes: [
        { chance: 40, text: "Trovate il quaderno segreto! Contiene una tecnica di difesa: DIF +5 a tutti.", effects: [{ type: "stat", stat: "def", amt: 5, target: "all" }] },
        { chance: 60, text: "Solo vecchi giornali. Però tra le pagine c'è un Talismano.", effects: [{ type: "item", id: "talismano" }] },
      ] },
    ],
  },
  {
    id: "tempesta", title: "Tempesta Improvvisa",
    text: "Un temporale vi sorprende in campo aperto. I fulmini illuminano il cielo.",
    choices: [
      { label: "Continuate ad allenarvi sotto la pioggia", outcomes: [
        { chance: 50, text: "Il coraggio paga: la squadra è più veloce, ma qualcuno prende freddo.", effects: [{ type: "stat", stat: "spd", amt: 5, target: "all" }, { type: "damage", pct: 25, target: "all" }] },
        { chance: 50, text: "Un fulmine colpisce il palo! Tutti spaventati, ma illesi. Trovate un Pallone d'Oro fuso dal fulmine.", effects: [{ type: "item", id: "pallone" }] },
      ] },
      { label: "Rifugiatevi nello spogliatoio", outcomes: [{ chance: 100, text: "Riposate al caldo. La squadra recupera un po' di energie.", effects: [{ type: "heal", pct: 35, target: "all" }] }] },
    ],
  },
  {
    id: "raimon_mensa", title: "La Mensa della Raimon",
    text: "La cuoca della Raimon ha preparato riso al curry per tutti. L'odore è irresistibile.",
    choices: [
      { label: "Mangiate a volontà", outcomes: [{ chance: 100, text: "Che bontà! Tutti al massimo degli HP... ma un po' più lenti per questa ondata.", effects: [{ type: "heal", pct: 100, target: "all" }] }] },
      { label: "Prendete solo un pacchetto per dopo", outcomes: [{ chance: 100, text: "Ottenete 2 Barrette Energetiche.", effects: [{ type: "item", id: "barretta" }, { type: "item", id: "barretta" }] }] },
    ],
  },
  {
    id: "scommessa", title: "La Scommessa di Willy",
    text: "Willy Glass vi propone una scommessa: 80 Punti Prestigio per raddoppiare o perdere tutto.",
    choices: [
      { label: "Scommetti 80 Prestigio", outcomes: [
        { chance: 45, text: "Vincete! Willy paga a malincuore.", effects: [{ type: "money", amt: 80 }] },
        { chance: 55, text: "Willy aveva già calcolato tutto. Perdete la scommessa.", effects: [{ type: "money", amt: -80 }] },
      ] },
      { label: "Non scommetto", outcomes: [{ chance: 100, text: "«Saggia scelta», dice Willy sistemandosi gli occhiali.", effects: [] }] },
    ],
  },
  {
    id: "alius", title: "Segnale dall'Alius Academy",
    text: "Una luce verde nel cielo. Un giocatore dell'Alius Academy atterra davanti a voi e vi sfida.",
    choices: [
      { label: "Accetta la sfida", outcomes: [{ chance: 100, text: "Che inizi la battaglia!", effects: [{ type: "battle", ids: ["dvalin"], levelBonus: 3, reward: "cuneo" }] }] },
      { label: "Ritirata strategica", outcomes: [{ chance: 100, text: "Il giocatore ride e sparisce in un lampo. Vi sentite umiliati: -30 Prestigio.", effects: [{ type: "money", amt: -30 }] }] },
    ],
  },
  {
    id: "laboratorio", title: "Il Laboratorio di Ray Dark",
    text: "Trovate un laboratorio abbandonato pieno di fiale luminose. Una scritta: «Progetto DNA».",
    choices: [
      { label: "Prendi un Cuneo DNA", outcomes: [
        { chance: 65, text: "Il Cuneo DNA pulsa di energia. È vostro!", effects: [{ type: "item", id: "cuneo" }] },
        { chance: 35, text: "Un allarme! Le guardie vi cacciano e il vostro capitano si ferisce nella fuga.", effects: [{ type: "damage", pct: 40, target: "active" }] },
      ] },
      { label: "Studia le note scientifiche", outcomes: [{ chance: 100, text: "Le note rivelano segreti dell'allenamento: il capitano ottiene +10 HP max.", effects: [{ type: "stat", stat: "hp", amt: 10, target: "active" }] }] },
    ],
  },
  {
    id: "camelia", title: "La Manager Camelia",
    text: "Camelia Travis, la manager, vi offre un check-up completo... in cambio di 50 Punti Prestigio.",
    choices: [
      { label: "Paga 50 Prestigio: cura gli HP dei giocatori non KO", cost: 50, outcomes: [{ chance: 100, text: "HP dei giocatori non KO completamente ripristinati. I giocatori KO restano KO.", effects: [{ type: "money", amt: -50 }, { type: "heal", pct: 100, target: "all" }] }] },
      { label: "Rifiuta", outcomes: [{ chance: 100, text: "Camelia scrolla le spalle e vi regala comunque una bibita.", effects: [{ type: "item", id: "bibita" }] }] },
    ],
  },
  {
    id: "cane", title: "Il Cane di Xavier",
    text: "Un cane randagio ha rubato il pallone e corre verso il fiume!",
    choices: [
      { label: "Inseguilo!", outcomes: [
        { chance: 60, text: "Lo prendete! Il cane vi conduce a un giocatore solitario che vuole unirsi a voi.", effects: [{ type: "recruit", tier: 2 }] },
        { chance: 40, text: "Il pallone finisce nel fiume. Recuperate però un paio di Scarpini Turbo dalla riva.", effects: [{ type: "item", id: "scarpini" }] },
      ] },
      { label: "Lascialo andare", outcomes: [{ chance: 100, text: "Che pace. Il capitano medita e guadagna esperienza.", effects: [{ type: "xp", amt: 40, target: "active" }] }] },
    ],
  },
  {
    id: "fusione", title: "La Macchina della Fusione",
    text: "Un vecchio scienziato vi mostra una macchina: «Un Cuneo DNA gratis, se lasciate che io registri i dati».",
    choices: [
      { label: "Accetta", outcomes: [{ chance: 100, text: "La macchina ronza e sputa fuori un Cuneo DNA!", effects: [{ type: "item", id: "cuneo" }] }] },
      { label: "Troppo strano, andiamo", outcomes: [{ chance: 100, text: "Meglio non fidarsi. Trovate 40 Prestigio per strada.", effects: [{ type: "money", amt: 40 }] }] },
    ],
  },
  {
    id: "rivali", title: "Sfida dei Rivali",
    text: "Una squadra di quartiere vi sfida per il possesso del campo. Sono in tre e sembrano forti.",
    choices: [
      { label: "Accetta la sfida (ricompensa extra)", outcomes: [{ chance: 100, text: "In campo!", effects: [{ type: "battle", count: 3, levelBonus: 2, reward: "trofeo" }] }] },
      { label: "Cedete il campo", outcomes: [{ chance: 100, text: "Andate via a testa bassa, ma trovate un altro campo dove allenarvi: +20 XP a tutti.", effects: [{ type: "xp", amt: 20, target: "all" }] }] },
    ],
  },
  {
    id: "erik", title: "Il Fantasma dell'Inazuma Eleven",
    text: "Al vecchio stadio, uno spirito con la maglia dell'Inazuma Eleven originale vi osserva.",
    choices: [
      { label: "Chiedi un insegnamento", outcomes: [
        { chance: 50, text: "«La forza della squadra è nel cuore.» Tutti ottengono +3 ATK.", effects: [{ type: "stat", stat: "atk", amt: 3, target: "all" }] },
        { chance: 50, text: "Lo spirito vi lascia la Fascia del Capitano.", effects: [{ type: "item", id: "fascia" }] },
      ] },
      { label: "Scappa", outcomes: [{ chance: 100, text: "Fuggite a gambe levate. Nessuno vi biasima.", effects: [] }] },
    ],
  },
  {
    id: "mercato_nero", title: "Il Mercato Nero di Kogure",
    text: "Kogure ghigna: «Psst... oggetti rari, prezzi da amici. 120 Prestigio per una sorpresa.»",
    choices: [
      { label: "Paga 120 Prestigio", cost: 120, outcomes: [
        { chance: 40, text: "Un Cuneo DNA! Affare fatto!", effects: [{ type: "money", amt: -120 }, { type: "item", id: "cuneo" }] },
        { chance: 35, text: "Un Fischietto d'Argento. Non male.", effects: [{ type: "money", amt: -120 }, { type: "item", id: "fischietto" }] },
        { chance: 25, text: "Una rana di gomma. Kogure ride e scappa.", effects: [{ type: "money", amt: -120 }] },
      ] },
      { label: "No grazie", outcomes: [{ chance: 100, text: "Kogure fa una pernacchia e sparisce.", effects: [] }] },
    ],
  },
  {
    id: "infortunio", title: "Infortunio in Allenamento",
    text: "Durante un tiro potente, il tuo capitano cade male. Il ginocchio fa male.",
    choices: [
      { label: "Stringi i denti e continua", outcomes: [
        { chance: 50, text: "Il dolore passa e il capitano è più tenace: +8 HP max, ma perde metà HP.", effects: [{ type: "stat", stat: "hp", amt: 8, target: "active" }, { type: "damage", pct: 50, target: "active" }] },
        { chance: 50, text: "Peggiora. Perde il 60% degli HP.", effects: [{ type: "damage", pct: 60, target: "active" }] },
      ] },
      { label: "Riposa e fai curare", outcomes: [{ chance: 100, text: "Un po' di ghiaccio e passa tutto. -30 Prestigio per le cure.", effects: [{ type: "money", amt: -30 }, { type: "heal", pct: 30, target: "active" }] }] },
    ],
  },
  {
    id: "talent", title: "Talent Scout",
    text: "Un talent scout vi propone uno scambio: un giocatore della vostra squadra per un talento sconosciuto.",
    choices: [
      { label: "Accetta l'incontro", outcomes: [{ chance: 100, text: "Un nuovo talento raro vuole unirsi alla squadra!", effects: [{ type: "recruit", tier: 3 }] }] },
      { label: "La squadra è già perfetta", outcomes: [{ chance: 100, text: "Lo scout apprezza la lealtà e vi lascia delle Proteine.", effects: [{ type: "item", id: "proteine" }] }] },
    ],
  },
  {
    id: "vulcano", title: "Il Campo Vulcanico",
    text: "Un campo di allenamento su roccia vulcanica: i giocatori di tipo Fuoco si sentono a casa.",
    choices: [
      { label: "Allenamento di Fuoco", outcomes: [{ chance: 100, text: "I giocatori di tipo Fuoco ottengono +6 ATK!", effects: [{ type: "stat", stat: "atk", amt: 6, target: "element", element: "fuoco" }] }] },
      { label: "Raccogli pietre vulcaniche", outcomes: [{ chance: 100, text: "Vendibili! +70 Prestigio.", effects: [{ type: "money", amt: 70 }] }] },
    ],
  },
  {
    id: "foresta", title: "La Foresta di Fubuki",
    text: "Nella foresta innevata dell'Hokkaido, il vento sibila tra gli alberi.",
    choices: [
      { label: "Allenamento nel vento", outcomes: [{ chance: 100, text: "I giocatori di tipo Aria ottengono +6 VEL, quelli di tipo Natura +5 DIF.", effects: [{ type: "stat", stat: "spd", amt: 6, target: "element", element: "aria" }, { type: "stat", stat: "def", amt: 5, target: "element", element: "natura" }] }] },
      { label: "Cerca un rifugio", outcomes: [{ chance: 100, text: "Un capanno con una stufa. Tutti recuperano il 50% HP.", effects: [{ type: "heal", pct: 50, target: "all" }] }] },
    ],
  },
];

export const RECRUIT_LINES = [
  "«Ho visto la vostra partita... posso unirmi a voi?»",
  "«Cerco una squadra che punti in alto. Mi prendete?»",
  "«Il mio sogno è il Football Frontier. Fatemi giocare!»",
  "«Non ho più una squadra. Datemi una possibilità.»",
];

export const WILD_INTROS = [
  "Un giocatore solitario si allena sul campo e vi sfida!",
  "«Ehi voi! Vediamo quanto valete!»",
  "Un calciatore di passaggio vuole mettervi alla prova.",
  "Qualcuno vi blocca il passaggio con un pallone sotto il braccio.",
];

export const TEAM_NAMES = ["Occult", "Wild", "Brain", "Otaku", "Shuriken", "Farm", "Kirkwood", "Umbrella", "Sea Rockets", "Epsilon", "Gemini Storm", "Neo Japan", "Orpheus", "Knights of Queen", "Fire Dragon", "The Empire", "Unicorn", "Big Waves", "Rose Griffon", "Team K"];
