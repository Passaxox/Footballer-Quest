import { useState } from "react";
import { ROSTER, ELEMENTS } from "@/game/data";
import { createPlayer } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, PlayerCard, StatLine } from "./ui";

export default function TeamSelect({ meta, onStart, onBack }) {
  const [sel, setSel] = useState([]);
  const roster = ROSTER.filter((r) => meta.unlocked.includes(r.id));
  const toggle = (id) => {
    sfx.select();
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s));
  };
  return (
    <div data-testid="team-selection-screen" className="flex flex-col flex-1">
      <Header title="Scegli 3 titolari" sub={`${sel.length}/3 selezionati`} right={<Btn variant="ghost" data-testid="select-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        <div className="font-body text-slate-400 text-base leading-tight mb-2">
          Ricorda il ciclo elementale: <span className={ELEMENTS.aria.text}>Aria</span> &gt; <span className={ELEMENTS.terra.text}>Terra</span> &gt; <span className={ELEMENTS.fuoco.text}>Fuoco</span> &gt; <span className={ELEMENTS.natura.text}>Natura</span> &gt; <span className={ELEMENTS.aria.text}>Aria</span>
        </div>
        {roster.map((r) => {
          const p = createPlayer(r.id, 3);
          const on = sel.includes(r.id);
          return (
            <div key={r.id}>
              <PlayerCard p={p} selected={on} testId={`starter-${r.id}`} onClick={() => toggle(r.id)} />
              {on && <div className="border-2 border-t-0 border-amber-400 p-2 bg-[#0b101d]"><StatLine p={p} /></div>}
            </div>
          );
        })}
      </div>
      <div className="p-3 bg-[#111827] border-t-4 border-slate-800">
        <Btn data-testid="start-run-btn" variant="primary" className="w-full" disabled={sel.length !== 3} onClick={() => { sfx.win(); onStart(sel); }}>Inizia la Run</Btn>
      </div>
    </div>
  );
}
