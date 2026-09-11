import { RARITIES } from "./rarity";
import { LEGACY_EVENTS } from "./data";

export const EVENT_OUTCOME_TYPES = new Set([
  "healTeam", "damageTeam", "grantCurrency", "grantItem", "grantXp", "adjustStat",
  "startEncounter", "offerRecruit", "setFlag", "incrementFlag", "temporaryModifier", "narrative",
]);

const outcome = (text, effects, weight = 1) => ({ text, effects, weight });
const choice = (label, outcomes, cost = 0) => ({ label, outcomes, ...(cost ? { cost } : {}) });

export const RUN_EVENTS = [
  {
    eventId: "sideline-clinic", title: "Clinica a Bordocampo", body: "Un fisioterapista offre una pausa breve prima della prossima sfida.",
    category: "recovery", rarity: "common", weight: 8, oncePerRun: false, cooldownWaves: 5,
    choices: [
      choice("Cura tutta la squadra", [outcome("La squadra recupera il 35% degli HP.", [{ type: "healTeam", percent: 35 }])]),
      choice("Prendi le scorte", [outcome("Ricevi due impacchi da bordocampo.", [{ type: "grantItem", itemId: "impacco", quantity: 2 }])]),
    ],
  },
  {
    eventId: "camelia-checkup", title: "Il Check-up di Camelia", body: "Camelia offre un controllo completo in cambio di 50 Prestigio.",
    category: "recovery", rarity: "uncommon", weight: 6, oncePerRun: false, cooldownWaves: 7,
    choices: [
      choice("Paga 50 Prestigio: cura tutti i giocatori non KO", [outcome("Gli HP dei giocatori non KO sono ripristinati. I giocatori KO restano KO.", [{ type: "grantCurrency", amount: -50 }, { type: "healTeam", percent: 100 }])], 50),
      choice("Rifiuta il check-up", [outcome("Camelia lascia comunque una Bibita Inazuma.", [{ type: "grantItem", itemId: "bibita" }])]),
    ],
  },
  {
    eventId: "iron-tower-drill", title: "Allenamento alla Torre", body: "Lo pneumatico legato alla Torre di Ferro aspetta una squadra abbastanza tenace.",
    category: "training", rarity: "common", weight: 7, scenarioIds: ["urban", "raimon-training"], waveRange: { from: 2, to: 20 }, oncePerRun: true,
    choices: [
      choice("Allenamento di squadra", [outcome("Tutti guadagnano 24 XP, ma perdono il 15% degli HP.", [{ type: "grantXp", amount: 24 }, { type: "damageTeam", percent: 15 }])]),
      choice("Studia il quaderno", [outcome("La difesa del capitano aumenta di 4.", [{ type: "adjustStat", stat: "def", amount: 4, target: "active" }, { type: "setFlag", flag: "tower-notes", value: true }])]),
    ],
  },
  {
    eventId: "street-tournament", title: "Torneo Lampo", body: "Una squadra di quartiere mette in palio un trofeo per chi accetta subito.",
    category: "risk-reward", rarity: "common", weight: 7, scenarioIds: ["urban"], oncePerRun: false, cooldownWaves: 7,
    choices: [
      choice("Gioca per il trofeo", [outcome("La sfida comincia: gli avversari hanno il vantaggio del campo.", [{ type: "startEncounter", count: 3, levelBonus: 2, rewardItem: "trofeo" }, { type: "incrementFlag", flag: "street-challenges", amount: 1 }])]),
      choice("Conserva le energie", [outcome("Un allenamento leggero vale 16 XP per tutti.", [{ type: "grantXp", amount: 16 }])]),
    ],
  },
  {
    eventId: "route-split", title: "Due Strade", body: "Una scorciatoia promette rivali più forti; la strada lunga passa da un punto ristoro.",
    category: "risk-reward", rarity: "uncommon", weight: 6, oncePerRun: false, cooldownWaves: 6,
    choices: [
      choice("Prendi la scorciatoia", [outcome("Per tre ondate aumentano le possibilità di incontri rari e le ricompense.", [{ type: "temporaryModifier", id: "bold-route", remainingWaves: 3, rarityWeights: { rare: 1.8, special: 1.5 }, rewardMultiplier: 1.25 }, { type: "setFlag", flag: "bold-route", value: true }])]),
      choice("Passa dal ristoro", [outcome("La squadra recupera il 25% degli HP.", [{ type: "healTeam", percent: 25 }])]),
    ],
  },
  {
    eventId: "honest-wallet", title: "Portafoglio Smarrito", body: "Tra le gradinate trovi un portafoglio pieno di Prestigio e un tesserino da allenatore.",
    category: "narrative", rarity: "common", weight: 6, scenarioIds: ["urban", "raimon-training"], oncePerRun: true,
    choices: [
      choice("Restituiscilo", [outcome("Il proprietario ricambia con un Fischietto d'Argento.", [{ type: "grantItem", itemId: "fischietto" }, { type: "setFlag", flag: "trusted-coach", value: true }])]),
      choice("Tieni il Prestigio", [
        outcome("Ottieni 90 Prestigio, ma perdi la futura fiducia dell'allenatore.", [{ type: "grantCurrency", amount: 90 }, { type: "setFlag", flag: "kept-wallet", value: true }], 3),
        outcome("Nel portafoglio ci sono solo 40 Prestigio e un contatto che non si fiderà più di voi.", [{ type: "grantCurrency", amount: 40 }, { type: "setFlag", flag: "kept-wallet", value: true }], 1),
      ]),
    ],
  },
  {
    eventId: "trusted-coach-recruit", title: "La Parola dell'Allenatore", body: "L'allenatore che hai aiutato presenta un giovane talento alla squadra.",
    category: "recruitment", rarity: "rare", weight: 8, requiresFlags: { "trusted-coach": true }, excludesFlags: ["coach-rewarded"], oncePerRun: true,
    choices: [
      choice("Offrigli un posto", [outcome("Il talento è pronto a unirsi senza chiedere Prestigio.", [{ type: "offerRecruit", maxRarity: "uncommon", price: 0 }, { type: "setFlag", flag: "coach-rewarded", value: true }])]),
      choice("Chiedi attrezzatura", [outcome("Ricevi Guanti Rinforzati e chiudi l'accordo.", [{ type: "grantItem", itemId: "guanti" }, { type: "setFlag", flag: "coach-rewarded", value: true }])]),
    ],
  },
  {
    eventId: "royal-tactics", title: "Schema della Royal", body: "Un foglio tattico della Royal Academy mostra come chiudere ogni spazio.",
    category: "training", rarity: "uncommon", weight: 7, scenarioIds: ["royal-academy"], oncePerRun: true,
    choices: [
      choice("Studia lo schema", [outcome("Tutta la squadra ottiene +3 DIF.", [{ type: "adjustStat", stat: "def", amount: 3 }])]),
      choice("Sfida chi l'ha lasciato", [outcome("Una formazione Royal torna a reclamarlo.", [{ type: "startEncounter", teamTags: ["royal-academy"], count: 3, levelBonus: 1, rewardItem: "fascia" }])]),
    ],
  },
  {
    eventId: "zeus-altar", title: "Altare dello Stadio Zeus", body: "Una luce dorata avvolge un pallone lasciato al centro del campo.",
    category: "special-team encounter", rarity: "rare", weight: 6, scenarioIds: ["zeus"], oncePerRun: true,
    choices: [
      choice("Accetta la prova", [outcome("Gli dèi del campo mandano due sfidanti.", [{ type: "startEncounter", teamTags: ["zeus"], count: 2, levelBonus: 3, rewardItem: "talismano" }, { type: "setFlag", flag: "zeus-trial", value: true }])]),
      choice("Raccogli l'offerta", [outcome("Ottieni 100 Prestigio, senza affrontare la prova.", [{ type: "grantCurrency", amount: 100 }])]),
    ],
  },
  {
    eventId: "epsilon-console", title: "Console Epsilon", body: "Nel laboratorio lampeggia una console ancora collegata alla rete Alius.",
    category: "narrative", rarity: "uncommon", weight: 9, scenarioIds: ["epsilon-lab"], oncePerRun: true,
    choices: [
      choice("Decifra il segnale", [outcome("Trovi le coordinate di un atleta Epsilon isolato.", [{ type: "setFlag", flag: "epsilon-signal", value: true }, { type: "grantXp", amount: 20 }])]),
      choice("Sottrai una fiala", [outcome("Il capitano ottiene +7 HP, ma perde il 25% degli HP attuali.", [{ type: "adjustStat", stat: "hp", amount: 7, target: "active" }, { type: "damageTeam", percent: 25, target: "active" }])]),
    ],
  },
  {
    eventId: "epsilon-defector", title: "Disertore Epsilon", body: "Le coordinate conducono a un giocatore Epsilon che vuole scegliere il proprio futuro.",
    category: "recruitment", rarity: "rare", weight: 10, scenarioIds: ["epsilon-lab"], requiresFlags: { "epsilon-signal": true }, excludesFlags: ["epsilon-contact"], oncePerRun: true,
    choices: [
      choice("Invitalo in squadra", [outcome("Accetta di parlare dopo una prova sul campo.", [{ type: "offerRecruit", teamTags: ["epsilon"], maxRarity: "rare", price: 0 }, { type: "setFlag", flag: "epsilon-contact", value: true }])]),
      choice("Chiedi informazioni", [outcome("Ottieni 120 Prestigio e chiudi il contatto.", [{ type: "grantCurrency", amount: 120 }, { type: "setFlag", flag: "epsilon-contact", value: true }])]),
    ],
  },
  {
    eventId: "gemini-fragment", title: "Frammento Meteorico", body: "Nel cratere Gemini un frammento vibra quando il pallone si avvicina.",
    category: "risk-reward", rarity: "uncommon", weight: 9, scenarioIds: ["gemini-crash-site"], oncePerRun: true,
    choices: [
      choice("Segui la risonanza", [outcome("Il segnale attira una pattuglia Gemini e apre una nuova pista.", [{ type: "startEncounter", teamTags: ["gemini-storm"], count: 2, levelBonus: 2, rewardItem: "scarpini" }, { type: "setFlag", flag: "gemini-resonance", value: true }])]),
      choice("Vendi il frammento", [outcome("Un collezionista paga 110 Prestigio.", [{ type: "grantCurrency", amount: 110 }])]),
    ],
  },
  {
    eventId: "gemini-rendezvous", title: "Rendez-vous Gemini", body: "La risonanza rivela un membro della Gemini Storm disposto a cambiare rotta.",
    category: "recruitment", rarity: "rare", weight: 9, scenarioIds: ["gemini-crash-site"], requiresFlags: { "gemini-resonance": true }, oncePerRun: true,
    choices: [
      choice("Proponi di unirsi", [outcome("Il giocatore ascolta la proposta.", [{ type: "offerRecruit", teamTags: ["gemini-storm"], maxRarity: "rare", price: 40 }])]),
      choice("Scambia informazioni", [outcome("Ricevi un Cuneo DNA in cambio dei dati.", [{ type: "grantItem", itemId: "cuneo" }])]),
    ],
  },
  {
    eventId: "diamond-whiteout", title: "Bufera Bianca", body: "Sul ghiacciaio Diamond Dust la visibilità crolla e due sentieri spariscono nella neve.",
    category: "recovery", rarity: "common", weight: 9, scenarioIds: ["diamond-dust-glacier"], oncePerRun: false, cooldownWaves: 5,
    choices: [
      choice("Cerca il rifugio", [outcome("Nel rifugio la squadra recupera metà degli HP.", [{ type: "healTeam", percent: 50 }, { type: "setFlag", flag: "glacier-shelter", value: true }])]),
      choice("Avanza nella bufera", [outcome("Il freddo costa il 20% degli HP, ma trovi un equipaggiamento raro.", [{ type: "damageTeam", percent: 20 }, { type: "grantItem", itemId: "pallone" }])]),
    ],
  },
  {
    eventId: "diamond-scout", title: "Sentinella del Ghiacciaio", body: "Dal rifugio emerge una sentinella Diamond Dust incuriosita dalla vostra resistenza.",
    category: "recruitment", rarity: "rare", weight: 10, scenarioIds: ["diamond-dust-glacier"], requiresFlags: { "glacier-shelter": true }, oncePerRun: true,
    choices: [
      choice("Invitala alla squadra", [outcome("La sentinella accetta un incontro diretto.", [{ type: "offerRecruit", teamTags: ["diamond-dust"], maxRarity: "rare", price: 30 }])]),
      choice("Chiedi una guida", [outcome("La guida evita i pericoli e procura due Bibite Inazuma.", [{ type: "grantItem", itemId: "bibita", quantity: 2 }])]),
    ],
  },
  {
    eventId: "international-sponsor", title: "Sponsor Internazionale", body: "Uno sponsor offre fondi in cambio di una partita dimostrativa immediata.",
    category: "reward", rarity: "uncommon", weight: 7, scenarioIds: ["international"], oncePerRun: false, cooldownWaves: 8,
    choices: [
      choice("Gioca la dimostrazione", [outcome("Tre avversari internazionali entrano in campo.", [{ type: "startEncounter", count: 3, levelBonus: 2, rewardItem: "buono" }, { type: "grantCurrency", amount: 50 }])]),
      choice("Firma solo per le forniture", [outcome("Ricevi un Buono Sponsor.", [{ type: "grantItem", itemId: "buono" }])]),
    ],
  },
  {
    eventId: "captains-choice", title: "La Scelta del Capitano", body: "La squadra chiede se puntare sul recupero o preparare una sfida più ambiziosa.",
    category: "narrative", rarity: "common", weight: 5, oncePerRun: false, cooldownWaves: 6,
    choices: [
      choice("Proteggi la squadra", [outcome("Tutti recuperano il 20% degli HP.", [{ type: "healTeam", percent: 20 }, { type: "incrementFlag", flag: "careful-decisions", amount: 1 }])]),
      choice("Alza la posta", [outcome("Per due ondate gli incontri non comuni e rari sono favoriti.", [{ type: "temporaryModifier", id: "captain-ambition", remainingWaves: 2, rarityWeights: { uncommon: 1.4, rare: 1.7 } }, { type: "incrementFlag", flag: "bold-decisions", amount: 1 }])]),
    ],
  },
];

export const SCENARIO_EVENT_POOLS = {
  "raimon-training": { include: ["sideline-clinic", "camelia-checkup", "iron-tower-drill", "honest-wallet", "trusted-coach-recruit", "route-split", "captains-choice"] },
  urban: { include: ["sideline-clinic", "camelia-checkup", "iron-tower-drill", "street-tournament", "route-split", "honest-wallet", "trusted-coach-recruit", "captains-choice"] },
  "royal-academy": { include: ["sideline-clinic", "camelia-checkup", "royal-tactics", "route-split", "captains-choice"] },
  zeus: { include: ["sideline-clinic", "camelia-checkup", "zeus-altar", "route-split", "captains-choice"] },
  "epsilon-lab": { include: ["sideline-clinic", "camelia-checkup", "epsilon-console", "epsilon-defector", "route-split", "captains-choice"] },
  "gemini-crash-site": { include: ["sideline-clinic", "camelia-checkup", "gemini-fragment", "gemini-rendezvous", "route-split", "captains-choice"] },
  "diamond-dust-glacier": { include: ["sideline-clinic", "camelia-checkup", "diamond-whiteout", "diamond-scout", "route-split", "captains-choice"] },
  international: { include: ["sideline-clinic", "camelia-checkup", "international-sponsor", "route-split", "captains-choice"] },
};

const validPositive = value => Number.isFinite(value) && value > 0;

export function validateEvents(events = RUN_EVENTS) {
  if (!Array.isArray(events)) throw new Error("Event registry must be an array");
  const ids = new Set();
  const errors = [];
  for (const event of events) {
    if (!event?.eventId || ids.has(event.eventId)) errors.push(`Duplicate/invalid event ID: ${event?.eventId || "missing"}`);
    ids.add(event?.eventId);
    if (!event?.title || !event?.body || !event?.category || !RARITIES[event?.rarity] || !validPositive(event?.weight)) errors.push(`Invalid event metadata: ${event?.eventId}`);
    if (!Array.isArray(event?.choices) || event.choices.length < 2) errors.push(`Event needs meaningful choices: ${event?.eventId}`);
    for (const eventChoice of event?.choices || []) {
      if (!eventChoice.label || !Array.isArray(eventChoice.outcomes) || !eventChoice.outcomes.length) errors.push(`Invalid choice: ${event?.eventId}`);
      for (const result of eventChoice.outcomes || []) {
        if (!result.text || !validPositive(result.weight) || !Array.isArray(result.effects)) errors.push(`Invalid outcome: ${event?.eventId}`);
        for (const effect of result.effects || []) if (!EVENT_OUTCOME_TYPES.has(effect.type)) errors.push(`Unknown outcome type ${effect.type}: ${event?.eventId}`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
  return true;
}

validateEvents();

export function eventEligible(event, run, scenario) {
  const flags = run.storyFlags || {};
  const history = run.eventHistory?.[event.eventId];
  const range = event.waveRange || { from: 1, to: null };
  return run.wave >= (range.from || 1) && (range.to == null || run.wave <= range.to)
    && (!event.scenarioIds || event.scenarioIds.includes(scenario.id))
    && (!event.excludedScenarioIds || !event.excludedScenarioIds.includes(scenario.id))
    && (!event.requiresFlags || Object.entries(event.requiresFlags).every(([key, value]) => flags[key] === value))
    && (!event.excludesFlags || event.excludesFlags.every(key => !flags[key]))
    && (!event.oncePerRun || !history)
    && (!history || !event.cooldownWaves || run.wave - history.lastWave >= event.cooldownWaves);
}

export function eventPool(run, scenario) {
  const configured = scenario.eventPool?.include;
  return RUN_EVENTS.filter(event => (!configured || configured.includes(event.eventId)) && eventEligible(event, run, scenario))
    .map(event => ({ event, weight: event.weight * RARITIES[event.rarity].selectionWeight * (scenario.eventPool?.weights?.[event.eventId] || 1) }));
}

export function weightedPick(rows, rng = Math.random) {
  if (!rows.length) return null;
  let draw = rng() * rows.reduce((total, row) => total + row.weight, 0);
  return rows.find(row => (draw -= row.weight) < 0) || rows.at(-1);
}

export const selectEvent = (run, scenario, rng = Math.random) => weightedPick(eventPool(run, scenario), rng)?.event || null;

export function resolveEventChoice(event, choiceIndex, rng = Math.random) {
  const selected = event?.choices?.[choiceIndex];
  if (!selected) throw new Error(`Unknown choice ${choiceIndex} for event ${event?.eventId || "missing"}`);
  return weightedPick(selected.outcomes.map(result => ({ result, weight: result.weight })), rng)?.result;
}

const legacyEffect = effect => {
  const mappings = {
    item: { type: "grantItem", itemId: effect.id },
    money: { type: "grantCurrency", amount: effect.amt },
    heal: { type: "healTeam", percent: effect.pct, target: effect.target, element: effect.element },
    damage: { type: "damageTeam", percent: effect.pct, target: effect.target, element: effect.element },
    xp: { type: "grantXp", amount: effect.amt, target: effect.target, element: effect.element },
    stat: { type: "adjustStat", stat: effect.stat, amount: effect.amt, target: effect.target, element: effect.element },
    battle: { type: "startEncounter", versionIds: effect.ids, count: effect.count, levelBonus: effect.levelBonus, rewardItem: effect.reward },
    recruit: { type: "offerRecruit", maxRarity: effect.tier >= 3 ? "rare" : effect.tier === 2 ? "uncommon" : "common" },
  };
  return mappings[effect.type] || effect;
};

export const normalizeEventResult = result => ({ ...result, effects: (result?.effects || []).map(legacyEffect) });

function adaptLegacyEvent(event) {
  return {
    eventId: event.id,
    title: event.title,
    body: event.text,
    category: "legacy",
    rarity: "common",
    weight: 1,
    oncePerRun: true,
    choices: event.choices.map(eventChoice => ({
      label: eventChoice.label,
      ...(eventChoice.cost ? { cost: eventChoice.cost } : {}),
      outcomes: eventChoice.outcomes.map(result => ({ ...normalizeEventResult(result), weight: result.chance || 1 })),
    })),
  };
}

export function getRunEvent(eventId) {
  return RUN_EVENTS.find(event => event.eventId === eventId)
    || (LEGACY_EVENTS.find(event => event.id === eventId) ? adaptLegacyEvent(LEGACY_EVENTS.find(event => event.id === eventId)) : null);
}
