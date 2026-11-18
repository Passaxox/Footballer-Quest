import { POOL_BY_ID } from "./bossPools";

// Diario Rivali: one entry per boss/miniboss (kind:bossId) with best results across runs.
export function recordRival(meta, enc, wave, kos) {
  const boss = POOL_BY_ID[enc.bossId];
  if (!boss || !(enc.kind === "boss" || enc.miniboss)) return meta;
  const kind = enc.kind === "boss" ? "boss" : "miniboss";
  const key = `${kind}:${boss.id}`;
  const prev = meta.rivals?.[key];
  const entry = {
    key, kind, bossId: boss.id, team: boss.team, teamId: boss.crestId || boss.teamId,
    wins: (prev?.wins || 0) + 1,
    bestWave: Math.max(prev?.bestWave || 0, wave),
    fewestKo: Math.min(prev?.fewestKo ?? Infinity, kos),
    firstAt: prev?.firstAt || Date.now(), lastAt: Date.now(),
  };
  return { ...meta, rivals: { ...(meta.rivals || {}), [key]: entry } };
}

export const rivalEntries = (meta) => Object.values(meta.rivals || {}).filter((r) => r && typeof r === "object" && r.key)
  .sort((a, b) => (a.kind === b.kind ? b.bestWave - a.bestWave : a.kind === "boss" ? -1 : 1));
