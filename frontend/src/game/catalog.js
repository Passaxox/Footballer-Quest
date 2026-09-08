import { ROSTER } from "./data";

// Version kind: player | manager | coach | dev. Unknown authored metadata stays null/empty.
// Future costs must reference currencyId; no currency or economy is introduced here.

// Stable legacy adapter. New incarnations will have their own versionId and share characterId.
export const CHARACTERS = Object.fromEntries(ROSTER.map(r => [r.id, { characterId: r.id, displayName: r.name }]));
export const LEGACY_VERSION_IDS = Object.fromEntries(ROSTER.map(r => [r.id, `${r.id}:base`]));
export const PRIMARY_MOVES = Object.fromEntries(ROSTER.map(r => [`${r.id}:primary`, { ...r.move }]));
export const CHARACTER_VERSIONS = Object.fromEntries(ROSTER.map(r => {
  const versionId = LEGACY_VERSION_IDS[r.id];
  return [versionId, {
    versionId, characterId: r.id, legacyRosterId: r.id, kind: "player",
    role: r.role, gender: null, spriteId: r.id, teamTags: [], element: r.element, types: [r.element],
    baseStats: { hp: r.hp, atk: r.atk, def: r.def, spd: r.spd },
    primaryMoveId: `${r.id}:primary`, secondaryMoveId: null,
    rarityId: null, variantId: null, categoryId: null, encounterTier: r.tier,
  }];
}));

export const resolveVersion = id => Object.hasOwn(CHARACTER_VERSIONS, id) ? CHARACTER_VERSIONS[id]
  : Object.hasOwn(LEGACY_VERSION_IDS, id) ? CHARACTER_VERSIONS[LEGACY_VERSION_IDS[id]] : null;

// Add identity only. Never rebuild saved stats, moves, HP, XP, UID or legacy fusion data.
export const withPlayerIdentity = player => {
  if (!player || player.fused || String(player.baseId).includes("+")) return player;
  const version = resolveVersion(player.versionId || player.baseId);
  if (!version) return player;
  return { ...player, versionId: player.versionId ?? version.versionId, characterId: player.characterId ?? version.characterId };
};
