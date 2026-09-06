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
  { id: "joseph", name: "Joseph King", element: "fuoco", role: "A", tier: 3, hp: 76, atk: 44, def: 26, spd: 34, move: M("Pinguino Imperatore N.1", "fuoco", 95, "burn") },
  { id: "david", name: "David Samford", element: "fuoco", role: "C", tier: 3, hp: 74, atk: 36, def: 30, spd: 36, move: M("Twin Boost", "fuoco", 80, "multi") },
  { id: "byron", name: "Byron Love", element: "aria", role: "A", tier: 4, hp: 82, atk: 50, def: 30, spd: 44, move: M("Piuma Celeste", "aria", 105, "drain") },
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

export const BOSSES = {
  10: { team: "Royal Academy", intro: "La Royal Academy vi sbarra la strada. Il Preside Ray Dark osserva dalla tribuna...", ids: ["jude", "david", "joseph"] },
  20: { team: "Zeus", intro: "Gli dèi dello stadio scendono in campo. Byron Love sorride con aria di superiorità.", ids: ["jonas", "byron"] },
  30: { team: "Chaos", intro: "Fuoco e ghiaccio: Torch e Gazelle uniscono le forze contro di voi!", ids: ["dvalin", "torch", "gazelle"] },
  40: { team: "Genesis", intro: "L'Alius Academy schiera la sua squadra definitiva. Xavier Foster vi attende.", ids: ["jordan", "dvalin", "xavier"] },
  50: { team: "Little Gigant", intro: "La finale del Football Frontier International! Rococo Urupa para tutto... o quasi.", ids: ["fidio", "kruger", "rococo"] },
};

export const FINAL_WAVE = 50;

export const ITEMS = {
  barretta: { id: "barretta", name: "Barretta Energetica", desc: "Recupera il 50% degli HP di un giocatore.", price: 40, battle: true },
  bibita: { id: "bibita", name: "Bibita Inazuma", desc: "Recupera tutti gli HP e cura le condizioni.", price: 90, battle: true },
  pallone: { id: "pallone", name: "Pallone d'Oro", desc: "Rianima un giocatore KO con metà HP.", price: 150, battle: true },
  cuneo: { id: "cuneo", name: "Cuneo DNA", desc: "Fonde due giocatori in uno solo, più forte.", price: 300, battle: false },
  fascia: { id: "fascia", name: "Fascia del Capitano", desc: "+5 ATK permanente a un giocatore.", price: 120, battle: false },
  guanti: { id: "guanti", name: "Guanti Rinforzati", desc: "+5 DIF permanente a un giocatore.", price: 120, battle: false },
  scarpini: { id: "scarpini", name: "Scarpini Turbo", desc: "+6 VEL permanente a un giocatore.", price: 120, battle: false },
  proteine: { id: "proteine", name: "Proteine Kudo", desc: "+15 HP max permanente a un giocatore.", price: 120, battle: false },
  trofeo: { id: "trofeo", name: "Mini Trofeo", desc: "Tutta la squadra guadagna esperienza.", price: 100, battle: false },
  fischietto: { id: "fischietto", name: "Fischietto d'Argento", desc: "Il prossimo avversario singolo si unirà a te se lo sconfiggi.", price: 200, battle: false },
  talismano: { id: "talismano", name: "Talismano Elementale", desc: "In battaglia: la tua mossa colpisce sempre come superefficace per 1 turno.", price: 110, battle: true },
};

export const SHOP_POOL = ["barretta", "barretta", "bibita", "pallone", "cuneo", "fascia", "guanti", "scarpini", "proteine", "trofeo", "fischietto", "talismano"];

export const REWARD_POOL = [
  { id: "barretta", w: 20 }, { id: "bibita", w: 10 }, { id: "pallone", w: 6 }, { id: "cuneo", w: 5 },
  { id: "fascia", w: 9 }, { id: "guanti", w: 9 }, { id: "scarpini", w: 9 }, { id: "proteine", w: 9 },
  { id: "trofeo", w: 8 }, { id: "fischietto", w: 4 }, { id: "talismano", w: 7 },
];

// Story events: choices -> outcomes (random pick weighted by chance)
export const EVENTS = [
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
      { label: "Paga 50 Prestigio", cost: 50, outcomes: [{ chance: 100, text: "Squadra completamente curata e pronta!", effects: [{ type: "money", amt: -50 }, { type: "heal", pct: 100, target: "all" }] }] },
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
