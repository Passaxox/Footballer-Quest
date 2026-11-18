import { resolveVersion } from "./catalog";

// Talenti: permanent tree (3 paths x 3 nodes + mastery), bought with Punti Talento earned from checkpoints and challenges.
export const TALENT_PATHS = [
  { id: "bomber", name: "Via del Bomber", nodes: [
    { id: "tiro-base", name: "Tiro di Base", values: [2, 4, 6], fx: (v) => ({ atkPct: v }), text: (v) => `+${v}% ATK` },
    { id: "testa", name: "Colpo di Testa", values: [3, 5, 7], fx: (v) => ({ critBonus: v }), text: (v) => `+${v}% critico` },
    { id: "corsa", name: "Tiro in Corsa", values: [2, 4, 6], fx: (v) => ({ spdPct: v }), text: (v) => `+${v}% VEL` },
    { id: "m-bomber", name: "Maestria · Fuoco del Bomber", mastery: true, values: [1], fx: () => ({ atkPct: 8, critBonus: 5 }), text: () => "+8% ATK e +5% critico" },
  ] },
  { id: "portiere", name: "Via del Portiere", nodes: [
    { id: "presa", name: "Presa Sicura", values: [2, 4, 6], fx: (v) => ({ defPct: v }), text: (v) => `+${v}% DIF` },
    { id: "riflessi", name: "Riflessi", values: [3, 6, 9], fx: (v) => ({ hpPct: v }), text: (v) => `+${v}% HP massimi` },
    { id: "recupero", name: "Recupero a Bordocampo", values: [3, 6, 9], fx: (v) => ({ healPct: v }), text: (v) => `Cura il ${v}% HP dopo ogni vittoria` },
    { id: "m-portiere", name: "Maestria · Mano di Dio", mastery: true, values: [1], fx: () => ({ defPct: 8, hpPct: 8 }), text: () => "+8% DIF e +8% HP" },
  ] },
  { id: "mister", name: "Via del Mister", nodes: [
    { id: "taccuino", name: "Taccuino del Mister", values: [5, 10, 15], fx: (v) => ({ xpPct: v }), text: (v) => `+${v}% EXP` },
    { id: "sponsor-locale", name: "Sponsor Locale", values: [5, 10, 15], fx: (v) => ({ moneyPct: v }), text: (v) => `+${v}% monete` },
    { id: "osservatore", name: "Osservatore", values: [5, 10, 15], fx: (v) => ({ recruitBonus: v }), text: (v) => `+${v}% probabilità di reclutamento` },
    { id: "m-mister", name: "Maestria · Tattica del Nonno", mastery: true, values: [1], fx: () => ({ synergyPoints: 1, money: 100 }), text: () => "+1 punto sinergia e +100 monete a inizio run" },
  ] },
];
const NODES = TALENT_PATHS.flatMap((p) => p.nodes.map((n, i) => ({ ...n, path: p.id, index: i })));
export const TALENT_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

export const talentLevel = (meta, id) => meta?.talents?.[id] || 0;
export const talentCost = (node) => (node.mastery ? 3 : 1);
// A node needs the previous one at level 1; a mastery needs all previous nodes maxed.
export const talentAvailable = (meta, node) => {
  const path = TALENT_PATHS.find((p) => p.id === node.path).nodes;
  if (node.mastery) return path.slice(0, node.index).every((n) => talentLevel(meta, n.id) >= n.values.length);
  return node.index === 0 || talentLevel(meta, path[node.index - 1].id) > 0;
};

export function buyTalent(meta, id) {
  const node = TALENT_BY_ID[id];
  const level = talentLevel(meta, id);
  if (!node || level >= node.values.length || !talentAvailable(meta, node) || (meta.talentPoints || 0) < talentCost(node)) return meta;
  return { ...meta, talentPoints: meta.talentPoints - talentCost(node), talents: { ...(meta.talents || {}), [id]: level + 1 } };
}

export const resetTalents = (meta) => ({ ...meta, talents: {},
  talentPoints: (meta.talentPoints || 0) + NODES.reduce((n, node) => n + talentLevel(meta, node.id) * talentCost(node), 0) });

// Snapshot taken when a run starts; read by runPerkFx so talents behave like always-on perks.
export function talentFx(meta) {
  const fx = {};
  for (const node of NODES) {
    const lv = talentLevel(meta, node.id);
    if (!lv) continue;
    for (const [k, v] of Object.entries(node.fx(node.values[lv - 1]))) fx[k] = (fx[k] || 0) + v;
  }
  return fx;
}

// Sfide: in-run challenges paying extra Spirito di squadra (and talent points for perfect checkpoints).
export const CHALLENGES = [
  { id: "perfect", name: "Checkpoint perfetto", desc: "Vinci un boss senza giocatori KO a fine partita", reward: "+20 Spirito e +1 Punto Talento ciascuno" },
  { id: "nofuga", name: "Nessuna fuga", desc: "Arriva almeno alla W10 senza mai fuggire", reward: "+30 Spirito" },
  { id: "cuore-raimon", name: "Cuore Raimon", desc: "Vinci il FFI con almeno 3 giocatori della Raimon", reward: "+60 Spirito" },
  { id: "pochi", name: "Pochi ma buoni", desc: "Vinci il FFI con 4 giocatori o meno", reward: "+80 Spirito" },
];

export function challengeResults(run, result) {
  const c = run.challenges || {};
  const reached = Math.max(0, (run.wave || 1) - 1) + (result === "win" ? 1 : 0);
  const raimon = run.team.filter((p) => resolveVersion(p.versionId)?.primaryTeamId === "raimon").length;
  const won = result === "win";
  return [
    { id: "perfect", count: c.perfect || 0, spirit: 20 * (c.perfect || 0), points: c.perfect || 0 },
    { id: "nofuga", count: reached >= 10 && !c.fled ? 1 : 0, spirit: reached >= 10 && !c.fled ? 30 : 0, points: 0 },
    { id: "cuore-raimon", count: won && raimon >= 3 ? 1 : 0, spirit: won && raimon >= 3 ? 60 : 0, points: 0 },
    { id: "pochi", count: won && run.team.length <= 4 ? 1 : 0, spirit: won && run.team.length <= 4 ? 80 : 0, points: 0 },
  ].map((r) => ({ ...r, ...CHALLENGES.find((x) => x.id === r.id) }));
}

// One talent point per checkpoint boss beaten, plus perfect checkpoints.
export const runTalentPoints = (run, result) => Math.floor((Math.max(0, (run.wave || 1) - 1) + (result === "win" ? 1 : 0)) / 10)
  + challengeResults(run, result).reduce((n, r) => n + r.points, 0);
