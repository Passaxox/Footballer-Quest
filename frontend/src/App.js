import { discoverVersion, recruitVersion } from "@/game/collection";
import { useCallback, useState } from "react";
import "@/App.css";
import { EVENTS, FINAL_WAVE } from "@/game/data";
import { generateWave, recruitChallengePlayer, generateRewards, addItem, createPlayer, randomRosterId, enemiesForEffect, fuseRunPlayers, gainXp, recalcStats, chance, newRun, normalizeRun, resolveActiveUid, applyEventDamage, completeNonCombatNode, reportXpChanges, mergeXpReports } from "@/game/engine";
import { loadMeta, saveMeta, loadRun, saveRun, clearRun, recordFinishedRun } from "@/game/storage";
import { setSoundEnabled } from "@/game/audio";
import TitleScreen from "@/components/game/TitleScreen";
import TeamSelect from "@/components/game/TeamSelect";
import HubScreen from "@/components/game/HubScreen";
import BattleScreen from "@/components/game/BattleScreen";
import RewardScreen from "@/components/game/RewardScreen";
import EventScreen from "@/components/game/EventScreen";
import ShopScreen from "@/components/game/ShopScreen";
import RecruitScreen from "@/components/game/RecruitScreen";
import TrainingScreen from "@/components/game/TrainingScreen";
import FusionScreen from "@/components/game/FusionScreen";
import TeamScreen from "@/components/game/TeamScreen";
import EndScreen from "@/components/game/EndScreen";
import CollectionScreen from "@/components/game/CollectionScreen";
import RecordsScreen from "@/components/game/RecordsScreen";

function App() {
  const [screen, setScreen] = useState("title");
  const [run, setRun] = useState(() => loadRun());
  const [meta, setMeta] = useState(() => { const saved = loadMeta(); setSoundEnabled(saved.sound); return saved; });
  const [ctx, setCtx] = useState({});

  const updateRun = (r) => { const nextRun = normalizeRun(r); setRun(nextRun); saveRun(nextRun); return nextRun; };
  const updateMeta = (m) => { setMeta(m); saveMeta(m); };

  const onDiscover = useCallback(player => {
    if (!player || player.fused) return;
    setMeta(previous => {
      const nextMeta = discoverVersion(previous, player.versionId || player.baseId);
      if (nextMeta !== previous) saveMeta(nextMeta);
      return nextMeta;
    });
  }, []);

  const startRun = (ids, difficultyId) => {
    updateRun(newRun(ids, difficultyId));
    updateMeta(ids.reduce((nextMeta, id) => recruitVersion(nextMeta, id), meta));
    setScreen("hub");
  };

  const gotoPending = (r) => {
    const p = r.pending;
    if (p.type === "battle") {
      if (!resolveActiveUid(r.team, r.activeUid)) { finishRun(r, "lose"); return; }
      setScreen("battle");
    }
    else if (p.type === "recruit") { setCtx({ mode: "encounter", offer: p.player, price: p.price, after: "advance", ...p.context }); setScreen("recruit"); }
    else if (p.type === "reward") { setCtx(p.context); setScreen("reward"); }
    else setScreen(p.type);
  };

  const next = () => {
    let r = run;
    if (!r.pending) {
      const pending = generateWave(r);
      r = updateRun({ ...r, scenarioState: pending.scenarioState, pending });
    }
    gotoPending(r);
  };

  const finishRun = (r, result) => {
    updateMeta(recordFinishedRun(meta, r, result));
    clearRun(); setRun(null);
    setCtx({ result, finalRun: r });
    setScreen("end");
  };

  const advanceWave = (r, nonCombat = false) => {
    if (nonCombat) r = completeNonCombatNode(r);
    if (r.wave >= FINAL_WAVE) { finishRun(r, "win"); return; }
    updateRun({ ...r, wave: r.wave + 1, pending: null });
    setScreen("hub");
  };

  const onWin = (team, items, activeUid, combatReport) => {
    const xpReport = mergeXpReports(run.pending.progression?.report, combatReport);
    const enc = run.pending;
    const boss = enc.kind === "boss";
    const gain = (20 + run.wave * 3) * (boss ? 3 : enc.kind === "team" ? 1.6 : 1);
    let r = { ...run, lastProgression: { wave: run.wave, report: xpReport }, activeUid, team: boss ? team.map((p) => ({ ...p, hp: p.maxHp })) : team, items, money: run.money + Math.round(gain), stats: { ...run.stats, wins: run.stats.wins + 1, ...(boss ? { lastBossDefeated: enc.teamName } : {}) } };
    // Final victory keeps earned growth/money, but has no next-node item phase.
    if (r.wave >= FINAL_WAVE) { finishRun(r, "win"); return; }
    const rewards = generateRewards();
    const base = { rewards, bonus: enc.rewardItem, money: Math.round(gain), xpReport };
    if (enc.kind === "wild" && (r.fischietto || enc.forceRecruit || chance(40))) {
      const e = enc.enemies[0];
      const fresh = { ...createPlayer(e.versionId || e.baseId, e.level), uid: e.uid };
      r = { ...r, fischietto: false };
      const context = { ...base, mode: "offer", offer: fresh, after: "rewards" };
      updateRun({ ...r, pending: { type: "recruit", context } });
      setCtx(context);
      setScreen("recruit");
      return;
    }
    updateRun({ ...r, pending: { type: "reward", context: base } });
    setCtx(base);
    setScreen("reward");
  };

  const onPickReward = (id) => {
    let items = run.items;
    if (id) items = addItem(items, id);
    if (ctx.bonus) items = addItem(items, ctx.bonus);
    advanceWave({ ...run, items });
  };

  const continueAfterRecruit = (r) => {
    if (ctx.after === "rewards") { updateRun({ ...r, pending: { type: "reward", context: ctx } }); setScreen("reward"); }
    else advanceWave(r, true);
  };

  const joinTeam = (replaceIdx, paid) => {
    const p = { ...ctx.offer, hp: ctx.offer.maxHp };
    const team = replaceIdx === null ? [...run.team, p] : run.team.map((q, i) => (i === replaceIdx ? p : q));
    const r = { ...run, team, money: paid ? run.money - ctx.price : run.money, stats: { ...run.stats, recruits: run.stats.recruits + 1 } };
    if (!p.fused) updateMeta(recruitVersion(meta, p.versionId || p.baseId));
    continueAfterRecruit(r);
  };

  const challengeRecruit = () => {
    const r = updateRun({ ...run, pending: { type: "battle", kind: "wild", enemies: [recruitChallengePlayer(ctx.offer, run)], forceRecruit: true } });
    gotoPending(r);
  };

  const applyEffects = (effects) => {
    let r = { ...run };
    let recruitTier = null;
    let battle = null;
    const target = (fn, t, el) => r.team.map((p, i) => ((t === "all") || (t === "active" && i === 0) || (t === "element" && p.element === el) ? fn(p) : p));
    for (const e of effects) {
      switch (e.type) {
        case "item": r.items = addItem(r.items, e.id); break;
        case "money": r.money = Math.max(0, r.money + e.amt); break;
        case "heal": r.team = target((p) => (p.hp > 0 ? { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * e.pct / 100)) } : p), e.target); break;
        case "damage": r.team = target((p) => applyEventDamage(p, e.pct), e.target); break;
        case "stat": r.team = target((p) => { const q = recalcStats({ ...p, bonus: { ...p.bonus, [e.stat]: p.bonus[e.stat] + e.amt } }); return e.stat === "hp" && p.hp > 0 ? { ...q, hp: Math.min(q.maxHp, q.hp + e.amt) } : q; }, e.target, e.element); break;
        case "xp": r.team = target((p) => gainXp(p, e.amt).player, e.target); break;
        case "recruit": recruitTier = e.tier; break;
        case "battle": battle = e; break;
        default: break;
      }
    }
    return { r, recruitTier, battle };
  };

  const onEventResolve = (outcome) => {
    const ev = EVENTS.find((e) => e.id === run.pending.eventId);
    const { r, recruitTier, battle } = applyEffects(outcome.effects);
    const progression = { hadOwnXp: outcome.effects.some((e) => e.type === "xp" && e.amt > 0), hadCombat: !!battle, report: reportXpChanges(run.team, r.team, "node") };
    r.pending = { ...r.pending, progression };
    r.seenEvents = [...(run.seenEvents || []), ev.id];
    if (battle) {
      const enemies = enemiesForEffect(battle, run.wave, r);
      const nextRun = updateRun({ ...r, pending: { type: "battle", kind: enemies.length === 1 ? "wild" : "team", teamName: "Sfidanti", enemies, progression, rewardItem: battle.reward } });
      gotoPending(nextRun);
      return;
    }
    if (recruitTier) {
      const context = { mode: "offer", offer: createPlayer(randomRosterId(recruitTier), Math.max(1, run.wave)), after: "advance" };
      updateRun({ ...r, pending: { type: "recruit", context, progression } });
      setCtx(context);
      setScreen("recruit");
      return;
    }
    advanceWave(r, true);
  };

  const onFuse = (a, b, moveFrom) => {
    if (!(run.items.cuneo > 0) || a === b || !run.team[a] || !run.team[b] || run.team[a].fused || run.team[b].fused || !["a", "b"].includes(moveFrom)) return;
    updateRun(fuseRunPlayers(run, a, b, moveFrom));
    setScreen("team");
  };

  const toggleSound = () => { const m = { ...meta, sound: !meta.sound }; updateMeta(m); setSoundEnabled(m.sound); };

  const render = () => {
    switch (screen) {
      case "title": return <TitleScreen hasRun={!!run} meta={meta} onNew={() => { if (!run || window.confirm("Esiste una run in corso. Iniziando una nuova run perderai quei progressi. Continuare?")) setScreen("select"); }} onContinue={() => setScreen("hub")} onRecords={() => setScreen("records")} onCollection={() => setScreen("collection")} onToggleSound={toggleSound} />;
      case "select": return <TeamSelect meta={meta} onStart={startRun} onBack={() => setScreen("title")} />;
      case "records": return <RecordsScreen meta={meta} onBack={() => setScreen("title")} />;
      case "collection": return <CollectionScreen meta={meta} onBack={() => setScreen("title")} />;
      case "hub": return <HubScreen run={run} onPause={() => { saveRun(run); setCtx({}); setScreen("title"); }} onNext={next} onTeam={() => setScreen("team")} onAbandon={() => { if (window.confirm("Abbandonare la run? Il progresso andrà perso.")) finishRun(run, "lose"); }} />;
      case "team": return <TeamScreen run={run} onUpdate={(patch) => updateRun({ ...run, ...patch })} onFusion={() => setScreen("fusion")} onBack={() => setScreen("hub")} />;
      case "fusion": return <FusionScreen run={run} onFuse={onFuse} onBack={() => setScreen("team")} />;
      case "battle": return <BattleScreen onDiscover={onDiscover} key={`${run.wave}-${run.pending.enemies[0].uid}`} run={run} encounter={run.pending} onWin={onWin} onActiveChange={(activeUid) => updateRun({ ...run, activeUid })} onLose={(team, items, activeUid, report) => finishRun({ ...run, team, items, activeUid, lastProgression: { wave: run.wave, report: mergeXpReports(run.pending.progression?.report, report) } }, "lose")} onFlee={(team, items, activeUid, report) => advanceWave({ ...run, team, items, activeUid, lastProgression: { wave: run.wave, report: mergeXpReports(run.pending.progression?.report, report) } })} />;
      case "reward": return <RewardScreen rewards={ctx.rewards} bonus={ctx.bonus} money={ctx.money} xpReport={ctx.xpReport} onPick={onPickReward} />;
      case "event": return <EventScreen key={run.wave} run={run} event={EVENTS.find((e) => e.id === run.pending.eventId)} onChoose={(result) => updateRun({ ...run, pending: { ...run.pending, result } })} onResolve={onEventResolve} />;
      case "shop": return <ShopScreen run={run} stock={run.pending.stock} onBuy={(index) => {
        const pending = run.pending;
        const entry = pending.stock[index];
        if (!entry || (pending.bought || []).includes(index) || run.money < entry.price) return;
        updateRun({ ...run, money: run.money - entry.price, items: addItem(run.items, entry.id), pending: { ...pending, bought: [...(pending.bought || []), index] } });
      }} onLeave={() => advanceWave(run, true)} />;
      case "training": return <TrainingScreen run={run} onDone={(team, hadOwnXp = false) => advanceWave({ ...run, team, pending: { ...run.pending, progression: { hadOwnXp, report: reportXpChanges(run.team, team, "node") } } }, true)} />;
      case "recruit": return <RecruitScreen onDiscover={onDiscover} run={run} player={ctx.offer} price={ctx.price} mode={ctx.mode} xpReport={ctx.xpReport} onChallenge={challengeRecruit} onJoin={joinTeam} onSkip={() => continueAfterRecruit(run)} />;
      case "end": return <EndScreen run={ctx.finalRun} result={ctx.result} onRetry={() => { setCtx({}); setScreen("select"); }} onHome={() => setScreen("title")} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] flex justify-center font-body">
      <div className="w-full max-w-md min-h-screen bg-[#0d1322] text-slate-100 flex flex-col border-x-4 border-slate-800 relative overflow-hidden scanlines">
        {render()}
      </div>
    </div>
  );
}

export default App;
