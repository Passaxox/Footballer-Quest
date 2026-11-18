import { Panel } from "./ui";

// Minimal fixed palette (Tailwind utilities used verbatim so JIT keeps them).
const COLOR_MAP = {
  cyan:    { border: "border-cyan-500",    fill: "bg-cyan-400",    text: "text-cyan-300",    track: "bg-cyan-900/40"    },
  fuchsia: { border: "border-fuchsia-500", fill: "bg-fuchsia-400", text: "text-fuchsia-300", track: "bg-fuchsia-900/40" },
  violet:  { border: "border-violet-500",  fill: "bg-violet-400",  text: "text-violet-300",  track: "bg-violet-900/40"  },
  amber:   { border: "border-amber-500",   fill: "bg-amber-400",   text: "text-amber-300",   track: "bg-amber-900/40"   },
  yellow:  { border: "border-yellow-500",  fill: "bg-yellow-400",  text: "text-yellow-300",  track: "bg-yellow-900/40"  },
  sky:     { border: "border-sky-500",     fill: "bg-sky-400",     text: "text-sky-300",     track: "bg-sky-900/40"     },
  orange:  { border: "border-orange-500",  fill: "bg-orange-400",  text: "text-orange-300",  track: "bg-orange-900/40"  },
  rose:    { border: "border-rose-500",    fill: "bg-rose-400",    text: "text-rose-300",    track: "bg-rose-900/40"    },
  purple:  { border: "border-purple-500",  fill: "bg-purple-400",  text: "text-purple-300",  track: "bg-purple-900/40"  },
  indigo:  { border: "border-indigo-500",  fill: "bg-indigo-400",  text: "text-indigo-300",  track: "bg-indigo-900/40"  },
  emerald: { border: "border-emerald-500", fill: "bg-emerald-400", text: "text-emerald-300", track: "bg-emerald-900/40" },
  teal:    { border: "border-teal-500",    fill: "bg-teal-400",    text: "text-teal-300",    track: "bg-teal-900/40"    },
  red:     { border: "border-red-500",     fill: "bg-red-400",     text: "text-red-300",     track: "bg-red-900/40"     },
  slate:   { border: "border-slate-500",   fill: "bg-slate-400",   text: "text-slate-300",   track: "bg-slate-800/40"   },
  white:   { border: "border-slate-300",   fill: "bg-white",       text: "text-slate-100",   track: "bg-slate-800/40"   },
  stone:   { border: "border-stone-500",   fill: "bg-stone-400",   text: "text-stone-300",   track: "bg-stone-900/40"   },
  pink:    { border: "border-pink-500",    fill: "bg-pink-400",    text: "text-pink-300",    track: "bg-pink-900/40"    },
  lime:    { border: "border-lime-500",    fill: "bg-lime-400",    text: "text-lime-300",    track: "bg-lime-900/40"    },
  zinc:    { border: "border-zinc-500",    fill: "bg-zinc-400",    text: "text-zinc-300",    track: "bg-zinc-800/40"    },
};

const TierDots = ({ tier, max = 6, colorKey }) => {
  const c = COLOR_MAP[colorKey] || COLOR_MAP.slate;
  return (
    <div className="flex gap-0.5" aria-label={`Tier ${tier}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`w-2 h-2 border ${i < tier ? `${c.fill} border-white/80` : "bg-slate-800 border-slate-600"}`} />
      ))}
    </div>
  );
};

const SynergyRow = ({ syn, compact }) => {
  const c = COLOR_MAP[syn.color] || COLOR_MAP.slate;
  const active = syn.tier > 0;
  return (
    <div data-testid={`synergy-${syn.teamId}`} className={`p-2 border-2 ${active ? c.border : "border-slate-700"} ${active ? c.track : "bg-slate-900/40"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-pixel text-[9px] ${active ? c.text : "text-slate-400"} truncate`}>{syn.traitLabel}</div>
          <div className="font-body text-xs text-slate-400 truncate">{syn.teamName}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TierDots tier={syn.tier} colorKey={syn.color} />
          <span className="font-pixel text-[8px] text-slate-300">{syn.points} pt{syn.points === 1 ? "" : "i"}</span>
        </div>
      </div>
      {!compact && (
        <>
          <div className={`font-body text-sm mt-1 ${active ? "text-slate-100" : "text-slate-500"}`}>
            {active ? syn.description : "Aggiungi un calciatore di questa squadra per attivare."}
          </div>
          {syn.nextThreshold && (
            <div className="font-body text-xs text-slate-400 mt-1">
              Prossimo tier a {syn.nextThreshold} pt · <span className={c.text}>{syn.nextValue}{syn.unit.includes("%") ? "" : ""} {syn.unit}</span>
            </div>
          )}
          {syn.towerMode && (
            <div className="font-pixel text-[8px] text-amber-300 mt-1">TORRE ×1.5</div>
          )}
        </>
      )}
    </div>
  );
};

export default function SynergyPanel({ synergies, title = "Sinergie di squadra", subtitle, empty = "Aggiungi un titolare per attivare la prima sinergia.", compact = false, testId = "synergy-panel" }) {
  const active = synergies.filter((s) => s.tier > 0);
  const inactive = synergies.filter((s) => s.tier === 0);
  const list = compact ? active : [...active, ...inactive];
  return (
    <Panel data-testid={testId} className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-[10px] text-amber-300">{title}</div>
          {subtitle && <div className="font-body text-xs text-slate-400">{subtitle}</div>}
        </div>
        <div className="font-pixel text-[8px] text-slate-300">{active.length} attive</div>
      </div>
      {list.length === 0 ? (
        <div className="font-body text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="grid gap-2">
          {list.map((syn) => <SynergyRow key={syn.teamId} syn={syn} compact={compact} />)}
        </div>
      )}
    </Panel>
  );
}
