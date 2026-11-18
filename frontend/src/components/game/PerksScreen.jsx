import { useState } from "react";
import { PERKS, PERK_CATEGORIES, PERK_BY_ID, RARITIES, PERK_CURRENCY, perkLevel, perkCost, perkText, maxLevel, fusionReady, buyPerk } from "@/game/perks";
import { sfx } from "@/game/audio";
import { Btn, Header } from "./ui";
import { Flame } from "lucide-react";
import { TalentsPanel, ChallengesPanel } from "./TalentsPanel";

const ROMAN = ["I", "II", "III"];

function PerkRow({ perk, meta, onBuy }) {
  const level = perkLevel(meta, perk.id);
  const max = maxLevel(perk);
  const r = RARITIES[perk.rarity];
  const cost = level < max ? perkCost(perk, level) : null;
  const ready = fusionReady(meta, perk);
  const afford = cost !== null && (meta.teamSpirit || 0) >= cost;
  return (
    <div data-testid={`perk-row-${perk.id}`} className="p-3 border-2 bg-[#121a2b] space-y-1" style={{ borderColor: level ? r.color : "#334155" }}>
      <div className="flex justify-between gap-2 items-baseline">
        <span className="font-pixel text-[9px] text-white">{perk.name}</span>
        <span className="font-body text-sm" style={{ color: r.color }}>{r.label}</span>
      </div>
      <div className="flex gap-1">{perk.values.map((v, i) => <span key={i} data-testid={`perk-${perk.id}-lv${i + 1}`}
        className={`font-pixel text-[8px] px-2 py-1 border ${i < level ? "bg-amber-400 text-slate-900 border-amber-300" : "text-slate-400 border-slate-600"}`}>{perk.single ? "★" : ROMAN[i]}</span>)}</div>
      <div className="font-body text-base text-slate-200 leading-tight">{perkText(perk.id, Math.max(1, level))}</div>
      {level > 0 && level < max && <div className="font-body text-sm text-slate-400">Prossimo: {perkText(perk.id, level + 1)}</div>}
      {perk.requires && !ready && <div className="font-body text-sm text-rose-300">Richiede {perk.requires.map((id) => `${PERK_BY_ID[id].name} III`).join(" + ")}</div>}
      {cost !== null ? <Btn data-testid={`perk-buy-${perk.id}`} className="w-full" variant={afford && ready ? "primary" : "default"} disabled={!afford || !ready} onClick={() => { sfx.select(); onBuy(perk.id); }}>
        {cost === 0 ? (level ? "Potenzia · gratis" : "Sblocca · gratis") : `${level ? "Potenzia" : "Sblocca"} · ${cost}`}</Btn>
        : <div className="font-body text-sm text-emerald-300">Livello massimo</div>}
    </div>
  );
}

export default function PerksScreen({ meta, onUpdate, onBack }) {
  const [cat, setCat] = useState("off");
  const [tab, setTab] = useState("perks");
  const total = PERKS.reduce((n, p) => n + maxLevel(p), 0);
  const owned = PERKS.reduce((n, p) => n + perkLevel(meta, p.id), 0);
  return (
    <div data-testid="perks-screen" className="flex flex-col flex-1">
      <Header title="Spedizione" sub={`Vantaggi ${owned}/${total} · Talenti e Sfide`} right={<Btn variant="ghost" data-testid="perks-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="px-3 pt-3 grid grid-cols-3 gap-1" role="tablist">
        {[["perks", "Vantaggi"], ["talents", "Talenti"], ["challenges", "Sfide"]].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id}
          data-testid={`meta-tab-${id}`} onClick={() => setTab(id)} className={`font-pixel text-[8px] py-2 border-2 ${tab === id ? "border-amber-400 text-amber-200 bg-slate-800" : "border-slate-700 text-slate-400"}`}>{label}</button>)}
      </div>
      {tab === "talents" && <div className="p-3 flex-1 overflow-y-auto"><TalentsPanel meta={meta} onUpdate={onUpdate} /></div>}
      {tab === "challenges" && <div className="p-3 flex-1 overflow-y-auto"><ChallengesPanel /></div>}
      {tab === "perks" && <><div className="px-3 pt-3">
        <div data-testid="team-spirit-balance" className="flex items-center gap-2 font-pixel text-[10px] text-amber-300 border-2 border-amber-600 bg-amber-950/40 p-2">
          <Flame size={16} /> {meta.teamSpirit || 0} · {PERK_CURRENCY}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {PERK_CATEGORIES.map((c) => {
            const list = PERKS.filter((p) => p.cat === c.id);
            return <button key={c.id} type="button" data-testid={`perk-cat-${c.id}`} onClick={() => setCat(c.id)}
              className={`font-body text-sm py-2 border-2 transition-colors ${cat === c.id ? "border-amber-400 text-amber-200 bg-slate-800" : "border-slate-700 text-slate-300"}`}>
              {c.label} {list.reduce((n, p) => n + perkLevel(meta, p.id), 0)}/{list.reduce((n, p) => n + maxLevel(p), 0)}</button>;
          })}
        </div>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        {cat === "curse" && <p className="font-body text-base text-rose-200">Gratis, ma con un prezzo: in run sono facoltativi e aumentano lo Spirito di squadra guadagnato.</p>}
        {cat === "fusion" && <p className="font-body text-base text-fuchsia-200">Fondi due vantaggi al livello III in uno solo, più forte: occupa un unico posto in run.</p>}
        {PERKS.filter((p) => p.cat === cat).map((p) => <PerkRow key={p.id} perk={p} meta={meta} onBuy={(id) => onUpdate(buyPerk(meta, id))} />)}
        <p className="font-body text-sm text-slate-400 pt-2">Guadagni Spirito di squadra a fine run: 2 per wave, 15 per checkpoint, 60 se vinci il FFI, più le Sfide. I vantaggi sbloccati ti vengono offerti a inizio run e dopo ogni boss.</p>
      </div></>}
    </div>
  );
}
