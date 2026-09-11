import { getScenario } from "@/game/scenarios";
import { BOSSES, FINAL_WAVE } from "@/game/data";
import { glory } from "@/game/engine";
import { DIFFICULTIES, getRules } from "@/game/rules";
import { Btn, Header, Panel, PlayerCard, XpReport } from "./ui";
import { Coins, Backpack } from "lucide-react";

export default function HubScreen({ run, onNext, onTeam, onPause, onAbandon }) {
  const nextBoss = Object.keys(BOSSES).map(Number).find((w) => w >= run.wave);
  const isBoss = !!BOSSES[run.wave];
  const itemCount = Object.values(run.items).reduce((a, b) => a + b, 0);
  const pendingLabel = run.pending ? ({ battle: "Battaglia in corso", recruit: "Incontro", shop: "Mercante", training: "Allenamento", reward: "Ricompensa", event: "Evento" })[run.pending.type] : null;
  return (
    <div data-testid="hub-screen" className="flex flex-col flex-1">
      <Header title={`Ondata ${run.wave} / ${FINAL_WAVE}`} sub={isBoss ? `BOSS: ${BOSSES[run.wave].team}` : nextBoss ? `Prossimo boss all'ondata ${nextBoss}` : "Finale!"}
        right={<div className="flex items-center gap-1 font-pixel text-[9px] text-amber-300" data-testid="money-display"><Coins size={12} /> {run.money}</div>} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <div data-testid="run-difficulty" className="font-pixel text-[9px] text-sky-300">{DIFFICULTIES[getRules(run.rulesetId).difficultyId].label}</div>
        <div data-testid="run-seed" className="font-pixel text-[8px] text-slate-400 break-all">Seed: {run.seed}</div>
        <Panel className="font-body text-lg leading-tight text-slate-200">
          <div data-testid="run-scenario" className="text-amber-200 mb-2">{getScenario(run.scenarioState?.id).displayName}</div>
          {isBoss ? (
            <span className="text-red-400">Una squadra leggendaria vi attende. Preparatevi al meglio: dopo il boss la squadra sarà curata completamente.</span>
          ) : (
            <span>La strada verso il Football Frontier continua. Cosa vi aspetta alla prossima ondata? Una sfida, un mercante, un incontro inatteso...</span>
          )}
          {pendingLabel && <div className="mt-2 text-amber-300">→ {pendingLabel}: riprendi da dove avevi lasciato.</div>}
        </Panel>
        <div className="flex justify-between font-body text-slate-400 text-base">
          <span>Vittorie {run.stats.wins} · Reclutati {run.stats.recruits} · Fusioni {run.stats.fusions}</span>
          <span className="text-purple-300">Gloria {glory(run)}</span>
        </div>
        <XpReport report={!run.pending ? run.lastProgression?.report : null} />
        <div className="space-y-2">
          {run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact testId={`hub-player-${i}`} right={i === 0 ? <span className="font-pixel text-[7px] text-amber-300 border border-amber-400 px-1">CAP</span> : null} />)}
        </div>
      </div>
      <div className="p-3 bg-[#111827] border-t-4 border-slate-800 grid grid-cols-3 gap-2">
        <Btn data-testid="team-btn" onClick={onTeam} className="flex items-center justify-center gap-1"><Backpack size={14} /> Squadra ({itemCount})</Btn>
        <Btn data-testid="next-wave-btn" variant="primary" className="col-span-2" onClick={onNext}>{run.pending ? "Riprendi" : isBoss ? "Affronta il Boss" : "Avanti"}</Btn>
        <Btn data-testid="pause-run-btn" className="col-span-3" onClick={onPause}>Salva e torna al menu</Btn>
        <Btn data-testid="abandon-btn" variant="ghost" className="col-span-3 min-h-[36px] py-1 text-[8px]" onClick={onAbandon}>Abbandona la run</Btn>
      </div>
    </div>
  );
}
