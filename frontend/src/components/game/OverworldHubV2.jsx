import { useMemo, useRef, useState } from "react";
import { BOSSES } from "@/game/data";
import { graphForRunV2, selectableNodesV2 } from "@/game/overworldRunV2";
import { createOverworldMapLayoutV2 } from "@/game/overworldMapLayoutV2";
import { DEFAULT_OVERWORLD_ART_PACK_V2 } from "@/game/overworldArtPackV2";
import { deriveMapStatesV2 } from "@/game/overworldMapViewV2";
import { getScenario } from "@/game/scenarios";
import { DIFFICULTIES } from "@/game/rules";
import { Btn, Header, Panel, XpReport } from "./ui";
import DistrictMapV2, { ACTIVITY_LABELS, districtName } from "./DistrictMapV2";

const layouts = new WeakMap();
const layoutFor = graph => {
  if (!layouts.has(graph)) layouts.set(graph, createOverworldMapLayoutV2(graph));
  return layouts.get(graph);
};

export default function OverworldHubV2({ run, onSelectNode, onTeam, onPause, onAbandon, artPack = DEFAULT_OVERWORLD_ART_PACK_V2 }) {
  const options = selectableNodesV2(run);
  const graph = graphForRunV2(run), layout = layoutFor(graph);
  const graphNodes = useMemo(() => new Map(graph.nodes.map(n => [n.nodeId, n])), [graph]);
  const states = deriveMapStatesV2(layout, run, options.map(o => o.nodeId));
  const bossWave = Object.keys(BOSSES).map(Number).find(wave => wave >= run.wave);
  const [focusRaw, setFocus] = useState(null);
  const [browse, setBrowse] = useState({ wave: run.wave, frameId: null });
  const frameId = browse.wave === run.wave && browse.frameId ? browse.frameId : states.currentFrameId;
  const frameIndex = layout.frames.findIndex(f => f.frameId === frameId), frame = layout.frames[frameIndex];
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
  const go = index => setBrowse({ wave: run.wave, frameId: layout.frames[index].frameId });
  const label = node => node.boss ? `Boss · ${BOSSES[node.wave].team}` : ACTIVITY_LABELS[node.type][0];

  return <div className="v2-hub" data-testid="overworld-v2-hub">
    <Header title={`Wave ${run.wave} / 50`} sub="Overworld V2 · sperimentale" />
    <div className="fq-scroll v2-hub-scroll p-2 space-y-2">
      <XpReport report={run.lastProgression?.report} />
      <nav className="v2-frame-nav" aria-label="Quadri della mappa">
        <button type="button" data-testid="v2-frame-prev" disabled={frameIndex === 0} onClick={() => go(frameIndex - 1)} aria-label="Quadro precedente">◀</button>
        <button type="button" data-testid="v2-frame-current" className="v2-frame-title" disabled={frameId === states.currentFrameId} onClick={() => setBrowse({ wave: run.wave, frameId: null })}>
          <strong>{districtName(frame.segment)} · Quadro {frame.part}</strong>
          <small>W{frame.fromWave}–W{frame.toWave}{frameId === states.currentFrameId ? " · posizione attuale" : " · torna alla posizione"}</small>
        </button>
        <button type="button" data-testid="v2-frame-next" disabled={frameIndex === layout.frames.length - 1} onClick={() => go(frameIndex + 1)} aria-label="Quadro successivo">▶</button>
      </nav>
      <DistrictMapV2 layout={layout} graphNodes={graphNodes} frameId={frameId} states={states} options={options} focusId={focusId}
        onFocus={setFocus} artPack={artPack} caravanNodeId={states.caravanNodeId} />
      <ul className="v2-legend" aria-label="Legenda percorso">
        <li data-state="completed">Percorso fatto</li><li data-state="reachable">Raggiungibile</li><li data-state="discarded">Ramo scartato</li>
      </ul>
      <section className="v2-tactical" data-testid="v2-tactical-panel" aria-label="Destinazioni raggiungibili">
        <h2>Pannello tattico</h2>
        <div className="space-y-2">
          {options.map(node => <button key={node.nodeId} type="button" data-testid={`v2-node-${node.nodeId}`} aria-pressed={focusId === node.nodeId}
            className={`v2-destination${focusId === node.nodeId ? " is-focus" : ""}`} onClick={() => setFocus(node.nodeId)}>
            <strong>W{node.wave} · {getScenario(node.locationId).displayName}</strong>
            <span>{label(node)}</span>
            <small>{node.boss ? "Affronta il boss. La vittoria cura completamente la squadra." : ACTIVITY_LABELS[node.type][1]}</small>
          </button>)}
        </div>
      </section>
      <Panel className="v2-status">
        <p>Località attuale: <strong>{getScenario(run.scenarioState?.id).displayName}</strong></p>
        <p>Boss successivo: {BOSSES[bossWave]?.team} · W{bossWave}</p>
        <p>Tappe completate: {run.overworld.completedWave} / 50</p>
        <p>{run.money} Prestigio · {DIFFICULTIES[run.difficultyId].label}</p>
        <p role="status">Run in corso · scegli una destinazione raggiungibile</p>
      </Panel>
    </div>
    <footer className="v2-hub-dock">
      <Btn data-testid="v2-confirm-btn" className="v2-cta" disabled={!focused} onClick={confirm}>
        {focused ? `Conferma · ${getScenario(focused.locationId).displayName} · W${focused.wave}` : "Scegli una destinazione"}
      </Btn>
      <div className="v2-hub-actions">
        <Btn data-testid="v2-team-btn" onClick={onTeam}>Squadra & Zaino</Btn>
        <Btn data-testid="pause-run-btn" onClick={onPause}>Salva e menu</Btn>
        <Btn data-testid="abandon-btn" variant="ghost" onClick={onAbandon}>Abbandona la run</Btn>
      </div>
    </footer>
  </div>;
}
