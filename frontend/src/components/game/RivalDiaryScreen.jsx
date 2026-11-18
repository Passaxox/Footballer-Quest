import { Btn, Header, Panel } from "./ui";
import { TeamCrest } from "./TeamCrest";
import { BOSS_POOL } from "@/game/bossPools";
import { rivalEntries } from "@/game/rivals";

const Stat = ({ label, value, testId, tone = "text-white" }) => (
  <div className="flex flex-col"><span className="font-body text-xs text-slate-400">{label}</span><span data-testid={testId} className={`font-pixel text-[10px] ${tone}`}>{value}</span></div>
);

export default function RivalDiaryScreen({ meta, onBack }) {
  const entries = rivalEntries(meta);
  const beaten = new Set(entries.map((e) => e.bossId));
  return (
    <div data-testid="rival-diary-screen" className="flex flex-col flex-1">
      <Header title="Diario Rivali" sub={`${beaten.size} / ${BOSS_POOL.length} squadre rivali battute`} right={<Btn variant="ghost" data-testid="rival-diary-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 space-y-2 overflow-y-auto">
        {entries.length === 0 && <div data-testid="rival-diary-empty" className="font-body text-slate-400 text-lg">Nessun boss o miniboss battuto. Vinci un checkpoint per aprire il diario.</div>}
        {entries.map((e) => (
          <Panel key={e.key} data-testid={`rival-entry-${e.key.replace(":", "-")}`} className="flex items-center gap-3">
            <TeamCrest teamId={e.teamId} name={e.team} size={44} showName={false} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className={`font-pixel text-[8px] px-1 border ${e.kind === "boss" ? "text-amber-300 border-amber-500" : "text-sky-300 border-sky-500"}`}>{e.kind === "boss" ? "BOSS" : "MINIBOSS"}</span>
                <span className="font-body text-lg text-white truncate">{e.team}</span></div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Stat label="Vittorie" value={e.wins} testId={`rival-wins-${e.key.replace(":", "-")}`} />
                <Stat label="Miglior wave" value={`W${e.bestWave}`} testId={`rival-wave-${e.key.replace(":", "-")}`} tone="text-amber-300" />
                <Stat label="Min. KO subiti" value={e.fewestKo} testId={`rival-ko-${e.key.replace(":", "-")}`} tone={e.fewestKo === 0 ? "text-emerald-400" : "text-white"} />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
