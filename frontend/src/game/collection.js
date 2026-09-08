import { LEGACY_VERSION_IDS, resolveVersion } from "./catalog";

const empty = () => ({ discovered: false, recruited: false, starterUnlocked: false });
const legacyIdFor = version => version && LEGACY_VERSION_IDS[version.legacyRosterId] === version.versionId ? version.legacyRosterId : null;
export const getCollectionProgress = (meta, id) => {
  const version = resolveVersion(id);
  const entry = meta.collection?.[version?.versionId || id] || {};
  const legacy = !!legacyIdFor(version) && (meta.unlocked || []).includes(legacyIdFor(version));
  return { discovered: entry.discovered === true || entry.recruited === true || (legacy && !meta.collection?.[version?.versionId]),
    recruited: entry.recruited === true, starterUnlocked: entry.starterUnlocked === true || legacy };
};
export const getCollectionState = (meta, id) => {
  const entry = getCollectionProgress(meta, id);
  return entry.recruited ? "RECRUITED" : entry.discovered ? "DISCOVERED" : "UNKNOWN";
};
export const migrateCollection = meta => {
  const collection = { ...(meta.collection || {}) };
  for (const id of meta.unlocked || []) {
    const version = resolveVersion(id);
    if (!version) continue; // Preserve unknown legacy IDs without inventing catalog entries.
    collection[version.versionId] = { ...collection[version.versionId], ...getCollectionProgress(meta, version.versionId) };
  }
  return { ...meta, metaSchemaVersion: Math.max(1, meta.metaSchemaVersion || 0), collection };
};
const update = (meta, id, patch) => {
  const version = resolveVersion(id);
  if (!version) return meta;
  const before = meta.collection?.[version.versionId] || empty();
  const after = { ...before, ...patch };
  const legacy = meta.unlocked || [];
  const legacyId = legacyIdFor(version);
  const unlocked = after.starterUnlocked && legacyId && !legacy.includes(legacyId)
    ? [...legacy, legacyId] : legacy;
  if (unlocked === legacy && Object.keys(after).every(key => before[key] === after[key])) return meta;
  return { ...meta, unlocked, collection: { ...meta.collection, [version.versionId]: after } };
};
export const discoverVersion = (meta, id) => update(meta, id, { discovered: true });
export const unlockStarter = (meta, id) => update(meta, id, { starterUnlocked: true });
export const recruitVersion = (meta, id) => update(meta, id, { discovered: true, recruited: true, starterUnlocked: true });
