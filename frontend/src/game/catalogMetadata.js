// Passive taxonomy. An origin denotes the represented game, not a guessed debut.
export const TEAMS = [
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
// Evidence: data.js BOSSES introductions at 20/40/50 explicitly name these players.
// Composite boss lineups are NOT affiliation evidence for their other members.
// No gender or game origin can be established from those introductions.
export const VERSION_METADATA = {
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
  "byron:base": { teamTags: ["zeus"] },
  "xavier:base": { teamTags: ["genesis"], arcId: "alius", eraId: "original" },
  "rococo:base": { teamTags: ["little-gigant"], arcId: "ffi", eraId: "original" },
};
