export const VERSION_KINDS = { PLAYER: "player", MANAGER: "manager", COACH: "coach", DEV: "dev" };
export const GENDERS = ["male", "female", "unknown"];

// Validate source arrays BEFORE indexing: Object.fromEntries would hide duplicate IDs.
// Runtime instances and saved snapshots are deliberately outside this validator.
export function validateCatalog({ characters, versions, moves, legacyMappings, rarityIds = [], teams = [], arcs = [], eras = [], gameOrigins = [] }, { spriteIds, requiredLegacyIds = [] } = {}) {
  const errors = [];
  if (![characters, versions, moves, legacyMappings, rarityIds, teams, arcs, eras, gameOrigins].every(Array.isArray)) throw new Error("Invalid catalog: source collections must be arrays");
  const validId = value => typeof value === "string" && value.trim().length > 0;
  const index = (rows, key) => {
    const result = new Map();
    for (const row of rows) {
      const id = row?.[key];
      if (!validId(id)) { errors.push(`Invalid ${key}`); continue; }
      if (result.has(id)) errors.push(`Duplicate ${key}: ${id}`);
      result.set(id, row);
    }
    return result;
  };
  const characterIndex = index(characters, "characterId");
  const versionIndex = index(versions, "versionId");
  const moveIndex = index(moves, "moveId");
  const legacyIndex = index(legacyMappings, "legacyId");
  const teamIndex = index(teams, "teamId");
  const arcIndex = index(arcs, "arcId");
  const eraIndex = index(eras, "eraId");
  const originIndex = index(gameOrigins, "gameOrigin");
  for (const row of [...arcs, ...gameOrigins]) {
    if (row?.eraId != null && !eraIndex.has(row.eraId)) errors.push("Unknown registry eraId");
  }
  const claimedLegacy = new Set();
  for (const c of characters) if (!validId(c?.displayName)) errors.push(`Missing character displayName: ${c?.characterId}`);
  for (const v of versions) {
    if (!v) continue;
    const label = v.versionId;
    if (!characterIndex.has(v.characterId)) errors.push(`Unknown characterId: ${label}`);
    if (!validId(v.displayName)) errors.push(`Missing version displayName: ${label}`);
    if (!Object.values(VERSION_KINDS).includes(v.kind)) errors.push(`Invalid kind: ${label}`);
    if (v.gender != null && !GENDERS.includes(v.gender)) errors.push(`Invalid gender: ${label}`);
    if (!Array.isArray(v.teamTags) || v.teamTags.some(tag => !validId(tag)) || new Set(v.teamTags).size !== v.teamTags.length) errors.push(`Invalid teamTags: ${label}`);
    if (Array.isArray(v.teamTags) && v.teamTags.some(tag => !teamIndex.has(tag))) errors.push(`Unknown teamTag: ${label}`);
    for (const [key, registry] of [["arcId", arcIndex], ["eraId", eraIndex], ["gameOrigin", originIndex]]) {
      if (v[key] != null && !registry.has(v[key])) errors.push(`Unknown ${key}: ${label}`);
    }
    // Check reference consistency only: gameOrigin is incarnation debut, never derived from arc/team.
    const declaredEras = [v.eraId, arcIndex.get(v.arcId)?.eraId, originIndex.get(v.gameOrigin)?.eraId].filter(id => id != null);
    if (new Set(declaredEras).size > 1) errors.push(`Incompatible metadata eras: ${label}`);
    if (v.rarityId != null && !rarityIds.includes(v.rarityId)) errors.push(`Invalid rarityId: ${label}`);
    for (const key of ["variantId", "categoryId", "arcId", "eraId", "gameOrigin"]) {
      if (v[key] != null && !validId(v[key])) errors.push(`Invalid ${key}: ${label}`);
    }
    if (!validId(v.spriteId) || !/^[a-zA-Z0-9_-]+$/.test(v.spriteId) || (spriteIds && !spriteIds.has(v.spriteId))) errors.push(`Invalid spriteId: ${label}`);
    if ((v.kind === VERSION_KINDS.PLAYER || v.primaryMoveId != null) && !moveIndex.has(v.primaryMoveId)) errors.push(`Unknown primaryMoveId: ${label}`);
    if (v.legacyRosterId != null) {
      if (!validId(v.legacyRosterId) || claimedLegacy.has(v.legacyRosterId)) errors.push(`Duplicate or invalid legacy ID: ${label}`);
      claimedLegacy.add(v.legacyRosterId);
      if (legacyIndex.get(v.legacyRosterId)?.versionId !== v.versionId) errors.push(`Missing or ambiguous legacy mapping: ${label}`);
    }
  }
  for (const mapping of legacyMappings) {
    if (!mapping) continue;
    if (versionIndex.get(mapping.versionId)?.legacyRosterId !== mapping.legacyId) errors.push(`Invalid legacy target: ${mapping.legacyId}`);
    if (versionIndex.has(mapping.legacyId) && mapping.versionId !== mapping.legacyId) errors.push(`Ambiguous legacy/version ID: ${mapping.legacyId}`);
  }
  for (const id of requiredLegacyIds) if (!legacyIndex.has(id)) errors.push(`Required legacy mapping missing: ${id}`);
  if (errors.length) throw new Error(`Invalid catalog:\n${errors.join("\n")}`);
  return true;
}
