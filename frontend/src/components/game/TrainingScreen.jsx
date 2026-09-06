import { useState } from "react";
import { gainXp, recalcStats } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, PlayerCard } from "./ui";

const DRILLS = [
  { id: "atk", label: "Tiri in porta", desc: "+4 ATK", apply: (p) => recalcStats({ ...p, bonus: { ...p.bonus, atk: p.bonus.atk + 4 } }) },
  { id: "def", label: "Placcaggi", desc: "+4 DIF", apply: (p) => recalcStats({ ...p, bonus: { ...p.bonus, def: p.bonus.def + 4 } }) },
  { id: "spd", label: "Scatti", desc: "+5 VEL", apply: (p) => recalcStats({ ...p, bonus: { ...p.bonus, spd: p.bonus.spd + 5 } }) },
  { id: "hp", label: "Resistenza", desc: "+12 HP max", apply: (p) => { const q = recalcStats({ ...p, bonus: { ...p.bonus, hp: p.bonus.hp + 12 } }); return { ...q, hp: Math.min(q.maxHp, q.hp + 12) }; } },
];

export default function TrainingScreen({ run, onDone }) {
  const [sel, setSel] = useState(null);
  const teamXp = () => { sfx.levelup(); onDone(run.team.map((p) => gainXp(p, 30).player)); };
  const drill = (d) => { sfx.levelup(); onDone(run.team.map((p, i) => (i === sel ? d.apply(p) : p))); };
  return (
    <div data-testid="training-screen" className="flex flex-col flex-1">
      <Header title="Allenamento Inazuma" sub="Coach Hillman vi osserva" />
      <div className="p-3 space-y-3 flex-1">
        <Panel className="font-body text-lg text-slate-200 leading-tight">Un campo libero e un pomeriggio intero. Allenate un singolo giocatore in modo mirato, oppure fate esperienza tutti insieme.</Panel>
        <Btn data-testid="training-team-xp" variant="primary" className="w-full" onClick={teamXp}>Partitella di squadra (+30 XP a tutti)</Btn>
        <div className="font-pixel text-[9px] text-slate-400 uppercase">Oppure allena un giocatore:</div>
        <div className="space-y-2">
          {run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact selected={sel === i} testId={`training-player-${i}`} onClick={() => { sfx.select(); setSel(i); }} />)}
        </div>
        {sel !== null && (
          <div className="grid grid-cols-2 gap-2">
            {DRILLS.map((d) => <Btn key={d.id} data-testid={`training-drill-${d.id}`} onClick={() => drill(d)}>{d.label}<br /><span className="text-amber-300">{d.desc}</span></Btn>)}
          </div>
        )}
      </div>
    </div>
  );
}
