import { useState } from "react";
import { ITEMS } from "@/game/data";
import { applyItemTo, consumeRunItem, removeItem, gainXp, canReleasePlayer, xpProgress } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, PlayerCard, ItemTargetCard, StatLine, MoveInfo, XpBar } from "./ui";

export default function TeamScreen({ run, onUpdate, onFusion, onBack }) {
  const [sel, setSel] = useState(0);
  const [itemSel, setItemSel] = useState(null);
  const p = run.team[sel];
  const items = Object.entries(run.items).filter(([, n]) => n > 0);

  const consumeItem = (id) => {
    if (ITEMS[id].effect.type === "money") { const next = consumeRunItem(run, id); onUpdate({ money: next.money, items: next.items }); return; }
    if (ITEMS[id].battleOnly) return;
    if (id === "trofeo") { sfx.levelup(); onUpdate({ team: run.team.map((q) => gainXp(q, 40).player), items: removeItem(run.items, id) }); return; }
    if (id === "cuneo") { onFusion(); return; }
    if (id === "fischietto") { sfx.confirm(); onUpdate({ fischietto: true, items: removeItem(run.items, id) }); return; }

    setItemSel(id);
  };
  const applyTo = (i) => {
    sfx.heal();
    onUpdate({ team: run.team.map((q, j) => (j === i ? applyItemTo(itemSel, q) : q)), items: removeItem(run.items, itemSel) });
    setItemSel(null);
  };
  const makeCaptain = () => { sfx.confirm(); onUpdate({ team: [p, ...run.team.filter((_, i) => i !== sel)] }); setSel(0); };
  const release = () => {
    if (!canReleasePlayer(run.team, p.uid)) return;
    sfx.cancel();
    onUpdate({ team: run.team.filter((_, i) => i !== sel) });
    setSel(0);
  };

  return (
    <div data-testid="inventory-bench-screen" className="flex flex-col flex-1">
      <Header title="Squadra & Zaino" sub={`${run.team.length}/6 giocatori · ${run.money} Prestigio${run.fischietto ? " · Fischietto attivo" : ""}`} right={<Btn variant="ghost" data-testid="team-back-btn" onClick={onBack}>Indietro</Btn>} />
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        {itemSel ? (
          <>
            <div className="font-body text-slate-300 text-lg">Su chi usare {ITEMS[itemSel].name}?</div>
            {run.team.map((q, i) => (
              <ItemTargetCard key={q.uid} p={q} itemId={itemSel} testId={`team-item-target-${i}`} onClick={() => applyTo(i)} />
            ))}
            <Btn data-testid="team-item-cancel" variant="ghost" className="w-full" onClick={() => setItemSel(null)}>Annulla</Btn>
          </>
        ) : (
          <>
            {run.team.map((q, i) => <PlayerCard key={q.uid} p={q} compact selected={sel === i} testId={`team-player-${i}`} onClick={() => { sfx.select(); setSel(i); }}
              right={i === 0 ? <span className="font-pixel text-[7px] text-amber-300 border border-amber-400 px-1">CAP</span> : null} />)}
            {p && (
              <Panel className="space-y-2">
                <div className="font-pixel text-[9px] text-white">{p.name} · Lv{p.level}</div>
                <StatLine p={p} /><XpBar progress={xpProgress(p)} />
                <MoveInfo move={p.move} />
                <div className="grid grid-cols-2 gap-2">
                  <Btn data-testid="make-captain-btn" disabled={sel === 0} onClick={makeCaptain}>Capitano</Btn>
                  <Btn data-testid="release-player-btn" variant="danger" disabled={!canReleasePlayer(run.team, p.uid)} onClick={release}>Congeda</Btn>
                </div>
                {!canReleasePlayer(run.team, p.uid) && <p className="font-body text-sm text-amber-200">Deve restare almeno un giocatore vivo in squadra.</p>}
              </Panel>
            )}
            <div className="font-pixel text-[9px] text-slate-400 uppercase mt-3">Zaino</div>
            {items.length === 0 && <div className="font-body text-slate-500 text-lg">Lo zaino è vuoto.</div>}
            {items.map(([id, n]) => (
              <div key={id} className="flex items-center gap-2 p-2 border-2 border-slate-700 bg-[#141c2e]">
                <div className="flex-1">
                  <div className="font-pixel text-[9px] text-white">{ITEMS[id].name} <span className="text-amber-300">x{n}</span></div>
                  <div className="font-body text-slate-300 text-sm leading-tight">{ITEMS[id].desc}</div>
                </div>
                <Btn data-testid={`bag-use-${id}`} variant={id === "cuneo" ? "fusion" : "default"} disabled={ITEMS[id].battleOnly || (id === "cuneo" && run.team.length < 2)} onClick={() => consumeItem(id)}>
                  {ITEMS[id].battleOnly ? "In lotta" : id === "cuneo" ? "Fondi" : "Usa"}
                </Btn>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
