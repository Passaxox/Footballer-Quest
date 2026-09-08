// gameOrigin = first original-trilogy game featuring this specific incarnation.
// Never character debut across media, sprite source, current team or inferred arc.
// GO registry entries remain reserved; this batch assigns only ie1/ie2/ie3.
export const TEAMS = [
  { teamId: "royal-academy", displayName: "Royal Academy" },
  { teamId: "alius-academy", displayName: "Alius Academy" },
  { teamId: "gemini-storm", displayName: "Gemini Storm" },
  { teamId: "epsilon", displayName: "Epsilon" },
  { teamId: "epsilon-plus", displayName: "Epsilon Plus" },
  { teamId: "diamond-dust", displayName: "Diamond Dust" },
  { teamId: "prominence", displayName: "Prominence" },
  { teamId: "chaos", displayName: "Chaos" },
  { teamId: "dark-emperors", displayName: "Dark Emperors" },
  { teamId: "absolute-royal-academy", displayName: "Absolute Royal Academy" },
  { teamId: "inazuma-japan", displayName: "Inazuma Japan" },
  { teamId: "big-waves", displayName: "Big Waves" },
  { teamId: "desert-lion", displayName: "Desert Lion" },
  { teamId: "fire-dragon", displayName: "Fire Dragon" },
  { teamId: "knights-of-queen", displayName: "Knights of Queen" },
  { teamId: "unicorn", displayName: "Unicorn" },
  { teamId: "orpheus", displayName: "Orpheus" },
  { teamId: "the-empire", displayName: "The Empire" },
  { teamId: "neo-japan", displayName: "Neo Japan" },
  { teamId: "raimon", displayName: "Raimon" },
  { teamId: "zeus", displayName: "Zeus" },
  { teamId: "genesis", displayName: "Genesis" },
  { teamId: "little-gigant", displayName: "Little Gigant" },
];
export const ERAS = [{ eraId: "original", displayName: "Original" }, { eraId: "go", displayName: "GO" }];
export const ARCS = [
  { arcId: "football-frontier", eraId: "original" },
  { arcId: "alius", eraId: "original" },
  { arcId: "ffi", eraId: "original" },
  { arcId: "ogre", eraId: "original" },
  { arcId: "go", eraId: "go" },
  { arcId: "chrono-stones", eraId: "go" },
  { arcId: "galaxy", eraId: "go" },
];
export const GAME_ORIGINS = [
  { gameOrigin: "ie1", eraId: "original" },
  { gameOrigin: "ie2", eraId: "original" },
  { gameOrigin: "ie3", eraId: "original" },
  { gameOrigin: "go", eraId: "go" },
  { gameOrigin: "chrono-stones", eraId: "go" },
  { gameOrigin: "galaxy", eraId: "go" },
];
// Evidence and unresolved identities: tests/fixtures/catalog-batch3-sources.md.
// Composite boss lineups alone are NOT affiliation evidence for their members.
export const VERSION_METADATA = {
  "chae:base": { teamTags: ["fire-dragon"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" },
  "teres:base": { gender: "male", teamTags: ["the-empire"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" },
  "edgar:base": { gender: "male", teamTags: ["knights-of-queen"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" },
  "dylan:base": { gender: "male", teamTags: ["unicorn"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" },
  "kruger:base": { gender: "male", teamTags: ["unicorn"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" },
  "gazelle:base": { teamTags: ["chaos", "alius-academy"], arcId: "alius", eraId: "original", gameOrigin: "ie2" },
  "torch:base": { gender: "male", teamTags: ["chaos", "alius-academy"], arcId: "alius", eraId: "original", gameOrigin: "ie2" },
  // User-verified Batch 2: current base versions only; no inferred arc or game origin.
  "mark:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "axel:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "jude:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "nathan:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "shawn:base": { gender: "male", eraId: "original" },
  "jack:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "kevin:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "tod:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "tim:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "willy:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "malcolm:base": { gender: "male", teamTags: ["raimon"], eraId: "original" },
  "byron:base": { teamTags: ["zeus"], arcId: "football-frontier", eraId: "original", gameOrigin: "ie1" },
  "xavier:base": { teamTags: ["genesis", "alius-academy"], arcId: "alius", eraId: "original", gameOrigin: "ie2" },
  "rococo:base": { teamTags: ["little-gigant"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" },
};
