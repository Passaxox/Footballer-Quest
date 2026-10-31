import { BOSSES } from "@/game/data";
import { selectableNodesV2 } from "@/game/overworldRunV2";
import { getScenario } from "@/game/scenarios";
import { DIFFICULTIES } from "@/game/rules";
import { Btn, Header, Panel, XpReport } from "./ui";

const activities = {
  battle: ["Battaglia", "Affronta gli avversari di questa tappa."],
  recruit: ["Incontro", "Incontra un calciatore e valuta il reclutamento."],
  shop: ["Negozio", "Consulta le offerte e scegli come spendere il Prestigio."],
  training: ["Allenamento", "Scegli un esercizio per migliorare la squadra."],
  event: ["Evento", "Leggi la situazione e scegli come agire."],
};

export default function OverworldHubV2({ run, onSelectNode, onTeam, onPause, onAbandon }) {
  const options = selectableNodesV2(run);
  const bossWave = Object.keys(BOSSES).map(Number).find(wave => wave >= run.wave);
  return <div className="v2-hub" data-testid="overworld-v2-hub">
    <Header title={`Wave ${run.wave} / 50`} sub="Overworld V2 · sperimentale" />
    <div className="fq-scroll p-3 space-y-3">
      <Panel>
        <p>Località attuale: <strong>{getScenario(run.scenarioState?.id).displayName}</strong></p>
        <p>Boss successivo: {BOSSES[bossWave]?.team} · W{bossWave}</p>
        <p>Tappe completate: {run.overworld.completedWave} / 50</p>
        <p>{run.money} Prestigio · {DIFFICULTIES[run.difficultyId].label}</p>
        <p role="status">Run in corso · scegli una destinazione raggiungibile</p>
      </Panel>
      <XpReport report={run.lastProgression?.report} />
      <div className="space-y-2" aria-label="Destinazioni raggiungibili">
        {options.map(node => <button key={node.nodeId} data-testid={`v2-node-${node.nodeId}`} className="v2-destination" onClick={() => onSelectNode(node.nodeId)}>
          <strong>{getScenario(node.locationId).displayName}</strong>
          <span>{node.boss ? `Boss · ${BOSSES[node.wave].team}` : activities[node.type][0]}</span>
          <small>{node.boss ? "Affronta il boss. La vittoria cura completamente la squadra." : activities[node.type][1]}</small>
        </button>)}
      </div>
    </div>
    <footer className="v2-hub-actions">
      <Btn data-testid="v2-team-btn" onClick={onTeam}>Squadra & Zaino</Btn>
      <Btn data-testid="pause-run-btn" onClick={onPause}>Salva e menu</Btn>
      <Btn data-testid="abandon-btn" variant="ghost" className="col-span-2" onClick={onAbandon}>Abbandona la run</Btn>
    </footer>
  </div>;
}
