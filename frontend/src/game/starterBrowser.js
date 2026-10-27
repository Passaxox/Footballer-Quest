import { CHARACTERS, CHARACTER_VERSIONS, canonicalCharacterId } from "./catalog";
import { getCollectionProgress } from "./collection";
import { isFreshPlayerVersion } from "./scenarios";
import { TEAMS } from "./catalogMetadata";

export const starterTeamName = version => TEAMS.find(t => t.teamId === version.primaryTeamId)?.displayName || "Affiliazione non definita";
export const starterVersionName = version => version.primaryTeamId ? starterTeamName(version) : version.displayName;
const normalized = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");

// Existing catalog order is stable; no power/rarity ranking and no new unlock policy.
export function starterGroups(meta, versions = Object.values(CHARACTER_VERSIONS), characters = CHARACTERS) {
  const groups = new Map();
  for (const version of versions) {
    if (!isFreshPlayerVersion(version) || !getCollectionProgress(meta, version.versionId).starterUnlocked) continue;
    const characterId = canonicalCharacterId(version);
    if (!groups.has(characterId)) groups.set(characterId, { characterId,
      name: characters[characterId]?.displayName || version.displayName, versions: [], aliases: [] });
    const group = groups.get(characterId);
    group.versions.push(version);
    group.aliases.push(characters[version.characterId]?.displayName || "", ...(characters[characterId]?.aliases || []));
  }
  return [...groups.values()];
}

export function filterStarterGroups(groups, { search = "", team = "", role = "", element = "" } = {}) {
  const query = normalized(search).trim();
  return groups.flatMap(group => {
    const nameMatches = [group.name, ...group.aliases].some(name => normalized(name).includes(query));
    const matchingVersions = group.versions.filter(v => (!team || v.primaryTeamId === team)
      && (!role || v.role === role) && (!element || v.element === element)
      && (!query || nameMatches || normalized(v.displayName).includes(query) || normalized(starterTeamName(v)).includes(query)));
    return matchingVersions.length ? [{ ...group, matchingVersions }] : [];
  });
}

export function selectStarterVersion(selected, versionId) {
  const identity = canonicalCharacterId(versionId);
  const index = selected.findIndex(id => canonicalCharacterId(id) === identity);
  if (index >= 0) return selected.map((id, i) => i === index ? versionId : id);
  return selected.length < 3 ? [...selected, versionId] : selected;
}
