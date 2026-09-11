import { discoverVersion, recruitVersion } from "@/game/collection";
import { useCallback, useState } from "react";
import "@/App.css";
import { FINAL_WAVE } from "@/game/data";
import { getRunEvent } from "@/game/events";
import { advanceRunWave, applyRunEventOutcome, chooseRunEvent, generateWave, recruitChallengePlayer, generateRewards, addItem, createPlayer, fuseRunPlayers, newRun, normalizeRun, resolveActiveUid, completeNonCombatNode, reportXpChanges, mergeXpReports } from "@/game/engine";
import { createRunRandomCursor } from "@/game/runRandom";
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
      const generated = generateWave(r);
      const { scenarioState, seed, rngState, rngCounter, ...pending } = generated;
      r = updateRun({ ...r, scenarioState, seed, rngState, rngCounter, pending });
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
    updateRun(advanceRunWave(r));
    setScreen("hub");
  };

  const onWin = (team, items, activeUid, combatReport) => {
    const xpReport = mergeXpReports(run.pending.progression?.report, combatReport);
    const enc = run.pending;
    const boss = enc.kind === "boss";
    const rewardMultiplier = (run.temporaryModifiers || []).reduce((multiplier, modifier) => multiplier * (modifier.rewardMultiplier || 1), 1);
    const gain = (20 + run.wave * 3) * (boss ? 3 : enc.kind === "team" ? 1.6 : 1) * rewardMultiplier;
    let r = { ...run, lastProgression: { wave: run.wave, report: xpReport }, activeUid, team: boss ? team.map((p) => ({ ...p, hp: p.maxHp })) : team, items, money: run.money + Math.round(gain), stats: { ...run.stats, wins: run.stats.wins + 1, ...(boss ? { lastBossDefeated: enc.teamName } : {}) } };
    // Final victory keeps earned growth/money, but has no next-node item phase.
    if (r.wave >= FINAL_WAVE) { finishRun(r, "win"); return; }
    const cursor = createRunRandomCursor(r);
    const rewards = generateRewards(cursor.next);
    const base = { rewards, bonus: enc.rewardItem, money: Math.round(gain), xpReport };
    const recruitOffered = enc.kind === "wild" && (r.fischietto || enc.forceRecruit || cursor.next() * 100 < 40);
    r = { ...r, ...cursor.patch() };
    if (recruitOffered) {
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

  const onEventResolve = () => {
    const event = getRunEvent(run.pending.eventId);
    const nextRun = applyRunEventOutcome(run, event, run.pending.result);
    if (nextRun.pending.type === "battle" || nextRun.pending.type === "recruit") {
      updateRun(nextRun);
      gotoPending(nextRun);
    } else {
      advanceWave(nextRun, true);
    }
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
      case "event": {
        const event = getRunEvent(run.pending.eventId);
        return <EventScreen key={`${run.wave}-${event.eventId}`} run={run} event={event} onChoose={(choiceIndex) => updateRun(chooseRunEvent(run, event, choiceIndex))} onResolve={onEventResolve} />;
      }
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
