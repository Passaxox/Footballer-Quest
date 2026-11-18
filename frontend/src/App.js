import { discoverVersion, recruitVersion } from "@/game/collection";
import { canRecruitPlayer, ownedCharacterIds } from "@/game/catalog";
import { useCallback, useRef, useState } from "react";
import { hasOverworld, completeOverworldNode } from "@/game/overworld";
import { unlockStarter } from "@/game/collection";
import { spiritFor } from "@/game/spirits";
import { applyMixi } from "@/game/mixi";
import { talentFx, challengeResults, runTalentPoints } from "@/game/talents";
import { perkOffer, addRunPerk, runPerkFx, runSpiritReward } from "@/game/perks";
import PerkOfferScreen from "@/components/game/PerkOfferScreen";
import MinibossRewardScreen from "@/components/game/MinibossRewardScreen";
import PerksScreen from "@/components/game/PerksScreen";
import SaveCodeScreen from "@/components/game/SaveCodeScreen";
import { BossIntro, Consequence, Anomaly } from "@/components/game/StoryScreen";
import { beginOverworldNode, minibossOptions } from "@/game/engine";
import "@/App.css";
import { EVENTS, FINAL_WAVE, ITEMS } from "@/game/data";
import { generateWave, epsilonRecruitOffer, recruitChallengePlayer, generateRewards, addItem, createPlayer, randomRosterId, enemiesForEffect, fuseRunPlayers, gainXp, recalcStats, chance, newRun, normalizeRun, resolveActiveUid, applyEventDamage, completeNonCombatNode, reportXpChanges, mergeXpReports } from "@/game/engine";
import { loadMeta, saveMeta, loadRun, saveRun, clearRun, recordFinishedRun, normalizeMeta } from "@/game/storage";
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
import RivalDiaryScreen from "@/components/game/RivalDiaryScreen";
import { recordRival } from "@/game/rivals";

function App() {
  const [screen, setScreen] = useState("title");
  const [run, setRun] = useState(() => loadRun());
  const [meta, setMeta] = useState(() => { const saved = loadMeta(); setSoundEnabled(saved.sound); return saved; });
  const [ctx, setCtx] = useState({});
  const runRef = useRef(run);

  const updateRun = (r) => { const nextRun = normalizeRun(r); runRef.current = nextRun; setRun(nextRun); saveRun(nextRun); return nextRun; };
  // Reject duplicate taps/stale screen callbacks before applying any resource/XP effects.
  const isCurrentAction = () => runRef.current === run;
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
    const offer = perkOffer(meta, null, Math.random, { start: true });
    const tfx = talentFx(meta);
    const base = newRun(ids, difficultyId);
    const fresh = { ...base, talentFx: tfx, challenges: { perfect: 0, fled: false }, money: base.money + (tfx.money || 0) };
    const r = updateRun(offer.normal.length || offer.cursed ? { ...fresh, pending: { type: "perk", offer, start: true, context: null } } : fresh);
    updateMeta(ids.reduce((nextMeta, id) => recruitVersion(nextMeta, id), meta));
    if (r.pending) gotoPending(r); else setScreen("hub");
  };

  // Perk pick (run start or after a checkpoint); then the stored reward context, if any.
  const onPickPerks = (ids) => {
    if (!isCurrentAction() || run.pending?.type !== "perk") return;
    let r = ids.reduce((acc, id) => addRunPerk(acc, meta, id), run);
    const fx = runPerkFx({ perks: (r.perks || []).filter((p) => ids.includes(p.id)) });
    if (run.pending.start && fx.startLevels) r = { ...r, team: r.team.map((p) => recalcStats({ ...p, level: p.level + fx.startLevels, hp: p.maxHp })).map((p) => ({ ...p, hp: p.maxHp })) };
    const context = run.pending.context;
    if (!context) { updateRun({ ...r, pending: null }); setScreen("hub"); return; }
    updateRun({ ...r, pending: { type: "reward", context } });
    setCtx(context); setScreen("reward");
  };

  const gotoPending = (r) => {
    const p = r.pending;
    if (p.type === "battle") {
      if (!resolveActiveUid(r.team, r.activeUid)) { finishRun(r, "lose"); return; }
      setScreen(p.kind === "boss" && p.introSeen === false ? "boss-intro" : "battle");
    }
    else if (p.type === "consequence") { setCtx(p.context); setScreen("consequence"); }
    else if (p.type === "perk") setScreen("perk");
    else if (p.type === "miniboss-reward") { setCtx(p.context); setScreen("miniboss-reward"); }
    else if (p.type === "recruit") { setCtx({ mode: "encounter", offer: p.player, price: p.price, after: "advance", ...p.context }); setScreen("recruit"); }
    else if (p.type === "reward") { setCtx(p.context); setScreen("reward"); }
    else setScreen(p.type);
  };

  const next = () => {
    let r = runRef.current;
    if (!r || (hasOverworld(r) && !r.pending)) return;
    if (!r.pending) {
      const pending = generateWave(r);
      r = updateRun({ ...r, scenarioState: pending.scenarioState, pending });
    }
    gotoPending(r);
  };

  const selectNode = (nodeId) => {
    const current = runRef.current;
    if (!current) return;
    const nextRun = beginOverworldNode(current, nodeId);
    if (nextRun === current) return;
    gotoPending(updateRun(nextRun));
  };

  const finishRun = (r, result, baseMeta = meta) => {
    const challenges = challengeResults(r, result);
    const spiritGained = runSpiritReward(r, result) + challenges.reduce((n, c) => n + c.spirit, 0);
    const talentGained = runTalentPoints(r, result);
    const recorded = recordFinishedRun(baseMeta, r, result);
    updateMeta({ ...recorded, teamSpirit: (recorded.teamSpirit || 0) + spiritGained, talentPoints: (recorded.talentPoints || 0) + talentGained });
    clearRun(); runRef.current = null; setRun(null);
    setCtx({ result, finalRun: r, spiritGained, talentGained, challenges });
    setScreen("end");
  };

  const advanceWave = (r, nonCombat = false) => {
    if (!isCurrentAction()) return;
    if (nonCombat) r = completeNonCombatNode(r);
    if (r.wave >= FINAL_WAVE) { finishRun(completeOverworldNode(r), "win"); return; }
    updateRun({ ...completeOverworldNode(r), wave: r.wave + 1, pending: null });
    setScreen("hub");
  };

  const onWin = (team, items, activeUid, combatReport) => {
    if (!isCurrentAction() || run.pending?.type !== "battle") return;
    const xpReport = mergeXpReports(run.pending.progression?.report, combatReport);
    const enc = run.pending;
    const boss = enc.kind === "boss";
    const fx = runPerkFx(run);
    const gain = Math.max(0, (20 + run.wave * 3) * (boss ? 3 : enc.kind === "team" ? 1.6 : 1) * (1 + (fx.moneyPct || 0) / 100));
    if (fx.healPct && !boss) team = team.map((p) => (p.hp > 0 ? { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * fx.healPct / 100)) } : p));
    let r = { ...run, lastProgression: { wave: run.wave, report: xpReport }, activeUid, team: boss ? team.map((p) => ({ ...p, hp: p.maxHp })) : team, items, money: run.money + Math.round(gain), stats: { ...run.stats, wins: run.stats.wins + 1, ...(boss ? { lastBossDefeated: enc.teamName } : {}) } };
    // Final victory keeps earned growth/money, but has no next-node item phase.
    if (boss && team.every((p) => p.hp > 0)) r = { ...r, challenges: { ...(r.challenges || {}), perfect: (r.challenges?.perfect || 0) + 1 } };
    if (enc.miniboss) r = { ...r, challenges: { ...(r.challenges || {}), minis: (r.challenges?.minis || 0) + 1 } };
    const rivalMeta = recordRival(meta, enc, run.wave, team.filter((p) => p.hp <= 0).length);
    if (rivalMeta !== meta) updateMeta(rivalMeta);
    if (r.wave >= FINAL_WAVE) { finishRun(completeOverworldNode(r), "win", rivalMeta); return; }
    const rewards = generateRewards(r);
    const base = { rewards, bonus: enc.rewardItem, money: Math.round(gain), xpReport };
    if (boss && enc.actId) {
      updateRun({ ...r, pending: { type: "consequence", actId: enc.actId, bossId: enc.bossId, context: base, overworldNodeId: enc.overworldNodeId } });
      setCtx(base); setScreen("consequence"); return;
    }
    if (enc.miniboss) {
      const pending = { type: "miniboss-reward", teamName: enc.teamName, options: minibossOptions(r, enc), context: base };
      updateRun({ ...r, pending }); setCtx(base); setScreen("miniboss-reward"); return;
    }
    if (enc.kind === "anomaly") {
      const target = r.team.find((p) => p.uid === enc.spiritUid && spiritFor(p));
      const receiver = enc.variant === "mixi" && r.team.find((p) => p.uid === enc.mixiUid && !p.mixi);
      let notice = "Lo squarcio si richiude. Avete ottenuto un premio raro.";
      let bonus = enc.spiritUid || receiver ? null : "pallone";
      if (receiver) {
        r = { ...r, team: r.team.map((p) => (p.uid === receiver.uid ? applyMixi(p, enc.cameo) : p)) };
        const mixed = r.team.find((p) => p.uid === receiver.uid);
        notice = `Mixi Max riuscito: ${receiver.name} riceve l'aura di ${enc.cameo.name} (${mixed.mixi.label})!`;
        const forms = meta.forms || [];
        const formId = `${receiver.characterId || receiver.baseId}:mixi:${enc.cameo.characterId || enc.cameo.baseId}`;
        if (!forms.some((f) => f.formId === formId)) updateMeta({ ...meta, forms: [...forms, { formId, kind: "mixi", name: `${receiver.name} × ${enc.cameo.name}`, owner: receiver.name }] });
      } else if (target) {
        r = { ...r, team: r.team.map((p) => (p.uid === target.uid ? { ...p, spiritUnlocked: true } : p)) };
        notice = `Spirito Guerriero sbloccato: ${target.name} può evocare ${spiritFor(target).name} in partita!`;
        const forms = meta.forms || [];
        const formId = `${target.characterId || target.baseId}:keshin`;
        if (!forms.some((f) => f.formId === formId)) updateMeta({ ...meta, forms: [...forms, { formId, kind: "keshin", name: spiritFor(target).name, owner: target.name }] });
      }
      const context = { ...base, notice, bonus };
      updateRun({ ...r, pending: { type: "reward", context } });
      setCtx(context); setScreen("reward"); return;
    }
    const epsilonOffer = epsilonRecruitOffer(enc, r.team);
    if (epsilonOffer || (enc.kind === "wild" && canRecruitPlayer(r.team, enc.enemies[0]) && (r.fischietto || enc.forceRecruit || chance(40 + (fx.recruitBonus || 0))))) {
      const e = epsilonOffer || enc.enemies[0];
      const fresh = { ...createPlayer(e.versionId || e.baseId, e.level), uid: e.uid };
      r = { ...r, fischietto: epsilonOffer ? r.fischietto : false };
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
    if (!isCurrentAction() || run.pending?.type !== "reward") return;
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
    if (!isCurrentAction() || run.pending?.type !== "recruit") return;
    if (!canRecruitPlayer(run.team, ctx.offer)) return;
    const p = { ...ctx.offer, hp: ctx.offer.maxHp };
    const team = replaceIdx === null ? [...run.team, p] : run.team.map((q, i) => (i === replaceIdx ? p : q));
    const r = { ...run, team, money: paid ? run.money - ctx.price : run.money, stats: { ...run.stats, recruits: run.stats.recruits + 1 } };
    if (!p.fused) updateMeta(recruitVersion(meta, p.versionId || p.baseId));
    continueAfterRecruit(r);
  };

  const challengeRecruit = () => {
    if (!isCurrentAction() || run.pending?.type !== "recruit") return;
    if (!canRecruitPlayer(run.team, ctx.offer)) return;
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
    if (!isCurrentAction() || run.pending?.type !== "event") return;
    const ev = EVENTS.find((e) => e.id === run.pending.eventId);
    const { r, recruitTier, battle } = applyEffects(outcome.effects);
    const progression = { hadOwnXp: outcome.effects.some((e) => e.type === "xp" && e.amt > 0), hadCombat: !!battle, report: reportXpChanges(run.team, r.team, "node") };
    r.pending = { ...r.pending, progression };
    r.seenEvents = [...(run.seenEvents || []), ev.id];
    if (battle) {
      const enemies = enemiesForEffect(battle, run.wave, r);
      const nextRun = updateRun({ ...r, pending: { type: "battle", kind: enemies.length === 1 ? "wild" : "team", encounterType: enemies.length === 1 ? "solo" : "mixed", teamId: null, teamName: "Sfidanti", enemies, progression, rewardItem: battle.reward } });
      gotoPending(nextRun);
      return;
    }
    if (recruitTier) {
      const recruitId = randomRosterId(recruitTier, [...ownedCharacterIds(r.team)]);
      if (!recruitId) { advanceWave(r, true); return; }
      const context = { mode: "offer", offer: createPlayer(recruitId, Math.max(1, run.wave)), after: "advance" };
      updateRun({ ...r, pending: { type: "recruit", context, progression } });
      setCtx(context);
      setScreen("recruit");
      return;
    }
    advanceWave(r, true);
  };

  const onFuse = (a, b, moveFrom) => {
    if (!(run.items.cuneo > 0) || run.stats.fusions > 0 || a === b || !run.team[a] || !run.team[b] || run.team[a].fused || run.team[b].fused || !["a", "b"].includes(moveFrom)) return;
    updateRun(fuseRunPlayers(run, a, b, moveFrom));
    setScreen("team");
  };

  const onConsequence = (choice, offer, idx) => {
    if (!isCurrentAction() || run.pending?.type !== "consequence") return;
    const unlockId = offer?.versionId;
    let r = { ...run, overworld: { ...run.overworld, unlocks: unlockId && !run.overworld.unlocks.includes(unlockId) ? [...run.overworld.unlocks, unlockId] : run.overworld.unlocks } };
    if (unlockId) updateMeta(unlockStarter(meta, unlockId));
    if (choice === "recruit" && run.team.length < 6 && canRecruitPlayer(run.team, offer)) {
      r = { ...r, team: [...r.team, offer], stats: { ...r.stats, recruits: r.stats.recruits + 1 } };
      updateMeta(recruitVersion(unlockStarter(meta, unlockId), unlockId));
    }
    if (choice === "swap" && r.team[idx]) {
      const old = r.team[idx];
      const swapped = recalcStats({ ...createPlayer(unlockId, old.level), uid: old.uid, xp: old.xp, bonus: old.bonus, spiritUnlocked: old.spiritUnlocked });
      r = { ...r, team: r.team.map((p, i) => (i === idx ? { ...swapped, hp: swapped.maxHp } : p)) };
      updateMeta(recruitVersion(unlockStarter(meta, unlockId), unlockId));
    }
    r = { ...r, items: addItem(r.items, "medaglia") };
    const context = { ...run.pending.context, notice: "Ricompensa esclusiva del boss: Medaglia del Checkpoint." };
    const perkChoices = perkOffer(meta, r);
    if (perkChoices.normal.length || perkChoices.cursed) { const next = updateRun({ ...r, pending: { type: "perk", offer: perkChoices, context } }); gotoPending(next); return; }
    updateRun({ ...r, pending: { type: "reward", context } });
    setCtx(context); setScreen("reward");
  };

  const onMinibossPick = (o) => {
    if (!isCurrentAction() || run.pending?.type !== "miniboss-reward") return;
    let r = run;
    let notice = null;
    if (o?.kind === "recruit" && r.team.length < 6 && canRecruitPlayer(r.team, o.player)) {
      r = { ...r, team: [...r.team, o.player], stats: { ...r.stats, recruits: r.stats.recruits + 1 } };
      updateMeta(recruitVersion(meta, o.player.versionId)); notice = `${o.player.name} si unisce alla squadra!`;
    }
    if (o?.kind === "item") { r = { ...r, items: addItem(r.items, o.id) }; notice = `Ottenuto: ${ITEMS[o.id].name}`; }
    if (o?.kind === "spirit") {
      r = { ...r, team: r.team.map((p) => (p.uid === o.uid ? { ...p, spiritUnlocked: true } : p)) };
      notice = `Spirito Guerriero sbloccato: ${o.name} può evocare ${o.spirit}!`;
      const target = run.team.find((p) => p.uid === o.uid);
      const formId = `${target.characterId || target.baseId}:keshin`;
      if (!(meta.forms || []).some((f) => f.formId === formId)) updateMeta({ ...meta, forms: [...(meta.forms || []), { formId, kind: "keshin", name: o.spirit, owner: o.name }] });
    }
    const context = { ...run.pending.context, notice };
    updateRun({ ...r, pending: { type: "reward", context } });
    setCtx(context); setScreen("reward");
  };

  const acceptAnomaly = (uid) => {
    if (!isCurrentAction() || run.pending?.type !== "anomaly") return;
    const cameo = run.pending.cameo;
    const target = run.pending.variant === "mixi" ? { mixiUid: uid } : { spiritUid: uid };
    gotoPending(updateRun({ ...run, pending: { ...run.pending, type: "battle", kind: "anomaly", elite: true, ...target, teamName: "Anomalia temporale",
      intro: `Il tempo si piega: ${cameo.name} esce dallo squarcio e vi sfida!`, enemies: [cameo] } }));
  };

  const toggleSound = () => { const m = { ...meta, sound: !meta.sound }; updateMeta(m); setSoundEnabled(m.sound); };

  const render = () => {
    switch (screen) {
      case "title": return <TitleScreen hasRun={!!run} meta={meta} onNew={() => { if (!run || window.confirm("Esiste una run in corso. Iniziando una nuova run perderai quei progressi. Continuare?")) setScreen("select"); }} onContinue={() => setScreen("hub")} onRecords={() => setScreen("records")} onCollection={() => setScreen("collection")} onPerks={() => setScreen("perks")} onSaveCode={() => setScreen("savecode")} onRivals={() => setScreen("rivals")} onToggleSound={toggleSound} />;
      case "select": return <TeamSelect meta={meta} onStart={startRun} onBack={() => setScreen("title")} />;
      case "rivals": return <RivalDiaryScreen meta={meta} onBack={() => setScreen("title")} />;
      case "records": return <RecordsScreen meta={meta} onBack={() => setScreen("title")} />;
      case "collection": return <CollectionScreen meta={meta} onBack={() => setScreen("title")} />;
      case "perks": return <PerksScreen meta={meta} onUpdate={updateMeta} onBack={() => setScreen("title")} />;
      case "savecode": return <SaveCodeScreen meta={meta} run={run} onImport={(data) => { updateMeta(normalizeMeta(data.meta)); let imported = null; try { imported = data.run && Array.isArray(data.run.team) && data.run.team.length ? normalizeRun(data.run) : null; } catch { imported = null; } if (imported) updateRun(imported); else { clearRun(); runRef.current = null; setRun(null); } setScreen("title"); }} onBack={() => setScreen("title")} />;
      case "miniboss-reward": return <MinibossRewardScreen key={run.wave} pending={run.pending} onPick={onMinibossPick} />;
      case "perk": return <PerkOfferScreen key={run.wave} run={run} meta={meta} offer={run.pending.offer} onPick={onPickPerks} />;
      case "hub": return <HubScreen run={run} onSelectNode={selectNode} onPause={() => { saveRun(run); setCtx({}); setScreen("title"); }} onNext={next} onTeam={() => setScreen("team")} onIntroSeen={(i) => updateRun({ ...run, overworld: { ...run.overworld, introSeen: i } })} onAbandon={() => { if (window.confirm("Abbandonare la run? Il progresso andrà perso.")) finishRun(run, "lose"); }} />;
      case "team": return <TeamScreen run={run} onUpdate={(patch) => updateRun({ ...run, ...patch })} onFusion={() => setScreen("fusion")} onBack={() => setScreen("hub")} />;
      case "fusion": return <FusionScreen run={run} onFuse={onFuse} onBack={() => setScreen("team")} />;
      case "battle": return <BattleScreen onDiscover={onDiscover} key={`${run.wave}-${run.pending.enemies[0].uid}`} run={run} encounter={run.pending} onWin={onWin} onActiveChange={(activeUid) => updateRun({ ...run, activeUid })} onLose={(team, items, activeUid, report) => finishRun({ ...run, team, items, activeUid, lastProgression: { wave: run.wave, report: mergeXpReports(run.pending.progression?.report, report) } }, "lose")} onFlee={(team, items, activeUid, report) => advanceWave({ ...run, challenges: { ...(run.challenges || {}), fled: true }, team, items, activeUid, lastProgression: { wave: run.wave, report: mergeXpReports(run.pending.progression?.report, report) } })} />;
      case "reward": return <RewardScreen rewards={ctx.rewards} bonus={ctx.bonus} money={ctx.money} xpReport={ctx.xpReport} notice={ctx.notice} onPick={onPickReward} />;
      case "boss-intro": return <BossIntro run={run} encounter={run.pending} onStart={() => { const r = updateRun({ ...run, pending: { ...run.pending, introSeen: true } }); gotoPending(r); }} />;
      case "consequence": return <Consequence key={run.wave} run={run} pending={run.pending} onResolve={onConsequence} />;
      case "anomaly": return <Anomaly key={run.wave} run={run} pending={run.pending} onAccept={acceptAnomaly} onLeave={() => advanceWave({ ...run, pending: { ...run.pending, skipped: true } }, true)} />;
      case "event": return <EventScreen key={run.wave} run={run} event={EVENTS.find((e) => e.id === run.pending.eventId)} onChoose={(result) => updateRun({ ...run, pending: { ...run.pending, result } })} onResolve={onEventResolve} />;
      case "shop": return <ShopScreen run={run} stock={run.pending.stock} onBuy={(index) => {
        if (!isCurrentAction()) return;
        const pending = run.pending;
        const entry = pending.stock[index];
        if (!entry || (pending.bought || []).includes(index) || run.money < entry.price) return;
        updateRun({ ...run, money: run.money - entry.price, items: addItem(run.items, entry.id), pending: { ...pending, bought: [...(pending.bought || []), index] } });
      }} onLeave={() => advanceWave({ ...run, pending: { ...run.pending, skipped: true } }, true)} />;
      case "training": return <TrainingScreen run={run} onDone={(team, hadOwnXp = false) => advanceWave({ ...run, team, pending: { ...run.pending, progression: { hadOwnXp, report: reportXpChanges(run.team, team, "node") } } }, true)} />;
      case "recruit": return <RecruitScreen onDiscover={onDiscover} run={run} player={ctx.offer} price={ctx.price} mode={ctx.mode} xpReport={ctx.xpReport} onChallenge={challengeRecruit} onJoin={joinTeam} onSkip={() => continueAfterRecruit(run)} />;
      case "end": return <EndScreen run={ctx.finalRun} result={ctx.result} spiritGained={ctx.spiritGained} talentGained={ctx.talentGained} challenges={ctx.challenges} onRetry={() => { setCtx({}); setScreen("select"); }} onHome={() => setScreen("title")} />;
      default: return null;
    }
  };

  const owHub = screen === "hub" && hasOverworld(run);
  return (
    <div className={`min-h-screen bg-[#05070d] flex justify-center font-body ${owHub ? "ow-shell" : ""}`}>
      <div className={`w-full max-w-md min-h-screen bg-[#0d1322] text-slate-100 flex flex-col border-x-4 border-slate-800 relative ${owHub ? "ow-shell overflow-clip" : "overflow-hidden"} scanlines`}>
        {render()}
      </div>
    </div>
  );
}

export default App;
