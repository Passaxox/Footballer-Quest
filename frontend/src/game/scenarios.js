import { CHARACTER_VERSIONS } from "./catalog";
import { TEAMS, ARCS, ERAS } from "./catalogMetadata";

// Foundation travel policy; future checkpoints/events may supply a different segmentEnd.
export const SCENARIO_SEGMENT_LENGTH = 6;
export const MACRO_SCENARIOS = [{ id: "ffi", displayName: "Football Frontier International" }];
export const LOCATION_TYPES = ["field", "city", "facility", "hq", "stadium", "special", "generic"];
const common = { macroScenarioId: null, areaId: null, locationType: "generic", minTier: 1, arcId: null, eraId: "original", allowedTeamTags: [], preferredTeamTags: [], excludedTeamTags: [], allowedVersionIds: null,
  encounterPool: { baseWeight: 1, preferredWeight: 3, versionWeights: {} },
  eventPool: null, bossPool: null, managerPool: null, presentationProfile: null, weight: 1, availability: true };
// Location/context is not canonical membership. Explicit urban versions need no invented teamTags.
export const SCENARIOS = [
  { ...common, id: "raimon-training", displayName: "Campo Raimon", locationType: "field", allowedTeamTags: ["raimon"], preferredTeamTags: ["raimon"], waveRange: { from: 1, to: null } },
  { ...common, id: "urban", displayName: "Sfide in città", locationType: "city", allowedVersionIds: ["shawn", "darren", "sam", "steve", "bobby", "maxwell", "erik", "caleb", "hurley", "scotty", "thor", "archer", "canon", "hector", "silvia", "aiden", "david", "paolo", "fidio"].map(id => id + ":base"), waveRange: { from: 1, to: null } },
  { ...common, id: "royal-academy", displayName: "Royal Academy", locationType: "field", minTier: 2, arcId: "football-frontier", allowedTeamTags: ["royal-academy"], preferredTeamTags: ["royal-academy"], waveRange: { from: 8, to: null } },
  { ...common, id: "zeus", displayName: "Stadio Zeus", locationType: "stadium", minTier: 3, arcId: "football-frontier", allowedTeamTags: ["zeus"], preferredTeamTags: ["zeus"], waveRange: { from: 18, to: null } },
  { ...common, id: "epsilon-lab", displayName: "Laboratorio Epsilon", locationType: "facility", minTier: 3, arcId: "alius", allowedTeamTags: ["epsilon"], preferredTeamTags: ["epsilon"], allowedVersionIds: ["dvalin:epsilon-ie2", "tytan:epsilon-ie2", "krypto:epsilon-ie2", "zell:epsilon-ie2"], waveRange: { from: 18, to: null } },
  { ...common, id: "international", displayName: "Incontri internazionali", macroScenarioId: "ffi", minTier: 3, arcId: "ffi", allowedTeamTags: ["unicorn", "knights-of-queen", "the-empire", "fire-dragon", "little-gigant"], preferredTeamTags: ["unicorn"], waveRange: { from: 18, to: null } },
];
export function validateScenarios(scenarios = SCENARIOS) {
  if (!Array.isArray(scenarios)) throw new Error("Invalid scenario registry");
  const ids = new Set(), teams = new Set(TEAMS.map(t => t.teamId));
  const errors = [];
  for (const s of scenarios) {
    if (!s || typeof s !== "object") { errors.push("Invalid scenario record"); continue; }
    if (s.macroScenarioId != null && !MACRO_SCENARIOS.some(m => m.id === s.macroScenarioId)) errors.push("Unknown macroScenarioId");
    if (!LOCATION_TYPES.includes(s.locationType)) errors.push("Invalid locationType");
    if (!Number.isInteger(s.minTier) || s.minTier < 1) errors.push("Invalid scenario tier");
    if (!s.id || ids.has(s.id)) errors.push("Duplicate/invalid scenario ID");
    ids.add(s.id);
    if (!s.displayName || typeof s.availability !== "boolean" || !(s.weight > 0) || !Number.isFinite(s.weight)) errors.push("Invalid scenario availability/weight");
    if (s.arcId != null && !ARCS.some(a => a.arcId === s.arcId)) errors.push("Unknown scenario arc");
    if (s.eraId != null && !ERAS.some(e => e.eraId === s.eraId)) errors.push("Unknown scenario era");
    for (const key of ["allowedTeamTags", "preferredTeamTags", "excludedTeamTags"]) {
      if (!Array.isArray(s[key]) || new Set(s[key]).size !== s[key].length || s[key].some(t => !teams.has(t))) errors.push("Invalid scenario team tags");
    }
    if (s.allowedVersionIds != null && (!Array.isArray(s.allowedVersionIds) || new Set(s.allowedVersionIds).size !== s.allowedVersionIds.length || s.allowedVersionIds.some(id => CHARACTER_VERSIONS[id]?.kind !== "player"))) errors.push("Unknown/duplicate scenario version");
    if (!Number.isInteger(s.waveRange?.from) || s.waveRange.from < 1 || (s.waveRange.to != null && (!Number.isInteger(s.waveRange.to) || s.waveRange.to < s.waveRange.from))) errors.push("Invalid scenario wave range");
    const pool = s.encounterPool;
    if (!pool || ![pool.baseWeight, pool.preferredWeight].every(w => Number.isFinite(w) && w > 0) || !pool.versionWeights || typeof pool.versionWeights !== "object" || Array.isArray(pool.versionWeights)) errors.push("Invalid encounter weights");
    else for (const [id, w] of Object.entries(pool.versionWeights)) if (!CHARACTER_VERSIONS[id] || !Number.isFinite(w) || w <= 0) errors.push("Invalid version weight");
  }
  if (errors.length) throw new Error(errors.join("; "));
  return true;
}
validateScenarios();
export const getScenario = id => SCENARIOS.find(s => s.id === id) || SCENARIOS.find(s => s.id === "urban");
const eligible = (s, wave) => s.availability && wave >= s.waveRange.from && (s.waveRange.to == null || wave <= s.waveRange.to);
export function scenarioPool(scenarioId, wave, maxTier, exclude = []) {
  const s = getScenario(scenarioId);
  if (!eligible(s, wave) || maxTier < s.minTier) return [];
  return Object.values(CHARACTER_VERSIONS).filter(v => v.kind === "player" && v.encounterTier <= maxTier
    && !exclude.includes(v.versionId) && !exclude.includes(v.legacyRosterId)
    && (!s.allowedVersionIds || s.allowedVersionIds.includes(v.versionId))
    && (!s.allowedTeamTags.length || v.teamTags.some(t => s.allowedTeamTags.includes(t)))
    && !v.teamTags.some(t => s.excludedTeamTags.includes(t)))
    .map(v => ({ version: v, weight: s.encounterPool.versionWeights[v.versionId] ?? (v.teamTags.some(t => s.preferredTeamTags.includes(t)) ? s.encounterPool.preferredWeight : s.encounterPool.baseWeight) }));
}
function weighted(rows, rng) {
  if (!rows.length) return null;
  let n = rng() * rows.reduce((sum, row) => sum + row.weight, 0);
  return rows.find(row => (n -= row.weight) < 0) || rows.at(-1);
}
export const selectEncounterVersion = (scenarioId, wave, maxTier, exclude = [], rng = Math.random) => weighted(scenarioPool(scenarioId, wave, maxTier, exclude), rng)?.version ?? null;
const segmentStart = wave => Math.floor((wave - 1) / SCENARIO_SEGMENT_LENGTH) * SCENARIO_SEGMENT_LENGTH + 1;
export function normalizeScenarioState(state, wave) {
  if (state?.revision === 1 && SCENARIOS.some(s => s.id === state.id) && Number.isInteger(state.segmentStart) && state.segmentStart >= 1 && state.segmentStart <= wave) return { ...state, segmentEnd: Number.isInteger(state.segmentEnd) && state.segmentEnd >= state.segmentStart ? state.segmentEnd : state.segmentStart + SCENARIO_SEGMENT_LENGTH - 1 };
  return { id: "urban", revision: 1, segmentStart: segmentStart(wave), segmentEnd: segmentStart(wave) + SCENARIO_SEGMENT_LENGTH - 1 };
}
export function scenarioForWave(state, wave, maxTier, rng = Math.random) {
  if (state && wave >= state.segmentStart && wave <= state.segmentEnd && scenarioPool(state.id, wave, maxTier).length >= 3) return state;
  const candidates = SCENARIOS.filter(s => eligible(s, wave) && scenarioPool(s.id, wave, maxTier).length >= 3);
  const chosen = weighted(candidates, rng);
  return { id: chosen?.id || "urban", revision: 1, segmentStart: wave, segmentEnd: wave + SCENARIO_SEGMENT_LENGTH - 1 };
}
// Pure reveal descriptor: no discovery, unlock, animation or outcome side effects.
export const encounterDescriptor = (v, scenarioId) => ({ versionId: v.versionId, characterId: v.characterId, teamTags: [...v.teamTags],
  element: v.element, role: v.role, rarityId: v.rarityId ?? null, variantId: v.variantId ?? null, scenarioId: getScenario(scenarioId).id, locationId: getScenario(scenarioId).id,
  macroScenarioId: getScenario(scenarioId).macroScenarioId, areaId: getScenario(scenarioId).areaId, locationType: getScenario(scenarioId).locationType });
