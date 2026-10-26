import { useEffect, useRef, useState } from "react";
import { Check, Lock, Swords, Users, ShoppingBag, Dumbbell, Sparkles, Trophy, Navigation, HelpCircle, X, ArrowDown } from "lucide-react";
import { OVERWORLD_ROUTES, OVERWORLD_NODE_LABELS, selectableOverworldNode } from "@/game/overworld";
import { MAP_LAYOUT, mapNodes, markerNode, nodeState, environmentFor } from "@/game/overworldPresentation";
import { Avatar } from "./ui";
import "./overworld.css";

const icons = { battle: Swords, recruit: Users, shop: ShoppingBag, training: Dumbbell, event: Sparkles };
const states = { completed: "completata", current: "in corso", available: "raggiungibile", locked: "bloccata", unknown: "da scoprire" };

function EnvironmentLayer({ environment }) {
  return <div className={`ow-environment ow-env-${environment.decoration}`} aria-hidden="true">
    <div className="ow-river" /><div className="ow-road" />
    {[0, 1, 2, 3].map(i => <div key={i} className={`ow-scenery ow-scenery-${i}`}>
      <div className="ow-pitch"><i /><b /></div><div className="ow-building"><i /><i /><i /></div>
      <div className="ow-trees"><i /><i /><i /></div>
    </div>)}
    <div className="ow-royal-district" /><span className="ow-district-label">TERRITORIO ROYAL</span>
  </div>;
}

function MapPath({ nodes, run }) {
  const routes = run.overworld.routeId ? OVERWORLD_ROUTES.filter(r => r.id === run.overworld.routeId) : OVERWORLD_ROUTES;
  const point = p => `${p.x * MAP_LAYOUT.width / 100},${p.y}`;
  return <svg className="ow-paths" viewBox={`0 0 ${MAP_LAYOUT.width} ${MAP_LAYOUT.height}`} preserveAspectRatio="none" aria-hidden="true">
    {routes.map(route => {
      const points = [MAP_LAYOUT.start, ...nodes.filter(n => n.routeId === route.id).map(n => n.position), MAP_LAYOUT.checkpoint];
      return <g key={route.id} className={`ow-path-${route.id}`}>{points.slice(1).map((to, i) => {
        const from = points[i], middle = (from.y + to.y) / 2;
        const d = `M${point(from)} C${from.x * 3.6},${middle} ${to.x * 3.6},${middle} ${point(to)}`;
        const done = run.overworld.routeId === route.id && i < run.overworld.completedWave;
        return <g key={i}><path className="ow-path-shadow" d={d} /><path className={`ow-path ${done ? "ow-path-done" : ""}`} d={d} /></g>;
      })}</g>;
    })}
  </svg>;
}

function MapNode({ node, state, overview, onPreview, nodeRef }) {
  const boss = !node.routeId;
  const Icon = state === "unknown" ? HelpCircle : state === "completed" ? Check : boss ? Trophy : icons[node.type];
  const visibleName = state === "unknown" ? "Da scoprire" : node.name;
  return <div ref={nodeRef} className={`ow-stop ow-${state} ${boss ? "ow-boss" : ""} ${overview ? "ow-overview-stop" : ""}`}
    style={{ left: `${node.position.x}%`, top: node.position.y }}>
    {boss && <div className="ow-stadium" aria-hidden="true"><span>R</span><i /><i /></div>}
    <button type="button" data-testid={`map-node-${boss ? "royal-10" : `${node.routeId}-${node.wave}`}`}
      disabled={state !== "available"} aria-current={state === "current" ? "step" : undefined}
      aria-label={`W${node.wave}, ${visibleName}, ${states[state]}`}
      className="ow-node" onClick={() => onPreview(node)}>
      <Icon size={boss ? 27 : 22} aria-hidden="true" />
      <span className="ow-wave">{node.wave}</span>
      {state === "locked" && <Lock className="ow-lock" size={12} aria-hidden="true" />}
    </button>
    <span className="ow-place">{boss && <small>CHECKPOINT · W10</small>}{visibleName}</span>
    {state === "available" && <span className="ow-reachable">{overview ? OVERWORLD_ROUTES.find(r => r.id === node.routeId).name : "ESPLORA"}</span>}
  </div>;
}

function NodePreview({ node, run, onClose, onEnter }) {
  const dialog = useRef(null), submitted = useRef(false);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal?.();
    return () => previous?.focus?.();
  }, []);
  const enter = () => {
    if (submitted.current || !selectableOverworldNode(run, node.nodeId)) return;
    submitted.current = true;
    onEnter(node.nodeId);
  };
  return <dialog ref={dialog} open={typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal ? true : undefined}
    className="ow-preview" aria-labelledby="ow-preview-title" onCancel={onClose}>
    <button type="button" className="ow-preview-close" aria-label="Chiudi anteprima" onClick={onClose}><X size={22} /></button>
    <div className="ow-eyebrow">W{node.wave} · {node.environment.name}</div>
    <h2 id="ow-preview-title">{node.name}</h2>
    <div className="ow-preview-type">{!node.routeId ? "Boss · Royal Academy" : OVERWORLD_NODE_LABELS[node.type]}</div>
    <p>{node.description}</p>
    <p className="ow-risk">{node.risk} · Una tappa</p>
    {!run.overworld.routeId && <p className="ow-route-warning">Entrando scegli il percorso {OVERWORLD_ROUTES.find(r => r.id === node.routeId)?.name} fino alla Royal.</p>}
    <button type="button" data-testid="map-enter" className="ow-enter" onClick={enter}>Entra <ArrowDown size={18} /></button>
  </dialog>;
}

export default function OverworldMap({ run, onSelect, onResume }) {
  const [preview, setPreview] = useState(null);
  const nodes = mapNodes(run), marker = markerNode(run, nodes), environment = environmentFor(run);
  const currentRef = useRef(null), checkpointRef = useRef(null);
  const focusCurrent = () => currentRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  useEffect(() => {
    if (run.overworld.routeId) currentRef.current?.scrollIntoView?.({ block: "center", behavior: "auto" });
  }, [run.wave, run.overworld.routeId]);
  const current = nodes.find(n => nodeState(run, n) === "available")?.nodeId || marker.nodeId;
  return <section className="ow-map" aria-label="Mappa verso la Royal" data-testid="overworld-map"
    style={{ "--ow-ground": environment.palette[0], "--ow-accent": environment.palette[1] }}>
    <div className="ow-area-heading">
      <div className="ow-eyebrow">FOOTBALL FRONTIER · AREA 01</div>
      <h1>La strada per la <em>Royal</em></h1>
      <p>{run.overworld.routeId ? environment.description : "Scegli dove partire. Il tuo percorso comincia qui."}</p>
      <button type="button" className="ow-destination" onClick={() => checkpointRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" })}>
        <Trophy size={18} /><span>ROYAL ACADEMY <small data-testid="map-progress">{run.overworld.completedWave}/10 tappe · {10 - run.overworld.completedWave} alla Royal</small></span><ArrowDown size={18} />
      </button>
    </div>
    <div className={`ow-world ${run.overworld.routeId ? "ow-journey" : ""}`} style={{ height: MAP_LAYOUT.height }}>
      <EnvironmentLayer environment={environment} />
      <MapPath nodes={nodes} run={run} />
      <div className="ow-departure"><span>RAIMON</span><small>IL VIAGGIO COMINCIA QUI</small></div>
      {!run.overworld.routeId && <div className="ow-fork-label">SCEGLI UNA STRADA</div>}
      {run.overworld.routeId && <div className="ow-route-sign"><Lock size={12} /> {OVERWORLD_ROUTES.find(r => r.id === run.overworld.routeId)?.name}<span>le altre strade restano al bivio</span></div>}
      {nodes.map(node => <MapNode key={node.nodeId} node={node} state={nodeState(run, node)} overview={!run.overworld.routeId}
        nodeRef={el => { if (!node.routeId) checkpointRef.current = el; if (node.nodeId === current) currentRef.current = el; }} onPreview={setPreview} />)}
      <div className="ow-marker" data-testid="map-player-marker" aria-label={`Squadra: ${marker.name}`}
        style={{ left: `${marker.position.x}%`, top: marker.nodeId === "departure" ? marker.position.y : marker.position.y - 43 }}>
        <Avatar p={run.team[0]} size={30} /><span>VOI</span>
      </div>
    </div>
    <div className="ow-map-controls">
      <button type="button" onClick={focusCurrent}><Navigation size={18} /> La tua posizione</button>
      {run.pending ? <button type="button" data-testid="next-wave-btn" className="ow-resume" onClick={onResume}>Riprendi la tappa</button> : <span>TOCCA UN LUOGO ILLUMINATO</span>}
    </div>
    {preview && <NodePreview key={preview.nodeId} node={preview} run={run} onClose={() => setPreview(null)} onEnter={id => { setPreview(null); onSelect(id); }} />}
  </section>;
}
