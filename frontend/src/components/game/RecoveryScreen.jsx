import { useState } from "react";
import { Header, Panel, Btn, PlayerCard } from "./ui";
import { Coins, Heart, Cross, Sparkles, Activity } from "lucide-react";
import { sfx } from "@/game/audio";

export default function RecoveryScreen({ run, onApplyOption, onLeave }) {
  const [chosen, setChosen] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);

  const options = [
    {
      id: "rest",
      title: "Riposo e Rinfresco",
      cost: 0,
      icon: Heart,
      desc: "Recupera il 35% degli HP massimi di tutti i compagni non KO.",
      badge: "Gratuito",
    },
    {
      id: "physio",
      title: "Fisioterapia Completa",
      cost: 35,
      icon: Activity,
      desc: "Recupera il 70% degli HP di tutti i compagni non KO e cura ogni bruciatura.",
      badge: "Consigliato",
    },
    {
      id: "medical",
      title: "Intervento Medico Avanzato",
      cost: 60,
      icon: Cross,
      desc: "Rianima compagni KO con 50% HP, ripristina tutti al 100% HP e cura le condizioni.",
      badge: "Completo",
    },
  ];

  const handleSelect = (optionId) => {
    if (chosen) return;
    sfx.heal?.();
    setSelectedOpt(optionId);
    setChosen(true);
    onApplyOption(optionId);
  };

  return (
    <div data-testid="recovery-screen" className="flex flex-col flex-1">
      <Header
        title="Area di Recupero"
        sub="Punto di ristoro lungo il tragitto"
        right={
          <div className="flex items-center gap-1 font-pixel text-[9px] text-amber-300">
            <Coins size={12} /> {run.money}
          </div>
        }
      />

      <div className="p-3 space-y-3 flex-1 overflow-y-auto font-body text-base">
        <Panel className="border-emerald-700 bg-emerald-950/20 text-slate-200">
          <div className="flex items-center gap-2 text-emerald-400 font-pixel text-[9px] mb-1">
            <Sparkles size={12} /> Punto di Ristoro
          </div>
          <p className="text-sm">
            La squadra può rifiatare prima della prossima tappa. Scegli un trattamento medico per ripristinare le forze.
          </p>
        </Panel>

        {/* Options */}
        <div className="space-y-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const canAfford = run.money >= opt.cost;
            const isSelected = selectedOpt === opt.id;

            return (
              <div
                key={opt.id}
                data-testid={`recovery-card-${opt.id}`}
                className={`p-2.5 rounded border transition-all ${
                  isSelected
                    ? "bg-emerald-950/60 border-emerald-400 shadow-md shadow-emerald-900/30"
                    : canAfford && !chosen
                    ? "bg-slate-900/90 border-slate-700 hover:border-slate-500"
                    : "bg-slate-950/60 border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 shrink-0">
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="font-pixel text-[9px] text-white flex items-center gap-2">
                        {opt.title}
                        <span className="text-[7px] px-1 py-0.5 rounded border border-emerald-600/50 text-emerald-300 font-normal">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`font-pixel text-[8px] ${opt.cost === 0 ? "text-emerald-400" : "text-amber-300"}`}>
                      {opt.cost === 0 ? "GRATIS" : `${opt.cost} P`}
                    </span>
                    {!chosen && (
                      <Btn
                        variant={opt.cost === 0 ? "primary" : "secondary"}
                        data-testid={`recovery-option-${opt.id}`}
                        disabled={!canAfford}
                        onClick={() => handleSelect(opt.id)}
                        className="text-[8px] py-1 px-2 min-h-[28px]"
                      >
                        Scegli
                      </Btn>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {chosen && (
          <div data-testid="recovery-confirmed-feedback" className="p-2 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-pixel text-[8px] flex items-center gap-2 animate-fade-1">
            <Sparkles size={14} className="shrink-0 text-emerald-400" />
            <span>Trattamento completato con successo! La squadra ha recuperato le forze.</span>
          </div>
        )}

        {/* Team Preview */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="font-pixel text-[8px] text-slate-400 uppercase">Stato Squadra:</div>
          <div className="space-y-1.5">
            {run.team.map((player) => (
              <PlayerCard key={player.uid} p={player} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#111827] border-t-4 border-slate-800">
        <Btn
          data-testid="recovery-skip-btn"
          variant={chosen ? "primary" : "secondary"}
          onClick={onLeave}
          className="w-full"
        >
          {chosen ? "Prosegui il Viaggio" : "Lascia l'Area di Recupero"}
        </Btn>
      </div>
    </div>
  );
}
