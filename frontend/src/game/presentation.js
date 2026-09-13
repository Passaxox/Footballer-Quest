import { resolveVersion, CHARACTERS } from "./catalog";

export const ENCOUNTER_TIERS = {
  normal: {
    id: "normal",
    label: "SFIDA ORDINARIA",
    shortLabel: "SFIDA",
    badgeClass: "bg-slate-800/90 text-slate-300 border-slate-600",
    borderClass: "border-slate-700",
    glowClass: "",
    accentColor: "#94a3b8",
    headerBg: "bg-slate-900/90",
    winHeadline: "BATTAGLIA VINTA",
    introDelay: 400,
  },
  elite: {
    id: "elite",
    label: "BATTAGLIA D'ÉLITE",
    shortLabel: "ÉLITE",
    badgeClass: "bg-sky-950/95 text-sky-300 border-sky-400 font-bold tracking-wide",
    borderClass: "border-sky-500",
    glowClass: "elite-glow",
    accentColor: "#38bdf8",
    headerBg: "bg-sky-950/70",
    winHeadline: "ÉLITE SUPERATA",
    introDelay: 800,
  },
  miniboss: {
    id: "miniboss",
    label: "SCONTRO MINIBOSS",
    shortLabel: "MINIBOSS",
    badgeClass: "bg-amber-950/95 text-amber-300 border-amber-400 font-bold tracking-wide shadow-sm",
    borderClass: "border-amber-500",
    glowClass: "miniboss-glow",
    accentColor: "#f59e0b",
    headerBg: "bg-amber-950/70",
    winHeadline: "MINIBOSS SCONFITTO",
    introDelay: 1100,
  },
  boss: {
    id: "boss",
    label: "BATTAGLIA DECISIVA BOSS",
    shortLabel: "BOSS",
    badgeClass: "bg-rose-950/95 text-rose-300 border-rose-500 font-bold tracking-wider shadow-md",
    borderClass: "border-rose-600",
    glowClass: "boss-glow",
    accentColor: "#f43f5e",
    headerBg: "bg-rose-950/85",
    winHeadline: "BOSS ABBATTUTO",
    introDelay: 1500,
  },
};

export const getEncounterTier = (encounter = {}) => {
  if (encounter.kind === "boss") return ENCOUNTER_TIERS.boss;
  if (encounter.kind === "miniboss") return ENCOUNTER_TIERS.miniboss;
  if (encounter.kind === "elite") return ENCOUNTER_TIERS.elite;
  return ENCOUNTER_TIERS.normal;
};

export const TEAM_ACCENTS = {
  "royal-academy": {
    displayName: "Royal Academy",
    shortLabel: "Royal",
    primaryColor: "#dc2626",
    accentColor: "#1e3a8a",
    borderClass: "border-red-600",
    bgClass: "from-red-950/80 via-slate-950 to-blue-950/60",
    tagBadge: "bg-red-950 text-red-300 border-red-500",
    subtitle: "L'Impero Calcistico di Ray Dark",
    theme: "stadium",
  },
  zeus: {
    displayName: "Zeus Jr. High",
    shortLabel: "Zeus",
    primaryColor: "#fbbf24",
    accentColor: "#38bdf8",
    borderClass: "border-amber-400",
    bgClass: "from-amber-950/80 via-slate-950 to-sky-950/60",
    tagBadge: "bg-amber-950 text-amber-200 border-amber-400",
    subtitle: "La Potenza Divina dell'Olimpo",
    theme: "stadium",
  },
  "gemini-storm": {
    displayName: "Gemini Storm",
    shortLabel: "Gemini",
    primaryColor: "#0284c7",
    accentColor: "#4f46e5",
    borderClass: "border-cyan-500",
    bgClass: "from-cyan-950/80 via-slate-950 to-indigo-950/60",
    tagBadge: "bg-cyan-950 text-cyan-300 border-cyan-400",
    subtitle: "Avanguardia a Velocità Ipersonica",
    theme: "alius",
  },
  epsilon: {
    displayName: "Epsilon",
    shortLabel: "Epsilon",
    primaryColor: "#9333ea",
    accentColor: "#f97316",
    borderClass: "border-purple-500",
    bgClass: "from-purple-950/80 via-slate-950 to-orange-950/60",
    tagBadge: "bg-purple-950 text-purple-300 border-purple-400",
    subtitle: "Squadra di Primo Rango dell'Alius",
    theme: "alius",
  },
  "diamond-dust": {
    displayName: "Diamond Dust",
    shortLabel: "Diamond",
    primaryColor: "#38bdf8",
    accentColor: "#93c5fd",
    borderClass: "border-sky-400",
    bgClass: "from-sky-950/80 via-slate-950 to-slate-900",
    tagBadge: "bg-sky-950 text-sky-200 border-sky-400",
    subtitle: "I Maestri del Ghiaccio e della Bufera",
    theme: "snow",
  },
  prominence: {
    displayName: "Prominence",
    shortLabel: "Prominence",
    primaryColor: "#ea580c",
    accentColor: "#ef4444",
    borderClass: "border-orange-500",
    bgClass: "from-orange-950/80 via-slate-950 to-red-950/60",
    tagBadge: "bg-orange-950 text-orange-300 border-orange-400",
    subtitle: "I Signori delle Fiamme Ardenti",
    theme: "volcanic",
  },
  genesis: {
    displayName: "Genesis",
    shortLabel: "Genesis",
    primaryColor: "#6366f1",
    accentColor: "#a855f7",
    borderClass: "border-indigo-500",
    bgClass: "from-indigo-950/80 via-slate-950 to-purple-950/70",
    tagBadge: "bg-indigo-950 text-indigo-200 border-indigo-400",
    subtitle: "L'Evoluzione Suprema dell'Alius",
    theme: "alius",
  },
  chaos: {
    displayName: "Chaos",
    shortLabel: "Chaos",
    primaryColor: "#ef4444",
    accentColor: "#0284c7",
    borderClass: "border-fuchsia-500",
    bgClass: "from-red-950/70 via-slate-950 to-sky-950/70",
    tagBadge: "bg-fuchsia-950 text-fuchsia-200 border-fuchsia-400",
    subtitle: "La Fusione Proibita di Fuoco e Ghiaccio",
    theme: "stadium",
  },
  alpine: {
    displayName: "Alpine Jr. High",
    shortLabel: "Alpine",
    primaryColor: "#0ea5e9",
    accentColor: "#e2e8f0",
    borderClass: "border-cyan-400",
    bgClass: "from-cyan-950/70 via-slate-950 to-slate-900",
    tagBadge: "bg-cyan-950 text-cyan-200 border-cyan-400",
    subtitle: "I Lupi delle Vette dell'Hokkaido",
    theme: "snow",
  },
  raimon: {
    displayName: "Raimon",
    shortLabel: "Raimon",
    primaryColor: "#facc15",
    accentColor: "#2563eb",
    borderClass: "border-amber-400",
    bgClass: "from-amber-950/70 via-slate-950 to-blue-950/60",
    tagBadge: "bg-amber-950 text-amber-300 border-amber-400",
    subtitle: "I Difensori del Calcio del Cuore",
    theme: "field",
  },
  international: {
    displayName: "Rappresentativa Mondiale",
    shortLabel: "Mondiale",
    primaryColor: "#10b981",
    accentColor: "#38bdf8",
    borderClass: "border-emerald-500",
    bgClass: "from-emerald-950/70 via-slate-950 to-slate-900",
    tagBadge: "bg-emerald-950 text-emerald-300 border-emerald-400",
    subtitle: "Il Grande Palcoscenico Internazionale",
    theme: "stadium",
  },
};

export const resolveTeamAccent = (teamName = "", teamTags = []) => {
  const norm = String(teamName).toLowerCase();
  for (const tag of teamTags) {
    if (TEAM_ACCENTS[tag]) return TEAM_ACCENTS[tag];
    if (tag.includes("royal") && TEAM_ACCENTS["royal-academy"]) return TEAM_ACCENTS["royal-academy"];
    if (tag.includes("zeus") && TEAM_ACCENTS.zeus) return TEAM_ACCENTS.zeus;
    if (tag.includes("gemini") && TEAM_ACCENTS["gemini-storm"]) return TEAM_ACCENTS["gemini-storm"];
    if (tag.includes("epsilon") && TEAM_ACCENTS.epsilon) return TEAM_ACCENTS.epsilon;
    if (tag.includes("diamond") && TEAM_ACCENTS["diamond-dust"]) return TEAM_ACCENTS["diamond-dust"];
    if (tag.includes("prominence") && TEAM_ACCENTS.prominence) return TEAM_ACCENTS.prominence;
    if (tag.includes("genesis") && TEAM_ACCENTS.genesis) return TEAM_ACCENTS.genesis;
    if (tag.includes("chaos") && TEAM_ACCENTS.chaos) return TEAM_ACCENTS.chaos;
    if (tag.includes("alpine") && TEAM_ACCENTS.alpine) return TEAM_ACCENTS.alpine;
    if (tag.includes("raimon") && TEAM_ACCENTS.raimon) return TEAM_ACCENTS.raimon;
  }
  if (norm.includes("royal")) return TEAM_ACCENTS["royal-academy"];
  if (norm.includes("zeus")) return TEAM_ACCENTS.zeus;
  if (norm.includes("gemini")) return TEAM_ACCENTS["gemini-storm"];
  if (norm.includes("epsilon")) return TEAM_ACCENTS.epsilon;
  if (norm.includes("diamond") || norm.includes("ghiacci")) return TEAM_ACCENTS["diamond-dust"];
  if (norm.includes("prominence") || norm.includes("infuocato")) return TEAM_ACCENTS.prominence;
  if (norm.includes("genesis")) return TEAM_ACCENTS.genesis;
  if (norm.includes("chaos")) return TEAM_ACCENTS.chaos;
  if (norm.includes("alpine")) return TEAM_ACCENTS.alpine;
  if (norm.includes("raimon")) return TEAM_ACCENTS.raimon;
  if (norm.includes("mondiale") || norm.includes("internazionale")) return TEAM_ACCENTS.international;

  return {
    displayName: teamName || "Formazione Avversaria",
    shortLabel: "Sfida",
    primaryColor: "#94a3b8",
    accentColor: "#64748b",
    borderClass: "border-slate-600",
    bgClass: "from-slate-900 via-slate-950 to-slate-900",
    tagBadge: "bg-slate-800 text-slate-300 border-slate-600",
    subtitle: "Rivali sulla via del Football Frontier",
    theme: "field",
  };
};

export const resolveScenarioTheme = (scenarioId = "", routeTheme = "") => {
  if (routeTheme === "zona-alius" || scenarioId.includes("epsilon") || scenarioId.includes("gemini") || scenarioId.includes("genesis")) return "alius";
  if (routeTheme === "strada-montana" || scenarioId.includes("alpine") || scenarioId.includes("diamond")) return "snow";
  if (scenarioId.includes("prominence")) return "volcanic";
  if (routeTheme === "stadio-prestigio" || scenarioId.includes("zeus") || scenarioId.includes("royal") || scenarioId.includes("chaos") || scenarioId.includes("international")) return "stadium";
  if (routeTheme === "area-metropolitana" || routeTheme === "quartiere-commerciale" || scenarioId === "urban") return "urban";
  return "field";
};

export const TRIGGER_ITEM_PRESENTATION = {
  stendardo: {
    title: "STENDARDO TATTICO ATTIVATO",
    subtitle: "Primo assalto potenziato (+20% potenza)!",
    icon: "🚩",
    color: "border-amber-400 bg-amber-950/95 text-amber-200",
  },
  cavigliera: {
    title: "CAVIGLIERA PROTETTIVA ATTIVATA",
    subtitle: "KO evitato con tenacia · 1 HP rimasto!",
    icon: "🛡️",
    color: "border-emerald-400 bg-emerald-950/95 text-emerald-200",
  },
  cerotto: {
    title: "CEROTTO D'EMERGENZA ATTIVATO",
    subtitle: "Soccorso medico tempestivo sul campo!",
    icon: "🩹",
    color: "border-sky-400 bg-sky-950/95 text-sky-200",
  },
  balsamo: {
    title: "BALSAMO RINFRESCANTE ATTIVATO",
    subtitle: "Bruciatura prevenuta e status protetto!",
    icon: "💧",
    color: "border-blue-400 bg-blue-950/95 text-blue-200",
  },
};

export const SYNERGY_PRESENTATION = {
  fuoco: { label: "INTESA FUOCO", effectDesc: "+10% probabilità di colpo critico", cue: "Critico favorito dalla passione" },
  aria: { label: "INTESA ARIA", effectDesc: "+4 VEL e massima iniziativa", cue: "Iniziativa rapida come il vento" },
  terra: { label: "INTESA TERRA", effectDesc: "-10% danno da ogni attacco subito", cue: "Danno ridotto dalla difesa di roccia" },
  natura: { label: "INTESA NATURA", effectDesc: "Recupero 7% HP post-vittoria", cue: "Rigenerazione naturale post-match" },
};

export const getCheckpointForeshadowing = (segment, wave) => {
  if (!segment) return "Avanti verso la prossima sfida";
  const nextBossWave = [10, 20, 30, 40, 50].find(w => w >= wave);
  const isTerminalBoss = segment.checkpointType === "boss" || (segment.step + 1 >= segment.length && nextBossWave === wave + 1);
  if (isTerminalBoss) {
    return "Una squadra leggendaria presidia lo stadio finale del segmento!";
  }
  if (segment.routeId === "zona-alius") {
    return "Forte segnale ostile: una pattuglia d'élite Alius blocca l'accesso.";
  }
  if (segment.routeId === "strada-montana") {
    return "Condizioni meteo estreme: un muro difensivo d'alta quota vi attende.";
  }
  if (segment.routeId === "circuito-prestigio") {
    return "Atmosfera da grande evento: campioni regionali pronti al confronto.";
  }
  if (segment.routeId === "campi-federali") {
    return "Tecnici e osservatori presidiano il campo centrale del checkpoint.";
  }
  return "Una formazione d'élite regionale presidia la fine del segmento.";
};

export const formatVersionSubtitle = (player) => {
  if (!player) return "";
  const v = resolveVersion(player.versionId || player.baseId);
  const canon = CHARACTERS[player.characterId || player.baseId];
  if (player.fused) return "Giocatore Fuso ✦";
  if (v?.displayName && canon?.displayName && v.displayName !== canon.displayName) {
    const match = v.displayName.match(/\((.+?)\)/);
    if (match) return match[1];
    if (v.teamTags?.length) {
      const team = TEAM_ACCENTS[v.teamTags[0]];
      if (team) return team.displayName;
    }
    return v.displayName.replace(canon.displayName, "").trim() || "Forma Speciale";
  }
  if (v?.teamTags?.length) {
    const team = TEAM_ACCENTS[v.teamTags[0]];
    if (team) return team.displayName;
  }
  return "Forma Base";
};
