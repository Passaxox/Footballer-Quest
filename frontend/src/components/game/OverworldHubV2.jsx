import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BOSSES } from "@/game/data";
import { graphForRunV2, selectableNodesV2 } from "@/game/overworldRunV2";
import { createVerticalMapLayoutV2, focusYV2, scrollTopForV2, segmentForWave, segmentWindowV2 } from "@/game/overworldVerticalMapV2";
import { DEFAULT_OVERWORLD_ART_PACK_V2 } from "@/game/overworldArtPackV2";
import { deriveMapStatesV2 } from "@/game/overworldMapViewV2";
import { createOverworldMapLayoutV2 } from "@/game/overworldMapLayoutV2";
import { getScenario } from "@/game/scenarios";
import { DIFFICULTIES } from "@/game/rules";
import { Btn, XpReport } from "./ui";
import DistrictMapV2, { ACTIVITY_LABELS, districtName, nodeActivity } from "./DistrictMapV2";

const cache = new WeakMap();
// States still come from the S1 view-model, which needs the S1 layout for its node/edge lists.
const layoutsFor = graph => {
  if (!cache.has(graph)) cache.set(graph, { vertical: createVerticalMapLayoutV2(graph), legacy: createOverworldMapLayoutV2(graph) });
  return cache.get(graph);
};
const KIND_ICON = { battle: "⚽", recruit: "👤", shop: "🛍", training: "⬆", event: "❓", boss: "👑" };
const kindOf = node => node.boss ? "boss" : node.type;

export default function OverworldHubV2({ run, onSelectNode, onTeam, onPause, onAbandon, artPack = DEFAULT_OVERWORLD_ART_PACK_V2 }) {
  const options = selectableNodesV2(run);
  const graph = graphForRunV2(run), { vertical: layout, legacy } = layoutsFor(graph);
  const graphNodes = useMemo(() => new Map(graph.nodes.map(n => [n.nodeId, n])), [graph]);
  const states = deriveMapStatesV2(legacy, run, options.map(o => o.nodeId));
  const bossWave = Object.keys(BOSSES).map(Number).find(wave => wave >= run.wave);
  const [focusRaw, setFocus] = useState(null);
  const [browse, setBrowse] = useState({ wave: run.wave, segment: null });
  const [recenter, setRecenter] = useState(0);
  const currentSegment = segmentForWave(layout, run.wave);
  const segment = browse.wave === run.wave && browse.segment ? browse.segment : currentSegment;
  const focusId = options.some(n => n.nodeId === focusRaw) ? focusRaw : options.length === 1 ? options[0].nodeId : null;
  const focused = options.find(n => n.nodeId === focusId);
  // One commit per route state: the ref blocks same-tick double taps before React re-renders.
  const commitKey = `${run.overworld.transition}:${run.overworld.path.length}:${run.overworld.selectedNodeId}`;
  const committed = useRef(null);
  const confirm = () => {
    if (!focused || committed.current === commitKey) return;
    committed.current = commitKey;
    onSelectNode(focused.nodeId);
  };

  // Brings the Caravan (or the first wave of a browsed segment) into a readable spot. It only runs when the
  // route, segment or "centre" request changes, so manual scrolling is never overridden by re-renders.
  const scroller = useRef(null);
  useLayoutEffect(() => {
    const el = scroller.current, map = el?.querySelector(".v2-map");
    if (!el || !map) return;
    const view = segmentWindowV2(layout, segment);
    const y = segment === currentSegment ? focusYV2(layout, states.caravanNodeId, run.wave)
      : layout.nodes.find(n => n.wave === view.fromWave).y;
    el.scrollTop = map.offsetTop + scrollTopForV2({
      y, top: view.top, bottom: view.bottom, contentHeight: map.offsetHeight, viewportHeight: el.clientHeight,
      anchor: segment === currentSegment ? 0.04 : 0.1,
    });
  }, [layout, segment, currentSegment, run.wave, commitKey, recenter]); // eslint-disable-line react-hooks/exhaustive-deps

  const goto = value => setBrowse({ wave: run.wave, segment: value });
  const here = segment === currentSegment;
  const location = getScenario(run.scenarioState?.id).displayName;
  const description = node => node.boss ? "Affronta il boss. La vittoria cura completamente la squadra." : ACTIVITY_LABELS[node.type][1];

  return <div className="v2-hub" data-testid="overworld-v2-hub">
    <header className="v2-hud">
      <div className="v2-hud-stats">
        <strong>Wave {run.wave} / 50</strong>
        <small><span>{run.money} Prestigio</span> · {location} · {DIFFICULTIES[run.difficultyId].label}</small>
      </div>
      <div className="v2-hud-actions">
        <button type="button" data-testid="v2-team-btn" onClick={onTeam} aria-label="Squadra e Zaino"><span aria-hidden="true">👥</span>Squadra</button>
        <button type="button" data-testid="pause-run-btn" onClick={onPause} aria-label="Salva e menu"><span aria-hidden="true">💾</span>Salva</button>
        <button type="button" data-testid="abandon-btn" onClick={onAbandon} aria-label="Abbandona la run"><span aria-hidden="true">🏳</span>Abbandona</button>
      </div>
    </header>
    <nav className="v2-frame-nav" aria-label="Distretti della mappa">
      <button type="button" data-testid="v2-frame-prev" disabled={segment === 1} onClick={() => goto(segment - 1)} aria-label="Distretto precedente">◀</button>
      <button type="button" data-testid="v2-frame-current" className="v2-frame-title" disabled={here} onClick={() => setBrowse({ wave: run.wave, segment: null })}>
        <strong>{districtName(segment)}</strong>
        <small>W{(segment - 1) * 10 + 1}–W{segment * 10}{here ? " · attuale" : " · torna qui"}</small>
      </button>
      <button type="button" data-testid="v2-frame-next" disabled={segment === layout.segments.length} onClick={() => goto(segment + 1)} aria-label="Distretto successivo">▶</button>
      <button type="button" data-testid="v2-center-caravan" className="v2-center" aria-label="Centra il Caravan" onClick={() => { setBrowse({ wave: run.wave, segment: null }); setRecenter(n => n + 1); }}>🚐</button>
    </nav>
    <div className="v2-map-scroll" ref={scroller} data-testid="v2-map-scroll">
      {run.lastProgression?.report && <details className="v2-xp"><summary>Esperienza squadra</summary><XpReport report={run.lastProgression.report} /></details>}
      <DistrictMapV2 layout={layout} graphNodes={graphNodes} segment={segment} states={states} options={options} focusId={focusId}
        onFocus={setFocus} artPack={artPack} caravanNodeId={states.caravanNodeId} />
    </div>
    <footer className="v2-hub-dock">
      <section className="v2-tactical" data-testid="v2-tactical-panel" aria-label="Destinazioni raggiungibili">
        {options.length > 0 && <div className={`v2-chips${options.length === 1 ? " v2-chips-solo" : ""}`}>
          {options.map(node => <button key={node.nodeId} type="button" data-testid={`v2-node-${node.nodeId}`} aria-pressed={focusId === node.nodeId}
            className={`v2-destination v2-type-${kindOf(node)}${focusId === node.nodeId ? " is-focus" : ""}`} onClick={() => setFocus(node.nodeId)}>
            <strong>{getScenario(node.locationId).displayName}</strong>
            <span><span aria-hidden="true">{KIND_ICON[kindOf(node)]}</span> {nodeActivity(node)}</span>
          </button>)}
        </div>}
        <p className="v2-preview" role="status" hidden={!focused && options.length > 0}>
          {focused ? `W${focused.wave} · ${options.length === 1 ? `${nodeActivity(focused)} · ` : ""}${description(focused)}`
            : options.length ? "" : `Run in corso · prossimo boss ${BOSSES[bossWave]?.team} · W${bossWave}`}
        </p>
      </section>
      <Btn data-testid="v2-confirm-btn" className="v2-cta" disabled={!focused} onClick={confirm}>
        {focused ? `Conferma · ${getScenario(focused.locationId).displayName} · W${focused.wave}` : "Scegli una destinazione"}
      </Btn>
    </footer>
  </div>;
}
