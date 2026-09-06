import { Btn, Panel } from "./ui";
import { Volume2, VolumeX } from "lucide-react";
import { sfx } from "@/game/audio";

export default function TitleScreen({ hasRun, meta, onNew, onContinue, onRecords, onCollection, onToggleSound }) {
  return (
    <div data-testid="title-screen-container" className="flex flex-col flex-1 p-5 title-bg">
      <div className="flex justify-end">
        <button data-testid="sound-toggle" onClick={onToggleSound} className="text-slate-300 p-2 border-2 border-slate-700 bg-slate-900">
          {meta.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      <div className="mt-10 mb-8">
        <div className="font-pixel text-[10px] text-sky-300 tracking-widest mb-3 animate-fade-1">FOOTBALL FRONTIER ROGUE</div>
        <h1 className="font-pixel text-3xl sm:text-4xl leading-tight text-amber-300 drop-shadow-[4px_4px_0_#000] animate-fade-2">
          INAZUMA<br /><span className="text-white">ROGUE</span>
        </h1>
        <p className="font-body text-slate-300 text-xl leading-tight mt-4 max-w-xs animate-fade-3">
          Una squadra. Una mossa a testa. Cinquanta ondate. Recluta calciatori, fondi il loro DNA e conquista il Football Frontier.
        </p>
      </div>
      <div className="grid gap-3 animate-fade-3">
        {hasRun && <Btn data-testid="continue-run-btn" variant="primary" onClick={() => { sfx.confirm(); onContinue(); }}>Continua la Run</Btn>}
        <Btn data-testid="new-run-btn" variant={hasRun ? "default" : "primary"} onClick={() => { sfx.confirm(); onNew(); }}>{hasRun ? "Nuova Run (cancella quella in corso)" : "Nuova Run"}</Btn>
        <div className="grid grid-cols-2 gap-3">
          <Btn data-testid="records-btn" onClick={() => { sfx.select(); onRecords(); }}>Albo d'Oro</Btn>
          <Btn data-testid="collection-btn" onClick={() => { sfx.select(); onCollection(); }}>Collezione</Btn>
        </div>
      </div>
      <Panel className="mt-auto font-body text-slate-400 text-base leading-tight">
        <div className="flex justify-between"><span>Run giocate</span><span className="text-white">{meta.runs}</span></div>
        <div className="flex justify-between"><span>Miglior ondata</span><span className="text-amber-300">{meta.bestWave}</span></div>
        <div className="flex justify-between"><span>Calciatori sbloccati</span><span className="text-emerald-400">{meta.unlocked.length}</span></div>
      </Panel>
    </div>
  );
}
