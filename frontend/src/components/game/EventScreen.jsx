import { sfx } from "@/game/audio";
import { Btn, Header, Panel } from "./ui";
import { RARITIES } from "@/game/rarity";

export default function EventScreen({ run, event, onChoose, onResolve }) {
  const result = run.pending.result || null;
  const visual = event.presentation;
  const choose = (choiceIndex) => {
    sfx.confirm();
    onChoose(choiceIndex);
  };
  return (
    <div data-testid="event-screen" className="flex flex-col flex-1">
      <Header title="Evento" sub={`Ondata ${run.wave} · Seed ${run.seed}`} />
      <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
        <div data-testid="event-presentation" className={`event-art border-4 ${visual.accentClass} min-h-32 p-3 bg-gradient-to-br ${visual.panelClass} flex items-center gap-4`}>
          <div aria-hidden="true" className="w-16 h-16 shrink-0 border-2 border-current bg-slate-950/70 flex items-center justify-center text-4xl text-amber-300">{visual.symbol}</div>
          <div className="min-w-0">
            <div className="font-pixel text-[8px] uppercase text-slate-300 mb-2">{visual.hint} · {event.scenarioIds?.length ? getScenarioLabel(run) : "In viaggio"}</div>
            <h2 className="font-pixel text-sm text-amber-300 drop-shadow-[2px_2px_0_#000] leading-relaxed">{event.title}</h2>
          </div>
        </div>
        <div className="flex justify-between font-pixel text-[8px] uppercase tracking-wide">
          <span className="text-slate-400">{event.category}</span>
          <span className={RARITIES[event.rarity].accentClass}>{RARITIES[event.rarity].label}</span>
        </div>
        <Panel className="font-body text-xl leading-tight text-white min-h-[96px]">
          {result ? <span data-testid="event-result-text">{result.text}</span> : event.body}
        </Panel>
        <div className="mt-auto space-y-2">
          {!result && event.choices.map((c, i) => (
            <Btn key={i} data-testid={`event-choice-${i}`} className="w-full min-h-[52px] text-left normal-case whitespace-normal leading-tight" disabled={c.cost && run.money < c.cost} onClick={() => choose(i)}>
              ▶ {c.label}{c.cost && run.money < c.cost ? " (Prestigio insufficiente)" : ""}
            </Btn>
          ))}
          {result && <Btn data-testid="event-continue-btn" variant="primary" className="w-full min-h-[52px]" onClick={onResolve}>Continua</Btn>}
        </div>
      </div>
    </div>
  );
}

const getScenarioLabel = run => run.scenarioState?.id?.replaceAll("-", " ") || "Scenario";
