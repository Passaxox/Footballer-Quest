import { TALENT_PATHS, talentLevel, talentCost, talentAvailable, buyTalent, resetTalents, CHALLENGES } from "@/game/talents";
import { sfx } from "@/game/audio";
import { Btn } from "./ui";
import { Star, Lock } from "lucide-react";

function TalentNode({ node, meta, onUpdate }) {
  const level = talentLevel(meta, node.id);
  const max = node.values.length;
  const open = talentAvailable(meta, node);
  const cost = talentCost(node);
  const canBuy = open && level < max && (meta.talentPoints || 0) >= cost;
  return (
    <div data-testid={`talent-${node.id}`} className={`p-2 border-2 space-y-1 ${node.mastery ? "border-amber-400 bg-amber-950/30" : level ? "border-sky-500 bg-[#121a2b]" : "border-slate-700 bg-[#0f1524]"}`}>
      <div className="flex items-center gap-1 font-pixel text-[8px] text-white">{node.mastery ? <Star size={12} className="text-amber-300" /> : !open ? <Lock size={12} className="text-slate-500" /> : null}{node.name}</div>
      <div className="flex gap-1">{node.values.map((_, i) => <span key={i} className={`w-4 h-2 ${i < level ? "bg-sky-400" : "bg-slate-700"}`} />)}</div>
      <div className="font-body text-sm text-slate-200 leading-tight">{node.text(node.values[Math.max(0, level - 1)])}{level > 0 && level < max ? ` → ${node.text(node.values[level])}` : ""}</div>
      {level < max
        ? <Btn data-testid={`talent-buy-${node.id}`} className="w-full" variant={canBuy ? "primary" : "default"} disabled={!canBuy} onClick={() => { sfx.select(); onUpdate(buyTalent(meta, node.id)); }}>
            {!open ? (node.mastery ? "Massimizza la via" : "Sblocca il precedente") : `${level ? "Livello" : "Impara"} · ${cost} PT`}</Btn>
        : <div className="font-body text-sm text-emerald-300">{node.mastery ? "Maestria ottenuta" : "Livello massimo"}</div>}
    </div>
  );
}

export function TalentsPanel({ meta, onUpdate }) {
  return (
    <div data-testid="talents-panel" className="space-y-3">
      <div data-testid="talent-points-balance" className="font-pixel text-[10px] text-sky-300 border-2 border-sky-600 bg-sky-950/40 p-2">{meta.talentPoints || 0} Punti Talento</div>
      {TALENT_PATHS.map((p) => (
        <section key={p.id} data-testid={`talent-path-${p.id}`} className="space-y-2">
          <div className="font-pixel text-[9px] text-amber-300 uppercase">{p.name}</div>
          <div className="grid grid-cols-2 gap-2">{p.nodes.map((n) => <TalentNode key={n.id} node={n} meta={meta} onUpdate={onUpdate} />)}</div>
        </section>
      ))}
      <p className="font-body text-sm text-slate-400">Guadagni 1 Punto Talento per ogni boss battuto e 1 per ogni Checkpoint perfetto. I talenti sono sempre attivi in ogni run. Le maestrie richiedono tutta la via al massimo.</p>
      <Btn data-testid="talents-reset" variant="ghost" className="w-full" onClick={() => { if (window.confirm("Azzerare i talenti? I punti spesi ti verranno restituiti.")) onUpdate(resetTalents(meta)); }}>Azzera talenti (rimborso completo)</Btn>
    </div>
  );
}

export const ChallengesPanel = () => (
  <div data-testid="challenges-panel" className="space-y-2">
    <p className="font-body text-base text-slate-300">Sfide sempre attive: completale durante la run per guadagnare Spirito di squadra extra a fine partita.</p>
    {CHALLENGES.map((c) => <div key={c.id} data-testid={`challenge-${c.id}`} className="p-2 border-2 border-slate-700 bg-[#121a2b]">
      <div className="font-pixel text-[8px] text-white">{c.name}</div>
      <div className="font-body text-base text-slate-300">{c.desc}</div>
      <div className="font-body text-sm text-amber-300">{c.reward}</div>
    </div>)}
  </div>
);
