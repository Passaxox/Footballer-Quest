import { useState } from "react";
import axios from "axios";
import { glory, playtestSummary } from "@/game/engine";
import { Btn, Header, Panel, PlayerCard, XpReport } from "./ui";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EndScreen({ run, result, onHome }) {
  const [nick, setNick] = useState(localStorage.getItem("inazuma_rogue_nick") || "");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const g = glory(run);
  const summary = playtestSummary(run);
  const submit = async () => {
    try {
      localStorage.setItem("inazuma_rogue_nick", nick);
      await axios.post(`${API}/runs`, { nickname: nick.trim() || "Anonimo", wave: run.wave, glory: g, result, wins: run.stats.wins, recruits: run.stats.recruits, fusions: run.stats.fusions, team: run.team.map((p) => p.name) });
      setSent(true);
    } catch { setErr("Invio fallito. Riprova più tardi."); }
  };
  return (
    <div data-testid="game-over-screen" className={`flex flex-col flex-1 ${result === "win" ? "victory-bg" : ""}`}>
      <Header title={result === "win" ? "CAMPIONI!" : "Game Over"} sub={result === "win" ? "Avete vinto il Football Frontier International!" : `La run si conclude all'ondata ${run.wave}`} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <Panel data-testid="playtest-summary" className="grid grid-cols-2 gap-2 font-body text-lg text-slate-200">
          <div>Difficoltà</div><div className="text-right text-sky-300">{summary.difficulty}</div>
          <div>Ondata raggiunta</div><div className="text-right text-amber-300" data-testid="end-wave">{run.wave}</div>
          <div>Partite vinte</div><div className="text-right">{run.stats.wins}</div>
          <div>Calciatori reclutati</div><div className="text-right">{run.stats.recruits}</div>
          <div>Fusioni DNA</div><div className="text-right text-pink-400">{run.stats.fusions}</div>
          <div>Livello medio</div><div className="text-right">{summary.averageLevel.toFixed(1)}</div>
          <div>Livello massimo</div><div className="text-right">{summary.maxLevel}</div>
          {summary.bossReached && <><div>Boss affrontato</div><div className="text-right">{summary.bossReached}</div></>}
          {summary.bossDefeated && <><div>Ultimo boss sconfitto</div><div className="text-right">{summary.bossDefeated}</div></>}
          <div className="font-pixel text-[10px] text-purple-300 self-center">GLORIA</div><div className="text-right font-pixel text-purple-300 text-lg" data-testid="end-glory">{g}</div>
        </Panel>
        <XpReport report={run.lastProgression?.report} />
        <div className="space-y-2">{run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact testId={`end-player-${i}`} />)}</div>
        <Panel className="space-y-2">
          <div className="font-pixel text-[9px] text-slate-300 uppercase">Albo d'Oro Globale</div>
          {sent ? <div className="font-body text-emerald-400 text-lg" data-testid="submit-success">Punteggio inviato!</div> : (
            <>
              <input data-testid="nickname-input" value={nick} onChange={(e) => setNick(e.target.value.slice(0, 16))} placeholder="Il tuo nickname" className="w-full bg-slate-950 border-2 border-slate-600 p-2 font-body text-lg text-white outline-none focus:border-amber-400" />
              <Btn data-testid="submit-score-btn" variant="primary" className="w-full" onClick={submit}>Invia il punteggio</Btn>
              {err && <div className="font-body text-red-400">{err}</div>}
            </>
          )}
        </Panel>
      </div>
      <div className="p-3"><Btn data-testid="end-home-btn" className="w-full" onClick={onHome}>Torna al menu</Btn></div>
    </div>
  );
}
