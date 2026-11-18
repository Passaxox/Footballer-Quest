import { resolveVersion } from "./catalog";

// Mixi Max (fan anomaly, Chrono Stone mechanic): donor aura grants a passive by donor role; receiver keeps identity.
const PASSIVES = {
  A: { stat: "atkPct", value: 10, label: "+10% ATK" },
  C: { stat: "spdPct", value: 10, label: "+10% VEL" },
  D: { stat: "defPct", value: 10, label: "+10% DIF" },
  P: { stat: "hpPct", value: 12, label: "+12% HP massimi" },
};

export const mixiPassive = (donorVersionId) => PASSIVES[resolveVersion(donorVersionId)?.role] || PASSIVES.C;
export const canReceiveMixi = (p) => !!p && p.hp > 0 && !p.mixi;

export const applyMixi = (p, donor) => ({ ...p, mixi: { donorVersionId: donor.versionId, donorName: donor.name, donorElement: donor.element, ...mixiPassive(donor.versionId) } });

// Runtime-only bonus, applied at match start like perks and synergies.
export const applyMixiBuffs = (team) => team.map((p) => {
  if (!p.mixi) return p;
  const m = 1 + p.mixi.value / 100;
  if (p.mixi.stat === "hpPct") { const maxHp = Math.round(p.maxHp * m); return { ...p, maxHp, hp: p.hp === 0 ? 0 : Math.round(p.hp * maxHp / p.maxHp) }; }
  const key = { atkPct: "atk", spdPct: "spd", defPct: "def" }[p.mixi.stat];
  return { ...p, [key]: Math.round(p[key] * m) };
});
