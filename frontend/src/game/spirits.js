import { canonicalCharacterId } from "./catalog";
import { playerTeamIds } from "./traits";

// Spiriti Guerrieri canonici della serie, per characterId. Lista modificabile.
export const SPIRITS = {
  mark: { name: "Gran Majin", desc: "Il guardiano dorato che protegge la porta.", atkMult: 1.15, defMult: 1.4, color: "#facc15" },
  axel: { name: "Enma Gazard", desc: "Il demone delle fiamme che incenerisce la difesa.", atkMult: 1.4, defMult: 1.1, color: "#f97316" },
};

export const spiritCharacterId = (p) => p?.fused
  ? canonicalCharacterId(p.parentVersionIds?.[0] || String(p.baseId).split("+")[0])
  : canonicalCharacterId(p);

export const spiritFor = (p) => SPIRITS[spiritCharacterId(p)] || null;

export const canSummonSpirit = (p, used) => !used && !!p && p.hp > 0 && !!spiritFor(p) && !p.status?.spirit;

export const summonSpirit = (p) => ({ ...p, status: { ...p.status, spirit: true } });

export const spiritTeamId = (p) => playerTeamIds(p)[0] || null;
