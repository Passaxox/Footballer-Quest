import { ITEMS } from "@/game/data";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, XpReport } from "./ui";
import { Gift } from "lucide-react";

export default function RewardScreen({ rewards, bonus, money, xpReport, onPick }) {
  return (
    <div data-testid="reward-selection-modal" className="flex flex-col flex-1">
      <Header title="Ricompensa" sub="Scegli un solo premio" />
      <div className="p-3 space-y-3 flex-1">
        <Panel className="font-body text-lg text-slate-200 leading-tight">
          Vittoria! Guadagni <span className="text-amber-300">+{money} Prestigio</span>.
          {bonus && <div className="text-emerald-400 mt-1">Bonus: {ITEMS[bonus].name} aggiunto allo zaino!</div>}
        </Panel>
        <XpReport report={xpReport} />
        {rewards.map((id, i) => (
          <button key={id + i} data-testid={`reward-option-${i}`} onClick={() => { sfx.confirm(); onPick(id); }}
            className={`w-full text-left p-3 border-4 ${id === "cuneo" ? "border-pink-500 bg-pink-950/40" : "border-slate-600 bg-[#141c2e]"} hover:border-amber-400 active:translate-y-[2px] flex gap-3 items-center`}>
            <Gift size={22} className={id === "cuneo" ? "text-pink-400" : "text-amber-300"} />
            <div>
              <div className="font-pixel text-[10px] text-white">{ITEMS[id].name}</div>
              <div className="font-body text-slate-300 text-base leading-tight mt-1">{ITEMS[id].desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-3"><Btn data-testid="reward-skip" variant="ghost" className="w-full" onClick={() => onPick(null)}>Nessun premio</Btn></div>
    </div>
  );
}
