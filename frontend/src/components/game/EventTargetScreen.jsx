import { useState } from "react";
import { ITEMS, itemPresentation, itemFamilyPresentation } from "@/game/data";
import { getItemTargetPreview } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header } from "./ui";
import { Check } from "lucide-react";

export default function EventTargetScreen({ run, onApplyTarget, onSkip }) {
  const [selectedUid, setSelectedUid] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const pending = run?.pending;
  const itemId = pending?.itemId;
  const quantity = pending?.quantity || 1;
  const item = ITEMS[itemId];

  if (!item) {
    return (
      <div data-testid="event-target-screen" className="flex flex-col flex-1 p-4">
        <p className="text-white">Nessun oggetto in attesa.</p>
        <Btn className="mt-4" onClick={onSkip}>Continua</Btn>
      </div>
    );
  }

  const rarityPres = itemPresentation(itemId);
  const familyPres = itemFamilyPresentation(itemId);
  const anyValid = run.team?.some(p => getItemTargetPreview(itemId, p).valid);

  return (
    <div data-testid="event-target-screen" className="flex flex-col flex-1">
      <Header
        title="Ricompensa Evento"
        sub={quantity > 1 ? `Seleziona compagno (rimanenti: ${quantity})` : "Seleziona compagno"}
      />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {/* Selected Item Summary Card */}
        <div className={`p-3 border-2 ${rarityPres.cardClass} rounded space-y-1`}>
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[9px] text-white font-bold">{item.name}</span>
            <div className="flex items-center gap-1">
              <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border ${familyPres.badgeClass}`}>
                {familyPres.label}
              </span>
              <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border ${rarityPres.accentClass}`}>
                {rarityPres.label}
              </span>
              {quantity > 1 && (
                <span className="font-pixel text-[7px] px-1.5 py-0.5 rounded border border-amber-500 bg-amber-950/80 text-amber-300">
                  x{quantity}
                </span>
              )}
            </div>
          </div>
          <p className="font-body text-xs text-slate-300 leading-snug">{item.desc || item.description}</p>
        </div>

        <div className="font-pixel text-[8px] text-slate-400 uppercase tracking-wide">
          Scegli a chi applicare l'oggetto:
        </div>

        <div className="space-y-2">
          {run.team.map((player) => {
            const preview = getItemTargetPreview(itemId, player);
            const isSelected = selectedUid === player.uid;
            return (
              <div
                key={player.uid}
                data-testid={`event-target-player-${player.uid}`}
                onClick={preview.valid ? () => { sfx.select(); setSelectedUid(player.uid); } : undefined}
                className={`p-2.5 rounded border-2 transition-all cursor-pointer ${
                  !preview.valid
                    ? "opacity-50 border-slate-800 bg-slate-950/40 cursor-not-allowed"
                    : isSelected
                    ? "border-amber-400 bg-amber-950/40 shadow-md ring-1 ring-amber-400"
                    : "border-slate-700 bg-[#141c2e] hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-pixel text-[9px] text-white">{player.name}</span>
                    <span className="font-pixel text-[8px] text-slate-400 ml-1.5">Lv.{player.level}</span>
                  </div>
                  <div>
                    {!preview.valid ? (
                      <span className="font-pixel text-[7px] text-rose-300 bg-rose-950/60 border border-rose-600/60 px-1 py-0.5 rounded">
                        {preview.reason}
                      </span>
                    ) : isSelected ? (
                      <span className="font-pixel text-[7px] text-amber-300 bg-amber-950/80 border border-amber-400 px-1 py-0.5 rounded flex items-center gap-0.5">
                        <Check size={9} /> SELEZIONATO
                      </span>
                    ) : (
                      <span className="font-pixel text-[7px] text-emerald-300 border border-emerald-600/40 px-1 py-0.5 rounded">
                        Seleziona
                      </span>
                    )}
                  </div>
                </div>

                {/* HP bar */}
                <div className="mt-1.5 flex items-center gap-2 font-pixel text-[7px]">
                  <span className="text-slate-400 w-6">HP:</span>
                  <div className="flex-1 bg-slate-900 border border-slate-700 h-2 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${player.hp <= 0 ? "bg-rose-900" : player.hp / player.maxHp < 0.3 ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100))}%` }}
                    />
                  </div>
                  <span className={player.hp <= 0 ? "text-rose-400" : "text-slate-300"}>
                    {player.hp}/{player.maxHp}
                  </span>
                </div>

                {/* Diffs preview */}
                {preview.valid && preview.diffs && preview.diffs.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-700/60 flex flex-wrap gap-2 text-xs font-pixel">
                    {preview.diffs.map((d, dIdx) => (
                      <span key={dIdx} className="text-emerald-300 bg-emerald-950/50 px-1 py-0.5 rounded border border-emerald-700/40">
                        {d.label}: {d.before} → {d.after} {d.diff ? `(+${d.diff})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-[#111827] border-t-4 border-slate-800 space-y-2">
        <Btn
          data-testid="event-confirm-target-btn"
          variant="primary"
          className="w-full min-h-[44px]"
          disabled={!selectedUid || isApplying}
          onClick={() => {
            if (!selectedUid || isApplying) return;
            setIsApplying(true);
            sfx.confirm();
            onApplyTarget(selectedUid);
            setSelectedUid(null);
          }}
        >
          Applica a questo compagno
        </Btn>
        <Btn
          data-testid="event-skip-target-btn"
          variant="ghost"
          className="w-full min-h-[38px]"
          disabled={isApplying}
          onClick={() => {
            if (isApplying) return;
            setIsApplying(true);
            sfx.cancel();
            setSelectedUid(null);
            onSkip();
          }}
        >
          {!anyValid ? "Salta (nessun compagno idoneo)" : "Salta assegnazione"}
        </Btn>
      </div>
    </div>
  );
}
