import { useState } from "react";
import { resolveOverworldArtPackV2 } from "@/game/overworldArtPackV2";
import { segmentWindowV2 } from "@/game/overworldVerticalMapV2";
import { getScenario } from "@/game/scenarios";
import { BOSSES } from "@/game/data";

export const ACTIVITY_LABELS = {
  battle: ["Battaglia", "Affronta gli avversari di questa tappa."],
  recruit: ["Reclutamento", "Incontra un calciatore e valuta il reclutamento."],
  shop: ["Negozio", "Consulta le offerte e scegli come spendere il Prestigio."],
  training: ["Allenamento", "Scegli un esercizio per migliorare la squadra."],
  event: ["Evento", "Leggi la situazione e scegli come agire."],
};
export const STATE_LABELS = {
  completed: "completata", active: "in corso", reachable: "raggiungibile", discarded: "scartata", future: "non ancora raggiungibile",
};
export const districtName = segment => segment === 1 ? "Inazuma Town" : `Distretto ${segment}`;
export const nodeActivity = node => node.boss ? `Boss · ${BOSSES[node.wave].team}` : ACTIVITY_LABELS[node.type][0];


const ROAD_ORDER = ["future", "discarded", "reachable", "active", "completed"];
// Greedy word wrap into at most two short lines, so neighbouring lane labels never collide.
function wrapLabel(text, max = 11) {
  const lines = [];
  for (const word of text.split(" ")) {
    if (lines.length && `${lines.at(-1)} ${word}`.length <= max) lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  const out = lines.slice(0, 2);
  if (lines.length > 2) out[1] = `${out[1]}…`;
  return out.map(line => line.length > max + 1 ? `${line.slice(0, max)}…` : line);
}
const road = ([a, b]) => `M${a.x} ${a.y}C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;

// Local SVG icons (24-unit box). Each activity has its own shape and accent colour, so no two kinds look alike.
const ICONS = {
  battle: <><circle r="11" /><path className="v2-ico-cut" d="M0 -5L5 -1L3 5H-3L-5 -1Z" /></>,
  recruit: <><circle cy="-5" r="5" /><path d="M-10 11C-10 2 10 2 10 11Z" /></>,
  shop: <><circle r="12" /><text className="v2-ico-cut v2-ico-text v2-ico-coin" y="7" textAnchor="middle">$</text></>,
  training: <path d="M0 -12L12 0H5V11H-5V0H-12Z" />,
  event: <text className="v2-ico-text" y="8" textAnchor="middle">?</text>,
  boss: <path d="M-13 9L-13 -7L-6 0L0 -11L6 0L13 -7L13 9Z" />,
};

// Falls back to the bundled local placeholder when the configured asset is missing or fails.
function ArtImage({ asset, ...props }) {
  const [failed, setFailed] = useState(false);
  const src = failed || !asset.src ? asset.fallback.src : asset.src;
  return <image href={src} onError={() => setFailed(true)} {...props} />;
}

export default function DistrictMapV2({ layout, graphNodes, segment, states, options, focusId, onFocus, artPack, caravanNodeId }) {
  const view = segmentWindowV2(layout, segment), { width } = layout;
  const inWindow = wave => wave >= view.windowFromWave && wave <= view.windowToWave;
  const nodes = layout.nodes.filter(n => inWindow(n.wave));
  const waves = new Map(layout.nodes.map(n => [n.nodeId, n.wave]));
  const byId = new Map(layout.nodes.map(n => [n.nodeId, n]));
  const optionIds = new Set(options.map(o => o.nodeId));
  const background = resolveOverworldArtPackV2(artPack, { frameId: `district:${segment}:A` }).background;
  const caravanArt = resolveOverworldArtPackV2(artPack, { frameId: `district:${segment}:A` }).caravan;
  const edges = layout.edges.filter(e => inWindow(waves.get(e.fromId)) && inWindow(waves.get(e.toId)))
    .sort((a, b) => ROAD_ORDER.indexOf(states.edgeState.get(a.edgeId)) - ROAD_ORDER.indexOf(states.edgeState.get(b.edgeId)));
  const waveList = Array.from({ length: view.windowToWave - view.windowFromWave + 1 }, (_, i) => view.windowFromWave + i);
  const seams = waveList.filter(w => w % 10 === 0 && w < layout.segments.at(-1).toWave);
  const y = value => value - view.top;

  const caravan = caravanNodeId ? byId.get(caravanNodeId) : null;
  const caravanSpot = caravan ? (inWindow(caravan.wave) ? { x: caravan.x, y: caravan.y, mode: "node" } : null)
    : view.windowFromWave === 1 ? { x: width / 2, y: layout.geometry.topPad, mode: "start" } : null;

  return <div className="v2-map" data-testid="v2-district-map" data-segment={segment} data-frame-id={`district:${segment}`} data-art-pack={artPack.id}
    style={{ aspectRatio: `${width} / ${view.height}` }}>
    <svg viewBox={`0 ${view.top} ${width} ${view.height}`} className="v2-map-svg" role="img" preserveAspectRatio="none"
      aria-label={`Mappa verticale ${districtName(segment)}, wave ${view.fromWave}-${view.toWave}`}>
      <defs>
        <pattern id="v2-tiles" width="60" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0L60 15L30 30L0 15Z" fill="none" stroke="#38bdf8" strokeOpacity=".07" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect x="0" y={view.top} width={width} height={view.height} fill="#0b1220" />
      <ArtImage asset={background} x="0" y={view.top} width={width} height={view.height} preserveAspectRatio="none" />
      <rect x="0" y={view.top} width={width} height={view.height} fill="url(#v2-tiles)" />
      <g className="v2-map-deco" aria-hidden="true">
        {waveList.map(w => <g key={w} className={w < view.fromWave || w > view.toWave ? "v2-wave-context" : undefined}>
          <path className="v2-wave-rule" d={`M26 ${y(layout.nodes.find(n => n.wave === w).y)}H${width}`} />
          <text className="v2-map-wave" x="3" y={y(layout.nodes.find(n => n.wave === w).y) + 4}>W{w}</text>
        </g>)}
        {seams.map(w => {
          const mid = (byId.get(layout.nodes.find(n => n.wave === w).nodeId).y + layout.geometry.waveSpacing / 2);
          return <g key={w} data-seam-wave={w}>
            <path className="v2-seam-rule" d={`M0 ${y(mid)}H${width}`} />
            <text className="v2-seam-text" x={width - 4} y={y(mid) - 4} textAnchor="end">{districtName(w / 10 + 1)}</text>
          </g>;
        })}
      </g>
      <g className="v2-map-roads">
        {edges.map(edge => {
          const state = states.edgeState.get(edge.edgeId), d = road(edge.points.map(p => ({ x: p.x, y: y(p.y) })));
          return <g key={edge.edgeId} className={`v2-road v2-road-${state}`}>
            <path className="v2-road-bed" d={d} data-edge-id={edge.edgeId} data-state={state} data-segment-link={edge.crossesSegment ? "true" : undefined} />
            <path className="v2-road-line" d={d} />
          </g>;
        })}
      </g>
      <g className="v2-map-nodes">
        {nodes.map(node => {
          const info = graphNodes.get(node.nodeId), state = states.nodeState.get(node.nodeId);
          const kind = node.isBoss ? "boss" : info.type, r = node.isBoss ? layout.geometry.bossRadius : layout.geometry.nodeRadius;
          const crest = info.boss && info.boss.teamId ? resolveOverworldArtPackV2(artPack, { frameId: `district:${segment}:A`, teamId: info.boss.teamId, environmentId: info.environmentId }).crest : null;
          const name = node.isBoss ? BOSSES[node.wave].team : getScenario(info.locationId).displayName;
          return <g key={node.nodeId} className={`v2-pad v2-type-${kind} v2-pad-${state}${focusId === node.nodeId ? " v2-pad-focus" : ""}`}
            data-node-id={node.nodeId} data-state={state} data-wave={node.wave} data-kind={kind} transform={`translate(${node.x} ${y(node.y)})`}>
            <circle className="v2-disc" r={r} />
            {state !== "discarded" && <g className="v2-ico">{ICONS[kind]}</g>}
            {state === "completed" && <g className="v2-pad-check"><circle cx={r * .72} cy={-r * .72} r="10" /><path d={`M${r * .72 - 5} ${-r * .72}l4 4l7 -8`} /></g>}
            {state === "discarded" && <path className="v2-pad-cross" d="M-11 -11L11 11M11 -11L-11 11" />}
            {crest && <ArtImage asset={crest} x={r * .5} y={-r - 20} width="30" height="36" data-crest={info.boss.teamId} />}
            {state !== "discarded" && !(caravan && node.wave === caravan.wave - 1 && state === "completed") && <text className="v2-label" textAnchor="middle">{wrapLabel(name).map((line, i) => <tspan key={i} x="0" y={r + 14 + i * 13}>{line}</tspan>)}</text>}
          </g>;
        })}
      </g>
      {caravanSpot && <g className="v2-caravan-wrap" transform={`translate(${caravanSpot.x} ${y(caravanSpot.y)})`} aria-hidden="true">
        {caravanSpot.mode === "node" && <circle className="v2-here-ring" r="38" />}
        <ArtImage asset={caravanArt} className="v2-caravan" data-testid="v2-caravan" data-mode={caravanSpot.mode} x="-36" y="-64" width="72" height="43" />
        <text className="v2-here-text" y="-68" textAnchor="middle">{caravanSpot.mode === "start" ? "PARTENZA" : "QUI"}</text>
      </g>}
    </svg>
    {nodes.filter(n => optionIds.has(n.nodeId)).map(node => {
      const info = graphNodes.get(node.nodeId), size = 68;
      return <button key={node.nodeId} type="button" data-testid={`v2-map-node-${node.nodeId}`} className={`v2-map-hit${focusId === node.nodeId ? " is-focus" : ""}`}
        style={{ left: `${node.x / width * 100}%`, top: `${y(node.y) / view.height * 100}%`, width: `${size / width * 100}%`, height: `${size / view.height * 100}%` }}
        aria-pressed={focusId === node.nodeId}
        aria-label={`Wave ${node.wave}, ${getScenario(info.locationId).displayName}, ${nodeActivity(info)}. Seleziona`} onClick={() => onFocus(node.nodeId)} />;
    })}
  </div>;
}
