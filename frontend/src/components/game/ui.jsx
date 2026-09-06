import { useState } from "react";
import { ELEMENTS, ROLES } from "@/game/data";
import { xpForLevel } from "@/game/engine";
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
  const ids = String(p.baseId).split("+");
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

export const PlayerCard = ({ p, onClick, selected = false, testId, compact = false, right = null }) => {
  const ko = p.hp === 0;
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`flex items-center gap-2 bg-[#141c2e] border-2 ${selected ? "border-amber-400" : "border-slate-700"} ${onClick ? "cursor-pointer active:translate-y-[2px]" : ""} p-2 ${ko ? "opacity-60" : ""}`}
    >
      <Avatar p={p} size={compact ? 40 : 52} ko={ko} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-pixel text-[9px] text-white truncate">{p.name}{p.fused && <span className="text-pink-400"> ✦</span>}</span>
          <span className="font-pixel text-[8px] text-amber-300 shrink-0">Lv{p.level}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <ElementBadge element={p.element} />
          <span className="font-body text-slate-400 text-sm leading-none">{ROLES[p.role]}</span>
        </div>
        {!compact && <div className="font-body text-sky-200 text-sm leading-none mt-1 truncate">{p.move.name}</div>}
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
