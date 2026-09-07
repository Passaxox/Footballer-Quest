import { useState } from "react";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel } from "./ui";

const pickOutcome = (outcomes) => {
  let x = Math.random() * outcomes.reduce((s, o) => s + o.chance, 0);
  return outcomes.find((o) => (x -= o.chance) < 0) || outcomes[outcomes.length - 1];
};

export default function EventScreen({ run, event, onChoose, onResolve }) {
  const [result, setResult] = useState(run.pending.result || null);
  const choose = (c) => {
    sfx.confirm();
    const chosen = pickOutcome(c.outcomes);
    onChoose(chosen);
    setResult(chosen);
  };
  return (
    <div data-testid="event-screen" className="flex flex-col flex-1">
      <Header title="Evento" sub={`Ondata ${run.wave}`} />
      <div className="p-3 flex-1 flex flex-col gap-3">
        <div className="event-art border-4 border-slate-600 h-28 flex items-end p-3">
          <h2 className="font-pixel text-sm text-amber-300 drop-shadow-[2px_2px_0_#000]">{event.title}</h2>
        </div>
        <Panel className="font-body text-xl leading-tight text-white">
          {result ? <span data-testid="event-result-text">{result.text}</span> : event.text}
        </Panel>
        <div className="mt-auto space-y-2">
          {!result && event.choices.map((c, i) => (
            <Btn key={i} data-testid={`event-choice-${i}`} className="w-full text-left normal-case" disabled={c.cost && run.money < c.cost} onClick={() => choose(c)}>
              ▶ {c.label}{c.cost && run.money < c.cost ? " (Prestigio insufficiente)" : ""}
            </Btn>
          ))}
          {result && <Btn data-testid="event-continue-btn" variant="primary" className="w-full" onClick={() => onResolve(result)}>Continua</Btn>}
        </div>
      </div>
    </div>
  );
}
