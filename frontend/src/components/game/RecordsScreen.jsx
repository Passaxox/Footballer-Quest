import { useEffect, useState } from "react";
import axios from "axios";
import { Btn, Header, Panel } from "./ui";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function RecordsScreen({ meta, onBack }) {
  const [global, setGlobal] = useState(null);
  useEffect(() => {
    axios.get(`${API}/leaderboard`).then((r) => setGlobal(r.data)).catch(() => setGlobal([]));
  }, []);
  const local = [...meta.records].sort((a, b) => b.glory - a.glory).slice(0, 10);
  return (
    <div data-testid="records-screen" className="flex flex-col flex-1">
      <Header title="Albo d'Oro" sub="Le tue run e la classifica globale" right={<Btn variant="ghost" data-testid="records-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 space-y-3 overflow-y-auto">
        <div className="font-pixel text-[9px] text-amber-300 uppercase">Le tue run</div>
        {local.length === 0 && <div className="font-body text-slate-500 text-lg">Nessuna run completata.</div>}
        {local.map((r, i) => (
          <Panel key={i} data-testid={`local-record-${i}`} className="font-body text-lg leading-tight flex justify-between">
            <div><span className={r.result === "win" ? "text-emerald-400" : "text-slate-300"}>{r.result === "win" ? "VITTORIA" : `Ondata ${r.wave}`}</span><div className="text-slate-500 text-sm">{r.team.join(", ")}</div></div>
            <div className="text-purple-300 font-pixel text-xs">{r.glory}</div>
          </Panel>
        ))}
        <div className="font-pixel text-[9px] text-sky-300 uppercase mt-4">Classifica globale</div>
        {global === null && <div className="font-body text-slate-500 text-lg">Caricamento...</div>}
        {global && global.length === 0 && <div className="font-body text-slate-500 text-lg">Nessun punteggio ancora.</div>}
        {global && global.map((r, i) => (
          <div key={r.id} data-testid={`global-record-${i}`} className="flex items-center gap-2 p-2 border-2 border-slate-700 bg-[#141c2e] font-body text-lg">
            <span className="font-pixel text-[9px] text-amber-300 w-6">{i + 1}.</span>
            <span className="flex-1 truncate text-white">{r.nickname}</span>
            <span className="text-slate-400 text-sm">Ond. {r.wave}</span>
            <span className="text-purple-300 font-pixel text-xs">{r.glory}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
