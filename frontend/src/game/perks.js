// Vantaggi: permanent meta unlocks (levels I-III) bought with Spirito di squadra, picked in run after bosses.
export const PERK_CURRENCY = "Spirito di squadra";
export const MAX_ACTIVE_PERKS = 5;

export const PERK_CATEGORIES = [
  { id: "off", label: "Offensivo" }, { id: "def", label: "Difensivo" }, { id: "spd", label: "Velocità" },
  { id: "grow", label: "Crescita" }, { id: "recruit", label: "Reclutamento" }, { id: "res", label: "Risorse" },
  { id: "team", label: "Squadra" }, { id: "curse", label: "Maledetto" }, { id: "fusion", label: "Fusione" },
];

export const RARITIES = {
  COMUNE: { label: "Comune", color: "#cbd5e1", costs: [0, 20, 45] },
  RARO: { label: "Raro", color: "#38bdf8", costs: [40, 80, 130] },
  EPICO: { label: "Epico", color: "#c084fc", costs: [90, 150, 230] },
  LEGGENDARIO: { label: "Leggendario", color: "#fbbf24", costs: [180, 280, 400] },
  MALEDETTO: { label: "Maledetto", color: "#f43f5e", costs: [0, 0, 0] },
};

const fmt = (v, unit = "%") => `${v > 0 ? "+" : ""}${v}${unit}`;

// fx(level) returns the effect object; text(level) the readable benefit.
export const PERKS = [
  { id: "tiro", cat: "off", rarity: "COMUNE", name: "Tiro Potente", values: [4, 7, 10], fx: (v) => ({ atkPct: v }), text: (v) => `${fmt(v)} ATK a tutta la squadra` },
  { id: "bomber", cat: "off", rarity: "RARO", name: "Istinto del Bomber", values: [5, 8, 12], fx: (v) => ({ critBonus: v }), text: (v) => `${fmt(v)} probabilità di colpo critico` },
  { id: "muro", cat: "def", rarity: "COMUNE", name: "Muro Difensivo", values: [4, 7, 10], fx: (v) => ({ defPct: v }), text: (v) => `${fmt(v)} DIF a tutta la squadra` },
  { id: "mano", cat: "def", rarity: "EPICO", name: "Guanti del Capitano", values: [8, 12, 16], fx: (v) => ({ hpPct: v }), text: (v) => `${fmt(v)} HP massimi in partita` },
  { id: "scatto", cat: "spd", rarity: "COMUNE", name: "Scatto Bruciante", values: [4, 7, 10], fx: (v) => ({ spdPct: v }), text: (v) => `${fmt(v)} VEL a tutta la squadra` },
  { id: "vento", cat: "spd", rarity: "RARO", name: "Passo del Vento", values: [8, 12, 16], fx: (v) => ({ spdPct: v }), text: (v) => `${fmt(v)} VEL a tutta la squadra` },
  { id: "allenamento", cat: "grow", rarity: "COMUNE", name: "Allenamento Extra", values: [10, 20, 30], fx: (v) => ({ xpPct: v }), text: (v) => `${fmt(v)} EXP dalle partite` },
  { id: "quaderno", cat: "grow", rarity: "EPICO", name: "Quaderno del Nonno", values: [1, 2, 3], fx: (v) => ({ startLevels: v }), text: (v) => `I titolari partono con +${v} livell${v === 1 ? "o" : "i"} (solo se scelto a inizio run)` },
  { id: "scout", cat: "recruit", rarity: "RARO", name: "Occhio dello Scout", values: [10, 20, 30], fx: (v) => ({ recruitBonus: v }), text: (v) => `${fmt(v)} probabilità che un avversario voglia unirsi` },
  { id: "sponsor", cat: "res", rarity: "COMUNE", name: "Sponsor Inazuma", values: [10, 20, 30], fx: (v) => ({ moneyPct: v }), text: (v) => `${fmt(v)} monete dalle vittorie` },
  { id: "borraccia", cat: "res", rarity: "RARO", name: "Borraccia della Manager", values: [8, 14, 20], fx: (v) => ({ healPct: v }), text: (v) => `Dopo ogni vittoria la squadra recupera il ${v}% degli HP` },
  { id: "cassa", cat: "res", rarity: "EPICO", name: "Cassa del Club", values: [100, 200, 300], fx: (v) => ({ money: v }), text: (v) => `+${v} monete subito` },
  { id: "gruppo", cat: "team", rarity: "LEGGENDARIO", name: "Spirito di Gruppo", values: [1, 2, 3], fx: (v) => ({ synergyPoints: v }), text: (v) => `+${v} punt${v === 1 ? "o" : "i"} sinergia alla squadra più numerosa` },
  { id: "raydark", cat: "curse", rarity: "MALEDETTO", name: "Patto di Ray Dark", values: [15, 20, 25], fx: (v) => ({ atkPct: v, hpPct: -v, bonusSpiritPct: 10 + v }), text: (v) => `${fmt(v)} ATK, ma ${fmt(-v)} HP massimi · +${10 + v}% Spirito di squadra a fine run` },
  { id: "pietra", cat: "curse", rarity: "MALEDETTO", name: "Frammento della Pietra Alius", values: [15, 20, 25], fx: (v) => ({ spdPct: v, xpPct: -(v + 5), bonusSpiritPct: 10 + v }), text: (v) => `${fmt(v)} VEL, ma ${fmt(-(v + 5))} EXP · +${10 + v}% Spirito di squadra a fine run` },
  { id: "media", cat: "curse", rarity: "MALEDETTO", name: "Pressione dei Media", values: [20, 30, 40], fx: (v) => ({ xpPct: v, moneyPct: -(v + 10), bonusSpiritPct: v }), text: (v) => `${fmt(v)} EXP, ma ${fmt(-(v + 10))} monete · +${v}% Spirito di squadra a fine run` },
  { id: "inazumabreak", cat: "fusion", rarity: "LEGGENDARIO", name: "Inazuma Break", requires: ["tiro", "scatto"], single: true, values: [12], fx: (v) => ({ atkPct: v, spdPct: v }), text: (v) => `Fusione di Tiro Potente III e Scatto Bruciante III: ${fmt(v)} ATK e VEL` },
  { id: "muraglia", cat: "fusion", rarity: "LEGGENDARIO", name: "Grande Muraglia", requires: ["muro", "mano"], single: true, values: [12], fx: (v) => ({ defPct: v, hpPct: v + 6 }), text: (v) => `Fusione di Muro Difensivo III e Guanti del Capitano III: ${fmt(v)} DIF e ${fmt(v + 6)} HP` },
];
export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export const perkLevel = (meta, id) => meta?.perks?.[id] || 0;
export const maxLevel = (perk) => perk.values.length;
export const perkText = (id, level) => { const p = PERK_BY_ID[id]; return p.text(p.values[Math.max(0, level - 1)]); };
export const perkCost = (perk, level) => (perk.single ? RARITIES[perk.rarity].costs[2] : RARITIES[perk.rarity].costs[level]);
export const fusionReady = (meta, perk) => !perk.requires || perk.requires.every((id) => perkLevel(meta, id) >= maxLevel(PERK_BY_ID[id]));

export function buyPerk(meta, id) {
  const perk = PERK_BY_ID[id];
  const level = perkLevel(meta, id);
  if (!perk || level >= maxLevel(perk) || !fusionReady(meta, perk)) return meta;
  const cost = perkCost(perk, level);
  if ((meta.teamSpirit || 0) < cost) return meta;
  return { ...meta, teamSpirit: (meta.teamSpirit || 0) - cost, perks: { ...(meta.perks || {}), [id]: level + 1 } };
}

export function runPerkFx(run) {
  const fx = {};
  for (const { id, level } of run?.perks || []) {
    const p = PERK_BY_ID[id];
    if (!p) continue;
    for (const [k, v] of Object.entries(p.fx(p.values[level - 1]))) fx[k] = (fx[k] || 0) + v;
  }
  return fx;
}

// Offer: up to 3 unlocked non-cursed perks not active, plus one optional cursed perk.
export function perkOffer(meta, run, rng = Math.random, { start = false } = {}) {
  const active = new Set((run?.perks || []).map((p) => p.id));
  // A fusion and its own components never stack.
  const fusions = PERKS.filter((p) => p.requires);
  const blocked = new Set([...fusions.filter((p) => p.requires.some((r) => active.has(r))).map((p) => p.id),
    ...fusions.filter((p) => active.has(p.id)).flatMap((p) => p.requires)]);
  const owned = PERKS.filter((p) => perkLevel(meta, p.id) > 0 && !active.has(p.id) && !blocked.has(p.id) && (start || p.id !== "quaderno"));
  const shuffle = (a) => a.map((x) => [rng(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const normal = shuffle(owned.filter((p) => p.cat !== "curse")).slice(0, 3).map((p) => p.id);
  const cursed = shuffle(owned.filter((p) => p.cat === "curse"))[0]?.id || null;
  if ((run?.perks || []).length >= MAX_ACTIVE_PERKS) return { normal: [], cursed: null };
  return { normal, cursed };
}

export const addRunPerk = (run, meta, id) => {
  if (!id || (run.perks || []).some((p) => p.id === id) || (run.perks || []).length >= MAX_ACTIVE_PERKS) return run;
  const level = perkLevel(meta, id);
  const fx = PERK_BY_ID[id].fx(PERK_BY_ID[id].values[level - 1]);
  let next = { ...run, perks: [...(run.perks || []), { id, level }] };
  if (fx.money) next = { ...next, money: next.money + fx.money };
  return next;
};

// Runtime only (like synergies): never written to base/bonus.
export const applyPerkBuffs = (team, fx) => team.map((p) => {
  const mult = (k) => 1 + (fx[k] || 0) / 100;
  const maxHp = Math.max(1, Math.round(p.maxHp * mult("hpPct")));
  return { ...p, atk: Math.max(1, Math.round(p.atk * mult("atkPct"))), def: Math.max(1, Math.round(p.def * mult("defPct"))),
    spd: Math.max(1, Math.round(p.spd * mult("spdPct"))), maxHp, hp: p.hp === 0 ? 0 : Math.max(1, Math.round(p.hp * maxHp / p.maxHp)), critBonus: fx.critBonus || 0 };
});

export function runSpiritReward(run, result) {
  const reached = Math.max(0, (run.wave || 1) - 1) + (result === "win" ? 1 : 0);
  const bosses = Math.floor(reached / 10);
  const base = reached * 2 + bosses * 15 + (result === "win" ? 60 : 0);
  return Math.round(base * (1 + (runPerkFx(run).bonusSpiritPct || 0) / 100));
}

// Portable save code: base64(JSON) of meta + current run.
export const encodeSave = (meta, run) => btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, meta, run: run || null }))));
export function decodeSave(code) {
  const data = JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));
  if (data?.v !== 1 || typeof data.meta !== "object" || !data.meta) throw new Error("Codice non valido");
  return data;
}
