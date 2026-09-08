import { migrateCollection } from "./collection";
import { withPlayerIdentity } from "./catalog";
import { STARTER_IDS } from "./data";
import { normalizeRun, glory, playtestSummary } from "./engine";

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
  const recordId = `${run.startedAt}:${run.team[0]?.uid || "empty"}`;
  if (meta.records.some(record => record.recordId === recordId)) return meta;
  const record = { ...playtestSummary(run), recordId, date: Date.now(), result,
    difficultyId: run.difficultyId, rulesetId: run.rulesetId, glory: glory(run),
    team: run.team.map(p => p.name),
    teamSnapshot: run.team.map(p => ({ baseId: p.baseId, name: p.name, level: p.level, fused: !!p.fused, characterId: withPlayerIdentity(p).characterId ?? null, versionId: withPlayerIdentity(p).versionId ?? null })),
  };
  return { ...meta, records: [...meta.records, record], runs: meta.runs + 1, bestWave: Math.max(meta.bestWave, run.wave) };
};

export const loadRun = () => {
  try { return normalizeRun(JSON.parse(localStorage.getItem(RUN_KEY))); } catch { return null; }
};
export const saveRun = (run) => (run ? localStorage.setItem(RUN_KEY, JSON.stringify(normalizeRun(run))) : localStorage.removeItem(RUN_KEY));
export const clearRun = () => localStorage.removeItem(RUN_KEY);
