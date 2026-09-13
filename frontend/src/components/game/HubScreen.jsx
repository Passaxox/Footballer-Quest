import { getScenario } from "@/game/scenarios";
import { BOSSES, FINAL_WAVE, ITEMS } from "@/game/data";
import { glory } from "@/game/engine";
import { DIFFICULTIES, getRules } from "@/game/rules";
import { getCheckpointForeshadowing } from "@/game/presentation";
import { Btn, Header, Panel, PlayerCard, XpReport } from "./ui";
import { Coins, Backpack, Sparkles, BookOpen, ShieldAlert } from "lucide-react";
import { activeSynergies } from "@/game/synergies";

export default function HubScreen({ run, onNext, onTeam, onPause, onAbandon, onGuide }) {
  const nextBoss = Object.keys(BOSSES).map(Number).find((w) => w >= run.wave);
  const isBoss = !!BOSSES[run.wave];
  const segment = run.segmentState;
  const isCheckpoint = isBoss || (segment && segment.step >= segment.length);
  const checkpointName = isBoss ? "BOSS" : (segment?.checkpointType === "boss" ? "BOSS" : "MINIBOSS");
  const itemCount = Object.values(run.items).reduce((a, b) => a + b, 0);
  const pendingLabel = run.pending ? ({ battle: "Battaglia in corso", recruit: "Incontro", shop: "Mercante", training: "Allenamento", recovery: "Area di Recupero", reward: "Ricompensa", event: "Evento" })[run.pending.type] : null;
  const synergies = activeSynergies(run.team);
  return (
    <div data-testid="hub-screen" className="flex flex-col flex-1">
      <Header title={`Ondata ${run.wave} / ${FINAL_WAVE}`} sub={isBoss ? `BOSS: ${BOSSES[run.wave].team}` : isCheckpoint ? `CHECKPOINT: ${checkpointName}` : nextBoss ? `Prossimo boss all'ondata ${nextBoss}` : "Finale!"}
        right={<div className="flex items-center gap-1 font-pixel text-[9px] text-amber-300" data-testid="money-display"><Coins size={12} /> {run.money}</div>} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <div data-testid="run-difficulty" className="font-pixel text-[9px] text-sky-300">{DIFFICULTIES[getRules(run.rulesetId).difficultyId].label}</div>
          {segment && (
            <div data-testid="segment-status-badge" className="font-pixel text-[8px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="text-amber-300">SEG {segment.segmentIndex} · PASSO {segment.step}/{segment.length}</span>
              {isCheckpoint ? (
                <span className="text-rose-400 font-bold border border-rose-600/50 px-1 rounded bg-rose-950/40">
                  {checkpointName}
                </span>
              ) : (
                <span className="text-slate-400">· {segment.routeTitle || "Standard"}</span>
              )}
            </div>
          )}
        </div>
        <div data-testid="run-seed" className="font-pixel text-[8px] text-slate-400 break-all">Seed: {run.seed}</div>

        {/* Segment Start Foreshadowing Banner */}
        {segment && segment.step === 1 && !isCheckpoint && (
          <div data-testid="segment-start-card" className="p-2.5 rounded border-2 border-sky-600/80 bg-sky-950/40 space-y-1 shadow-md animate-fade-1">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[8px] text-amber-300">INIZIO SEGMENTO {segment.segmentIndex}</span>
              <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border ${segment.riskLevel === "alto" ? "text-rose-300 border-rose-500 bg-rose-950/60" : "text-emerald-300 border-emerald-500 bg-emerald-950/60"}`}>
                RISCHIO: {segment.riskLevel ? segment.riskLevel.toUpperCase() : "STANDARD"}
              </span>
            </div>
            <div className="font-pixel text-xs text-white">
              {segment.routeTitle || "Percorso Standard"}
            </div>
            <p className="font-body text-xs text-slate-300 leading-snug">
              Previsione Checkpoint: <strong className="text-amber-200">{getCheckpointForeshadowing(segment, run.wave)}</strong>
            </p>
          </div>
        )}

        {/* Checkpoint Arrival Alert */}
        {isCheckpoint && (
          <div data-testid="checkpoint-alert" className="p-2.5 rounded border-2 border-rose-600 bg-rose-950/60 text-rose-200 flex items-center gap-2 shadow-lg animate-fade-1">
            <ShieldAlert size={18} className="shrink-0 text-rose-400" />
            <div className="min-w-0">
              <div className="font-pixel text-[8px] font-bold tracking-wide">
                ATTENZIONE: {checkpointName} AL CHECKPOINT
              </div>
              <div className="font-body text-xs text-slate-200">
                Lo scontro decisivo del segmento è imminente. Schiera i titolari e verifica i bonus nodo attivi.
              </div>
            </div>
          </div>
        )}

        <Panel className="font-body text-lg leading-tight text-slate-200">
          <div data-testid="run-scenario" className="text-amber-200 mb-2">{getScenario(run.scenarioState?.id).displayName}</div>
          {isBoss ? (
            <span className="text-red-400">Una squadra leggendaria vi attende. Preparatevi al meglio: dopo il boss la squadra sarà curata completamente.</span>
          ) : (
            <span>La strada verso il Football Frontier continua. Cosa vi aspetta alla prossima ondata? Una sfida, un mercante, un incontro inatteso...</span>
          )}
          {pendingLabel && <div className="mt-2 text-amber-300">→ {pendingLabel}: riprendi da dove avevi lasciato.</div>}
        </Panel>
        <div className="flex justify-between font-body text-slate-400 text-base">
          <span>Vittorie {run.stats.wins} · Reclutati {run.stats.recruits} · Fusioni {run.stats.fusions}</span>
          <span className="text-purple-300">Gloria {glory(run)}</span>
        </div>
        {/* Unified BONUS NODO Section */}
        <Panel data-testid="bonus-nodo" className="font-body text-base border-violet-600 space-y-2">
          <div className="flex items-center justify-between border-b border-violet-800/60 pb-1">
            <div className="font-pixel text-[8px] text-violet-300 flex items-center gap-1">
              <Sparkles size={12} /> BONUS NODO & INTESE
            </div>
            {onGuide && (
              <button
                type="button"
                data-testid="hub-guide-btn"
                onClick={onGuide}
                className="font-pixel text-[8px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
              >
                <BookOpen size={10} /> Guida rapida
              </button>
            )}
          </div>

          {/* Elemental Synergies */}
          {synergies.length > 0 && (
            <div data-testid="active-synergies" className="space-y-1">
              <div className="font-pixel text-[7px] text-slate-400 uppercase">Intese Elementali ({synergies.length}/2):</div>
              {synergies.map(synergy => (
                <div key={synergy.id} className="flex items-start justify-between gap-1 text-sm bg-violet-950/30 p-1.5 rounded border border-violet-800/40">
                  <div className="flex items-center gap-1.5">
                    <span className="font-pixel text-[8px] text-white">{synergy.label} ({synergy.members})</span>
                    <span className="text-slate-300">· {synergy.description}</span>
                  </div>
                  <span className="font-pixel text-[7px] text-violet-300 shrink-0 border border-violet-600/60 px-1 py-0.5 rounded">
                    Permanente nella run
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Auto-activated Node Items */}
          {(run.activeNodeItems || []).length > 0 && (
            <div data-testid="active-node-items" className="space-y-1">
              <div className="font-pixel text-[7px] text-slate-400 uppercase">Oggetti Nodo Attivi:</div>
              {(run.activeNodeItems || []).map((itemId, idx) => {
                const item = ITEMS[itemId] || { name: itemId, desc: "Bonus attivo per questo nodo." };
                return (
                  <div key={`${itemId}-${idx}`} className="flex items-start justify-between gap-1 text-sm bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                    <div>
                      <strong className="text-amber-200">{item.name}</strong>
                      <span className="text-slate-300 ml-1">· {item.desc}</span>
                    </div>
                    <span className="font-pixel text-[7px] text-amber-300 shrink-0 border border-amber-600/60 px-1 py-0.5 rounded">
                      Fino a fine nodo{segment ? ` · Checkpoint (${segment.step}/${segment.length})` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Temporary Event / Scenario Modifiers & Route Bonuses */}
          {((run.temporaryModifiers || []).length > 0 || (segment?.prestigeMultiplier > 1)) && (
            <div data-testid="active-temporary-modifiers" className="space-y-1">
              <div className="font-pixel text-[7px] text-slate-400 uppercase">Modificatori Evento & Rotta:</div>
              {segment?.prestigeMultiplier > 1 && (
                <div className="flex items-start justify-between gap-1 text-sm bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                  <div>
                    <strong className="text-amber-200">Bonus Percorso ({segment.routeTitle})</strong>
                    <span className="text-slate-300 ml-1">· +{Math.round((segment.prestigeMultiplier - 1) * 100)}% Prestigio dalle vittorie</span>
                  </div>
                  <span className="font-pixel text-[7px] text-amber-300 shrink-0 border border-amber-600/60 px-1 py-0.5 rounded">
                    Percorso
                  </span>
                </div>
              )}
              {(run.temporaryModifiers || []).map((mod, idx) => (
                <div key={idx} className="flex items-start justify-between gap-1 text-sm bg-sky-950/30 p-1.5 rounded border border-sky-800/40">
                  <div>
                    <strong className="text-sky-200">{mod.label || "Modificatore"}</strong>
                    <span className="text-slate-300 ml-1">· {mod.description || JSON.stringify(mod.effect)}</span>
                  </div>
                  <span className="font-pixel text-[7px] text-sky-300 shrink-0 border border-sky-600/60 px-1 py-0.5 rounded">
                    {mod.remainingWaves} {mod.remainingWaves === 1 ? "nodo rimanente" : "nodi rimanenti"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Armed Combat Triggers */}
          {run.armedTriggers && Object.entries(run.armedTriggers).some(([_, qty]) => qty > 0) && (
            <div data-testid="active-armed-triggers" className="space-y-1">
              <div className="font-pixel text-[7px] text-slate-400 uppercase">Oggetti Reattivi Armati:</div>
              {Object.entries(run.armedTriggers).filter(([_, qty]) => qty > 0).map(([itemId]) => {
                const item = ITEMS[itemId] || { name: itemId, description: "Attivazione automatica in lotta." };
                return (
                  <div key={itemId} className="flex items-start justify-between gap-1 text-sm bg-rose-950/30 p-1.5 rounded border border-rose-800/40">
                    <div>
                      <strong className="text-rose-200">{item.name}</strong>
                      <span className="text-slate-300 ml-1">· {item.description || item.desc}</span>
                    </div>
                    <span className="font-pixel text-[7px] text-rose-300 shrink-0 border border-rose-600/60 px-1 py-0.5 rounded">
                      Pronto alla lotta
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Special Resources (Cuneo DNA) */}
          {((run.specialResources?.cuneo > 0) || (run.items?.cuneo > 0)) && (
            <div data-testid="special-resources-hub" className="space-y-1">
              <div className="font-pixel text-[7px] text-slate-400 uppercase">Risorse Speciali:</div>
              <div className="flex items-start justify-between gap-1 text-sm bg-fuchsia-950/30 p-1.5 rounded border border-fuchsia-800/40">
                <div>
                  <strong className="text-fuchsia-200">Cuneo DNA (x{run.specialResources?.cuneo || run.items?.cuneo || 0})</strong>
                  <span className="text-slate-300 ml-1">· Valuta per la fusione genetica nella schermata Squadra.</span>
                </div>
                <span className="font-pixel text-[7px] text-fuchsia-300 shrink-0 border border-fuchsia-600/60 px-1 py-0.5 rounded">
                  Risorsa
                </span>
              </div>
            </div>
          )}

          {synergies.length === 0 && (run.activeNodeItems || []).length === 0 && (run.temporaryModifiers || []).length === 0 && !(segment?.prestigeMultiplier > 1) && !(run.armedTriggers && Object.values(run.armedTriggers).some(q => q > 0)) && !(run.specialResources?.cuneo > 0 || run.items?.cuneo > 0) && (
            <div className="text-sm text-slate-400 italic py-1">
              Nessun bonus attivo al momento. Schiera 2+ compagni dello stesso elemento o ottieni oggetti nodo per attivare vantaggi tattici.
            </div>
          )}
        </Panel>
        <XpReport report={!run.pending ? run.lastProgression?.report : null} />
        <div className="space-y-2">
          {run.team.map((p, i) => (
            <PlayerCard
              key={p.uid}
              p={p}
              compact
              testId={`hub-player-${i}`}
              right={
                i === 0 || p.isCaptain ? (
                  <span className="font-pixel text-[7px] text-amber-300 bg-amber-950/80 border border-amber-400 px-1 py-0.5 rounded shadow-sm">
                    ★ CAP
                  </span>
                ) : null
              }
            />
          ))}
        </div>
      </div>
      <div className="p-3 bg-[#111827] border-t-4 border-slate-800 grid grid-cols-3 gap-2">
        <Btn data-testid="team-btn" onClick={onTeam} className="flex items-center justify-center gap-1"><Backpack size={14} /> Squadra ({itemCount})</Btn>
        <Btn data-testid="next-wave-btn" variant="primary" className="col-span-2" onClick={onNext}>{run.pendingRouteChoices?.length ? "Scegli Percorso" : run.pending ? "Riprendi" : isBoss ? "Affronta il Boss" : isCheckpoint ? "Affronta il Checkpoint" : "Avanti"}</Btn>
        <Btn data-testid="pause-run-btn" className="col-span-3" onClick={onPause}>Salva e torna al menu</Btn>
        <Btn data-testid="abandon-btn" variant="ghost" className="col-span-3 min-h-[36px] py-1 text-[8px]" onClick={onAbandon}>Abbandona la run</Btn>
      </div>
    </div>
  );
}
