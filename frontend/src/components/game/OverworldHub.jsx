import { useEffect, useRef, useState } from "react";
import { Coins, Map as MapIcon, Backpack, BookOpen, Save, X } from "lucide-react";
import { DIFFICULTIES, getRules } from "@/game/rules";
import { glory } from "@/game/engine";
import { actForWave } from "@/game/campaign";
import { computeTeamSynergies } from "@/game/traits";
import { Avatar } from "./ui";
import { ActIntro, JourneyLog } from "./StoryScreen";
import { PERK_BY_ID, RARITIES, perkText } from "@/game/perks";
import { XpReport } from "./ui";
import OverworldMap from "./OverworldMap";

export default function OverworldHub({ run, onNext, onSelectNode, onTeam, onPause, onAbandon, onIntroSeen }) {
  const [open, setOpen] = useState(false), closeRef = useRef(null), triggerRef = useRef(null);
  const [perkTip, setPerkTip] = useState(null);
  const close = () => setOpen(false);
  const closeToTrigger = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = e => { if (e.key === "Escape") closeToTrigger(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const act = actForWave(run.wave);
  if (!run.pending && (run.overworld.introSeen || 0) < act.index) return <ActIntro run={run} act={act} onStart={() => onIntroSeen(act.index)} />;
  const synergies = computeTeamSynergies(run.team).slice(0, 4);
  return <div className={`ow-hub ow-${act.palette}`} data-testid="hub-screen">
    <header className="ow-hud">
      <div><strong data-testid="hub-wave">W{run.wave} / 50</strong><small data-testid="run-scenario">Atto {act.index} · {act.title}</small></div>
      <span className="ow-hud-money" data-testid="money-display"><Coins size={16} />{run.money}</span>
      <div className="ow-teambar" data-testid="hud-team">{run.team.map((p) => <div key={p.uid} className="ow-teambar-slot" title={`${p.name} Lv${p.level}`}>
        <Avatar p={p} size={32} ko={p.hp === 0} /><div className="ow-teambar-hp"><i style={{ width: `${p.hp / p.maxHp * 100}%`, background: p.hp / p.maxHp < 0.3 ? "#ef4444" : "#22c55e" }} /></div></div>)}</div>
      {(run.perks || []).length > 0 && <div className="ow-traits" data-testid="hud-perks">{run.perks.map((p) => <button key={p.id} type="button" data-testid={`hud-perk-${p.id}`}
        style={{ borderColor: RARITIES[PERK_BY_ID[p.id].rarity].color, color: RARITIES[PERK_BY_ID[p.id].rarity].color }} className="ow-perk-chip" onClick={() => setPerkTip(perkTip === p.id ? null : p.id)}>
        {PERK_BY_ID[p.id].name} {["", "I", "II", "III"][p.level]}</button>)}</div>}
      {perkTip && <div className="ow-perk-banner" role="status" data-testid="hud-perk-banner" onClick={() => setPerkTip(null)}><b>{PERK_BY_ID[perkTip].name}</b>{perkText(perkTip, run.perks.find((p) => p.id === perkTip)?.level || 1)}</div>}
      {synergies.length > 0 && <div className="ow-traits" data-testid="hud-traits">{synergies.map((x) => <span key={x.teamId} className={x.tier ? "on" : ""}>{x.traitLabel} {x.points}/{x.nextThreshold ?? x.points} T{x.tier}</span>)}</div>}
    </header>
    <div className="ow-stage">
      <OverworldMap run={run} onSelect={onSelectNode} onResume={onNext} />
      <aside className="ow-details" hidden={!open} role="dialog" aria-modal="false" aria-labelledby="ow-details-title" data-testid="details-panel">
        <div className="ow-details-head"><h2 id="ow-details-title">Diario della squadra</h2>
          <button type="button" ref={closeRef} className="ow-details-close" data-testid="details-close-btn" aria-label="Chiudi diario" onClick={closeToTrigger}><X size={22} /></button></div>
        <p data-testid="run-difficulty">{DIFFICULTIES[getRules(run.rulesetId).difficultyId].label}</p>
        <p>Gloria {glory(run)} · Vittorie {run.stats.wins} · Reclutati {run.stats.recruits}</p>
        <XpReport report={!run.pending ? run.lastProgression?.report : null} />
        <JourneyLog run={run} />
        <button type="button" data-testid="abandon-btn" className="ow-abandon" onClick={onAbandon}>Abbandona la run</button>
      </aside>
    </div>
    <nav className="ow-tools" aria-label="Navigazione principale">
      <button type="button" data-testid="nav-map-btn" aria-current={open ? undefined : "page"} onClick={close}><MapIcon size={20} aria-hidden="true" /><span>Mappa</span></button>
      <button type="button" data-testid="team-btn" aria-label="Squadra e zaino" title="Squadra e zaino" onClick={onTeam}><Backpack size={20} aria-hidden="true" /><span>Squadra</span></button>
      <button type="button" ref={triggerRef} data-testid="details-btn" aria-label="Dettagli / Diario" aria-expanded={open} aria-current={open ? "page" : undefined} onClick={() => setOpen(o => !o)}><BookOpen size={20} aria-hidden="true" /><span>Diario</span></button>
      <button type="button" data-testid="pause-run-btn" aria-label="Salva e pausa" onClick={onPause}><Save size={20} aria-hidden="true" /><span>Pausa</span></button>
    </nav>
  </div>;
}
