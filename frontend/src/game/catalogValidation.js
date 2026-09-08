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


export const IDENTITY_STATUSES = ["verified", "legacy-weird-but-verified", "suspicious", "unresolved"];

// Opt-in test/dev audit, NOT application startup or a save migration.
// Structural validity cannot establish canon. Human-reviewed evidence lives in the audit fixture.
// Uncertain snapshots are observations, not mandatory names/assets for future remediation.
export function validateIdentityAudit(catalog, audit, { spriteHashes } = {}) {
  validateCatalog(catalog);
  const errors = [];
  if (!Array.isArray(audit?.entries) || !Array.isArray(audit?.reviewRequiredLegacyIds)) throw new Error("Invalid identity audit arrays");
  const mappings = new Map(catalog.legacyMappings.map(m => [m.legacyId, m.versionId]));
  const versions = new Map(catalog.versions.map(v => [v.versionId, v]));
  const legacyIds = new Set(), versionIds = new Set();
  const counts = Object.fromEntries(IDENTITY_STATUSES.map(s => [s, 0]));
  const pending = [], verifiedLegacyIds = [];
  for (const row of audit.entries) {
    if (!row) { errors.push("Missing audit row"); continue; }
    const label = row.legacyId;
    for (const [key, seen] of [["legacyId", legacyIds], ["versionId", versionIds]]) {
      if (typeof row[key] !== "string" || !row[key].trim() || seen.has(row[key])) errors.push("Duplicate/invalid audit " + key);
      seen.add(row[key]);
    }
    const v = versions.get(row.versionId);
    if (!v || mappings.get(label) !== row.versionId || v.characterId !== row.characterId) errors.push("Audit technical mapping mismatch: " + label);
    if (!IDENTITY_STATUSES.includes(row.identityStatus)) { errors.push("Invalid identityStatus: " + label); continue; }
    counts[row.identityStatus]++;
    if (!Array.isArray(row.sources) || row.sources.length < 2 || row.sources.some(s => typeof s !== "string" || !s.trim()) || !row.notes) errors.push("Missing audit evidence: " + label);
    if (!/^[a-f0-9]{64}$/.test(row.spriteSha256 || "") || !/^[a-zA-Z0-9_-]+$/.test(row.spriteId || "") || row.spritePath !== "frontend/public/sprites/" + row.spriteId + ".png") errors.push("Invalid audit sprite snapshot: " + label);
    if (["verified", "legacy-weird-but-verified"].includes(row.identityStatus)) {
      verifiedLegacyIds.push(label);
      if (typeof row.canonicalCharacter !== "string" || !row.canonicalCharacter.trim()) errors.push("Verified identity missing canon: " + label);
      for (const key of ["displayName", "spriteId", "primaryMoveId"]) if (v?.[key] !== row[key]) errors.push("Verified identity drift " + key + ": " + label);
      if (spriteHashes && spriteHashes.get(row.spritePath) !== row.spriteSha256) errors.push("Verified sprite content drift: " + label);
    } else pending.push(label);
  }
  for (const id of mappings.keys()) if (!legacyIds.has(id)) errors.push("Missing identity audit: " + id);
  if (audit.entries.length !== mappings.size) errors.push("Identity audit coverage mismatch");
  if (new Set(audit.reviewRequiredLegacyIds).size !== audit.reviewRequiredLegacyIds.length || [...pending].sort().join("|") !== [...audit.reviewRequiredLegacyIds].sort().join("|")) errors.push("Uncertain identities must be explicitly enumerated");
  if (errors.length) throw new Error("Invalid identity audit:\n" + errors.join("\n"));
  return { technicalValid: true, counts, verifiedLegacyIds, reviewRequiredLegacyIds: pending };
}
