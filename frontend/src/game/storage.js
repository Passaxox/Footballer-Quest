import { hydrateOverworldV2, hasOverworldV2, runTokenV2, OverworldSaveError } from "./overworldRunV2";
import { resolveOverworldActionV2 } from "./overworldActionsV2";
import { migrateCollection, recruitVersion, discoverVersion } from "./collection";
import { withPlayerIdentity } from "./catalog";
import { STARTER_IDS } from "./data";
import { beginOverworldNode, normalizeRun, glory, playtestSummary } from "./engine";

const RUN_KEY = "inazuma_rogue_run";
const META_KEY = "inazuma_rogue_meta";

const defaultMeta = () => migrateCollection({ unlocked: [...STARTER_IDS], records: [], runs: 0, bestWave: 0, sound: true });

export const loadMeta = () => {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY));
    if (!m || typeof m !== "object") return defaultMeta();
    return migrateCollection({ ...defaultMeta(), ...m,
      unlocked: Array.isArray(m.unlocked) ? m.unlocked : [...STARTER_IDS],
      records: Array.isArray(m.records) ? m.records.filter(r => r && typeof r === "object") : [],
    });
  } catch { return defaultMeta(); }
};
export const saveMeta = (m) => localStorage.setItem(META_KEY, JSON.stringify(migrateCollection(m)));

// Extend the existing archive; never manufacture snapshots for legacy records.
export const recordFinishedRun = (meta, run, result) => {
  const recordId = hasOverworldV2(run) ? `v2:${run.startedAt}:${run.overworld.seed}:${run.overworld.contentSeed}` : `${run.startedAt}:${run.team[0]?.uid || "empty"}`;
  if (meta.records.some(record => record.recordId === recordId)) return meta;
  const record = { ...playtestSummary(run), recordId, date: Date.now(), result,
    difficultyId: run.difficultyId, rulesetId: run.rulesetId, glory: glory(run),
    team: run.team.map(p => p.name),
    teamSnapshot: run.team.map(p => ({ baseId: p.baseId, name: p.name, level: p.level, fused: !!p.fused, characterId: withPlayerIdentity(p).characterId ?? null, versionId: withPlayerIdentity(p).versionId ?? null })),
  };
  return { ...meta, records: [...meta.records, record], runs: meta.runs + 1, bestWave: Math.max(meta.bestWave, run.wave) };
};

// Run and meta are separate writes. Durable run receipts allow retry after a
// crash/quota failure between them, even if a recruited player later leaves.
export function reconcileRunV2Meta(run, discoveries = []) {
  let meta = loadMeta();
  const previous = meta;
  for (const id of discoveries) meta = discoverVersion(meta, id);
  for (const id of new Set([...(run.recruitedVersionsV2 || []), ...run.team.filter(p => !p.fused).map(p => p.versionId || p.baseId)])) meta = recruitVersion(meta, id);
  if (run.overworld.result) meta = recordFinishedRun(meta, run, run.overworld.result);
  if (meta !== previous) saveMeta(meta);
  return meta;
}

// Invalid/incompatible saves remain byte-for-byte intact; callers can inspect the
// result without crashing startup. Only explicit clearRun discards that snapshot.
let verifiedRaw = null;
const readRun = (hydrate) => {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (raw === null) return { status: "empty", run: null };
    const run = normalizeRun(JSON.parse(raw));
    if (!run) throw new Error("Salvataggio vuoto o non valido.");
    if (hydrate || raw !== verifiedRaw) hydrateOverworldV2(run);
    verifiedRaw = raw;
    return { status: "ok", run };
  } catch (error) { return { status: "incompatible", run: null, error }; }
};
export const loadRunResult = () => readRun(true);
export const loadRun = () => loadRunResult().run;
export const saveRun = run => {
  const existing = readRun(false);
  if (existing.status === "incompatible") throw new OverworldSaveError("Salvataggio incompatibile conservato; rimozione esplicita necessaria.");
  // Check only the saved path (at most 50 IDs), using the cached graph; never run
  // the whole-graph validator on HP/XP updates. Reject bad incoming snapshots too.
  const next = normalizeRun(run);
  if (next) hydrateOverworldV2(next);
  const raw = next ? JSON.stringify(next) : null;
  if (raw === null) localStorage.removeItem(RUN_KEY);
  else localStorage.setItem(RUN_KEY, raw);
  verifiedRaw = raw;
};
export const clearRun = () => localStorage.removeItem(RUN_KEY);

// Synchronous single-writer transaction: read latest, reject stale command, apply
// once, and persist the entire next snapshot with one setItem. A failed write
// throws and leaves the previous snapshot available; no partially saved selection.
export function dispatchRunV2(expected, action) {
  const loaded = loadRunResult();
  if (loaded.status === "incompatible") throw loaded.error;
  const run = loaded.run;
  if (!hasOverworldV2(run) || !expected || Object.entries(runTokenV2(run)).some(([key, value]) => expected[key] !== value)) return run;
  const next = action.type === "select" ? beginOverworldNode(run, action.nodeId) : resolveOverworldActionV2(run, action);
  if (next !== run) {
    // As in saveRun, reject a snapshot that hydration would refuse before writing.
    hydrateOverworldV2(next);
    const raw = JSON.stringify(next);
    localStorage.setItem(RUN_KEY, raw);
    verifiedRaw = raw;
  }
  return next;
}
