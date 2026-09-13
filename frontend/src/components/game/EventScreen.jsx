import { sfx } from "@/game/audio";
import { Btn, Header, Panel } from "./ui";
import { RARITIES } from "@/game/rarity";
import { resolveTeamAccent } from "@/game/presentation";

export default function EventScreen({ run, event, onChoose, onResolve }) {
  const result = run?.pending?.result || null;
  const visual = event.presentation;
  const teamAccent = event.scenarioIds?.[0] ? resolveTeamAccent(event.title, [event.scenarioIds[0]]) : null;

  const choose = (choiceIndex) => {
    sfx.confirm();
    onChoose(choiceIndex);
  };

  const getChoiceTag = (choice) => {
    if (choice.cost && (run?.money ?? 0) < choice.cost) return { label: "Prestigio insufficiente", class: "text-rose-400 border-rose-500/60 bg-rose-950/40" };
    const effects = choice.outcomes?.flatMap(o => o.effects || []) || [];
    if (effects.some(e => e.type === "startEncounter")) return { label: "Battaglia", class: "text-amber-300 border-amber-500/60 bg-amber-950/40" };
    if (effects.some(e => e.type === "offerRecruit")) return { label: "Reclutamento", class: "text-violet-300 border-violet-500/60 bg-violet-950/40" };
    if (effects.some(e => e.type === "healTeam")) return { label: "Recupero", class: "text-emerald-300 border-emerald-500/60 bg-emerald-950/40" };
    if (effects.some(e => e.type === "damageTeam")) return { label: "Rischio HP", class: "text-rose-300 border-rose-500/60 bg-rose-950/40" };
    if (effects.some(e => e.type === "grantItem")) return { label: "Oggetto", class: "text-sky-300 border-sky-500/60 bg-sky-950/40" };
    if (effects.some(e => e.type === "grantCurrency")) return { label: "Prestigio", class: "text-amber-300 border-amber-500/60 bg-amber-950/40" };
    if (effects.some(e => e.type === "temporaryModifier")) return { label: "Effetto Tattico", class: "text-cyan-300 border-cyan-500/60 bg-cyan-950/40" };
    return null;
  };

  return (
    <div data-testid="event-screen" className="flex flex-col flex-1">
      <Header title="Evento" sub={`Ondata ${run.wave} · Seed ${run.seed}`} />
      <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
        <div data-testid="event-presentation" className={`event-art border-4 ${visual.accentClass} min-h-32 p-3 bg-gradient-to-br ${visual.panelClass} flex items-center gap-4 shadow-lg rounded-sm`}>
          <div aria-hidden="true" className="w-16 h-16 shrink-0 border-2 border-current bg-slate-950/80 flex items-center justify-center text-4xl text-amber-300 shadow-inner">{visual.symbol}</div>
          <div className="min-w-0">
            <div className="font-pixel text-[8px] uppercase text-slate-300 mb-1 flex items-center gap-1.5 flex-wrap">
              <span>{visual.hint}</span>
              <span>·</span>
              <span className="text-sky-300">{event.scenarioIds?.length ? getScenarioLabel(run) : "In viaggio"}</span>
              {teamAccent && teamAccent.shortLabel !== "Sfida" && (
                <span className={`px-1 py-0.2 rounded border font-bold ${teamAccent.tagBadge}`}>
                  {teamAccent.shortLabel}
                </span>
              )}
            </div>
            <h2 className="font-pixel text-sm text-amber-300 drop-shadow-[2px_2px_0_#000] leading-relaxed">{event.title}</h2>
          </div>
        </div>
        <div className="flex justify-between items-center font-pixel text-[8px] uppercase tracking-wide">
          <span className="text-slate-400 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded">{event.category}</span>
          <span className={`px-1.5 py-0.5 rounded border border-current/40 ${RARITIES[event.rarity].accentClass}`}>{RARITIES[event.rarity].label}</span>
        </div>
        <Panel className="font-body text-xl leading-tight text-white min-h-[96px]">
          {result ? <span data-testid="event-result-text">{result.text}</span> : event.body}
        </Panel>
        <div className="mt-auto space-y-2">
          {!result && event.choices.map((c, i) => {
            const tag = getChoiceTag(c);
            return (
              <Btn key={i} data-testid={`event-choice-${i}`} className="w-full min-h-[52px] text-left normal-case whitespace-normal leading-tight" disabled={c.cost && (run?.money ?? 0) < c.cost} onClick={() => choose(i)}>
                <div className="flex items-center justify-between gap-2">
                  <span>▶ {c.label}{c.cost && (run?.money ?? 0) < c.cost ? " (Prestigio insufficiente)" : ""}</span>
                  {tag && <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border shrink-0 ${tag.class}`}>{tag.label}</span>}
                </div>
              </Btn>
            );
          })}
          {result && <Btn data-testid="event-continue-btn" variant="primary" className="w-full min-h-[52px]" onClick={onResolve}>Continua</Btn>}
        </div>
      </div>
    </div>
  );
}

const getScenarioLabel = run => run.scenarioState?.id?.replaceAll("-", " ") || "Scenario";
