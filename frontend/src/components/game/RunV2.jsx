import { useCallback, useEffect, useRef, useState } from "react";
import { EVENTS } from "@/game/data";
import { actionTokenV2, runTokenV2 } from "@/game/overworldRunV2";
import { dispatchRunV2, reconcileRunV2Meta, clearRun } from "@/game/storage";
import OverworldHubV2 from "./OverworldHubV2";
import BattleScreen from "./BattleScreen";
import RewardScreen from "./RewardScreen";
import EventScreen from "./EventScreen";
import ShopScreen from "./ShopScreen";
import RecruitScreen from "./RecruitScreen";
import TrainingScreen from "./TrainingScreen";
import TeamScreen from "./TeamScreen";
import FusionScreen from "./FusionScreen";
import EndScreen from "./EndScreen";
import "./overworldV2.css";

// Only view state lives here. Every encounter, offer, outcome and receipt comes
// from the durable snapshot; combat retains its existing in-memory turn state.
export default function RunV2({ run, onSnapshot, onMeta, onHome, onNew }) {
  const [view, setView] = useState("hub");
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const latest = useRef(run);
  latest.current = run;
  const discoveries = useRef(new Set());
  const retryCommand = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reconcile = useCallback(snapshot => {
    try { onMeta(reconcileRunV2Meta(snapshot, discoveries.current)); setError(""); return true; }
    catch { setError("Metadati non salvati. La run è conservata: riprova prima di continuare."); return false; }
  }, [onMeta]);
  useEffect(() => { reconcile(run); }, [run, reconcile]);

  const expected = runTokenV2(run), token = actionTokenV2(run);
  const submit = command => {
    if (!mounted.current) return;
    // Preserve an asynchronous combat result even if meta or run storage fails.
    // Its original tokens make retry harmless if a newer transition already won.
    if (!reconcile(latest.current)) { retryCommand.current = command; return; }
    try {
      const snapshot = dispatchRunV2(command.expected, command.action);
      retryCommand.current = null;
      if (snapshot) { latest.current = snapshot; onSnapshot(snapshot); reconcile(snapshot); }
    } catch { retryCommand.current = command; setError("Salvataggio non riuscito o incompatibile. I dati conservati non sono stati rimossi. Riprova."); }
  };
  const send = action => {
    if (!mounted.current || retryCommand.current) return;
    submit({ expected, action: { ...token, ...action } });
  };
  const discover = useCallback(player => {
    if (!mounted.current || !player || player.fused) return;
    discoveries.current.add(player.versionId || player.baseId);
    reconcile(latest.current);
  }, [reconcile]);
  const pause = () => { if (mounted.current && reconcile(run)) onHome(); };
  const dismiss = next => { if (mounted.current && reconcile(run)) { clearRun(); onSnapshot(null); next(); } };
  const result = run.overworld.result, p = run.pending;
  const screen = result ? "end" : p?.type || view;
  const battleResult = outcome => (team, items, activeUid, report) => send({ type: "battleResult", result: outcome, team, items, activeUid, report });
  let content;
  switch (screen) {
    case "battle": content = <BattleScreen key={p.overworldNodeId} run={run} encounter={p} onDiscover={discover} onWin={battleResult("win")} onLose={battleResult("lose")} onFlee={battleResult("flee")} onActiveChange={() => {}} />; break;
    case "reward": content = <RewardScreen {...p.context} onPick={id => send({ type: "reward", id })} />; break;
    case "recruit": {
      const context = { mode: "encounter", offer: p.player, price: p.price, ...p.context };
      content = <RecruitScreen key={`${p.overworldNodeId}:${p.actionStep}`} run={run} player={context.offer} price={context.price} mode={context.mode} xpReport={context.xpReport} onDiscover={discover} onJoin={replaceIndex => send({ type: "recruit", replaceIndex })} onSkip={() => send({ type: "skipRecruit" })} onChallenge={() => send({ type: "challenge" })} />; break;
    }
    case "shop": content = <ShopScreen run={run} stock={p.stock} onBuy={index => send({ type: "buy", index })} onLeave={() => send({ type: "leave" })} />; break;
    case "training": content = <TrainingScreen run={run} onTrain={(drill, index) => send({ type: "train", drill, index })} />; break;
    case "event": content = <EventScreen key={p.overworldNodeId} run={run} event={EVENTS.find(e => e.id === p.eventId)} onChooseIndex={index => send({ type: "chooseEvent", index })} onResolve={() => send({ type: "resolveEvent" })} />; break;
    case "team": content = <TeamScreen run={run} onUpdate={patch => send({ type: "teamPatch", patch })} onFusion={() => setView("fusion")} onBack={() => setView("hub")} />; break;
    case "fusion": content = <FusionScreen run={run} onFuse={(a, b, moveFrom) => { send({ type: "fuse", a, b, moveFrom }); setView("team"); }} onBack={() => setView("team")} />; break;
    case "end": content = <EndScreen run={run} result={result} onHome={() => dismiss(onHome)} onRetry={() => dismiss(onNew)} />; break;
    default: content = <OverworldHubV2 run={run} onSelectNode={nodeId => send({ type: "select", nodeId })} onTeam={() => setView("team")} onPause={pause} onAbandon={() => { if (window.confirm("Abbandonare la run? Il risultato sarà registrato come sconfitta.")) send({ type: "abandon" }); }} />;
  }
  return <div className="min-h-screen bg-[#05070d] flex justify-center font-body">
    <div className="v2-shell fq-safe fq-safe-fit w-full max-w-md bg-[#0d1322] text-slate-100 border-x-4 border-slate-800">
      {error && <div role="alert" className="v2-error">{error}<button data-testid="v2-retry-save" onClick={() => retryCommand.current ? submit(retryCommand.current) : reconcile(run)}>Riprova</button></div>}
      {p && !result && <div className="v2-pause"><span>W{run.wave} / 50 · V2</span><button disabled={!!error} data-testid="v2-pause-pending" onClick={pause}>{p.type === "battle" ? "Pausa (riavvia scontro)" : "Pausa e menu"}</button></div>}
      <div inert={!!error} className={`v2-content ${["battle", "team", "hub"].includes(screen) ? "v2-content-fit" : ""}`}>{content}</div>
    </div>
  </div>;
}
