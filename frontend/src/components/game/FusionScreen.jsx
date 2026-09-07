import { useState } from "react";
import { fusePlayers } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, PlayerCard, MoveInfo } from "./ui";
import { ROLES } from "@/game/data";
import { Dna } from "lucide-react";

export default function FusionScreen({ run, onFuse, onBack }) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [moveFrom, setMoveFrom] = useState("a");
  const tap = (i) => {
    if (run.team[i].fused) return;
    sfx.select();
    if (a === i) return setA(null);
    if (b === i) return setB(null);
    if (a === null) return setA(i);
    if (b === null) return setB(i);
  };
  const pa = run.team[a];
  const pb = run.team[b];
  const preview = pa && pb && a !== b && !pa.fused && !pb.fused ? fusePlayers(pa, pb, moveFrom) : null;
  return (
    <div data-testid="fusion-screen" className="flex flex-col flex-1">
      <Header title="Cuneo DNA" sub="Fondi due calciatori in uno" right={<Btn variant="ghost" data-testid="fusion-back-btn" onClick={onBack}>Indietro</Btn>} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <Panel className="font-body text-lg text-pink-200 leading-tight border-pink-500 flex gap-2 items-center">
          <Dna className="text-pink-400 shrink-0" />
          <span>Statistiche base medie +15%; i bonus si sommano. I due originali scompaiono. Un giocatore già fuso non può partecipare a un'altra fusione.</span>
        </Panel>
        {run.team.filter((p) => !p.fused).length < 2 && <p className="font-body text-amber-300">Servono almeno due giocatori non ancora fusi.</p>}
        <div className="space-y-2">
          {run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact selected={a === i || b === i} testId={`fusion-pick-${i}`} onClick={p.fused ? undefined : () => tap(i)}
            right={<span className="font-body text-pink-300">{p.fused ? "Già fuso" : a === i ? "A" : b === i ? "B" : ""}</span>} />)}
        </div>
        {preview && (
          <div className="space-y-2 border-4 border-pink-500 p-2 bg-pink-950/30 animate-fade-1">
            <div className="font-pixel text-[9px] text-pink-300 uppercase">Anteprima fusione</div>
            <p className="font-body text-slate-300">A: {pa.name} · B: {pb.name}</p>
            <table className="w-full font-body text-sm text-center" data-testid="fusion-stat-preview">
              <thead><tr><th>Stat</th><th>A</th><th>B</th><th>Risultato</th></tr></thead>
              <tbody>{[["HP max", "maxHp"], ["ATK", "atk"], ["DIF", "def"], ["VEL", "spd"]].map(([label, key]) => (
                <tr key={key} className="border-t border-slate-700"><th>{label}</th><td>{pa[key]}</td><td>{pb[key]}</td><td className="py-1">{preview[key]}
                  {[pa, pb].map((parent, i) => { const delta = preview[key] - parent[key]; return <div key={i} className={delta > 0 ? "text-emerald-300" : delta < 0 ? "text-red-300" : "text-slate-400"}>vs {i === 0 ? "A" : "B"}: {delta > 0 ? "+" : ""}{delta}</div>; })}
                </td></tr>
              ))}</tbody>
            </table>
            <div className="grid grid-cols-2 gap-2">
              <Btn data-testid="fusion-move-a" variant={moveFrom === "a" ? "fusion" : "default"} onClick={() => setMoveFrom("a")}><span>A · Giocatore: {pa.element}</span><MoveInfo move={pa.move} /></Btn>
              <Btn data-testid="fusion-move-b" variant={moveFrom === "b" ? "fusion" : "default"} onClick={() => setMoveFrom("b")}><span>B · Giocatore: {pb.element}</span><MoveInfo move={pb.move} /></Btn>
            </div>
            <PlayerCard p={preview} testId="fusion-preview-card" />
            <p className="font-body text-amber-200">Livello risultante: {preview.level} (il maggiore). EXP residua azzerata. HP ripristinati completamente, anche se un originale è KO. Ruolo da A: {ROLES[pa.role]}.</p>
            <Btn data-testid="fusion-confirm-btn" variant="fusion" className="w-full" disabled={!(run.items.cuneo > 0)} onClick={() => { sfx.fusion(); onFuse(a, b, moveFrom); }}>Fondi il DNA!</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
