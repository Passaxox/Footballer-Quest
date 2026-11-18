import { useState } from "react";

// Kit-inspired colours (dataset kit_colors where verified); neutral grey for declared selections.
const COLORS = {
  "royal-academy": ["#4338ca", "#e5e7eb"], occult: ["#4c1d95", "#d8b4fe"], zeus: ["#f8fafc", "#854d0e"], epsilon: ["#7f1d1d", "#fca5a5"],
  prominence: ["#dc2626", "#fde047"], genesis: ["#e2e8f0", "#7c3aed"], "fire-dragon": ["#b91c1c", "#fde68a"], "knights-of-queen": ["#1e3a8a", "#f8fafc"],
  "the-empire": ["#7dd3fc", "#0c4a6e"], "rose-griffon": ["#1d4ed8", "#fecaca"], brockenborg: ["#111827", "#f8fafc"], unicorn: ["#2563eb", "#ef4444"],
  orpheus: ["#0ea5e9", "#f8fafc"], "little-gigant": ["#f59e0b", "#14532d"],
};
const initials = (name) => name.replace(/^Selezione Alius · /, "Alius ").split(/\s+/).filter((w) => !/^(of|the|·)$/i.test(w)).map((w) => w[0]).join("").slice(0, 3).toUpperCase();

// Add a teamId here once /public/crests/<teamId>.png is imported; others use the readable placeholder.
const CREST_FILES = new Set([]);
export const TeamCrest = ({ teamId, name, label = name, size = 72, testId, showName = true }) => {
  const [missing, setMissing] = useState(!CREST_FILES.has(teamId));
  const [bg, fg] = COLORS[teamId] || ["#475569", "#f8fafc"];
  return (
    <div data-testid={testId} className="flex flex-col items-center gap-1" style={{ width: showName ? size + 24 : size }}>
      {missing ? (
        <div aria-label={`Stemma ${name}`} className="grid place-items-center font-pixel"
          style={{ width: size, height: size * 1.1, background: bg, color: fg, border: `3px solid ${fg}`, clipPath: "polygon(50% 100%, 0 70%, 0 0, 100% 0, 100% 70%)", fontSize: size / 5 }}>
          {initials(name)}
        </div>
      ) : <img src={`/crests/${teamId}.png`} alt={`Stemma ${name}`} width={size} height={size} onError={() => setMissing(true)} style={{ imageRendering: "pixelated" }} />}
      {showName && <span className="font-body text-sm text-center leading-tight text-slate-100">{label}</span>}
    </div>
  );
};
