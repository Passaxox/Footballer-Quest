import { useEffect } from "react";
import { getEncounterTier, resolveTeamAccent } from "@/game/presentation";
import { Avatar, ElementBadge } from "./ui";
import { Swords, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { sfx } from "@/game/audio";

export default function EncounterIntroModal({ encounter, run, onProceed }) {
  const tier = getEncounterTier(encounter);
  const teamAccent = resolveTeamAccent(encounter.teamName, encounter.teamTags);
  const segment = run?.segmentState;
  const enemy = encounter.enemies?.[0];
  const captain = encounter.enemies?.find(e => e.isCaptain) || enemy;

  useEffect(() => {
    if (encounter.kind === "boss") {
      sfx.bossIntro?.();
    } else {
      sfx.select?.();
    }

    // Auto-proceed timer based on encounter importance
    const timer = setTimeout(() => {
      onProceed?.();
    }, tier.introDelay || 900);

    return () => clearTimeout(timer);
  }, [encounter.kind, onProceed, tier.introDelay]);

  const TierIcon = encounter.kind === "boss" ? Trophy : encounter.kind === "miniboss" ? ShieldAlert : encounter.kind === "elite" ? Sparkles : Swords;

  return (
    <div
      data-testid="encounter-intro-panel"
      className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-1"
      onClick={() => onProceed?.()}
    >
      <div
        className={`w-full max-w-sm p-4 rounded-lg border-2 shadow-2xl space-y-3 bg-[#0b101d] ${tier.borderClass} ${tier.glowClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Segment / Context Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-pixel text-[8px] text-slate-400">
            {segment ? `SEG ${segment.segmentIndex} · PASSO ${segment.step}/${segment.length}` : `ONDATA ${run.wave}`}
          </span>
          <span className="font-pixel text-[8px] text-sky-300">
            {segment?.routeTitle || "Standard"}
          </span>
        </div>

        {/* Tier Banner */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <span className={`font-pixel text-[8px] px-2 py-0.5 rounded border flex items-center gap-1 ${tier.badgeClass}`}>
            <TierIcon size={11} />
            {tier.label}
          </span>
        </div>

        {/* Opponent Team Spotlight */}
        <div className="space-y-1">
          <h2
            className="font-pixel text-sm text-white drop-shadow-[1px_1px_0_#000] tracking-wide"
            data-testid="encounter-intro-team"
          >
            {encounter.teamName || teamAccent.displayName}
          </h2>
          <p className="font-body text-xs text-slate-400 italic">
            {teamAccent.subtitle}
          </p>
        </div>

        {/* Featured Captain / Opponent Card */}
        {captain && (
          <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded flex items-center gap-3 text-left">
            <div className={captain.isCaptain ? "captain-aura rounded" : ""}>
              <Avatar p={captain} size={48} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {captain.isCaptain && (
                  <span className="font-pixel text-[7px] text-amber-300 bg-amber-950 border border-amber-500/80 px-1 py-0.2 rounded shrink-0">
                    ★ CAPITANO
                  </span>
                )}
                <span className="font-pixel text-[9px] text-white truncate">
                  {captain.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <ElementBadge element={captain.element} />
                <span className="font-pixel text-[8px] text-amber-300">
                  Lv{captain.level}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Intro Message */}
        <p className="font-body text-sm text-slate-300 leading-snug px-1">
          {encounter.intro || "Una squadra avversaria scende in campo con determinazione!"}
        </p>

        {/* Action Button */}
        <button
          type="button"
          data-testid="encounter-intro-btn"
          onClick={() => {
            sfx.confirm?.();
            onProceed?.();
          }}
          className={`w-full py-2.5 font-pixel text-[10px] rounded border-2 shadow-lg transition-transform active:translate-y-[1px] flex items-center justify-center gap-2 ${
            encounter.kind === "boss"
              ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-900"
              : encounter.kind === "miniboss"
              ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-900 font-bold"
              : encounter.kind === "elite"
              ? "bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-900 font-bold"
              : "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-900"
          }`}
        >
          <Swords size={14} />
          {encounter.kind === "boss"
            ? "AFFRONTA IL BOSS"
            : encounter.kind === "miniboss"
            ? "AFFRONTA IL MINIBOSS"
            : "SCENDI IN CAMPO"}
        </button>
      </div>
    </div>
  );
}
