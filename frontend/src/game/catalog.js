import { ROSTER } from "./data";
import { validateCatalog } from "./catalogValidation";

// Character = person; CharacterVersion = authored incarnation; PlayerInstance = mutable run state.
// Legacy roster remains the verified 1:1 source. Null metadata is intentionally not guessed.
export const CATALOG_SOURCE = {
  characters: ROSTER.map(r => ({ characterId: r.id, displayName: r.name })),
  versions: ROSTER.map(r => ({
    versionId: `${r.id}:base`, characterId: r.id, legacyRosterId: r.id, displayName: r.name, kind: "player",
    role: r.role, gender: null, spriteId: r.id, teamTags: [], element: r.element, types: [r.element],
    baseStats: { hp: r.hp, atk: r.atk, def: r.def, spd: r.spd },
    primaryMoveId: `${r.id}:primary`, secondaryMoveId: null,
    rarityId: null, variantId: null, categoryId: null, arcId: null, eraId: null, gameOrigin: null,
    encounterTier: r.tier, // Encounter selection only; never collection rarity.
  })),
  // Stable primary identity, not a secondary/evolution system. Instances keep their saved move copy.
  moves: ROSTER.map(r => ({ moveId: `${r.id}:primary`, ...r.move })),
  legacyMappings: ROSTER.map(r => ({ legacyId: r.id, versionId: `${r.id}:base` })),
  rarityIds: [],
};
validateCatalog(CATALOG_SOURCE, { requiredLegacyIds: ROSTER.map(r => r.id) });
export const CHARACTERS = Object.fromEntries(CATALOG_SOURCE.characters.map(c => [c.characterId, c]));
export const CHARACTER_VERSIONS = Object.fromEntries(CATALOG_SOURCE.versions.map(v => [v.versionId, v]));
export const LEGACY_VERSION_IDS = Object.fromEntries(CATALOG_SOURCE.legacyMappings.map(m => [m.legacyId, m.versionId]));
// Keep the V2a move shape: adding registry identifiers must not change runtime/saved moves.
export const PRIMARY_MOVES = Object.fromEntries(CATALOG_SOURCE.moves.map(({ moveId, ...move }) => [moveId, move]));

export const resolveVersion = id => Object.hasOwn(CHARACTER_VERSIONS, id) ? CHARACTER_VERSIONS[id]
  : Object.hasOwn(LEGACY_VERSION_IDS, id) ? CHARACTER_VERSIONS[LEGACY_VERSION_IDS[id]] : null;

// Add identity only. Never rebuild saved stats, moves, HP, XP, UID or legacy fusion data.
export const withPlayerIdentity = player => {
  if (!player || player.fused || String(player.baseId).includes("+")) return player;
  const version = resolveVersion(player.versionId || player.baseId);
  if (!version) return player;
  return { ...player, versionId: player.versionId ?? version.versionId, characterId: player.characterId ?? version.characterId };
};
