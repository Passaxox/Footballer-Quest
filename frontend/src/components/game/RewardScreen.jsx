import { ITEMS, itemPresentation } from "@/game/data";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, XpReport, ItemInfo } from "./ui";
import { Gift, Trophy, ShieldAlert, Sparkles } from "lucide-react";

export default function RewardScreen({ rewards, bonus, money, xpReport, encounterKind, teamName, onPick }) {
  const isBoss = encounterKind === "boss";
  const isMiniboss = encounterKind === "miniboss";
  const isElite = encounterKind === "elite";

  const tierBadge = isBoss ? {
    title: "TRIONFO BOSS · CHECKPOINT COMPLETATO",
    class: "bg-rose-950/80 border-rose-500 text-rose-300",
    icon: Trophy,
  } : isMiniboss ? {
    title: "VITTORIA MINIBOSS · CHECKPOINT SUPERATO",
    class: "bg-amber-950/80 border-amber-500 text-amber-300",
    icon: ShieldAlert,
  } : isElite ? {
    title: "VITTORIA ÉLITE · RICOMPENSE MAGGIORATE",
    class: "bg-sky-950/80 border-sky-500 text-sky-300",
    icon: Sparkles,
  } : null;

  const TierIcon = tierBadge?.icon;

  return (
    <div data-testid="reward-selection-modal" className="flex flex-col flex-1">
      <Header title="Ricompensa" sub={tierBadge ? tierBadge.title : "Scegli un solo premio"} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {tierBadge && (
          <div data-testid="reward-tier-banner" className={`p-2 rounded border font-pixel text-[8px] flex items-center gap-2 ${tierBadge.class}`}>
            <TierIcon size={14} className="shrink-0" />
            <div className="min-w-0">
              <div className="font-bold">{tierBadge.title}</div>
              {teamName && <div className="font-body text-xs opacity-90">Sconfitti: {teamName}</div>}
            </div>
          </div>
        )}

        <Panel className="font-body text-lg text-slate-200 leading-tight">
          Vittoria! Guadagni <span className="text-amber-300">+{money} Prestigio</span>.
          {bonus && (
            <div data-testid="reward-guaranteed-bonus" className="text-emerald-400 mt-1 font-body text-sm flex items-center gap-1.5">
              <Sparkles size={14} className="shrink-0 text-emerald-400" />
              <span>
                Bonus garantito: {ITEMS[bonus].effect.type === "money" ? `${ITEMS[bonus].name} riscattato (+${ITEMS[bonus].effect.amount} P).` : `${ITEMS[bonus].name} aggiunto allo zaino!`}
              </span>
            </div>
          )}
        </Panel>
        <XpReport report={xpReport} />
        {rewards.map((id, i) => (
          <button key={id + i} data-testid={`reward-option-${i}`} onClick={() => { sfx.confirm(); onPick(id); }}
            className={`w-full text-left p-3 border-4 ${itemPresentation(id).cardClass} hover:border-amber-400 active:translate-y-[2px] flex gap-3 items-center shadow-md`}>
            <Gift size={22} className={itemPresentation(id).accentClass} />
            <ItemInfo id={id} />
          </button>
        ))}
      </div>
      <div className="p-3"><Btn data-testid="reward-skip" variant="ghost" className="w-full" onClick={() => onPick(null)}>Nessun premio</Btn></div>
    </div>
  );
}
