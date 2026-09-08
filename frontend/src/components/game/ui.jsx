import { resolveVersion } from "@/game/catalog";
import { useState } from "react";
import { ELEMENTS, ROLES, ITEMS, itemPresentation } from "@/game/data";
import { xpForLevel, canApplyItem, effectiveTypeMultiplier } from "@/game/engine";
import { Flame, Wind, Mountain, Leaf } from "lucide-react";

const VARIANTS = {
  default: "bg-slate-800 hover:bg-slate-700 text-white border-slate-950",
  primary: "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-900",
  danger: "bg-red-700 hover:bg-red-600 text-white border-red-950",
  fusion: "bg-pink-600 hover:bg-pink-500 text-white border-pink-950",
  ghost: "bg-transparent hover:bg-slate-800 text-slate-300 border-slate-700 shadow-none",
};

export const Btn = ({ variant = "default", className = "", children, ...props }) => (
  <button
    className={`pixel-btn border-2 font-pixel text-[10px] leading-tight uppercase tracking-wide py-3 px-3 min-h-[48px] disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const Panel = ({ className = "", children, ...props }) => (
  <div className={`pixel-panel bg-[#0b101d] border-4 border-slate-600 p-3 ${className}`} {...props}>{children}</div>
);

export const Header = ({ title, sub, right }) => (
  <div className="flex items-center justify-between px-3 py-2 bg-[#111827] border-b-4 border-slate-800">
    <div>
      <div className="font-pixel text-amber-300 text-xs uppercase">{title}</div>
      {sub && <div className="font-body text-slate-400 text-base leading-none mt-1">{sub}</div>}
    </div>
    {right}
  </div>
);

export const ElementIcon = ({ element, size = 12 }) => {
  const c = ELEMENTS[element].color;
  const props = { size, color: c, strokeWidth: 2.5 };
  if (element === "fuoco") return <Flame {...props} />;
  if (element === "aria") return <Wind {...props} />;
  if (element === "terra") return <Mountain {...props} />;
  return <Leaf {...props} />;
};

export const ElementBadge = ({ element, className = "" }) => {
  const e = ELEMENTS[element];
  return (
    <span data-testid={`element-badge-${element}`} className={`inline-flex items-center gap-1 border ${e.border} ${e.bg} ${e.text} font-pixel text-[8px] px-1.5 py-0.5 uppercase ${className}`}>
      <ElementIcon element={element} size={10} /> {e.label}
    </span>
  );
};

export const HpBar = ({ hp, maxHp, showText = true, testId }) => {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-amber-400" : "bg-red-500";
  return (
    <div data-testid={testId} className="w-full">
      <div className="h-3 w-full bg-slate-950 border-2 border-slate-500 overflow-hidden">
        <div className={`h-full ${color} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showText && <div className="font-body text-slate-300 text-sm leading-none mt-1 text-right">{hp}/{maxHp} HP</div>}
    </div>
  );
};

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export const PixelAvatar = ({ seed, element, size = 64, ko = false, className = "" }) => {
  const h = hashStr(seed);
  const e = ELEMENTS[element];
  const cells = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      const bit = (h >> ((y * 4 + x) % 31)) & 1;
      const bit2 = (h >> ((y * 3 + x * 5 + 7) % 31)) & 1;
      row.push(bit ? (bit2 ? e.color : "#f1f5f9") : y > 5 && bit2 ? "#1e293b" : "transparent");
    }
    cells.push([...row, ...[...row].reverse()]);
  }
  const cell = size / 8;
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, imageRendering: "pixelated", filter: ko ? "grayscale(1) brightness(0.5)" : "none" }}>
      <div className="absolute inset-0 grid grid-cols-8" style={{ background: "#0d1322", border: `2px solid ${e.color}` }}>
        {cells.flat().map((c, i) => <div key={i} style={{ width: cell - 0.5, height: cell - 0.5, background: c }} />)}
      </div>
    </div>
  );
};

const SpriteImg = ({ id, size, clip, fallback }) => {
  const [err, setErr] = useState(false);
  if (err) return fallback;
  return <img src={`/sprites/${id}.png`} alt="" draggable={false} onError={() => setErr(true)} className="absolute inset-0 w-full h-full object-contain" style={{ imageRendering: "pixelated", clipPath: clip }} />;
};

// Real DS/3DS sprite by baseId; fused players show a split of both parents; falls back to a procedural pixel avatar
export const Avatar = ({ p, size = 64, ko = false, className = "" }) => {
  const e = ELEMENTS[p.element];
  const ids = p.fused || String(p.baseId).includes("+")
    ? (p.parentVersionIds?.every(Boolean) ? p.parentVersionIds : String(p.baseId).split("+")).map(id => resolveVersion(id)?.spriteId)
    : [resolveVersion(p.versionId || p.baseId)?.spriteId];
  if (!e || ids.some(id => !id)) return <div aria-label="Ritratto non disponibile" className={`shrink-0 grid place-items-center bg-slate-800 text-slate-400 ${className}`} style={{ width: size, height: size }}>?</div>;
  const fb = <PixelAvatar seed={p.uid + p.name} element={p.element} size={size} ko={ko} />;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size, background: "#0d1322", border: `2px solid ${ko ? "#334155" : e.color}`, filter: ko ? "grayscale(1) brightness(0.5)" : "none", boxShadow: `0 0 0 1px #000, inset 0 0 ${size / 6}px ${e.color}33` }}>
      {ids.length === 1 ? (
        <SpriteImg id={ids[0]} size={size} fallback={fb} />
      ) : (
        <>
          <SpriteImg id={ids[0]} size={size} clip="polygon(0 0, 58% 0, 42% 100%, 0 100%)" fallback={fb} />
          <SpriteImg id={ids[1]} size={size} clip="polygon(58% 0, 100% 0, 100% 100%, 42% 100%)" fallback={null} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, transparent 48%, #ec4899 48%, #ec4899 52%, transparent 52%)", transform: "skewX(-9deg)" }} />
        </>
      )}
    </div>
  );
};

const EFFECT_LABEL = { drain: "assorbe HP", burn: "brucia", weaken: "riduce ATK", shatter: "riduce DIF", charge: "aumenta ATK", guard: "para il prossimo colpo", priority: "priorità", crit: "critici frequenti", multi: "colpi multipli", recoil: "contraccolpo", heal: "cura sé stesso" };

export const MoveInfo = ({ move }) => (
  <div className="font-body text-sky-200 text-base leading-tight space-y-1 break-words" data-testid="move-info">
    <div>{move.name}</div>
    <div className="flex flex-wrap items-center gap-2"><ElementBadge element={move.element} /><span>POT {move.power}</span></div>
    <div className="text-slate-300">Effetto: {move.effect ? EFFECT_LABEL[move.effect] || move.effect : "nessuno"}</div>
  </div>
);

export const MatchupBadge = ({ attacker, defender, compact = false, showNeutral = false }) => {
  const multiplier = effectiveTypeMultiplier(attacker, defender);
  if (multiplier === 1 && !showNeutral) return null;
  const favorable = multiplier > 1;
  return <span data-testid="matchup-badge" title="Efficacia elementale: non confronta il danno totale"
    className={`font-body ${compact ? "text-xs max-w-[108px]" : "text-sm"} leading-tight normal-case border px-1 py-0.5 ${multiplier === 1 ? "text-slate-200 bg-slate-800 border-slate-500" : favorable ? "text-emerald-200 bg-emerald-950 border-emerald-700" : "text-orange-200 bg-orange-950 border-orange-700"}`}>
    {multiplier === 1 ? "NEUTRO" : favorable ? "SUPEREFFICACE" : "POCO EFFICACE"}
  </span>;
};

export const XpBar = ({ progress }) => (
  <div className="font-body text-sm text-sky-200">
    <div>EXP {progress.xp} / {progress.required}</div>
    <div role="progressbar" aria-label="Esperienza" aria-valuemin={0} aria-valuemax={progress.required} aria-valuenow={Math.min(progress.xp, progress.required)} className="h-2 bg-slate-950 border border-slate-600 overflow-hidden">
      <div className="h-full bg-sky-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress.percent}%` }} />
    </div>
  </div>
);

export const XpReport = ({ report }) => {
  if (!report) return null;
  return <Panel data-testid="xp-report" className="space-y-2">
    <div className="font-pixel text-[9px] text-sky-300">{report.source === "travel" ? "Esperienza viaggio" : "Crescita squadra"}</div>
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
      {report.rows.map((row) => <div key={row.uid} className="font-body text-base leading-tight border-b border-slate-700 pb-2">
        <div className="text-white">{row.name} <span className="text-sky-300">+{row.total} EXP</span></div>
        {row.koCombat && row.activeXp + row.benchXp === 0 && <div className="text-slate-400">KO · Nessuna EXP da combattimento</div>}
        {row.benchXp > 0 && <div className="text-slate-400 text-sm">Panchina {row.benchPercent}%: +{row.benchXp}</div>}
        {row.activeXp > 0 && <div className="text-slate-400 text-sm">In campo: +{row.activeXp}</div>}
        {row.travelXp > 0 && <div className="text-sky-300 text-sm">Esperienza viaggio +{row.travelXp}</div>}
        <div className={row.after.level > row.before.level ? "text-amber-300" : "text-slate-300"}>
          {row.after.level > row.before.level ? `Lv${row.before.level} → Lv${row.after.level}!` : `Lv${row.after.level}`}
        </div>
        <XpBar progress={row.after} />
      </div>)}
    </div>
  </Panel>;
};

export const PlayerCard = ({ p, onClick, selected = false, testId, compact = false, right = null, highlightTarget = false }) => {
  const ko = p.hp === 0;
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`flex items-center gap-2 bg-[#141c2e] border-2 ${selected ? "border-amber-400" : "border-slate-700"} ${onClick ? "cursor-pointer active:translate-y-[2px]" : ""} p-2 ${ko && !highlightTarget ? "opacity-60" : ""}`}
    >
      <Avatar p={p} size={compact ? 40 : 52} ko={ko && !highlightTarget} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-pixel text-[9px] text-white break-words">{p.name}{p.fused && <span className="text-pink-400"> ✦</span>}</span>
          <span className="font-pixel text-[8px] text-amber-300 shrink-0">Lv{p.level}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <ElementBadge element={p.element} />
          <span className="font-body text-slate-400 text-sm leading-none">{ROLES[p.role]}</span>
        </div>
        {!compact && <MoveInfo move={p.move} />}
        <div className="mt-1"><HpBar hp={p.hp} maxHp={p.maxHp} showText={false} /></div>
        <div className="flex justify-between font-body text-xs text-slate-400 leading-none mt-1">
          <span>{p.hp}/{p.maxHp} HP</span>
          {!compact && <span>XP {p.xp}/{xpForLevel(p.level)}</span>}
        </div>
      </div>
      {right}
    </div>
  );
};

export const StatLine = ({ p }) => (
  <div className="grid grid-cols-4 gap-1 font-body text-sm text-slate-300 text-center">
    <div className="bg-slate-900 p-1"><div className="text-slate-500 text-xs">HP</div>{p.maxHp}</div>
    <div className="bg-slate-900 p-1"><div className="text-slate-500 text-xs">ATK</div>{p.atk}</div>
    <div className="bg-slate-900 p-1"><div className="text-slate-500 text-xs">DIF</div>{p.def}</div>
    <div className="bg-slate-900 p-1"><div className="text-slate-500 text-xs">VEL</div>{p.spd}</div>
  </div>
);


export const ItemInfo = ({ id }) => {
  const item = ITEMS[id], presentation = itemPresentation(id);
  return <div className="min-w-0">
    <div className="font-pixel text-[10px] text-white leading-relaxed">{item.name}</div>
    <div data-testid={`item-rarity-${id}`} className={`font-pixel text-[8px] mt-1 ${presentation.accentClass}`}>{presentation.label}</div>
    <div className="font-body text-slate-200 text-base leading-tight mt-1">{item.description}</div>
  </div>;
};


// Real disabled targets and explicit labels; KO portraits stay legible when revival is valid.
export const ItemTargetCard = ({ p, itemId, onClick, testId }) => {
  const valid = canApplyItem(itemId, p);
  return <button type="button" data-testid={testId} disabled={!valid} onClick={onClick}
    className={`w-full text-left border-2 p-1 ${valid ? "border-emerald-400 bg-emerald-950/40" : "border-slate-700 opacity-40 cursor-not-allowed"}`}>
    <div className={`font-pixel text-[8px] px-2 py-1 ${valid ? "text-emerald-300" : "text-slate-300"}`}>
      {valid ? (p.hp === 0 ? "KO • RIANIMABILE" : "TARGET VALIDO") : "NON SELEZIONABILE"}
    </div>
    <PlayerCard p={p} compact highlightTarget={valid} />
  </button>;
};
