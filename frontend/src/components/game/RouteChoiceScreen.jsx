import { Header, Panel, Btn } from "./ui";
import { Compass, MapPin, AlertTriangle, ShieldCheck, Flame, ArrowRight } from "lucide-react";
import { sfx } from "@/game/audio";

export default function RouteChoiceScreen({ run, choices = [], onSelect }) {
  const riskConfig = {
    basso: {
      label: "Rischio Basso",
      color: "text-emerald-400 border-emerald-500/70 bg-emerald-950/40",
      icon: ShieldCheck,
    },
    medio: {
      label: "Rischio Medio",
      color: "text-amber-400 border-amber-500/70 bg-amber-950/40",
      icon: Compass,
    },
    alto: {
      label: "Rischio Alto",
      color: "text-rose-400 border-rose-500/70 bg-rose-950/40",
      icon: Flame,
    },
  };

  const handleSelect = (routeId) => {
    sfx.confirm?.();
    onSelect(routeId);
  };

  return (
    <div data-testid="route-choice-screen" className="flex flex-col flex-1">
      <Header
        title="Bivio del Tragitto"
        sub="Pianifica la rotta del prossimo segmento"
      />

      <div className="p-3 space-y-3 flex-1 overflow-y-auto font-body text-base">
        <Panel className="border-sky-700 bg-sky-950/20 text-slate-200">
          <div className="flex items-center gap-2 text-sky-400 font-pixel text-[9px] mb-1">
            <MapPin size={12} /> Scelta Strategica di Percorso
          </div>
          <p className="text-sm leading-snug">
            La strada si divide. Ogni percorso offre opportunità diverse (allenamento, negozi, sfide élite o recupero) prima del prossimo scontro decisivo.
          </p>
        </Panel>

        <div className="space-y-3">
          {choices.map((route) => {
            const risk = riskConfig[route.risk] || riskConfig.medio;
            const RiskIcon = risk.icon;
            const [minL, maxL] = route.segmentLengthRange || [3, 4];

            return (
              <div
                key={route.id}
                data-testid={`route-choice-card-${route.id}`}
                className="p-3 rounded-lg border-2 border-slate-700 bg-[#0b101d] space-y-2 hover:border-slate-500 transition-all shadow-md"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
                      <Compass size={13} className="text-sky-400" />
                      {route.name}
                    </h3>
                    <span className="font-body text-xs text-slate-400">
                      Tendenza: <strong className="text-slate-200">{route.tendency}</strong>
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${risk.color}`}>
                      <RiskIcon size={9} />
                      {risk.label}
                    </span>
                    <span className="font-pixel text-[7px] text-slate-400">
                      {minL === maxL ? `${minL} Passi` : `${minL}-${maxL} Passi`}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-snug">
                  {route.description}
                </p>

                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-xs text-sky-200 flex items-center justify-between">
                  <span>Effetto: <strong>{route.modifierDesc}</strong></span>
                </div>

                <Btn
                  variant={route.risk === "alto" ? "primary" : "secondary"}
                  data-testid={`route-choice-btn-${route.id}`}
                  onClick={() => handleSelect(route.id)}
                  className="w-full text-[9px] py-1.5 mt-1 flex items-center justify-center gap-1"
                >
                  Scegli Questo Percorso <ArrowRight size={12} />
                </Btn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
