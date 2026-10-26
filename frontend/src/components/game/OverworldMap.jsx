import { Swords, Users, ShoppingBag, Dumbbell, Sparkles, Flag, Check } from "lucide-react";
import { OVERWORLD_AREA, OVERWORLD_ROUTES, OVERWORLD_NODE_LABELS, routeNodes, ROYAL_CHECKPOINT, selectableOverworldNode } from "@/game/overworld";

const icons = { battle: Swords, recruit: Users, shop: ShoppingBag, training: Dumbbell, event: Sparkles };

export default function OverworldMap({ run, onSelect }) {
  const state = run.overworld;
  const route = OVERWORLD_ROUTES.find(r => r.id === state.routeId);
  const tile = (node, checkpoint = false) => {
    const chosenRoute = node.routeId === state.routeId || checkpoint;
    const completed = chosenRoute && node.wave <= state.completedWave;
    const selected = state.selectedNodeId === node.nodeId;
    const available = !!selectableOverworldNode(run, node.nodeId);
    const Icon = completed ? Check : checkpoint ? Flag : icons[node.type];
    const label = checkpoint ? "Royal · Checkpoint" : OVERWORLD_NODE_LABELS[node.type];
    return <button key={node.nodeId} type="button" disabled={!available}
      data-testid={`map-node-${checkpoint ? "royal-10" : `${node.routeId}-${node.wave}`}`}
      aria-label={`Ondata ${node.wave}, ${label}${node.routeId ? `, ${OVERWORLD_ROUTES.find(r => r.id === node.routeId).name}` : ""}${completed ? ", completata" : selected ? ", in corso" : available ? ", seleziona" : ", non disponibile"}`}
      aria-current={selected ? "step" : undefined}
      onClick={() => onSelect(node.nodeId)}
      className={`w-full min-h-[60px] border-2 px-1 py-2 flex flex-col items-center justify-center gap-1 text-xs leading-tight transition-colors
        ${available ? "border-amber-300 bg-amber-950/50 text-amber-100 hover:bg-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300" :
        selected ? "border-sky-300 bg-sky-950 text-sky-100" : completed ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" :
        route && !chosenRoute ? "border-slate-800 bg-slate-950 text-slate-600" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
      <span className="flex items-center gap-1"><span className="text-[10px]">{node.wave}</span><Icon size={16} aria-hidden="true" /></span>
      <span>{label}</span>
    </button>;
  };
  return <section aria-label="Mappa verso la Royal" data-testid="overworld-map" className="border-2 border-slate-600 bg-[#0a1220] p-2 space-y-3">
    <div>
      <div className="text-xs uppercase tracking-wide text-sky-300">{OVERWORLD_AREA.macroScenarioName}</div>
      <h2 className="text-xl text-white">{OVERWORLD_AREA.displayName} <span className="text-sm text-slate-400">W1–W10</span></h2>
      <p className="text-sm text-slate-300">{route ? `Percorso: ${route.name}. Tocca la prossima casella evidenziata.` : "Scegli la prima casella: il percorso resta fissato fino alla Royal."}</p>
      <p className="text-xs text-slate-400 mt-1">Una tappa per ondata. Le caselle completate non si possono ripetere.</p>
      <p data-testid="map-progress" className="text-xs text-emerald-300 mt-1">{state.completedWave}/10 tappe completate{run.pending ? " · Riprendi la tappa in corso" : ""}</p>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {OVERWORLD_ROUTES.map(r => <div key={r.id} className="min-w-0">
        <h3 className="text-sm text-center text-amber-200">{r.name}</h3>
        <p className="min-h-[36px] text-[10px] leading-tight text-center text-slate-400 mb-2">{r.hint}</p>
        {routeNodes(r).map((node, i) => <div key={node.nodeId}>
          {i > 0 && <div aria-hidden="true" className={`h-2 w-0 border-l-2 mx-auto ${state.routeId === r.id ? "border-amber-700" : "border-slate-700"}`} />}
          {tile(node)}
        </div>)}
      </div>)}
    </div>
    <div className="border-t-2 border-amber-800 pt-2">{tile(ROYAL_CHECKPOINT, true)}</div>
    <p className="text-xs text-slate-400">Ogni percorso: 5 incontri, 1 recluta, 1 negozio, 1 allenamento, 1 evento e la Royal. Nessun premio extra per il percorso.</p>
  </section>;
}
