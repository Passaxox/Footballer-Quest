import { useEffect, useRef, useState } from "react";
import { attackFeedback } from "@/game/battleFeedback";
import { ITEMS, WILD_INTROS, ELEMENTS } from "@/game/data";
import { performAttack, applyBurn, turnOrder, applyNodeModifiers, addNodeStageModifier, settleCombatProgression, grantCombatXp, mergeXpReports, finishCombatReport, applyItemTo, removeItem, pick, chance, resolveActiveUid, xpProgress } from "@/game/engine";
import { activeSynergies } from "@/game/synergies";
import { sfx } from "@/game/audio";
import { getEncounterTier, resolveTeamAccent, resolveScenarioTheme, TRIGGER_ITEM_PRESENTATION } from "@/game/presentation";
import EncounterIntroModal from "./EncounterIntroModal";
import { Btn, HpBar, Avatar, ElementBadge, ElementIcon, PlayerCard, ItemTargetCard, MatchupBadge, MoveInfo, XpBar } from "./ui";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const Fighter = ({ p, side, hit, cue }) => (
  <div className={`flex ${side === "enemy" ? "flex-row-reverse" : "flex-row"} items-end gap-2 ${hit ? "animate-shake" : ""}`}>
    <div className={`battle-portrait ${cue?.side === side && cue.stage === "windup" ? "battle-lunge" : ""}`} style={{ "--lunge-x": side === "player" ? "12px" : "-12px", "--impact-color": ELEMENTS[cue?.element]?.color || "#fff" }}>
      {hit && cue && <div className={`battle-impact battle-impact-${cue.effectiveness}`} aria-hidden="true"><b>-{cue.damage} HP</b><span>{cue.label}</span></div>}
      <div className={`${p.hp === 0 ? "animate-ko" : "animate-idle"} ${hit ? "battle-flash" : ""} ${p.isCaptain ? "captain-aura rounded" : ""}`}>
        <Avatar p={p} size={side === "enemy" ? 100 : 120} ko={p.hp === 0} />
      </div>
    </div>
    <div className={`flex-1 min-w-0 bg-[#0b101d]/90 border-2 ${p.isCaptain ? "border-amber-400" : "border-slate-600"} p-2 ${side === "enemy" ? "text-left" : ""}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {p.isCaptain && (
            <span className="font-pixel text-[7px] text-amber-300 bg-amber-950/90 border border-amber-400 px-1 py-0.2 rounded-sm shadow-sm" data-testid={`${side}-captain-badge`}>
              ★ CAP
            </span>
          )}
          <span className="font-pixel text-[9px] text-white break-words min-w-0 leading-relaxed" data-testid={`${side}-name`}>{p.name}</span>
        </div>
        <span className="font-pixel text-[8px] text-amber-300">Lv{p.level}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 my-1">
        <ElementBadge element={p.element} />
        {p.status.burn > 0 && <span className="font-pixel text-[7px] text-orange-400 border border-orange-500 px-1">BRUCIA</span>}
        {p.status.guard && <span className="font-pixel text-[7px] text-sky-300 border border-sky-500 px-1">PARATA</span>}
        {p.status.atkMod !== 0 && <span className="font-pixel text-[7px] text-slate-300">ATK{p.status.atkMod > 0 ? "+" : ""}{p.status.atkMod}</span>}
        {p.status.defMod !== 0 && <span className="font-pixel text-[7px] text-slate-300">DIF{p.status.defMod > 0 ? "+" : ""}{p.status.defMod}</span>}
      </div>
      <HpBar hp={p.hp} maxHp={p.maxHp} testId={`${side}-hp-bar`} />
      {side === "player" && <div className="mt-1"><XpBar progress={xpProgress(p)} /></div>}
    </div>
  </div>
);

const Dots = ({ team, active }) => (
  <div className="flex gap-1">
    {team.map((p, i) => <span key={p.uid} className={`w-2.5 h-2.5 border border-slate-400 ${p.hp === 0 ? "bg-slate-800" : i === active ? "bg-amber-400" : "bg-emerald-500"}`} />)}
  </div>
);

export default function BattleScreen({ run, encounter, onWin, onLose, onFlee, onActiveChange, onDiscover, onStateChange }) {
  const s = useRef(null);
  if (!s.current) {
    s.current = {
      initialTeam: run.team.map(p => ({ ...p })), team: applyNodeModifiers(run.team, run.nodeModifiers), nodeModifiers: { ...run.nodeModifiers },
      items: { ...run.items }, armedTriggers: { ...(run.armedTriggers || {}) }, temporaryItemsUsed: [], active: run.team.findIndex((p) => p.uid === resolveActiveUid(run.team, run.activeUid)),
      enemies: encounter.enemies.map((e) => ({ ...e })), eIdx: 0, log: [], phase: "intro", cue: null, hit: null, menu: "main", xpReport: null,
      triggerBanner: null, synergyCue: null, victoryHeadline: null,
    };
  }
  const st = s.current;
  const shownEnemy = encounter.enemies[st.eIdx];
  useEffect(() => { if (st.active >= 0) onDiscover?.(shownEnemy); }, [shownEnemy, onDiscover, st.active]);
  const [, force] = useState(0);
  const rr = () => force((n) => n + 1);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const say = async (msg, ms = 750) => {
    if (!mounted.current) return;
    st.log = [...st.log.slice(-5), msg];
    rr();
    await sleep(ms);
  };

  const active = () => st.team[st.active];
  const enemy = () => st.enemies[st.eIdx];
  const setActive = (p) => { st.team = st.team.map((q, i) => (i === st.active ? p : q)); };
  const setEnemy = (p) => { st.enemies = st.enemies.map((q, i) => (i === st.eIdx ? p : q)); };

  useEffect(() => {
    let cancelled = false;
    if (st.active < 0) {
      if (st.phase !== "end") {
        st.phase = "end";
        if (Object.keys(st.nodeModifiers).length || st.temporaryItemsUsed.length) onLose(st.team, st.items, null, null, st.nodeModifiers, st.temporaryItemsUsed);
        else onLose(st.team, st.items, null);
      }
      return;
    }
    (async () => {
      if (encounter.kind === "boss") await say(encounter.intro, 1600);
      else if (encounter.kind === "team") await say(`La squadra ${encounter.teamName} vi sfida!`, 1000);
      else await say(pick(WILD_INTROS), 1000);
      if (cancelled) return;
      await say(`${enemy().name} scende in campo!`, 700);
      if (cancelled) return;
      st.phase = "preBattle"; rr();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBoss = encounter.kind === "boss";
  const hasSigillo = (run.activeNodeItems || []).includes("sigillo");

  const doAttack = async (attackerSide) => {
    const a = attackerSide === "player" ? active() : enemy();
    const d = attackerSide === "player" ? enemy() : active();
    const isPlayerAttacking = attackerSide === "player";
    const options = {
      attackerTeam: isPlayerAttacking ? st.team : st.enemies,
      defenderTeam: isPlayerAttacking ? st.enemies : st.team,
      isBoss,
      bossBonusAttacker: isPlayerAttacking && isBoss && hasSigillo,
      bossBonusDefender: !isPlayerAttacking && isBoss && hasSigillo,
      firstStrike: isPlayerAttacking && !st.firstStrikeUsed,
      hasStendardo: isPlayerAttacking && ((st.armedTriggers?.stendardo || st.items?.stendardo || 0) > 0),
      hasCavigliera: !isPlayerAttacking && !st.caviglieraUsed && ((st.armedTriggers?.cavigliera || st.items?.cavigliera || 0) > 0),
      hasBalsamo: !isPlayerAttacking && ((st.armedTriggers?.balsamo || st.items?.balsamo || 0) > 0),
      hasCerotto: !isPlayerAttacking && ((st.armedTriggers?.cerotto || st.items?.cerotto || 0) > 0),
      onTriggerUsed: (triggerId) => {
        if (triggerId === "stendardo") st.firstStrikeUsed = true;
        if (triggerId === "cavigliera") st.caviglieraUsed = true;
        if (st.armedTriggers?.[triggerId] > 0) {
          st.armedTriggers = { ...st.armedTriggers, [triggerId]: 0 };
        }
        if ((st.items[triggerId] || 0) > 0) {
          st.items = removeItem(st.items, triggerId);
        }
        st.temporaryItemsUsed = [...(st.temporaryItemsUsed || []), triggerId];
        onStateChange?.({ team: st.team, items: st.items, armedTriggers: st.armedTriggers, nodeModifiers: st.nodeModifiers });
        if (TRIGGER_ITEM_PRESENTATION[triggerId]) {
          st.triggerBanner = TRIGGER_ITEM_PRESENTATION[triggerId];
          sfx.triggerItem?.();
          rr();
        }
      },
    };
    const { att, def, msgs } = performAttack(a, d, options);
    if (isPlayerAttacking && msgs.includes("Colpo critico!") && synergies.some(syn => syn.element === "fuoco")) {
      st.synergyCue = "INTESA FUOCO · Colpo critico devastante (+10%)";
    }
    if (!isPlayerAttacking && synergies.some(syn => syn.element === "terra")) {
      st.synergyCue = "INTESA TERRA · Danno ridotto dalla roccia (-10%)";
    }
    st.cue = { ...attackFeedback(a, d, def), side: attackerSide, stage: "windup" };
    st.log = [...st.log.slice(-5), msgs[0]]; rr();
    await sleep(450);
    if (!mounted.current) return;
    st.cue = { ...st.cue, stage: "impact" };
    st.hit = attackerSide === "player" ? "enemy" : "player";
    if (attackerSide === "player") { setActive(att); setEnemy(def); } else { setEnemy(att); setActive(def); }
    (msgs.includes("Colpo critico!") ? sfx.crit : sfx.hit)();
    rr();
    await sleep(350);
    if (!mounted.current) return;
    st.hit = null; st.cue = null; rr();
    for (const m of msgs.slice(1)) { if (m.includes("KO")) sfx.ko(); if (m.includes("recupera")) sfx.heal(); await say(m, 650); }
  };

  const endOfTurn = async () => {
    for (const side of ["player", "enemy"]) {
      const p = side === "player" ? active() : enemy();
      if (p.hp === 0) continue;
      const { p: q, msg } = applyBurn(p);
      if (msg) { side === "player" ? setActive(q) : setEnemy(q); await say(msg); }
    }
  };

  const grantXp = (defeated) => {
    const result = grantCombatXp(st.team, active()?.uid, defeated.level, encounter.kind === "boss", run.rulesetId);
    st.team = result.team;
    st.xpReport = mergeXpReports(st.xpReport, result.report);
    if (result.report.rows.some((row) => row.after.level > row.before.level)) sfx.levelup();
    rr();
  };

  const afterAction = async () => {
    await endOfTurn();
    // Resolve the real team after all end-of-turn effects, before victory/XP/boss healing.
    if (!st.team.some((p) => p.hp > 0)) {
      sfx.lose();
      await say("Tutta la squadra è KO... La run finisce qui.", 1500);
      st.phase = "end"; rr();
      const settled = settleCombatProgression("lose", st.initialTeam, st.team, st.xpReport);
      st.team = settled.team; st.xpReport = settled.report;
      if (Object.keys(st.nodeModifiers).length || st.temporaryItemsUsed.length) onLose(st.team, st.items, active()?.uid, st.xpReport, st.nodeModifiers, st.temporaryItemsUsed);
      else onLose(st.team, st.items, active()?.uid, st.xpReport);
      return;
    }
    if (enemy().hp === 0) {
      await grantXp(enemy());
      if (st.eIdx < st.enemies.length - 1) {
        st.eIdx += 1;
        await say(`${encounter.teamName || "L'avversario"} manda in campo ${enemy().name}!`, 900);
      } else {
        sfx.win();
        const tier = getEncounterTier(encounter);
        st.victoryHeadline = tier.winHeadline;
        if (synergies.some(syn => syn.element === "natura")) {
          st.synergyCue = "INTESA NATURA · Recupero post-vittoria (+7% HP)";
        }
        await say(encounter.kind === "boss" ? `${tier.winHeadline}: Avete sconfitto ${encounter.teamName}!` : encounter.kind === "miniboss" ? `${tier.winHeadline}: Avete superato ${encounter.teamName}!` : encounter.kind === "elite" ? `${tier.winHeadline}: Avete superato ${encounter.teamName}!` : `${tier.winHeadline}!`, 1100);
        st.phase = "end"; rr();
        onWin(st.team.map((p) => ({ ...p, status: { ...p.status, atkMod: 0, defMod: 0, guard: false, talisman: false } })), st.items, resolveActiveUid(st.team, active()?.uid), finishCombatReport(st.team, st.xpReport), st.nodeModifiers, st.temporaryItemsUsed);
        return;
      }
    }
    if (active().hp === 0) {
      st.phase = "forcedSwitch"; st.menu = "switch";
      await say("Scegli il prossimo giocatore!", 300); rr();
      return;
    }
    st.phase = "menu"; st.menu = "main"; rr();
  };

  const attack = async () => {
    if (st.phase !== "menu") return;
    sfx.confirm();
    st.triggerBanner = null;
    st.synergyCue = null;
    st.phase = "busy"; rr();
    const first = turnOrder(active(), enemy(), st.team);
    const second = first === "player" ? "enemy" : "player";
    await doAttack(first);
    const defender = first === "player" ? enemy() : active();
    if (defender.hp > 0) await doAttack(second);
    await afterAction();
  };

  const enemyFreeTurn = async () => {
    await doAttack("enemy");
    await afterAction();
  };

  const beginBattle = async (idx = st.active) => {
    if (st.phase !== "preBattle" || !st.team[idx] || st.team[idx].hp <= 0) return;
    st.active = idx;
    st.phase = "busy"; st.menu = "main";
    onActiveChange(st.team[idx].uid);
    await say(`Forza ${active().name}!`, 600);
    if (!mounted.current) return;
    st.phase = "menu"; rr();
  };

  const switchTo = async (idx) => {
    if (st.phase === "preBattle") { await beginBattle(idx); return; }
    if (!["menu", "forcedSwitch"].includes(st.phase)) return;
    if (idx === st.active || st.team[idx].hp === 0) return;
    const forced = st.phase === "forcedSwitch";
    sfx.confirm();
    st.triggerBanner = null;
    st.synergyCue = null;
    st.phase = "busy"; st.menu = "main";
    st.active = idx;
    await say(`Entra in campo ${active().name}!`, 700);
    if (forced) { st.phase = "menu"; rr(); return; }
    await enemyFreeTurn();
  };

  const flee = async () => {
    if (encounter.kind === "boss" || encounter.kind === "miniboss") { await say("Non puoi fuggire da questo scontro decisivo!", 700); return; }
    sfx.cancel();
    st.phase = "busy"; rr();
    const ok = chance(45 + Math.max(-30, Math.min(30, (active().spd - enemy().spd) * 2)));
    if (ok) { await say("Siete fuggiti con successo!", 900); st.phase = "end"; rr(); onFlee(st.team, st.items, active()?.uid, finishCombatReport(st.team, st.xpReport), st.nodeModifiers, st.temporaryItemsUsed); return; }
    await say("La fuga è fallita!", 700);
    await enemyFreeTurn();
  };

  if (st.active < 0) return <div role="status">Nessun giocatore disponibile. La run è terminata.</div>;

  const p = active();
  const e = enemy();
  const synergies = activeSynergies(st.team);
  const tier = getEncounterTier(encounter);
  const teamAccent = resolveTeamAccent(encounter.teamName, encounter.teamTags);
  const theme = resolveScenarioTheme(run.scenarioState?.id, run.segmentState?.routeTheme);
  const segment = run.segmentState;
  const enemyCaptain = encounter.enemies.find((q) => q.isCaptain);

  const endIntro = () => {
    if (st.phase === "intro") {
      st.phase = "preBattle";
      rr();
    }
  };

  return (
    <div data-testid="battle-screen" className="battle-milestone flex flex-col flex-1 relative">
      {st.phase === "intro" && (
        <EncounterIntroModal encounter={encounter} run={run} onProceed={endIntro} />
      )}

      {/* Row 1: Wave, Segment progress, Opponent dots */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111827] border-b-2 border-slate-800 text-[8px] font-pixel">
        <span data-testid="wave-counter-badge" className="text-amber-300">ONDATA {run.wave}</span>
        {segment ? (
          <span data-testid="battle-segment-badge" className="text-slate-400">
            SEG {segment.segmentIndex} · PASSO {segment.step}/{segment.length} · <span className="text-sky-300">{segment.routeTitle || "Standard"}</span>
          </span>
        ) : (
          <span data-testid="battle-segment-badge" className="text-slate-400">FASE NORMALE</span>
        )}
        <Dots team={st.enemies} active={st.eIdx} />
      </div>

      {/* Row 2: Encounter Tier badge, Team Name, Captain badge */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b-4 ${tier.borderClass} ${tier.headerBg}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span data-testid="encounter-tier-badge" className={`font-pixel text-[8px] px-1.5 py-0.5 rounded border ${tier.badgeClass}`}>
            {tier.shortLabel}
          </span>
          <span data-testid="battle-team-name" className="font-pixel text-[9px] text-white uppercase truncate">
            {encounter.teamName || teamAccent.displayName}
          </span>
        </div>
        {enemyCaptain && (
          <span data-testid="battle-captain-badge" className="font-pixel text-[7px] text-amber-300 bg-amber-950/80 border border-amber-400 px-1 py-0.5 rounded shrink-0">
            CAP: {enemyCaptain.name}
          </span>
        )}
      </div>

      {/* Battle Arena */}
      <div className={`relative flex flex-col justify-between gap-3 p-3 battle-bg battle-theme-${theme} ${tier.glowClass}`}>
        <Fighter p={e} side="enemy" hit={st.hit === "enemy"} cue={st.cue} />
        <Fighter p={p} side="player" hit={st.hit === "player"} cue={st.cue} />
      </div>

      {/* Trigger item feedback banner */}
      {st.triggerBanner && (
        <div data-testid="battle-trigger-banner" className={`mx-3 mt-2 p-2 rounded border-2 shadow-lg flex items-center gap-2 battle-trigger-banner ${st.triggerBanner.color}`}>
          <span className="text-lg shrink-0">{st.triggerBanner.icon}</span>
          <div className="min-w-0">
            <div className="font-pixel text-[8px] font-bold">{st.triggerBanner.title}</div>
            <div className="font-body text-xs opacity-90">{st.triggerBanner.subtitle}</div>
          </div>
        </div>
      )}

      {/* Synergy feedback cue */}
      {st.synergyCue && (
        <div data-testid="battle-synergy-cue" className="mx-3 mt-1 px-2 py-1 bg-violet-950/90 border border-violet-500 rounded font-pixel text-[8px] text-violet-200 flex items-center justify-between animate-fade-1">
          <span>★ {st.synergyCue}</span>
        </div>
      )}

      {/* Victory headline banner */}
      {st.victoryHeadline && st.phase === "end" && (
        <div data-testid="battle-victory-headline" className="mx-3 mt-2 p-2 rounded border-2 border-amber-400 bg-amber-950/90 text-amber-200 font-pixel text-[10px] text-center shadow-lg">
          🏆 {st.victoryHeadline} 🏆
        </div>
      )}

      {synergies.length > 0 && (
        <div data-testid="battle-active-synergies" className="mx-3 mt-2 px-2 py-1 bg-[#0b101d]/90 border-2 border-violet-600 flex flex-wrap items-center justify-between gap-1">
          <span className="font-pixel text-[8px] text-violet-300">INTESE:</span>
          <div className="flex flex-wrap gap-2">
            {synergies.map((syn) => (
              <span key={syn.id} className="font-body text-xs text-slate-200 flex items-center gap-1">
                <span className={ELEMENTS[syn.element]?.text || "text-white"}>● {syn.label}</span>
                <span className="text-slate-400">({syn.shortDescription})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div data-testid="battle-log" className="mx-3 mt-2 bg-[#0b101d] border-4 border-slate-600 p-2 min-h-[84px] font-body text-lg leading-tight text-white">
        {st.log.slice(-3).map((m, i, arr) => (
          <div key={i} className={i === arr.length - 1 ? "text-white" : "text-slate-500"}>{m}{i === arr.length - 1 && st.phase !== "menu" ? <span className="blink">▼</span> : ""}</div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 pt-2">
        <Dots team={st.team} active={st.active} />
        <span className="font-body text-slate-400 text-sm">Squadra {st.team.filter((q) => q.hp > 0).length}/{st.team.length}</span>
      </div>

      <div className="p-3 mt-auto">
        {["preBattle", "menu", "busy"].includes(st.phase) && st.menu === "main" && (
          <div className="battle-decision mb-3" data-testid="battle-decision">
            <div className="grid grid-cols-2 gap-2">
              <section className="min-w-0 p-2 border border-sky-700 bg-slate-950" aria-label="La tua tecnica">
                <h3 className="font-pixel text-[8px] text-sky-300 mb-2">LA TUA TECNICA</h3>
                <MoveInfo move={p.move} /><MatchupBadge attacker={p} defender={e} showNeutral />
                {p.status.talisman && <p className="font-body text-sm text-amber-200">Talismano: prossimo colpo</p>}
              </section>
              <section className="min-w-0 p-2 border border-orange-800 bg-slate-950" aria-label="Tecnica avversaria">
                <h3 className="font-pixel text-[8px] text-orange-300 mb-2">AVVERSARIO</h3>
                <MoveInfo move={e.move} /><MatchupBadge attacker={e} defender={p} showNeutral />
              </section>
            </div>
            <p className="font-body text-sm text-slate-400 mt-1">Efficacia elementale, non danno previsto.</p>
          </div>
        )}
        {st.phase === "preBattle" && st.menu === "main" && (
          <div className="space-y-2" data-testid="pre-battle-prompt">
            <p className="font-body text-lg">Vuoi mantenere {p.name} in campo?</p>
            <div className="grid grid-cols-2 gap-2">
              <Btn data-testid="pre-battle-keep" variant="primary" onClick={() => beginBattle()}>Mantieni</Btn>
              <Btn data-testid="pre-battle-change" onClick={() => { st.menu = "switch"; rr(); }}>Cambia</Btn>
            </div>
            <p className="font-body text-sm text-slate-400">Questa scelta non consuma un turno.</p>
          </div>
        )}
        {(st.phase === "menu" || st.phase === "forcedSwitch") && st.menu === "main" && (
          <div className="grid grid-cols-2 gap-2">
            <Btn data-testid="attack-button" variant="primary" onClick={attack} className="col-span-2 flex flex-wrap items-center justify-center gap-2">
              <ElementIcon element={p.move.element} size={14} /> {p.move.name} <MatchupBadge attacker={p} defender={e} />
              <span className="text-[8px] opacity-70">POT {p.move.power}</span>
            </Btn>
            <Btn data-testid="switch-button" onClick={() => { sfx.select(); st.menu = "switch"; rr(); }}>Cambia</Btn>
            <Btn data-testid="flee-button" variant="ghost" onClick={flee} disabled={encounter.kind === "boss" || encounter.kind === "miniboss"}>Fuggi</Btn>
          </div>
        )}
        {(st.phase === "menu" || st.phase === "forcedSwitch" || st.phase === "preBattle") && st.menu === "switch" && (
          <div className="space-y-2">
            {st.team.map((q, i) => (
              <PlayerCard key={q.uid} p={q} compact selected={i === st.active} testId={`switch-player-btn-${i}`} onClick={() => switchTo(i)} right={q.hp > 0 ? <MatchupBadge attacker={q} defender={e} compact /> : null} />
            ))}
            {(st.phase === "menu" || st.phase === "preBattle") && <Btn data-testid="switch-cancel" variant="ghost" className="w-full" onClick={() => { sfx.cancel(); st.menu = "main"; rr(); }}>Indietro</Btn>}
          </div>
        )}
        {(st.phase === "busy" || st.phase === "intro" || st.phase === "end") && (
          <div className="grid grid-cols-2 gap-2 opacity-40 pointer-events-none">
            <Btn variant="primary" className="col-span-2">...</Btn>
            <Btn>Cambia</Btn><Btn>Fuggi</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
