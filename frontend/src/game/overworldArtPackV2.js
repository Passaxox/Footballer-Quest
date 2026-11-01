// P3a-S1: optional presentation manifest, independent of graph generation and saves.
// Private artwork stays outside this repository. No fetch, filesystem or image loading.
// Paths are web asset URLs (relative to basePath, root-relative, or absolute URLs).
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const svg = (width, height, content) => ({
  src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${content}</svg>`)}`,
  width, height,
});

// Original, deliberately simple local placeholders. Background contains no roads:
// only layout.edges may describe connections. No official imagery is bundled.
export const LOCAL_OVERWORLD_ART_V2 = freeze({
  background: svg(1000, 700, '<rect width="1000" height="700" fill="#0b1220"/><path d="M0 0H1000V80H0Z M0 620H1000V700H0Z" fill="#0f1a2e"/>'),
  landmark: svg(64, 64, '<path d="M8 28L32 10L56 28V56H8Z" fill="#c9b89e" stroke="#334155" stroke-width="3"/><path d="M27 56V38H37V56 M17 31H23 M41 31H47" fill="none" stroke="#334155" stroke-width="4"/>'),
  caravan: svg(80, 48, '<path d="M5 10H51L72 25V37H5Z" fill="#f8fafc" stroke="#334155" stroke-width="3"/><path d="M51 14L64 24H51Z" fill="#83baca"/><circle cx="20" cy="37" r="7" fill="#334155"/><circle cx="59" cy="37" r="7" fill="#334155"/>'),
  crest: svg(48, 56, '<path d="M6 5H42V29Q42 42 24 51Q6 42 6 29Z" fill="#64748b" stroke="#f8fafc" stroke-width="3"/>'),
});

function assetPath(value) {
  if (value == null) return null;
  if (typeof value !== "string") throw new TypeError("ArtPack paths must be strings or null.");
  return value.trim() || null;
}
const paths = entries => Object.fromEntries(Object.entries(entries || {}).map(([key, value]) => [key, assetPath(value)]));
const slots = value => ({
  backgrounds: paths(value.backgrounds), landmarks: paths(value.landmarks), crests: paths(value.crests),
  ...(own(value, "caravan") ? { caravan: assetPath(value.caravan) } : {}),
});

/**
 * Manifest v1: backgrounds keyed by layout frameId (or "default"), landmarks by
 * locationId, crests by teamId, one Caravan sprite, and partial environmentId
 * overrides with the same slots. Missing keys inherit; explicit null requests the
 * local fallback. This copies/freezes only owned data, never the caller's objects.
 */
export function createOverworldArtPackV2(config = {}) {
  return freeze({
    schemaVersion: 1, id: assetPath(config.id) || "local-district-v2",
    basePath: assetPath(config.basePath) || "",
    caravan: null, ...slots(config),
    environments: Object.fromEntries(Object.entries(config.environments || {}).map(([key, value]) => [key, slots(value)])),
  });
}
export const DEFAULT_OVERWORLD_ART_PACK_V2 = createOverworldArtPackV2();

function source(basePath, path) {
  if (!path) return null;
  if (!basePath || /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(path)) return path;
  return `${basePath.replace(/\/+$/, "")}/${path}`;
}

/**
 * Pure selection; each slot returns { src, fallback: { src, width, height } }.
 * Consumers use fallback.src when src is null OR loading fails. No load is started
 * here. Variant exact key > base exact key > variant default > base default.
 */
export function resolveOverworldArtPackV2(pack = DEFAULT_OVERWORLD_ART_PACK_V2, context = {}) {
  const variant = context.environmentId != null && own(pack.environments, context.environmentId)
    ? pack.environments[context.environmentId] : {};
  const keyed = (group, key) => {
    const overrides = variant[group] || {};
    if (key != null && own(overrides, key)) return overrides[key];
    if (key != null && own(pack[group], key)) return pack[group][key];
    if (own(overrides, "default")) return overrides.default;
    return own(pack[group], "default") ? pack[group].default : null;
  };
  const asset = (path, fallback) => ({ src: source(pack.basePath, path), fallback });
  return freeze({
    background: asset(keyed("backgrounds", context.frameId), LOCAL_OVERWORLD_ART_V2.background),
    landmark: asset(keyed("landmarks", context.locationId), LOCAL_OVERWORLD_ART_V2.landmark),
    caravan: asset(own(variant, "caravan") ? variant.caravan : pack.caravan, LOCAL_OVERWORLD_ART_V2.caravan),
    crest: asset(keyed("crests", context.teamId), LOCAL_OVERWORLD_ART_V2.crest),
  });
}
