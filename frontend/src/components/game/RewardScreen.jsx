import { useState } from "react";
import { ITEMS, itemPresentation, itemFamilyPresentation, isTargetItem } from "@/game/data";
import { getItemTargetPreview } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, XpReport, Avatar, ElementBadge, HpBar } from "./ui";
import { Gift, Trophy, ShieldAlert, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function RewardScreen({
  rewards = [],
  bonus,
  money = 0,
  xpReport,
  encounterKind,
  teamName,
  team = [],
  selectedRewardId = null,
  onPick,
  onSelectReward,
  onCancelTarget,
}) {
  const [localTargetItem, setLocalTargetItem] = useState(null);
  const activeTargetId = selectedRewardId || localTargetItem;

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

  const handlePickOption = (id) => {
    sfx.confirm?.();
    if (isTargetItem(id) && team && team.length > 0) {
      if (onSelectReward) {
        onSelectReward(id);
      } else {
        setLocalTargetItem(id);
      }
    } else {
      onPick(id);
    }
  };

  const handleConfirmTarget = (itemId, targetUid) => {
    sfx.heal?.();
    onPick(itemId, targetUid);
  };

  const handleCancelTarget = () => {
    sfx.cancel?.();
    if (onCancelTarget) {
      onCancelTarget();
    } else {
      setLocalTargetItem(null);
    }
  };

  // View B: Target selection for player-specific instant reward
  if (activeTargetId) {
    const item = ITEMS[activeTargetId];
    const family = itemFamilyPresentation(activeTargetId);
    const presentation = itemPresentation(activeTargetId);

    return (
      <div data-testid="reward-selection-modal" className="flex flex-col flex-1">
        <Header title="Assegna Oggetto" sub="SU CHI VUOI USARLO?" />
        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
          {/* Chosen Item Summary Banner */}
          <div className={`p-3 rounded border-2 ${presentation.cardClass} space-y-1.5`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-pixel text-[10px] text-white">{item?.name}</span>
              <div className="flex items-center gap-1.5">
                <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border ${family.badgeClass}`}>
                  {family.label}
                </span>
                <span className={`font-pixel text-[7px] ${presentation.accentClass}`}>
                  {presentation.label}
                </span>
              </div>
            </div>
            <p className="font-body text-sm text-slate-200 leading-snug">
              {item?.description}
            </p>
          </div>

          <div className="font-pixel text-[8px] text-slate-400 uppercase tracking-wide">
            Scegli il calciatore bersaglio:
          </div>

          {/* Team Target Cards with Before -> After Stat Previews */}
          <div className="space-y-2">
            {team.map((p, i) => {
              const preview = getItemTargetPreview(activeTargetId, p);
              const valid = preview.valid;
              return (
                <button
                  key={p.uid}
                  type="button"
                  data-testid={`reward-target-${i}`}
                  disabled={!valid}
                  onClick={() => valid && handleConfirmTarget(activeTargetId, p.uid)}
                  className={`w-full text-left p-2.5 rounded border-2 transition-all ${
                    valid
                      ? "border-emerald-500 bg-emerald-950/40 hover:border-emerald-400 active:translate-y-[1px] shadow-sm cursor-pointer"
                      : "border-slate-800 bg-slate-900/30 opacity-45 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border ${
                      valid
                        ? p.hp === 0
                          ? "text-sky-300 border-sky-500 bg-sky-950/60"
                          : "text-emerald-300 border-emerald-500 bg-emerald-950/60"
                        : "text-slate-400 border-slate-700 bg-slate-950/60"
                    }`}>
                      {valid ? (p.hp === 0 ? "KO • RIANIMABILE" : "TARGET VALIDO") : (preview.reason?.toUpperCase() || "NON SELEZIONABILE")}
                    </span>
                    {valid && (
                      <span className="text-emerald-400 flex items-center gap-1 font-body text-xs">
                        <CheckCircle2 size={12} /> Seleziona
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Avatar p={p} size={44} ko={p.hp === 0 && !valid} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-pixel text-[9px] text-white truncate">{p.name}</span>
                        <span className="font-pixel text-[8px] text-amber-300">Lv{p.level}</span>
                      </div>
                      <div className="flex items-center gap-1 my-1">
                        <ElementBadge element={p.element} />
                        <span className="font-body text-xs text-slate-400">{p.role}</span>
                      </div>
                      <HpBar hp={p.hp} maxHp={p.maxHp} showText={false} />
                      <div className="flex justify-between font-body text-xs text-slate-400 mt-0.5">
                        <span>{p.hp}/{p.maxHp} HP</span>
                        <span>ATK {p.atk} · DIF {p.def} · VEL {p.spd}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stat / Condition diffs */}
                  {preview.diffs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-800/40 grid grid-cols-2 gap-1 font-pixel text-[8px]">
                      {preview.diffs.map((diff, dIdx) => (
                        <div key={dIdx} className="bg-emerald-950/60 px-2 py-1 rounded text-emerald-200 border border-emerald-700/50">
                          {diff.label}: <span className="line-through text-slate-400">{diff.before}</span> → <strong className="text-emerald-300">{diff.after}</strong>
                          {diff.diff !== null && diff.diff !== undefined && (
                            <span className="ml-1 text-emerald-400">({diff.diff > 0 ? `+${diff.diff}` : diff.diff})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-[#111827] border-t-2 border-slate-800">
          <Btn data-testid="reward-target-cancel" variant="ghost" className="w-full flex items-center justify-center gap-1.5" onClick={handleCancelTarget}>
            <ArrowLeft size={14} /> Indietro (Cambia ricompensa)
          </Btn>
        </div>
      </div>
    );
  }

  // View A: 3 Reward Choices
  return (
    <div data-testid="reward-selection-modal" className="flex flex-col flex-1">
      <Header title="Ricompensa" sub={tierBadge ? tierBadge.title : "SCEGLI UNA RICOMPENSA"} />
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
                Bonus garantito: {ITEMS[bonus].effect.type === "money" ? `${ITEMS[bonus].name} riscattato (+${ITEMS[bonus].effect.amount} P).` : `${ITEMS[bonus].name} ottenuto!`}
              </span>
            </div>
          )}
        </Panel>

        <XpReport report={xpReport} />

        <div className="space-y-2">
          {rewards.map((id, i) => {
            const item = ITEMS[id];
            const presentation = itemPresentation(id);
            const family = itemFamilyPresentation(id);
            const needsTarget = isTargetItem(id);

            return (
              <button
                key={id + i}
                type="button"
                data-testid={`reward-option-${i}`}
                onClick={() => handlePickOption(id)}
                className={`w-full text-left p-3 border-4 ${presentation.cardClass} hover:border-amber-400 active:translate-y-[2px] rounded flex flex-col gap-2 shadow-md transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift size={20} className={`${presentation.accentClass} shrink-0`} />
                    <span className="font-pixel text-[10px] text-white leading-tight break-words">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      data-testid={`reward-family-badge-${id}`}
                      className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border ${family.badgeClass}`}
                    >
                      {family.label}
                    </span>
                    <span
                      data-testid={`item-rarity-${id}`}
                      className={`font-pixel text-[7px] ${presentation.accentClass}`}
                    >
                      {presentation.label}
                    </span>
                  </div>
                </div>

                <p className="font-body text-slate-200 text-sm leading-snug">
                  {item.description}
                </p>

                <div className="flex items-center justify-between text-[8px] font-pixel text-slate-400 pt-1 border-t border-slate-700/60">
                  <span>{family.description}</span>
                  {needsTarget ? (
                    <span className="text-amber-300">Scegli bersaglio →</span>
                  ) : (
                    <span className="text-sky-300">Applica subito ✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-3 bg-[#111827] border-t-2 border-slate-800">
        <Btn data-testid="reward-skip" variant="ghost" className="w-full" onClick={() => onPick(null)}>
          Nessun premio
        </Btn>
      </div>
    </div>
  );
}
