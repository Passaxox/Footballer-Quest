import { useState } from "react";
import { PERK_BY_ID, RARITIES, perkLevel, perkText, MAX_ACTIVE_PERKS, PERK_CATEGORIES } from "@/game/perks";
import { Btn, Header } from "./ui";
import { Skull, Check } from "lucide-react";

const ROMAN = ["", "I", "II", "III"];
export const PerkCard = ({ id, level, selected, onClick, testId }) => {
  const p = PERK_BY_ID[id];
  const r = RARITIES[p.rarity];
  return (
    <button type="button" data-testid={testId} onClick={onClick} aria-pressed={!!selected}
      className="w-full text-left p-3 border-2 bg-[#121a2b] transition-transform active:scale-[.98] flex gap-3 items-start"
      style={{ borderColor: selected ? "#facc15" : r.color }}>
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-[9px] text-white">{p.name} {ROMAN[level]}</div>
        <div className="font-body text-sm" style={{ color: r.color }}>{p.cat === "curse" ? r.label : `${r.label} · ${PERK_CATEGORIES.find((c) => c.id === p.cat).label}`}</div>
        <div className="font-body text-base text-slate-200 leading-tight mt-1">{perkText(id, level)}</div>
      </div>
      {p.cat === "curse" ? <Skull className="text-rose-400 shrink-0" size={18} /> : selected ? <Check className="text-amber-300 shrink-0" size={18} /> : null}
    </button>
  );
};

export default function PerkOfferScreen({ run, meta, offer, onPick }) {
  const [pick, setPick] = useState(null);
  const [curse, setCurse] = useState(false);
  const left = MAX_ACTIVE_PERKS - (run.perks || []).length;
  const ids = [pick, curse && left - (pick ? 1 : 0) > 0 ? offer.cursed : null].filter(Boolean);
  return (
    <div data-testid="perk-offer-screen" className="flex flex-col flex-1">
      <Header title="Scegli un vantaggio" sub={`W${run.wave} · vantaggi attivi ${(run.perks || []).length}/${MAX_ACTIVE_PERKS}`} />
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        <p className="font-body text-lg text-slate-300 leading-tight">Il mister ti propone un vantaggio tra quelli che hai sbloccato. Resta attivo fino a fine run.</p>
        {offer.normal.map((id) => <PerkCard key={id} id={id} level={perkLevel(meta, id)} selected={pick === id} testId={`perk-offer-${id}`} onClick={() => setPick(pick === id ? null : id)} />)}
        {offer.cursed && <div className="pt-2 space-y-2">
          <div className="font-pixel text-[9px] text-rose-300">VANTAGGIO MALEDETTO · FACOLTATIVO</div>
          <PerkCard id={offer.cursed} level={perkLevel(meta, offer.cursed)} selected={curse} testId={`perk-offer-${offer.cursed}`} onClick={() => setCurse(!curse)} />
        </div>}
      </div>
      <div className="p-3 grid gap-2">
        <Btn data-testid="perk-offer-confirm" variant="primary" disabled={!ids.length} onClick={() => onPick(ids)}>Conferma {ids.length ? `(${ids.length})` : ""}</Btn>
        <Btn data-testid="perk-offer-skip" variant="ghost" onClick={() => onPick([])}>Nessun vantaggio</Btn>
      </div>
    </div>
  );
}
