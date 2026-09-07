import { ROSTER, ROLES } from "@/game/data";
import { Btn, Header, Avatar, ElementBadge, MoveInfo } from "./ui";

export default function CollectionScreen({ meta, onBack }) {
  return (
    <div data-testid="collection-screen" className="flex flex-col flex-1">
      <Header title="Collezione" sub={`${meta.unlocked.length}/${ROSTER.length} calciatori sbloccati`} right={<Btn variant="ghost" data-testid="collection-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 grid grid-cols-2 gap-2 overflow-y-auto">
        {ROSTER.map((r) => {
          const on = meta.unlocked.includes(r.id);
          return (
            <div key={r.id} data-testid={`collection-${r.id}`} className={`p-2 border-2 ${on ? "border-slate-600 bg-[#141c2e]" : "border-slate-800 bg-slate-950 opacity-50"}`}>
              <div className="flex items-center gap-2">
                <Avatar p={{ baseId: r.id, element: r.element, uid: r.id, name: r.name }} size={44} ko={!on} />
                <div className="min-w-0">
                  <div className="font-pixel text-[8px] text-white truncate">{on ? r.name : "???"}</div>
                  <div className="font-body text-slate-400 text-sm">{ROLES[r.role]}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <ElementBadge element={r.element} />
                <span className="font-pixel text-[7px] text-amber-300">{"★".repeat(r.tier)}</span>
              </div>
              {on && <MoveInfo move={r.move} />}
            </div>
          );
        })}
      </div>
      <div className="p-3 font-body text-slate-400 text-base">Recluta un calciatore durante una run per sbloccarlo come titolare iniziale.</div>
    </div>
  );
}
