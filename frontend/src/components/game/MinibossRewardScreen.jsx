import { ITEMS } from "@/game/data";
import { Btn, Header, PlayerCard } from "./ui";
import { Gift, UserPlus, Zap } from "lucide-react";

const Option = ({ o, i, onPick }) => {
  const Icon = o.kind === "recruit" ? UserPlus : o.kind === "spirit" ? Zap : Gift;
  return (
    <button type="button" data-testid={`miniboss-option-${i}`} onClick={() => onPick(o)}
      className="w-full text-left p-3 border-2 border-amber-500 bg-[#121a2b] space-y-2 transition-transform active:scale-[.98]">
      <div className="flex items-center gap-2 font-pixel text-[9px] text-amber-300"><Icon size={16} />
        {o.kind === "recruit" ? "RECLUTAMENTO SPECIFICO" : o.kind === "spirit" ? "RISVEGLIO SPIRITO GUERRIERO" : "OGGETTO RARO"}</div>
      {o.kind === "recruit" && <PlayerCard p={o.player} compact testId={`miniboss-recruit-card`} />}
      {o.kind === "spirit" && <p className="font-body text-lg text-slate-200">{o.name} risveglia {o.spirit} e potrà evocarlo in partita.</p>}
      {o.kind === "item" && <p className="font-body text-lg text-slate-200"><b className="text-white">{ITEMS[o.id].name}</b> · {ITEMS[o.id].desc}</p>}
    </button>
  );
};

export default function MinibossRewardScreen({ pending, onPick }) {
  return (
    <div data-testid="miniboss-reward-screen" className="flex flex-col flex-1">
      <Header title="Miniboss battuto!" sub={`${pending.teamName} · scegli una ricompensa`} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <p className="font-body text-lg text-slate-300 leading-tight">Due premi in palio: puoi prenderne solo uno. Le ricompense esclusive restano ai boss.</p>
        {pending.options.map((o, i) => <Option key={i} o={o} i={i} onPick={onPick} />)}
      </div>
      <div className="p-3"><Btn data-testid="miniboss-skip" variant="ghost" className="w-full" onClick={() => onPick(null)}>Nessuna ricompensa</Btn></div>
    </div>
  );
}
