import { ITEMS, itemPresentation } from "@/game/data";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, XpReport, ItemInfo } from "./ui";
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
            className={`w-full text-left p-3 border-4 ${itemPresentation(id).cardClass} hover:border-amber-400 active:translate-y-[2px] flex gap-3 items-center`}>
            <Gift size={22} className={itemPresentation(id).accentClass} />
            <ItemInfo id={id} />
          </button>
        ))}
      </div>
      <div className="p-3"><Btn data-testid="reward-skip" variant="ghost" className="w-full" onClick={() => onPick(null)}>Nessun premio</Btn></div>
    </div>
  );
}
