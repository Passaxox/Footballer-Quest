import { useState } from "react";
import { RECRUIT_LINES } from "@/game/data";
import { pick } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, PlayerCard, StatLine, Avatar, XpReport } from "./ui";

// mode: "offer" (free join) | "encounter" (challenge / pay / skip)
export default function RecruitScreen({ run, player, price, mode, xpReport, onChallenge, onJoin, onSkip }) {
  const [replacing, setReplacing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [line] = useState(() => pick(RECRUIT_LINES));
  const full = run.team.length >= 6;
  const join = (replaceIdx = null, isPaid = paid) => { sfx.win(); onJoin(replaceIdx, isPaid); };
  const tryJoin = (isPaid = false) => { setPaid(isPaid); if (full) setReplacing(true); else join(null, isPaid); };

  return (
    <div data-testid="recruit-screen" className="flex flex-col flex-1">
      <Header title={mode === "offer" ? "Vuole unirsi!" : "Incontro"} sub={`Ondata ${run.wave}`} />
      <div className="p-3 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar p={player} size={80} />
          <Panel className="flex-1 font-body text-lg leading-tight text-white">{line}</Panel>
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
