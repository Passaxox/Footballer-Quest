import { useEffect, useState } from "react";
import { RECRUIT_LINES } from "@/game/data";
import { pick } from "@/game/engine";
import { sfx } from "@/game/audio";
import { resolveVersion, CHARACTERS } from "@/game/catalog";
import { rarityForVersion } from "@/game/rarity";
import { formatVersionSubtitle } from "@/game/presentation";
import { Btn, Header, Panel, PlayerCard, StatLine, Avatar, XpReport } from "./ui";

// mode: "offer" (free join) | "encounter" (challenge / pay / skip)
export default function RecruitScreen({ run, player, price, mode, xpReport, onChallenge, onJoin, onSkip, onDiscover }) {
  useEffect(() => { onDiscover?.(player); }, [player, onDiscover]);
  const [replacing, setReplacing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [line] = useState(() => pick(RECRUIT_LINES));
  const full = run.team.length >= 6;
  const join = (replaceIdx = null, isPaid = paid) => { sfx.win(); onJoin(replaceIdx, isPaid); };
  const tryJoin = (isPaid = false) => { setPaid(isPaid); if (full) setReplacing(true); else join(null, isPaid); };

  const version = resolveVersion(player?.versionId || player?.baseId);
  const canonical = CHARACTERS[player?.characterId || player?.baseId];
  const rarity = rarityForVersion(version);
  const versionSubtitle = formatVersionSubtitle(player);
  const contextTeam = run.pending?.teamName;

  return (
    <div data-testid="recruit-screen" className="flex flex-col flex-1">
      <Header title={mode === "offer" ? "Vuole unirsi!" : "Incontro"} sub={`Ondata ${run.wave}`} />
      <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center gap-3">
          <Avatar p={player} size={80} />
          <Panel className="flex-1 font-body text-lg leading-tight text-white space-y-1">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span data-testid="recruit-version-subtitle" className="font-pixel text-[8px] text-amber-300">
                {versionSubtitle}
              </span>
              <span data-testid="recruit-rarity-badge" className={`font-pixel text-[7px] px-1.5 py-0.2 rounded border ${rarity.accentClass} border-current/50 bg-slate-950/60`}>
                {rarity.label.toUpperCase()}
              </span>
            </div>
            <p className="text-base text-slate-200">{line}</p>
            {contextTeam && (
              <div className="font-body text-xs text-slate-400">
                Incontro da: <strong className="text-sky-300">{contextTeam}</strong>
              </div>
            )}
          </Panel>
        </div>
        <PlayerCard p={player} testId="recruit-player-card" />
        <StatLine p={player} />
        <XpReport report={xpReport} />
        {replacing ? (
          <div className="space-y-2">
            <div className="font-body text-slate-300 text-lg">La squadra è piena (6). Chi lascia il posto a {player.name}?</div>
            {run.team.map((p, i) => <PlayerCard key={p.uid} p={p} compact testId={`replace-player-${i}`} onClick={() => join(i)} />)}
            <Btn data-testid="replace-cancel" variant="ghost" className="w-full" onClick={() => setReplacing(false)}>Indietro</Btn>
          </div>
        ) : (
          <div className="mt-auto grid gap-2">
            {mode === "offer" ? (
              <Btn data-testid="recruit-accept-btn" variant="primary" onClick={() => tryJoin(false)}>Benvenuto in squadra!</Btn>
            ) : (
              <>
                <Btn data-testid="recruit-challenge-btn" variant="primary" onClick={() => { sfx.confirm(); onChallenge(); }}>Sfidalo (vinci = si unisce)</Btn>
                <Btn data-testid="recruit-pay-btn" disabled={run.money < price} onClick={() => { sfx.confirm(); tryJoin(true); }}>Convincilo ({price} Prestigio)</Btn>
              </>
            )}
            <Btn data-testid="recruit-skip-btn" variant="ghost" onClick={() => { sfx.cancel(); onSkip(); }}>{mode === "offer" ? "No, grazie" : "Ignora e prosegui"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
