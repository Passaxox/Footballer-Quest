import { useState } from "react";
import { ITEMS, ITEM_FAMILIES, itemPresentation, itemFamilyPresentation, isTargetItem } from "@/game/data";
import { getItemTargetPreview } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel } from "./ui";
import { Coins, Check } from "lucide-react";

export default function ShopScreen({
  run,
  stock,
  activeTargetIndex = null,
  onStartBuy,
  onConfirmBuy,
  onCancelTarget,
  onBuy,
  onLeave,
}) {
  const [localTargetIndex, setLocalTargetIndex] = useState(null);
  const [selectedUid, setSelectedUid] = useState(null);
  const [isBuying, setIsBuying] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const currentTargetIndex = activeTargetIndex ?? localTargetIndex;
  const bought = run?.pending?.bought || [];

  // Target Selection View for Target-Specific Instant Items
  if (currentTargetIndex !== null && stock && stock[currentTargetIndex]) {
    const s = stock[currentTargetIndex];
    const item = ITEMS[s.id];
    const familyPres = itemFamilyPresentation(s.id);
    const rarityPres = itemPresentation(s.id);

    return (
      <div data-testid="shop-screen" className="flex flex-col flex-1">
        <Header
          title="Destinatario Oggetto"
          sub={`Applica a un compagno · Costo: ${s.price} P`}
          right={
            <div className="flex items-center gap-1 font-pixel text-[9px] text-amber-300" data-testid="shop-money">
              <Coins size={12} /> {run.money}
            </div>
          }
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
              </div>
            </div>
            <p className="font-body text-xs text-slate-300 leading-snug">{item.desc || item.description}</p>
            <div className="font-pixel text-[7px] text-amber-300 pt-1">
              Il Prestigio ({s.price} P) verrà scalato solo alla conferma.
            </div>
          </div>

          <div className="font-pixel text-[8px] text-slate-400 uppercase tracking-wide">
            Seleziona il compagno di squadra:
          </div>

          <div className="space-y-2">
            {run.team.map((player) => {
              const preview = getItemTargetPreview(s.id, player);
              const isSelected = selectedUid === player.uid;
              return (
                <div
                  key={player.uid}
                  data-testid={`shop-target-player-${player.uid}`}
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
            data-testid="shop-confirm-target-btn"
            variant="primary"
            className="w-full min-h-[44px]"
            disabled={!selectedUid || isBuying}
            onClick={() => {
              if (!selectedUid || isBuying) return;
              setIsBuying(true);
              sfx.confirm();
              if (onConfirmBuy) {
                onConfirmBuy(currentTargetIndex, selectedUid);
              } else {
                onBuy?.(currentTargetIndex, selectedUid);
              }
              setLocalTargetIndex(null);
              setSelectedUid(null);
              setIsBuying(false);
            }}
          >
            Conferma Acquisto ({s.price} P)
          </Btn>
          <Btn
            data-testid="shop-cancel-target-btn"
            variant="ghost"
            className="w-full min-h-[38px]"
            onClick={() => {
              sfx.cancel();
              setLocalTargetIndex(null);
              setSelectedUid(null);
              onCancelTarget?.();
            }}
          >
            Annulla
          </Btn>
        </div>
      </div>
    );
  }

  // Standard Shop Screen View
  return (
    <div data-testid="shop-screen" className="flex flex-col flex-1">
      <Header
        title="Mercante Raijin"
        sub="«Solo roba di qualità, garantito!»"
        right={
          <div className="flex items-center gap-1 font-pixel text-[9px] text-amber-300" data-testid="shop-money">
            <Coins size={12} /> {run.money}
          </div>
        }
      />
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        <Panel className="font-body text-lg text-slate-200 leading-tight">
          Un venditore ambulante ha allestito un banchetto a bordo campo. Ogni oggetto può essere comprato una sola volta.
        </Panel>
        {stock.map((s, i) => {
          const done = bought.includes(i);
          const item = ITEMS[s.id];
          const rarityPres = itemPresentation(s.id);
          const familyPres = itemFamilyPresentation(s.id);
          const isTrigger = item?.family === ITEM_FAMILIES.TRIGGER;
          const isArmed = isTrigger && (run.armedTriggers?.[s.id] || 0) > 0;
          const isSegment = item?.family === ITEM_FAMILIES.SEGMENT;
          const isActiveSegment = isSegment && (
            (run.activeNodeItems || []).includes(s.id) ||
            (run.nextSegmentNodeItems || []).includes(s.id)
          );
          const canAfford = run.money >= s.price;
          const can = canAfford && !done && !isArmed;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 p-2.5 border-2 rounded ${rarityPres.cardClass} ${
                done ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="font-pixel text-[9px] text-white font-bold">{item?.name || s.id}</span>
                  <span className={`font-pixel text-[7px] px-1 py-0.2 rounded border ${familyPres.badgeClass}`}>
                    {familyPres.label}
                  </span>
                  <span data-testid={`item-rarity-${s.id}`} className={`font-pixel text-[7px] px-1 py-0.2 rounded border ${rarityPres.accentClass}`}>
                    {rarityPres.label}
                  </span>
                  {isArmed && (
                    <span className="font-pixel text-[7px] text-rose-300 bg-rose-950/80 border border-rose-500/60 px-1 py-0.2 rounded">
                      GIÀ ARMATO
                    </span>
                  )}
                  {isActiveSegment && (
                    <span className="font-pixel text-[7px] text-amber-300 bg-amber-950/80 border border-amber-500/60 px-1 py-0.2 rounded">
                      GIÀ ATTIVO
                    </span>
                  )}
                </div>
                <div className="font-body text-xs text-slate-300 leading-snug">
                  {item?.desc || item?.description}
                </div>
              </div>
              <Btn
                data-testid={`buy-item-${i}`}
                variant={can ? "primary" : "default"}
                disabled={!can}
                className="min-w-[80px] min-h-[44px] shrink-0"
                onClick={() => {
                  if (!can) return;
                  sfx.confirm();
                  if (onStartBuy) {
                    onStartBuy(i);
                  } else if (isTargetItem(s.id)) {
                    setLocalTargetIndex(i);
                  } else {
                    onBuy?.(i);
                  }
                }}
              >
                {done ? "OK" : isArmed ? "ARMATO" : `${s.price} P`}
              </Btn>
            </div>
          );
        })}
      </div>
      <div className="p-3 bg-[#111827] border-t-4 border-slate-800">
        <Btn
          data-testid="shop-leave-btn"
          className="w-full min-h-[44px]"
          disabled={isLeaving}
          onClick={() => {
            if (isLeaving) return;
            setIsLeaving(true);
            sfx.cancel();
            onLeave();
          }}
        >
          Lascia il mercante
        </Btn>
      </div>
    </div>
  );
}
