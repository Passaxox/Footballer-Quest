import { useState } from "react";
import { encodeSave, decodeSave } from "@/game/perks";
import { Btn, Header, Panel } from "./ui";

export default function SaveCodeScreen({ meta, run, onImport, onBack }) {
  const code = encodeSave(meta, run);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setMsg("Codice copiato!"); } catch { setMsg("Copia non riuscita: seleziona il testo e copialo a mano."); }
  };
  const load = () => {
    try {
      const data = decodeSave(input);
      if (window.confirm("Caricare questo codice? I progressi attuali su questo dispositivo verranno sostituiti.")) onImport(data);
    } catch { setMsg("Codice non valido."); }
  };
  return (
    <div data-testid="savecode-screen" className="flex flex-col flex-1">
      <Header title="Codice salvataggio" sub="Sposta i progressi tra dispositivi" right={<Btn variant="ghost" data-testid="savecode-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <Panel className="space-y-2">
          <div className="font-pixel text-[9px] text-amber-300">ESPORTA</div>
          <p className="font-body text-base text-slate-300">Contiene collezione, vantaggi, Spirito di squadra, record e la run in corso.</p>
          <textarea data-testid="savecode-export" readOnly value={code} onFocus={(e) => e.target.select()} className="w-full h-24 bg-[#09131e] border border-slate-600 text-slate-200 text-xs p-2 break-all" />
          <Btn data-testid="savecode-copy" variant="primary" className="w-full" onClick={copy}>Copia codice</Btn>
        </Panel>
        <Panel className="space-y-2">
          <div className="font-pixel text-[9px] text-amber-300">IMPORTA</div>
          <textarea data-testid="savecode-import" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Incolla qui il codice…" className="w-full h-24 bg-[#09131e] border border-slate-600 text-slate-200 text-xs p-2" />
          <Btn data-testid="savecode-load" className="w-full" disabled={!input.trim()} onClick={load}>Carica codice</Btn>
        </Panel>
        {msg && <p data-testid="savecode-msg" className="font-body text-lg text-amber-200">{msg}</p>}
      </div>
    </div>
  );
}
