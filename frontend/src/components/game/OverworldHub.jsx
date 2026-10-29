import { useEffect, useRef, useState } from "react";
import { Coins, Map as MapIcon, Backpack, BookOpen, Save, X } from "lucide-react";
import { DIFFICULTIES, getRules } from "@/game/rules";
import { glory } from "@/game/engine";
import { environmentFor } from "@/game/overworldPresentation";
import { XpReport } from "./ui";
import OverworldMap from "./OverworldMap";

export default function OverworldHub({ run, onNext, onSelectNode, onTeam, onPause, onAbandon }) {
  const [open, setOpen] = useState(false), closeRef = useRef(null), triggerRef = useRef(null);
  const close = () => setOpen(false);
  const closeToTrigger = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = e => { if (e.key === "Escape") closeToTrigger(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const living = run.team.filter(p => p.hp > 0).length;
  return <div className="ow-hub" data-testid="hub-screen">
    <header className="ow-hud">
      <div><strong>W{run.wave} / 10</strong><small data-testid="run-scenario">{environmentFor(run).name}</small></div>
      <span className="ow-hud-money" data-testid="money-display"><Coins size={16} />{run.money}</span>
      <div><strong>{living}/{run.team.length}</strong><small>in campo</small></div>
    </header>
    <div className="ow-stage">
      <OverworldMap run={run} onSelect={onSelectNode} onResume={onNext} />
      <aside className="ow-details" hidden={!open} role="dialog" aria-modal="false" aria-labelledby="ow-details-title" data-testid="details-panel">
        <div className="ow-details-head"><h2 id="ow-details-title">Diario della squadra</h2>
          <button type="button" ref={closeRef} className="ow-details-close" data-testid="details-close-btn" aria-label="Chiudi diario" onClick={closeToTrigger}><X size={22} /></button></div>
        <p data-testid="run-difficulty">{DIFFICULTIES[getRules(run.rulesetId).difficultyId].label}</p>
        <p>Gloria {glory(run)} · Vittorie {run.stats.wins} · Reclutati {run.stats.recruits}</p>
        <XpReport report={!run.pending ? run.lastProgression?.report : null} />
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
