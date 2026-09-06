import { ROSTER, ELEMENTS, BOSSES, ITEMS, REWARD_POOL, EVENTS, FINAL_WAVE, TEAM_NAMES, SHOP_POOL } from "./data";

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (pct) => Math.random() * 100 < pct;
export const uid = () => Math.random().toString(36).slice(2, 10);

export const byId = (id) => ROSTER.find((p) => p.id === id);

export const typeMultiplier = (moveEl, targetEl) => {
  if (ELEMENTS[moveEl].beats === targetEl) return 1.5;
  if (ELEMENTS[targetEl].beats === moveEl) return 0.67;
  return 1;
};

export const xpForLevel = (level) => Math.floor(20 + level * 12);

const scale = (base, level) => Math.floor(base * (1 + 0.07 * (level - 1)));

export const recalcStats = (p) => {
  const b = p.base;
  const maxHp = scale(b.hp, p.level) + p.bonus.hp;
  const ratio = p.maxHp ? p.hp / p.maxHp : 1;
  return { ...p, maxHp, hp: Math.max(1, Math.min(maxHp, Math.round(maxHp * ratio))), atk: scale(b.atk, p.level) + p.bonus.atk, def: scale(b.def, p.level) + p.bonus.def, spd: scale(b.spd, p.level) + p.bonus.spd };
};

export const createPlayer = (id, level = 1) => {
  const r = byId(id);
  const p = {
    uid: uid(), baseId: id, name: r.name, element: r.element, role: r.role, tier: r.tier, move: { ...r.move },
    level, xp: 0, base: { hp: r.hp, atk: r.atk, def: r.def, spd: r.spd }, bonus: { hp: 0, atk: 0, def: 0, spd: 0 },
    maxHp: 0, hp: 0, fused: false, status: freshStatus(),
  };
  const s = recalcStats(p);
  return { ...s, hp: s.maxHp };
};

export const freshStatus = () => ({ burn: 0, atkMod: 0, defMod: 0, guard: false, talisman: false });

export const gainXp = (p, amount) => {
  let q = { ...p, xp: p.xp + amount };
  let ups = 0;
  while (q.xp >= xpForLevel(q.level) && q.level < 100) {
    q.xp -= xpForLevel(q.level);
    q.level += 1;
    ups += 1;
  }
  if (ups) {
    const before = q.maxHp;
    q = recalcStats(q);
    q.hp = Math.min(q.maxHp, q.hp + (q.maxHp - before));
  }
  return { player: q, ups };
};

const modMult = (stage) => Math.max(0.4, 1 + stage * 0.25);

export const calcDamage = (att, def, move) => {
  const atk = att.atk * modMult(att.status.atkMod);
  const dfn = def.def * modMult(def.status.defMod);
  let mult = typeMultiplier(move.element, def.element);
  if (att.status.talisman) mult = 1.5;
  const crit = chance(move.effect === "crit" ? 30 : 8);
  const stab = move.element === att.element ? 1.1 : 1;
  let dmg = (((2 * att.level) / 5 + 2) * move.power * atk / dfn) / 9 + 2;
  dmg *= mult * stab * (0.88 + Math.random() * 0.12) * (crit ? 1.5 : 1);
  if (def.status.guard) dmg *= 0.5;
  return { dmg: Math.max(1, Math.round(dmg)), mult, crit };
};

// Executes one attack; returns updated {att, def, messages}
export const performAttack = (attacker, defender) => {
  const move = attacker.move;
  let att = { ...attacker, status: { ...attacker.status } };
  let def = { ...defender, status: { ...defender.status } };
  const msgs = [`${att.name} usa ${move.name}!`];
  const hits = move.effect === "multi" ? rand(2, 3) : 1;
  let total = 0;
  for (let i = 0; i < hits; i++) {
    const { dmg, mult, crit } = calcDamage(att, def, move);
    const real = Math.min(def.hp, Math.round(dmg / (hits > 1 ? 1.6 : 1)));
    def.hp -= real;
    total += real;
    if (i === 0) {
      if (crit) msgs.push("Colpo critico!");
      if (mult > 1) msgs.push("È superefficace!");
      if (mult < 1) msgs.push("Non è molto efficace...");
    }
  }
  if (hits > 1) msgs.push(`Colpisce ${hits} volte!`);
  if (def.status.guard) { def.status.guard = false; msgs.push(`${def.name} para parte del colpo!`); }
  att.status.talisman = false;
  switch (move.effect) {
    case "drain": { const h = Math.min(att.maxHp - att.hp, Math.round(total * 0.5)); att.hp += h; if (h > 0) msgs.push(`${att.name} recupera ${h} HP!`); break; }
    case "heal": { const h = Math.min(att.maxHp - att.hp, Math.round(att.maxHp * 0.3)); att.hp += h; if (h > 0) msgs.push(`${att.name} recupera ${h} HP!`); break; }
    case "burn": if (def.hp > 0 && !def.status.burn && chance(70)) { def.status.burn = 3; msgs.push(`${def.name} sta bruciando!`); } break;
    case "weaken": if (def.hp > 0 && def.status.atkMod > -3) { def.status.atkMod -= 1; msgs.push(`L'ATK di ${def.name} diminuisce!`); } break;
    case "shatter": if (def.hp > 0 && def.status.defMod > -3) { def.status.defMod -= 1; msgs.push(`La DIF di ${def.name} diminuisce!`); } break;
    case "charge": if (att.status.atkMod < 3) { att.status.atkMod += 1; msgs.push(`L'ATK di ${att.name} aumenta!`); } break;
    case "guard": att.status.guard = true; msgs.push(`${att.name} si prepara a parare!`); break;
    case "recoil": { const r = Math.min(att.hp - 1, Math.round(total * 0.2)); if (r > 0) { att.hp -= r; msgs.push(`${att.name} subisce ${r} danni di contraccolpo!`); } break; }
    default: break;
  }
  if (def.hp <= 0) { def.hp = 0; msgs.push(`${def.name} è KO!`); }
  return { att, def, msgs };
};

export const applyBurn = (p) => {
  if (!p.status.burn || p.hp <= 0) return { p, msg: null };
  const d = Math.max(1, Math.round(p.maxHp * 0.07));
  const q = { ...p, hp: Math.max(0, p.hp - d), status: { ...p.status, burn: p.status.burn - 1 } };
  return { p: q, msg: `${p.name} soffre per le fiamme (-${d})!${q.hp === 0 ? ` ${p.name} è KO!` : ""}` };
};

export const turnOrder = (a, b) => {
  const pa = a.move.effect === "priority" ? 1 : 0;
  const pb = b.move.effect === "priority" ? 1 : 0;
  if (pa !== pb) return pa > pb ? "player" : "enemy";
  if (a.spd === b.spd) return chance(50) ? "player" : "enemy";
  return a.spd > b.spd ? "player" : "enemy";
};

export const resetBattleStatus = (team) => team.map((p) => ({ ...p, status: freshStatus() }));

// ---------- Fusion ----------
export const fusePlayers = (a, b, moveFrom) => {
  const src = moveFrom === "b" ? b : a;
  const first = a.name.split(" ")[0];
  const last = b.name.split(" ").slice(-1)[0];
  const lvl = Math.max(a.level, b.level);
  const p = {
    uid: uid(), baseId: `${a.baseId}+${b.baseId}`, name: `${first} ${last}`, element: src.element, role: a.role, tier: Math.max(a.tier, b.tier), move: { ...src.move },
    level: lvl, xp: 0, fused: true, status: freshStatus(),
    base: { hp: Math.round((a.base.hp + b.base.hp) / 2 * 1.15), atk: Math.round((a.base.atk + b.base.atk) / 2 * 1.15), def: Math.round((a.base.def + b.base.def) / 2 * 1.15), spd: Math.round((a.base.spd + b.base.spd) / 2 * 1.15) },
    bonus: { hp: a.bonus.hp + b.bonus.hp, atk: a.bonus.atk + b.bonus.atk, def: a.bonus.def + b.bonus.def, spd: a.bonus.spd + b.bonus.spd },
    maxHp: 0, hp: 0,
  };
  const s = recalcStats(p);
  return { ...s, hp: s.maxHp };
};

// ---------- Enemy / wave generation ----------
const enemyLevel = (wave) => Math.max(1, wave + rand(-1, 2));

export const randomRosterId = (maxTier, exclude = []) => {
  const pool = ROSTER.filter((r) => r.tier <= maxTier && !exclude.includes(r.id));
  return pick(pool).id;
};

const tierForWave = (wave) => (wave < 8 ? 1 : wave < 18 ? 2 : 3);

export const generateWave = (run) => {
  const wave = run.wave;
  const boss = BOSSES[wave];
  if (boss) {
    return { type: "battle", kind: "boss", teamName: boss.team, intro: boss.intro, enemies: boss.ids.map((id) => createPlayer(id, wave + 3)) };
  }
  const roll = Math.random() * 100;
  if (wave === 1 || roll < 50) {
    const solo = chance(60);
    if (solo) return { type: "battle", kind: "wild", enemies: [createPlayer(randomRosterId(tierForWave(wave)), enemyLevel(wave))] };
    const n = wave < 5 ? 2 : rand(2, 3);
    const ids = [];
    while (ids.length < n) ids.push(randomRosterId(tierForWave(wave), ids));
    return { type: "battle", kind: "team", teamName: pick(TEAM_NAMES), enemies: ids.map((id) => createPlayer(id, enemyLevel(wave))) };
  }
  if (roll < 62) return { type: "recruit", player: createPlayer(randomRosterId(tierForWave(wave) + (chance(20) ? 1 : 0)), Math.max(1, wave - 1)), price: 60 + wave * 4 };
  if (roll < 74) return { type: "shop", stock: generateShop(wave) };
  if (roll < 84) return { type: "training" };
  const ev = pick(EVENTS.filter((e) => !(run.seenEvents || []).includes(e.id)) .length ? EVENTS.filter((e) => !(run.seenEvents || []).includes(e.id)) : EVENTS);
  return { type: "event", eventId: ev.id };
};

export const generateShop = (wave) => {
  const ids = [];
  while (ids.length < 4) { const id = pick(SHOP_POOL); if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, price: Math.round(ITEMS[id].price * (1 + wave * 0.01)) }));
};

export const generateRewards = () => {
  const out = [];
  const pool = [...REWARD_POOL];
  while (out.length < 3 && pool.length) {
    const total = pool.reduce((s, r) => s + r.w, 0);
    let x = Math.random() * total;
    const idx = pool.findIndex((r) => (x -= r.w) < 0);
    out.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return out;
};

export const enemiesForEffect = (eff, wave) => {
  if (eff.ids) return eff.ids.map((id) => createPlayer(id, wave + (eff.levelBonus || 0)));
  const ids = [];
  while (ids.length < (eff.count || 1)) ids.push(randomRosterId(tierForWave(wave), ids));
  return ids.map((id) => createPlayer(id, wave + (eff.levelBonus || 0)));
};

// ---------- Run helpers ----------
export const newRun = (starterIds) => ({
  wave: 1, team: starterIds.map((id) => createPlayer(id, 3)), items: { barretta: 2 }, money: 100,
  stats: { wins: 0, recruits: 0, fusions: 0, glory: 0 }, seenEvents: [], pending: null, fischietto: false, startedAt: Date.now(),
});

export const addItem = (items, id, n = 1) => ({ ...items, [id]: (items[id] || 0) + n });
export const removeItem = (items, id) => { const c = (items[id] || 0) - 1; const next = { ...items }; if (c <= 0) delete next[id]; else next[id] = c; return next; };

export const applyItemTo = (item, p) => {
  switch (item) {
    case "barretta": return { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5)) };
    case "bibita": return { ...p, hp: p.maxHp, status: { ...p.status, burn: 0 } };
    case "pallone": return p.hp === 0 ? { ...p, hp: Math.round(p.maxHp * 0.5) } : p;
    case "fascia": return recalcStats({ ...p, bonus: { ...p.bonus, atk: p.bonus.atk + 5 } });
    case "guanti": return recalcStats({ ...p, bonus: { ...p.bonus, def: p.bonus.def + 5 } });
    case "scarpini": return recalcStats({ ...p, bonus: { ...p.bonus, spd: p.bonus.spd + 6 } });
    case "proteine": { const q = recalcStats({ ...p, bonus: { ...p.bonus, hp: p.bonus.hp + 15 } }); return { ...q, hp: Math.min(q.maxHp, q.hp + 15) }; }
    case "talismano": return { ...p, status: { ...p.status, talisman: true } };
    default: return p;
  }
};

export const canApplyItem = (item, p) => {
  if (item === "pallone") return p.hp === 0;
  if (p.hp === 0) return false;
  if (item === "barretta" || item === "bibita") return p.hp < p.maxHp || (item === "bibita" && p.status.burn > 0);
  return true;
};

export const glory = (run) => run.stats.wins * 10 + (run.wave - 1) * 15 + run.stats.recruits * 20 + run.stats.fusions * 40;

export const isFinalWave = (wave) => wave >= FINAL_WAVE;
