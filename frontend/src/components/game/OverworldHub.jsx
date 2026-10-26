import { Coins } from "lucide-react";
import { DIFFICULTIES, getRules } from "@/game/rules";
import { glory } from "@/game/engine";
import { environmentFor } from "@/game/overworldPresentation";
import { XpReport } from "./ui";
import OverworldMap from "./OverworldMap";

export default function OverworldHub({ run, onNext, onSelectNode, onTeam, onPause, onAbandon }) {
  const living = run.team.filter(p => p.hp > 0).length;
  return <div className="ow-hub" data-testid="hub-screen">
    <header className="ow-hud">
      <div><strong>W{run.wave} / 10</strong><small data-testid="run-scenario">{environmentFor(run).name}</small></div>
      <span className="ow-hud-money" data-testid="money-display"><Coins size={16} />{run.money}</span>
      <div><strong>{living}/{run.team.length}</strong><small>in campo</small></div>
    </header>
    <OverworldMap run={run} onSelect={onSelectNode} onResume={onNext} />
    <nav className="ow-tools" aria-label="Gestione run">
      <button type="button" data-testid="team-btn" onClick={onTeam}>Squadra e zaino</button>
      <button type="button" data-testid="pause-run-btn" onClick={onPause}>Salva e pausa</button>
    </nav>
    <details className="ow-details"><summary>Diario della squadra</summary>
      <p data-testid="run-difficulty">{DIFFICULTIES[getRules(run.rulesetId).difficultyId].label}</p>
      <p>Gloria {glory(run)} · Vittorie {run.stats.wins} · Reclutati {run.stats.recruits}</p>
      <XpReport report={!run.pending ? run.lastProgression?.report : null} />
      <button type="button" data-testid="abandon-btn" onClick={onAbandon}>Abbandona la run</button>
    </details>
  </div>;
}
