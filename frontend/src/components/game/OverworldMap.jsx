import { useEffect, useRef, useState } from "react";
import { Lock, Swords, Users, ShoppingBag, Dumbbell, Sparkles, Trophy, Navigation, X, ArrowDown, Zap, Check, Flame, Shield } from "lucide-react";
import { OVERWORLD_NODE_LABELS, selectableOverworldNode } from "@/game/overworld";
import { bossDef } from "@/game/campaign";
import { actMapFor, mapHeight, nodePosition, nodePortrait, nodeState, edgeState, allEdges, markerNode } from "@/game/overworldPresentation";
import { Avatar } from "./ui";
import "./overworld.css";

const icons = { battle: Swords, recruit: Users, shop: ShoppingBag, training: Dumbbell, event: Sparkles, rival: Flame, anomaly: Zap, boss: Trophy, miniboss: Shield };
const states = { completed: "completata", current: "in corso", available: "raggiungibile", locked: "bloccata", skipped: "non scelta" };
const DESCRIPTIONS = {
  battle: "Avversari della zona. Vincere può portare un nuovo compagno.",
  recruit: "Scouting: un talento locale o una versione sbloccata dalla storia.",
  shop: "Scorte e oggetti per il viaggio.",
  training: "Affina la squadra prima della prossima sfida.",
  event: "Qualcosa di inatteso sta per succedere.",
  rival: "Il rivale dell'atto si fa vedere prima dello scontro decisivo.",
  miniboss: "Miniboss: battilo per scegliere tra due premi (reclutamento specifico, oggetto raro o risveglio dello Spirito Guerriero).",
  anomaly: "FACOLTATIVA. Uno squarcio nel tempo: un avversario di un'altra era e una forza del futuro da risvegliare.",
};

function MapNode({ node, state, onPreview, nodeRef }) {
  const Icon = icons[node.type];
  const face = nodePortrait(node);
  const boss = node.type === "boss";
  const pos = nodePosition(node);
  const label = boss ? node.laneName : node.type === "miniboss" ? bossDef(node.actId, node.bossId).team : OVERWORLD_NODE_LABELS[node.type];
  return <div ref={nodeRef} className={`ow-stop ow-${state} ow-type-${node.type}`} style={{ left: `${pos.x}%`, top: pos.y }}>
    <button type="button" data-testid={`map-node-${node.nodeId}`} disabled={state !== "available"} aria-current={state === "current" ? "step" : undefined}
      aria-label={`W${node.wave}, ${label}, ${node.laneName}, ${states[state]}`} className="ow-node" onClick={() => onPreview(node)}>
      {face ? <Avatar p={face} size={boss ? 68 : 46} /> : <Icon size={boss ? 30 : 22} aria-hidden="true" />}
      {face && !boss && <span className="ow-badge"><Icon size={11} /></span>}
      {state === "completed" && <span className="ow-done-check"><Check size={20} /></span>}
      {state === "locked" && !face && <Lock className="ow-badge" size={12} aria-hidden="true" />}
    </button>
    <span className="ow-wave">W{node.wave}</span>
    <span className="ow-place">{label}</span>
  </div>;
}

function NodePreview({ node, run, onClose, onEnter }) {
  const dialog = useRef(null), submitted = useRef(false);
  useEffect(() => { dialog.current?.showModal?.(); }, []);
  const enter = () => {
    if (submitted.current || !selectableOverworldNode(run, node.nodeId)) return;
    submitted.current = true; onEnter(node.nodeId);
  };
  const boss = node.type === "boss" ? bossDef(node.actId, node.bossId) : null;
  const mini = node.type === "miniboss" ? bossDef(node.actId, node.bossId) : null;
  return <dialog ref={dialog} open={typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal ? true : undefined}
    className="ow-preview" aria-labelledby="ow-preview-title" onCancel={onClose} data-testid="map-preview">
    <button type="button" className="ow-preview-close" aria-label="Chiudi anteprima" onClick={onClose}><X size={22} /></button>
    <div className="ow-eyebrow">W{node.wave} · {node.laneName}</div>
    <h2 id="ow-preview-title">{boss ? boss.team : OVERWORLD_NODE_LABELS[node.type]}</h2>
    <div className="ow-preview-type">{boss ? "Checkpoint · Boss" : node.environment}</div>
    <p data-testid="map-preview-desc">{boss ? boss.intro : DESCRIPTIONS[node.type]}</p>
    {mini && <p data-testid="map-miniboss-team" className="ow-route-warning">{mini.team}: {mini.intro}</p>}
    {(boss || mini)?.reduced && <p className="text-xs text-slate-400">Squadra ridotta: {(boss || mini).reduced}</p>}
    {node.type === "anomaly" && <p className="ow-route-warning" data-testid="map-anomaly-warning">Anomalia segnalata: puoi entrare o scegliere un'altra tappa.</p>}
    <button type="button" data-testid="map-enter" className="ow-enter" onClick={enter}>Entra <ArrowDown size={18} /></button>
  </dialog>;
}

export default function OverworldMap({ run, onSelect, onResume }) {
  const [preview, setPreview] = useState(null);
  const map = actMapFor(run);
  const height = mapHeight(map);
  const viewportRef = useRef(null), currentRef = useRef(null);
  const center = (behavior) => {
    const vp = viewportRef.current, el = currentRef.current;
    if (!vp || !el) return;
    const v = vp.getBoundingClientRect(), r = el.getBoundingClientRect();
    const top = Math.max(0, vp.scrollTop + r.top - v.top - (vp.clientHeight - r.height) / 2);
    if (typeof vp.scrollTo === "function") vp.scrollTo({ top, behavior }); else vp.scrollTop = top;
  };
  useEffect(() => { center("auto"); }, [run.wave, run.pending?.overworldNodeId]);
  const states = Object.fromEntries(map.nodes.map((n) => [n.nodeId, nodeState(run, n)]));
  const focusId = map.nodes.find((n) => states[n.nodeId] === "available" || states[n.nodeId] === "current")?.nodeId;
  const marker = markerNode(run, map);
  const markerPos = marker && nodePosition(marker);
  return <section className="ow-map flex-1 flex flex-col min-h-0" aria-label={`Mappa ${map.act.title}`} data-testid="overworld-map">
    <div className="ow-viewport" ref={viewportRef} data-testid="overworld-viewport" tabIndex={0}>
      <div className="ow-world" style={{ height }}>
        <div className="ow-act-banner"><h1 data-testid="map-act-title">ATTO {map.act.index} · {map.act.title}</h1><p>Verso W{map.act.toWave}: {map.nodes.filter((n) => n.type === "boss").map((n) => n.laneName).join(" / ")}</p></div>
        <div className="ow-lanes" data-testid="map-lanes">{map.lanes.map((l) => <div key={l.id}><b>{l.name}</b>{l.hint}</div>)}</div>
        <svg className="ow-paths" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {allEdges(map).map(([a, b]) => {
            const p = nodePosition(a), q = nodePosition(b), st = edgeState(run, a, b);
            return <path key={a.nodeId + b.nodeId} vectorEffect="non-scaling-stroke" className={`ow-path ${st === "done" ? "ow-path-done" : st === "open" ? "ow-path-open" : ""}`}
              d={`M${p.x},${p.y} C${p.x},${(p.y + q.y) / 2} ${q.x},${(p.y + q.y) / 2} ${q.x},${q.y}`} />;
          })}
        </svg>
        {map.nodes.map((n) => <MapNode key={n.nodeId} node={n} state={states[n.nodeId]} onPreview={setPreview}
          nodeRef={(el) => { if (n.nodeId === focusId) currentRef.current = el; }} />)}
        {marker && <div className="ow-marker" data-testid="map-player-marker" style={{ left: `${markerPos.x}%`, top: markerPos.y - 26 }}>
          <Avatar p={run.team[0]} size={28} /><span>VOI</span>
        </div>}
      </div>
    </div>
    <div className="ow-map-controls">
      <button type="button" onClick={() => center("smooth")}><Navigation size={18} /> Posizione</button>
      <span data-testid="map-progress">{run.wave - map.act.fromWave}/{map.act.toWave - map.act.fromWave + 1} tappe</span>
      {run.pending ? <button type="button" data-testid="next-wave-btn" className="ow-resume" onClick={onResume}>Riprendi la tappa</button> : <span>Tocca un luogo</span>}
    </div>
    {preview && <NodePreview key={preview.nodeId} node={preview} run={run} onClose={() => setPreview(null)} onEnter={(id) => { setPreview(null); onSelect(id); }} />}
  </section>;
}
