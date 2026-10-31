// V2-only domain transitions. V1 keeps its existing UI callbacks and RNG defaults.
import { EVENTS } from "./data";
import { canRecruitPlayer, ownedCharacterIds } from "./catalog";
import { nodeRandom } from "./overworld";
import { hydrateOverworldV2, hasOverworldV2, actionTokenV2 } from "./overworldRunV2";
import { normalizeRun, completeNonCombatNode, generateRewards, epsilonRecruitOffer, recruitChallengePlayer,
  createPlayer, chance, addItem, gainXp, recalcStats, applyEventDamage, reportXpChanges, mergeXpReports,
  randomRosterId, enemiesForEffect, resolveActiveUid } from "./engine";

const advance = (run, nonCombat = false) => {
  const r = nonCombat ? completeNonCombatNode(run) : run;
  return normalizeRun({ ...r, wave: Math.min(50, r.wave + 1), pending: null, overworld: { ...r.overworld,
    completedWave: r.wave, path: [...r.overworld.path, r.overworld.selectedNodeId], selectedNodeId: null,
    transition: r.overworld.transition + 1, result: r.wave === 50 ? "win" : null } });
};
const pending = (run, content) => normalizeRun({ ...run, overworld: { ...run.overworld, transition: run.overworld.transition + 1 }, pending: {
  ...content, overworldNodeId: run.pending.overworldNodeId, actionStep: run.pending.actionStep + 1,
  scenarioState: run.pending.scenarioState, environmentId: run.pending.environmentId,
} });
const afterRecruit = run => run.pending.context?.after === "rewards"
  ? pending(run, { type: "reward", context: run.pending.context }) : advance(run, true);

// Pass the token from the displayed pending. A repeated/stale callback is a no-op,
// including across reload. Call storage.dispatchRunV2 to commit against the latest save.
export function resolveOverworldActionV2(run, action) {
  if (!hasOverworldV2(run)) return run;
  hydrateOverworldV2(run);
  const token = actionTokenV2(run), p = run.pending;
  if (!token || !action || action.nodeId !== token.nodeId || action.step !== token.step) return run;
  const random = nodeRandom(run.overworld.contentSeed, `${token.nodeId}/action/${token.step}`);
  if (action.type === "buy" && p.type === "shop") {
    const entry = Number.isInteger(action.index) && p.stock[action.index];
    if (!entry || (p.bought || []).includes(action.index) || run.money < entry.price) return run;
    return pending({ ...run, money: run.money - entry.price, items: addItem(run.items, entry.id) }, { ...p, bought: [...(p.bought || []), action.index] });
  }
  if (action.type === "leave" && p.type === "shop") return advance(run, true);
  if (action.type === "train" && p.type === "training") {
    const amounts = { atk: 4, def: 4, spd: 5, hp: 12 }, ownXp = action.drill === "xp";
    if (!ownXp && (!Object.prototype.hasOwnProperty.call(amounts, action.drill) || !Number.isInteger(action.index) || !run.team[action.index])) return run;
    const team = run.team.map((player, i) => {
      if (ownXp) return gainXp(player, 30).player;
      if (i !== action.index) return player;
      const stat = action.drill, amt = amounts[stat];
      const next = recalcStats({ ...player, bonus: { ...player.bonus, [stat]: player.bonus[stat] + amt } });
      return stat === "hp" ? { ...next, hp: player.hp === 0 ? 0 : Math.min(next.maxHp, next.hp + amt) } : next;
    });
    return advance({ ...run, team, pending: { ...p, progression: { hadOwnXp: ownXp, report: reportXpChanges(run.team, team, "node") } } }, true);
  }
  if (p.type === "recruit") {
    const offer = p.context?.offer || p.player, free = p.context?.mode === "offer";
    if (action.type === "skipRecruit") return afterRecruit(run);
    if (action.type === "challenge" && !free && canRecruitPlayer(run.team, offer)) {
      return pending(run, { type: "battle", kind: "wild", enemies: [recruitChallengePlayer(offer, run)], forceRecruit: true });
    }
    if (action.type === "recruit" && canRecruitPlayer(run.team, offer)) {
      if (!free && run.money < p.price) return run;
      const replace = action.replaceIndex ?? null;
      if (replace === null ? run.team.length >= 6 : !Number.isInteger(replace) || !run.team[replace]) return run;
      const player = { ...offer, hp: offer.maxHp };
      const team = replace === null ? [...run.team, player] : run.team.map((q, i) => i === replace ? player : q);
      return afterRecruit({ ...run, team, money: run.money - (free ? 0 : p.price), stats: { ...run.stats, recruits: run.stats.recruits + 1 } });
    }
  }
  if (action.type === "chooseEvent" && p.type === "event" && !p.result) {
    const event = EVENTS.find(e => e.id === p.eventId), choice = Number.isInteger(action.index) && event?.choices[action.index];
    if (!choice || (choice.cost && run.money < choice.cost)) return run;
    let x = random() * choice.outcomes.reduce((sum, o) => sum + o.chance, 0);
    const result = choice.outcomes.find(o => (x -= o.chance) < 0) || choice.outcomes.at(-1);
    return pending(run, { ...p, result }); // Persist outcome before applying its effects.
  }
  if (action.type === "resolveEvent" && p.type === "event" && p.result) {
    let r = { ...run }, recruitTier = null, battle = null;
    const target = (fn, t, el) => r.team.map((q, i) => t === "all" || (t === "active" && i === 0) || (t === "element" && q.element === el) ? fn(q) : q);
    for (const e of p.result.effects) {
      switch (e.type) {
        case "item": r.items = addItem(r.items, e.id); break;
        case "money": r.money = Math.max(0, r.money + e.amt); break;
        case "heal": r.team = target(q => q.hp > 0 ? { ...q, hp: Math.min(q.maxHp, q.hp + Math.round(q.maxHp * e.pct / 100)) } : q, e.target); break;
        case "damage": r.team = target(q => applyEventDamage(q, e.pct), e.target); break;
        case "stat": r.team = target(q => { const n = recalcStats({ ...q, bonus: { ...q.bonus, [e.stat]: q.bonus[e.stat] + e.amt } }); return e.stat === "hp" && q.hp > 0 ? { ...n, hp: Math.min(n.maxHp, n.hp + e.amt) } : n; }, e.target, e.element); break;
        case "xp": r.team = target(q => gainXp(q, e.amt).player, e.target); break;
        case "recruit": recruitTier = e.tier; break;
        case "battle": battle = e; break;
        default: break;
      }
    }
    const progression = { hadOwnXp: p.result.effects.some(e => e.type === "xp" && e.amt > 0), hadCombat: !!battle, report: reportXpChanges(run.team, r.team, "node") };
    r = { ...r, seenEvents: [...(r.seenEvents || []), p.eventId], pending: { ...p, progression } };
    if (battle) {
      const enemies = enemiesForEffect(battle, r.wave, r, random);
      return pending(r, { type: "battle", kind: enemies.length === 1 ? "wild" : "team", encounterType: enemies.length === 1 ? "solo" : "mixed", teamId: null, teamName: "Sfidanti", enemies, progression, rewardItem: battle.reward });
    }
    if (recruitTier) {
      const id = randomRosterId(recruitTier, [...ownedCharacterIds(r.team)], random);
      if (id) return pending(r, { type: "recruit", progression, context: { mode: "offer", offer: createPlayer(id, Math.max(1, r.wave), random), after: "advance" } });
    }
    return advance(r, true);
  }
  if (action.type === "battleResult" && p.type === "battle") {
    // Combat owns per-enemy XP and rollback (settleCombatProgression). This boundary
    // accepts its settled snapshot, never grants a second combat XP award.
    if (!["win", "lose", "flee"].includes(action.result) || !Array.isArray(action.team)
        || action.team.length !== run.team.length || action.team.some((q, i) => q.uid !== run.team[i].uid)
        || (action.result === "flee" && p.kind === "boss")) return run;
    const xpReport = mergeXpReports(p.progression?.report, action.report);
    const boss = p.kind === "boss";
    let r = { ...run, team: action.team, items: action.items ?? run.items, activeUid: resolveActiveUid(action.team, action.activeUid), lastProgression: { wave: run.wave, report: xpReport } };
    if (action.result === "lose") return normalizeRun({ ...r, overworld: { ...r.overworld, transition: r.overworld.transition + 1, result: "lose" } });
    if (action.result === "flee") return advance(r);
    const gain = Math.round((20 + run.wave * 3) * (boss ? 3 : p.kind === "team" ? 1.6 : 1));
    r = { ...r, team: boss ? r.team.map(q => ({ ...q, hp: q.maxHp })) : r.team, money: r.money + gain,
      stats: { ...r.stats, wins: r.stats.wins + 1, ...(boss ? { lastBossDefeated: p.teamName } : {}) } };
    if (run.wave === 50) return advance(r);
    const base = { rewards: generateRewards(random), bonus: p.rewardItem, money: gain, xpReport };
    const epsilonOffer = epsilonRecruitOffer(p, r.team);
    if (epsilonOffer || (p.kind === "wild" && canRecruitPlayer(r.team, p.enemies[0]) && (r.fischietto || p.forceRecruit || chance(40, random)))) {
      const enemy = epsilonOffer || p.enemies[0], offer = { ...createPlayer(enemy.versionId || enemy.baseId, enemy.level, random), uid: enemy.uid };
      return pending({ ...r, fischietto: epsilonOffer ? r.fischietto : false }, { type: "recruit", context: { ...base, mode: "offer", offer, after: "rewards" } });
    }
    return pending(r, { type: "reward", context: base });
  }
  if (action.type === "reward" && p.type === "reward") {
    if (action.id != null && !p.context.rewards.includes(action.id)) return run;
    let items = run.items;
    if (action.id) items = addItem(items, action.id);
    if (p.context.bonus) items = addItem(items, p.context.bonus);
    return advance({ ...run, items });
  }
  return run;
}
