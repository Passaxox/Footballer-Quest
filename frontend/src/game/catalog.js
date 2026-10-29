import { TEAMS, ARCS, ERAS, GAME_ORIGINS, VERSION_METADATA } from "./catalogMetadata";
import { ROSTER } from "./data";
import { validateCatalog } from "./catalogValidation";
import { EXPANSION_CHARACTERS, EXPANSION_VERSIONS, EXPANSION_MOVES, EPSILON_ALIASES } from "./catalogExpansion";
import { LEGACY_MOVE_IDENTITIES } from "./legacyMoveIdentity";

// Character = person; CharacterVersion = authored incarnation; PlayerInstance = mutable run state.
// Legacy roster is the technical 1:1 source, not proof of canonical identity.
// See the opt-in identity audit for verified and disputed mappings.
const activeTeam = tags => {
  const teams = (tags || []).filter(t => t !== "alius-academy");
  // Only unambiguous authored membership; never select the first historical tag.
  return teams.length === 1 ? teams[0] : null;
};
// G2: rekey the person only; hector remains the historical version/move/roster/sprite key.
// Hector Helio is the independent rococo identity.
const rosterIdentity = r => r.id === "hector"
  ? { characterId: "suzette", displayName: "Suzette Hartland" }
  : { characterId: r.id, displayName: r.name };
export const CATALOG_SOURCE = {
  characters: [...ROSTER.map(rosterIdentity), ...EXPANSION_CHARACTERS],
  versions: [...ROSTER.map(r => ({
    versionId: `${r.id}:base`, ...rosterIdentity(r), legacyRosterId: r.id, kind: "player",
    role: r.role, gender: VERSION_METADATA[`${r.id}:base`]?.gender ?? null, spriteId: r.id,
    teamTags: [...(VERSION_METADATA[`${r.id}:base`]?.teamTags ?? [])], element: r.element, types: [r.element],
    primaryTeamId: activeTeam(VERSION_METADATA[`${r.id}:base`]?.teamTags),
    legacyOnly: r.id === "jonas",
    baseStats: { hp: r.hp, atk: r.atk, def: r.def, spd: r.spd },
    primaryMoveId: `${r.id}:primary`, secondaryMoveId: null,
    rarityId: null, variantId: null, categoryId: null,
    arcId: VERSION_METADATA[`${r.id}:base`]?.arcId ?? null,
    eraId: VERSION_METADATA[`${r.id}:base`]?.eraId ?? null,
    gameOrigin: VERSION_METADATA[`${r.id}:base`]?.gameOrigin ?? null,
    encounterTier: r.tier, // Encounter selection only; never collection rarity.
  })), ...EXPANSION_VERSIONS],
  // Stable primary identity, not a secondary/evolution system. Instances keep their saved move copy.
  moves: [...ROSTER.map(r => ({ moveId: `${r.id}:primary`, ...r.move })), ...EXPANSION_MOVES],
  legacyMappings: ROSTER.map(r => ({ legacyId: r.id, versionId: `${r.id}:base` })),
  rarityIds: ["Common", "Uncommon", "Rare"],
  teams: TEAMS, arcs: ARCS, eras: ERAS, gameOrigins: GAME_ORIGINS,
};
validateCatalog(CATALOG_SOURCE, { requiredLegacyIds: ROSTER.map(r => r.id) });
export const CHARACTERS = Object.fromEntries(CATALOG_SOURCE.characters.map(c => [c.characterId, EPSILON_ALIASES[c.characterId] ? { ...c, aliases: EPSILON_ALIASES[c.characterId] } : c]));
export const CHARACTER_VERSIONS = Object.fromEntries(CATALOG_SOURCE.versions.map(v => [v.versionId, v]));
export const LEGACY_VERSION_IDS = Object.fromEntries(CATALOG_SOURCE.legacyMappings.map(m => [m.legacyId, m.versionId]));
// Runtime snapshots retain identity alongside the unchanged authored gameplay payload.
export const PRIMARY_MOVES = Object.fromEntries(CATALOG_SOURCE.moves.map(move => [move.moveId, { ...move }]));

export const resolveVersion = id => Object.hasOwn(CHARACTER_VERSIONS, id) ? CHARACTER_VERSIONS[id]
  : Object.hasOwn(LEGACY_VERSION_IDS, id) ? CHARACTER_VERSIONS[LEGACY_VERSION_IDS[id]] : null;

// Verified localization alias; technical IDs and collection/save history remain intact.
export const CHARACTER_ALIASES = { paolo: "fidio" };
export const canonicalCharacterId = value => {
  const v = typeof value === "string" ? resolveVersion(value) : resolveVersion(value?.versionId || value?.baseId);
  const id = v?.characterId ?? (typeof value === "string" ? value : value?.characterId);
  return CHARACTER_ALIASES[id] || id || null;
};
export const ownedCharacterIds = (team = []) => new Set(team.flatMap(p => p.fused
  ? (p.parentVersionIds || String(p.baseId).split("+")).map(canonicalCharacterId)
  : [canonicalCharacterId(p)]).filter(Boolean));
export const canRecruitPlayer = (team, player) => !!canonicalCharacterId(player)
  && !resolveVersion(player?.versionId || player?.baseId)?.legacyOnly
  && !ownedCharacterIds(team).has(canonicalCharacterId(player));

// Frozen historical saved characterIds, valid only for their own versionId. Not a registry alias.
export const HISTORICAL_CHARACTER_IDS = Object.freeze({
  "malcolm:base": "malcolm",
  "hector:base": "hector",
});
export const isCharacterIdConsistent = (savedId, versionId, liveCharacterId) => !savedId
  || savedId === liveCharacterId
  || (Object.hasOwn(HISTORICAL_CHARACTER_IDS, versionId) && HISTORICAL_CHARACTER_IDS[versionId] === savedId);

// Missing IDs can only be inferred from exact incarnation AND complete payload evidence.
// Null is a durable unresolved marker: never retry it against a later content registry.
export const withMoveIdentity = player => {
  const move = player?.move;
  if (!move || typeof move !== "object" || Array.isArray(move)) return player;
  if (move.moveId === null || (typeof move.moveId === "string" && move.moveId.trim())) return player;
  let moveId = null;
  if (!Object.hasOwn(move, "moveId") && !player.fused && !String(player.baseId).includes("+")) {
    const version = resolveVersion(player.versionId || player.baseId);
    const baseVersion = resolveVersion(player.baseId);
    const consistent = (!player.versionId || !baseVersion || baseVersion.versionId === version?.versionId)
      && isCharacterIdConsistent(player.characterId, version?.versionId, version?.characterId);
    const expected = version && LEGACY_MOVE_IDENTITIES[version.versionId];
    if (consistent && expected && ["name", "element", "power", "effect"].every((key, i) => Object.hasOwn(move, key) && move[key] === expected[i + 1])) {
      moveId = expected[0];
    }
  }
  return { ...player, move: { ...move, moveId } };
};

// Add identity only. Never rebuild saved stats, move payloads, HP, XP or UID.
export const withPlayerIdentity = player => {
  player = withMoveIdentity(player);
  if (!player || player.fused || String(player.baseId).includes("+")) return player;
  const version = resolveVersion(player.versionId || player.baseId);
  if (!version) return player;
  return { ...player, versionId: player.versionId ?? version.versionId, characterId: player.characterId ?? version.characterId };
};
