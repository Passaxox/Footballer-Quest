import { useState } from "react";
import { resolveOverworldArtPackV2 } from "@/game/overworldArtPackV2";
import { getScenario } from "@/game/scenarios";
import { BOSSES } from "@/game/data";

export const ACTIVITY_LABELS = {
  battle: ["Battaglia", "Affronta gli avversari di questa tappa."],
  recruit: ["Incontro", "Incontra un calciatore e valuta il reclutamento."],
  shop: ["Negozio", "Consulta le offerte e scegli come spendere il Prestigio."],
  training: ["Allenamento", "Scegli un esercizio per migliorare la squadra."],
  event: ["Evento", "Leggi la situazione e scegli come agire."],
};
const GLYPHS = { battle: "VS", recruit: "+", training: "↑", shop: "$", event: "?" };
export const STATE_LABELS = {
  completed: "completata", active: "in corso", reachable: "raggiungibile", discarded: "scartata", future: "non ancora raggiungibile",
};
export const districtName = segment => segment === 1 ? "Inazuma Town" : `Distretto ${segment}`;
export const nodeActivity = node => node.boss ? `Boss · ${BOSSES[node.wave].team}` : ACTIVITY_LABELS[node.type][0];

const pts = points => points.map(p => `${p.x},${p.y}`).join(" ");
const ROAD_ORDER = ["future", "discarded", "reachable", "active", "completed"];

// Falls back to the bundled local placeholder when the configured asset is missing or fails.
function ArtImage({ asset, ...props }) {
  const [failed, setFailed] = useState(false);
  const src = failed || !asset.src ? asset.fallback.src : asset.src;
  return <image href={src} onError={() => setFailed(true)} {...props} />;
}

function Pitch({ x, y }) {
  return <g className="v2-map-pitch" transform={`translate(${x} ${y})`} aria-hidden="true">
    <rect width="92" height="54" rx="3" /><path d="M46 0V54M0 14H12V40H0M92 14H80V40H92" /><circle cx="46" cy="27" r="10" />
  </g>;
}

export default function DistrictMapV2({ layout, graphNodes, frameId, states, options, focusId, onFocus, artPack, caravanNodeId }) {
  const frame = layout.frames.find(f => f.frameId === frameId);
  const nodes = layout.nodes.filter(n => n.frameId === frameId);
  const edges = frame.edgeIds.map(id => layout.edges.find(e => e.edgeId === id));
  const byId = new Map(layout.nodes.map(n => [n.nodeId, n]));
  const optionIds = new Set(options.map(o => o.nodeId));
  const context = { frameId };
  const background = resolveOverworldArtPackV2(artPack, context).background;
  const locations = [...new Set(nodes.map(n => graphNodes.get(n.nodeId).locationId))].sort();

  const fragments = edges.flatMap(edge => edge.fragments.filter(f => f.frameId === frameId).map(fragment => ({ edge, fragment })))
    .sort((a, b) => ROAD_ORDER.indexOf(states.edgeState.get(a.edge.edgeId)) - ROAD_ORDER.indexOf(states.edgeState.get(b.edge.edgeId)));

  const caravan = caravanNodeId ? byId.get(caravanNodeId) : null;
  let caravanSpot = null;
  if (!caravan) {
    const first = nodes.filter(n => n.wave === frame.fromWave);
    if (frame.fromWave === 1 && first.length) caravanSpot = { y: first.reduce((s, n) => s + n.local.y, 0) / first.length, mode: "start" };
  } else if (caravan.frameId === frameId) {
    caravanSpot = { x: caravan.local.x - 31, y: caravan.local.y - 66, mode: "node" };
  } else {
    const entering = edges.filter(e => e.fromId === caravanNodeId).map(e => e.fragments.find(f => f.frameId === frameId));
    if (entering.length) caravanSpot = { y: entering.reduce((s, f) => s + f.points[0].y, 0) / entering.length, mode: "arrival" };
  }

  return <div className="v2-map" data-testid="v2-district-map" data-frame-id={frameId} data-art-pack={artPack.id}>
    <svg viewBox="0 0 1000 700" className="v2-map-svg" role="img" preserveAspectRatio="xMidYMid meet"
      aria-label={`Mappa ${districtName(frame.segment)}, quadro ${frame.part}, wave ${frame.fromWave}-${frame.toWave}`}>
      <defs>
        <pattern id="v2-tiles" width="80" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0L80 20L40 40L0 20Z" fill="none" stroke="#0f172a" strokeOpacity=".1" strokeWidth="2" />
        </pattern>
      </defs>
      <ArtImage asset={background} x="0" y="0" width="1000" height="700" preserveAspectRatio="none" />
      <rect width="1000" height="700" fill="url(#v2-tiles)" />
      <g className="v2-map-deco" aria-hidden="true">
        {locations.map((locationId, i) => {
          const art = resolveOverworldArtPackV2(artPack, { frameId, locationId }).landmark;
          const x = 60 + Math.floor(i / 2) * 460, y = i % 2 ? 622 : 14, type = getScenario(locationId).locationType;
          return <g key={locationId} data-location-id={locationId}>
            <ArtImage asset={art} x={x} y={y} width="64" height="64" />
            {(type === "field" || type === "stadium") && <Pitch x={x + 84} y={y + 6} />}
          </g>;
        })}
        {Array.from({ length: 5 }, (_, i) => <text key={i} className="v2-map-wave" x={i * 200 + 100} y="100" textAnchor="middle">W{frame.fromWave + i}</text>)}
      </g>
      <g className="v2-map-roads">
        {fragments.map(({ edge, fragment }) => {
          const state = states.edgeState.get(edge.edgeId);
          return <g key={`${edge.edgeId}:${frameId}`} className={`v2-road v2-road-${state}`}>
            <polyline className="v2-road-bed" points={pts(fragment.points)} data-edge-id={edge.edgeId} data-frame-id={frameId} data-state={state} />
            <polyline className="v2-road-line" points={pts(fragment.points)} />
          </g>;
        })}
        {edges.filter(e => e.transition).map(edge => {
          const exits = edge.fromFrameId === frameId, point = edge.fragments.find(f => f.frameId === frameId).points[exits ? 1 : 0];
          const dir = exits ? 1 : -1, x = point.x;
          return <path key={edge.edgeId} className={`v2-seam v2-seam-${states.edgeState.get(edge.edgeId)}`} data-seam={exits ? "exit" : "entry"} data-edge-id={edge.edgeId}
            d={`M${x - 26 * dir} ${point.y - 18}L${x - 6 * dir} ${point.y}L${x - 26 * dir} ${point.y + 18}`} />;
        })}
      </g>
      <g className="v2-map-nodes">
        {nodes.map(node => {
          const info = graphNodes.get(node.nodeId), state = states.nodeState.get(node.nodeId);
          const crest = info.boss && info.boss.teamId ? resolveOverworldArtPackV2(artPack, { frameId, teamId: info.boss.teamId, environmentId: info.environmentId }).crest : null;
          return <g key={node.nodeId} className={`v2-pad v2-pad-${state}${focusId === node.nodeId ? " v2-pad-focus" : ""}${node.isBoss ? " v2-pad-boss" : ""}`}
            data-node-id={node.nodeId} data-state={state} data-wave={node.wave} data-boss={node.isBoss ? "true" : undefined} transform={`translate(${node.local.x} ${node.local.y})`}>
            <circle r={node.isBoss ? 40 : 30} />
            <text y="9" textAnchor="middle">{node.isBoss ? "★" : GLYPHS[info.type]}</text>
            {state === "completed" && <path className="v2-pad-check" d="M-12 -2L-4 7L13 -14" />}
            {state === "discarded" && <path className="v2-pad-cross" d="M-11 -11L11 11M11 -11L-11 11" />}
            {crest && <ArtImage asset={crest} x="22" y="-62" width="34" height="40" data-crest={info.boss.teamId} />}
          </g>;
        })}
      </g>
      {caravanSpot && <ArtImage asset={resolveOverworldArtPackV2(artPack, { frameId }).caravan} className="v2-caravan" data-testid="v2-caravan" data-mode={caravanSpot.mode}
        x={caravanSpot.mode === "node" ? caravanSpot.x : 2} y={caravanSpot.mode === "node" ? caravanSpot.y : caravanSpot.y - 22}
        width={caravanSpot.mode === "node" ? 62 : 56} height={caravanSpot.mode === "node" ? 37 : 34} />}
    </svg>
    {nodes.filter(n => optionIds.has(n.nodeId)).map(node => {
      const info = graphNodes.get(node.nodeId);
      return <button key={node.nodeId} type="button" data-testid={`v2-map-node-${node.nodeId}`} className={`v2-map-hit${focusId === node.nodeId ? " is-focus" : ""}`}
        style={{ left: `${node.local.x / 10}%`, top: `${node.local.y / 7}%` }} aria-pressed={focusId === node.nodeId}
        aria-label={`Wave ${node.wave}, ${getScenario(info.locationId).displayName}, ${nodeActivity(info)}. Seleziona`} onClick={() => onFocus(node.nodeId)} />;
    })}
  </div>;
}
