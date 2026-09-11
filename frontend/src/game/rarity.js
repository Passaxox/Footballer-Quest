export const RARITIES = {
  common: { id: "common", label: "Comune", selectionWeight: 10, accentClass: "text-slate-200" },
  uncommon: { id: "uncommon", label: "Non comune", selectionWeight: 6, accentClass: "text-emerald-300" },
  rare: { id: "rare", label: "Raro", selectionWeight: 3, accentClass: "text-sky-300" },
  special: { id: "special", label: "Speciale", selectionWeight: 1.5, accentClass: "text-amber-300" },
};

export const RARITY_IDS = Object.keys(RARITIES);

export function rarityIdForVersion(version) {
  if (version?.rarityId && RARITIES[version.rarityId]) return version.rarityId;
  const tier = version?.encounterTier ?? 1;
  return tier >= 4 ? "special" : tier === 3 ? "rare" : tier === 2 ? "uncommon" : "common";
}

export const rarityForVersion = version => RARITIES[rarityIdForVersion(version)];
