import { useState } from "react";
import { fusePlayers, fusionUsed } from "@/game/engine";
import { playerTeamIds, traitLabelFor } from "@/game/traits";
import { TEAMS } from "@/game/catalogMetadata";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, PlayerCard, MoveInfo } from "./ui";
import { ROLES } from "@/game/data";
import { Dna } from "lucide-react";

const teamLabel = (p) => {
  const id = playerTeamIds(p)[0];
  return id ? `${TEAMS.find((t) => t.teamId === id)?.displayName || id} (${traitLabelFor(id) || "nessuna sinergia"})` : "Nessuna squadra";
};

export default function FusionScreen({ run, onFuse, onBack }) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [moveFrom, setMoveFrom] = useState("a");
  const used = fusionUsed(run);
  const tap = (i) => {
    if (run.team[i].fused || used) return;
    sfx.select();
    if (a === i) return setA(null);
    if (b === i) return setB(null);
    if (a === null) return setA(i);
    if (b === null) return setB(i);
  };
  const pa = run.team[a];
  const pb = run.team[b];
  const preview = !used && pa && pb && a !== b && !pa.fused && !pb.fused ? fusePlayers(pa, pb, moveFrom) : null;
  return (
    <div data-testid="fusion-screen" className="flex flex-col flex-1">
      <Header title="Cuneo DNA" sub="Fusione · una sola volta per run" right={<Btn variant="ghost" data-testid="fusion-back-btn" onClick={onBack}>Indietro</Btn>} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <Panel className="font-body text-lg text-pink-200 leading-tight border-pink-500 flex gap-2 items-center">
          <Dna className="text-pink-400 shrink-0" />
          <span>Scegli prima il giocatore BASE (A, mantenuto) e poi il DONATORE (B, assorbito). Statistiche base medie +15%, bonus sommati. Il base mantiene nome, ruolo e squadra-sinergia; puoi fargli ereditare la tecnica del donatore. Si libera uno slot in squadra.</span>
        </Panel>
        {used && <p data-testid="fusion-used-msg" className="font-body text-amber-300">Hai già usato la Fusione in questa run.</p>}
        {!used && run.team.filter((p) => !p.fused).length < 2 && <p className="font-body text-amber-300">Servono almeno due giocatori non ancora fusi.</p>}
        <div className="space-y-2">
          {run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact selected={a === i || b === i} testId={`fusion-pick-${i}`} onClick={p.fused || used ? undefined : () => tap(i)}
            right={<span className="font-body text-pink-300">{p.fused ? "Già fuso" : a === i ? "A · Base" : b === i ? "B · Donatore" : ""}</span>} />)}
        </div>
        {preview && (
          <div className="space-y-2 border-4 border-pink-500 p-2 bg-pink-950/30 animate-fade-1">
            <div className="font-pixel text-[9px] text-pink-300 uppercase">Anteprima fusione</div>
            <p data-testid="fusion-kept-info" className="font-body text-slate-200">Mantenuto: <b className="text-white">{pa.name}</b> · Assorbito: {pb.name}</p>
            <p data-testid="fusion-synergy-info" className="font-body text-sm text-amber-200">Sinergia ereditata: {teamLabel(pa)}</p>
            <table className="w-full font-body text-sm text-center" data-testid="fusion-stat-preview">
              <thead><tr><th>Stat</th><th>A</th><th>B</th><th>Risultato</th></tr></thead>
              <tbody>{[["HP max", "maxHp"], ["ATK", "atk"], ["DIF", "def"], ["VEL", "spd"]].map(([label, key]) => (
                <tr key={key} className="border-t border-slate-700"><th>{label}</th><td>{pa[key]}</td><td>{pb[key]}</td><td className="py-1">{preview[key]}
                  {[pa, pb].map((parent, i) => { const delta = preview[key] - parent[key]; return <div key={i} className={delta > 0 ? "text-emerald-300" : delta < 0 ? "text-red-300" : "text-slate-400"}>vs {i === 0 ? "A" : "B"}: {delta > 0 ? "+" : ""}{delta}</div>; })}
                </td></tr>
              ))}</tbody>
            </table>
            <div className="font-pixel text-[8px] text-pink-300">TECNICA DA EREDITARE</div>
            <div className="grid grid-cols-2 gap-2">
              <Btn data-testid="fusion-move-a" variant={moveFrom === "a" ? "fusion" : "default"} onClick={() => setMoveFrom("a")}><span>A · Mantieni la propria</span><MoveInfo move={pa.move} /></Btn>
              <Btn data-testid="fusion-move-b" variant={moveFrom === "b" ? "fusion" : "default"} onClick={() => setMoveFrom("b")}><span>B · Eredita dal donatore</span><MoveInfo move={pb.move} /></Btn>
            </div>
            <PlayerCard p={preview} testId="fusion-preview-card" />
            <p data-testid="fusion-slot-info" className="font-body text-emerald-300">Slot squadra: {run.team.length}/6 → {run.team.length - 1}/6 (si libera un posto).</p>
            <p className="font-body text-amber-200">Livello risultante: {preview.level} (il maggiore). EXP residua azzerata. HP ripristinati completamente. Ruolo da A: {ROLES[pa.role]}. Elemento: {pa.element}.</p>
            <Btn data-testid="fusion-confirm-btn" variant="fusion" className="w-full" disabled={!(run.items.cuneo > 0)} onClick={() => { sfx.fusion(); onFuse(a, b, moveFrom); }}>Fondi il DNA!</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
