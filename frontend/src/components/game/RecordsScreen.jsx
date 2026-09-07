import { useEffect, useState } from "react";
import axios from "axios";
import { Btn, Header, Panel } from "./ui";

const backendUrl = () => (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/$/, "");

export default function RecordsScreen({ meta, onBack }) {
  const BACKEND = backendUrl();
  const [global, setGlobal] = useState(null);
  const [unavailable, setUnavailable] = useState(!BACKEND);
  useEffect(() => {
    if (!BACKEND) return;
    let active = true;
    axios.get(`${BACKEND}/api/leaderboard`, { timeout: 8000 }).then((r) => {
      if (!Array.isArray(r.data) || !r.data.every(row => row && typeof row === "object" && typeof row.nickname === "string" && Number.isFinite(row.wave) && Number.isFinite(row.glory))) throw new Error("Invalid leaderboard");
      if (active) setGlobal(r.data);
    }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, [BACKEND]);
  const records = Array.isArray(meta.records) ? meta.records.filter(r => r && typeof r === "object") : [];
  const local = [...records].sort((a, b) => b.glory - a.glory).slice(0, 10);
  return (
    <div data-testid="records-screen" className="flex flex-col flex-1">
      <Header title="Albo d'Oro" sub="Le tue run e la classifica globale" right={<Btn variant="ghost" data-testid="records-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 space-y-3 overflow-y-auto">
        <div className="font-pixel text-[9px] text-amber-300 uppercase">Le tue run</div>
        {local.length === 0 && <div className="font-body text-slate-500 text-lg">Nessuna run completata.</div>}
        {local.map((r, i) => (
          <Panel key={i} data-testid={`local-record-${i}`} className="font-body text-lg leading-tight flex justify-between">
            <div><span className={r.result === "win" ? "text-emerald-400" : "text-slate-300"}>{r.result === "win" ? "VITTORIA" : `Ondata ${r.wave}`}</span><div className="text-slate-500 text-sm">{Array.isArray(r.team) ? r.team.filter(name => typeof name === "string").join(", ") : "Squadra non registrata"}</div></div>
            <div className="text-purple-300 font-pixel text-xs">{r.glory}</div>
          </Panel>
        ))}
        <div className="font-pixel text-[9px] text-amber-300 uppercase">Run History</div>
        {[...records].reverse().map((r, i) => (
          <Panel key={r.recordId || i} data-testid={`run-history-${i}`} className="font-body text-lg leading-tight space-y-1">
            <div>{r.difficulty || "Difficoltà non registrata"} · Ondata {r.wave} · Gloria {r.glory}</div>
            {r.teamSnapshot ? <>
              <div>Vittorie {r.wins} · Reclutamenti {r.recruits} · Fusioni {r.fusions}</div>
              <div>Livello medio {r.averageLevel.toFixed(1)} · Massimo {r.maxLevel}</div>
              {r.bossDefeated && <div>Ultimo boss sconfitto: {r.bossDefeated}</div>}
              <div className="text-slate-400">{r.teamSnapshot.map(p => `${p.name} Lv${p.level}${p.fused ? " (DNA)" : ""}`).join(", ")}</div>
            </> : <div className="text-slate-500">Run precedente: dettagli non registrati.</div>}
          </Panel>
        ))}
        <div className="font-pixel text-[9px] text-sky-300 uppercase mt-4">Classifica globale</div>
        {unavailable && <div className="font-body text-slate-400 text-lg">Classifica globale non disponibile</div>}
        {!unavailable && global === null && <div className="font-body text-slate-500 text-lg">Caricamento...</div>}
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
