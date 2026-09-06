import { useState } from "react";
import { fusePlayers } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, PlayerCard, StatLine } from "./ui";
import { Dna } from "lucide-react";

export default function FusionScreen({ run, onFuse, onBack }) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [moveFrom, setMoveFrom] = useState("a");
  const tap = (i) => {
    sfx.select();
    if (a === i) return setA(null);
    if (b === i) return setB(null);
    if (a === null) return setA(i);
    if (b === null) return setB(i);
  };
  const preview = a !== null && b !== null ? fusePlayers(run.team[a], run.team[b], moveFrom) : null;
  return (
    <div data-testid="fusion-screen" className="flex flex-col flex-1">
      <Header title="Cuneo DNA" sub="Fondi due calciatori in uno" right={<Btn variant="ghost" data-testid="fusion-back-btn" onClick={onBack}>Indietro</Btn>} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <Panel className="font-body text-lg text-pink-200 leading-tight border-pink-500 flex gap-2 items-center">
          <Dna className="text-pink-400 shrink-0" />
          <span>Il nuovo giocatore avrà statistiche medie +15%, il livello più alto dei due, l'elemento e la mossa che scegli. I due originali scompaiono.</span>
        </Panel>
        <div className="space-y-2">
          {run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact selected={a === i || b === i} testId={`fusion-pick-${i}`} onClick={() => tap(i)}
            right={a === i ? <span className="font-pixel text-[8px] text-pink-400">A</span> : b === i ? <span className="font-pixel text-[8px] text-pink-400">B</span> : null} />)}
        </div>
        {preview && (
          <div className="space-y-2 border-4 border-pink-500 p-2 bg-pink-950/30 animate-fade-1">
            <div className="font-pixel text-[9px] text-pink-300 uppercase">Anteprima fusione</div>
            <div className="grid grid-cols-2 gap-2">
              <Btn data-testid="fusion-move-a" variant={moveFrom === "a" ? "fusion" : "default"} onClick={() => setMoveFrom("a")}>{run.team[a].move.name}<br /><span className="opacity-70">({run.team[a].element})</span></Btn>
              <Btn data-testid="fusion-move-b" variant={moveFrom === "b" ? "fusion" : "default"} onClick={() => setMoveFrom("b")}>{run.team[b].move.name}<br /><span className="opacity-70">({run.team[b].element})</span></Btn>
            </div>
            <PlayerCard p={preview} testId="fusion-preview-card" />
            <StatLine p={preview} />
            <Btn data-testid="fusion-confirm-btn" variant="fusion" className="w-full" onClick={() => { sfx.fusion(); onFuse(a, b, moveFrom); }}>Fondi il DNA!</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
