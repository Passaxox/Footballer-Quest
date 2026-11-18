import { useMemo, useState } from "react";
import { createPlayer } from "@/game/engine";
import { canonicalCharacterId } from "@/game/catalog";
import { ACTS, bossDef, actBosses, actMiniboss } from "@/game/campaign";
import { spiritFor, spiritEligible } from "@/game/spirits";
import { canReceiveMixi, mixiPassive } from "@/game/mixi";
import { Avatar, Btn, PlayerCard } from "./ui";
import { MapPin, Swords, Flag, Sparkles, Zap } from "lucide-react";
import { TeamCrest } from "./TeamCrest";
import "./story.css";

const portrait = (id) => createPlayer(id, 1);

const Frame = ({ act, testId, children }) => (
  <div data-testid={testId} className={`story-screen story-${act?.palette || "act1"} flex flex-col flex-1`}>{children}</div>
);

export function ActIntro({ run, act, onStart }) {
  const bosses = actBosses(run.overworld.contentSeed, act);
  const mini = actMiniboss(run.overworld.contentSeed, act);
  const why = act.why.replace("{mini}", mini.team).replace("{boss}", bosses.map((b) => b.team).join(" oppure "));
  return (
    <Frame act={act} testId="act-intro">
      <div className="story-eyebrow">ATTO {act.index} / {ACTS.length} · W{act.fromWave}–{act.toWave}</div>
      <h1 className="story-title" data-testid="act-intro-title">{act.title}</h1>
      <div className="story-rivals">{[mini, ...bosses].map((b, i) => <TeamCrest key={b.id} teamId={b.teamId} name={b.team} label={`${i === 0 ? "Miniboss" : "Boss"} · ${b.team}`} size={64} testId={`act-intro-crest-${i}`} />)}</div>
      <section className="story-card"><MapPin size={16} /><div><b>Dove siamo</b><p>{act.where}</p></div></section>
      <section className="story-card"><Swords size={16} /><div><b>Chi affrontiamo</b><p>{act.who}</p>
        <p data-testid="act-intro-bosses" className="text-amber-200">Miniboss W{act.fromWave + 4}: {mini.team} · Boss W{act.toWave}: {bosses.map((b) => b.team).join(" oppure ")}</p></div></section>
      <section className="story-card"><Flag size={16} /><div><b>Perché conta</b><p data-testid="act-intro-why">{why}</p></div></section>
      <Btn data-testid="act-intro-start" variant="primary" className="w-full mt-auto" onClick={onStart}>Si parte!</Btn>
    </Frame>
  );
}

export function BossIntro({ run, encounter, onStart }) {
  const boss = bossDef(encounter.actId, encounter.bossId);
  const act = ACTS.find((a) => a.id === encounter.actId);
  const [step, setStep] = useState(0);
  const rival = useMemo(() => portrait(boss.leader), [boss.leader]);
  const lines = boss.dialogue.slice(0, step + 1);
  const done = step >= boss.dialogue.length - 1;
  return (
    <Frame act={act} testId="boss-intro">
      <div className="story-eyebrow">W{run.wave} · CHECKPOINT</div>
      <h1 className="story-title">{boss.team}</h1>
      <p className="story-sub">{boss.intro}</p>
      <div className="story-dialogue">
        {lines.map((l, i) => {
          const speaker = l.who === "rival" ? rival : run.team[0];
          return <div key={i} data-testid={`boss-line-${i}`} className={`story-line ${l.who === "rival" ? "story-line-rival" : "story-line-captain"}`}>
            <Avatar p={speaker} size={56} /><div><b>{speaker.name}</b><p>{l.text}</p></div></div>;
        })}
      </div>
      <Btn data-testid={done ? "boss-intro-start" : "boss-intro-next"} variant="primary" className="w-full mt-auto" onClick={() => (done ? onStart() : setStep(step + 1))}>{done ? "Calcio d'inizio!" : "Avanti ▼"}</Btn>
    </Frame>
  );
}

export function Consequence({ run, pending, onResolve }) {
  const act = ACTS.find((a) => a.id === pending.actId);
  const boss = bossDef(pending.actId, pending.bossId);
  const unlockId = act.consequence.unlock || boss.unlock;
  const offer = useMemo(() => unlockId && createPlayer(unlockId, Math.max(1, run.wave - 1)), [unlockId, run.wave]);
  const sameIdx = offer ? run.team.findIndex((p) => !p.fused && canonicalCharacterId(p) === canonicalCharacterId(offer)) : -1;
  const sameVersion = sameIdx >= 0 && run.team[sameIdx].versionId === offer.versionId;
  return (
    <Frame act={act} testId="consequence-screen">
      <div className="story-eyebrow">ATTO {act.index} COMPLETATO</div>
      <h1 className="story-title" data-testid="consequence-title">{act.consequence.title}</h1>
      <p className="story-sub">{act.consequence.text.replace("{boss}", boss.team)}</p>
      <p data-testid="consequence-exclusive" className="story-card">Ricompensa esclusiva: Medaglia del Checkpoint (+4 ATK/DIF/VEL, +12 HP a un giocatore).</p>
      {offer && <section className="story-card story-unlock" data-testid="consequence-unlock">
        <Sparkles size={16} /><div className="flex-1 min-w-0"><b>Nuova versione sbloccata</b><p>{act.consequence.unlockText}</p>
          <p className="text-amber-200">Sbloccato anche come titolare per le prossime run.</p>
          <PlayerCard p={offer} testId="consequence-offer-card" />
          {sameIdx >= 0 && !sameVersion && <p className="text-sky-200">Hai già {run.team[sameIdx].name}: puoi passare a questa versione sullo stesso slot, mantenendo livello ed esperienza.</p>}
        </div></section>}
      <div className="grid gap-2 mt-auto">
        {offer && sameIdx >= 0 && !sameVersion && <Btn data-testid="consequence-swap" variant="primary" onClick={() => onResolve("swap", offer, sameIdx)}>Cambia versione sullo stesso slot</Btn>}
        {offer && sameIdx < 0 && run.team.length < 6 && <Btn data-testid="consequence-recruit" variant="primary" onClick={() => onResolve("recruit", offer)}>Recluta subito</Btn>}
        <Btn data-testid="consequence-continue" onClick={() => onResolve("skip", offer)}>{offer ? "Lascialo nello scouting e continua" : "Continua"}</Btn>
      </div>
    </Frame>
  );
}

export function Anomaly({ run, pending, onAccept, onLeave }) {
  const mixi = pending.variant === "mixi";
  const eligible = run.team.filter((p) => (mixi ? canReceiveMixi(p) : p.hp > 0 && spiritEligible(p)));
  const [pickUid, setPick] = useState(eligible[0]?.uid || null);
  const act = ACTS.find((a) => run.wave >= a.fromWave && run.wave <= a.toWave);
  return (
    <Frame act={act} testId="anomaly-screen">
      <div className="story-eyebrow anomaly-glitch" data-testid="anomaly-variant">ANOMALIA TEMPORALE · {mixi ? "MIXI MAX" : "SPIRITO GUERRIERO"} · W{run.wave}</div>
      <h1 className="story-title">Uno squarcio nel tempo</h1>
      <div className="anomaly-rift"><Avatar p={pending.cameo} size={96} /></div>
      <p className="story-sub" data-testid="anomaly-cameo">Dallo squarcio emerge {pending.cameo.name}, un'eco di un altro momento della storia. {mixi
        ? `Battetelo e la sua aura potrà legarsi a un vostro giocatore con il Mixi Max (meccanica dell'era Chrono Stone): ${mixiPassive(pending.cameo.versionId).label}.`
        : "Chi lo batte può risvegliare una forza che appartiene al futuro: lo Spirito Guerriero."}</p>
      {eligible.length ? (
        <section className="story-card"><Zap size={16} /><div className="flex-1"><b>{mixi ? "Chi riceverà l'aura?" : "Chi tenterà il risveglio?"}</b>
          {eligible.map((p) => <PlayerCard key={p.uid} p={p} compact selected={pickUid === p.uid} testId={`anomaly-pick-${p.uid}`} onClick={() => setPick(p.uid)}
            right={<span className="font-body text-amber-300 text-sm">{mixi ? "Mixi Max" : spiritFor(p).name}</span>} />)}
        </div></section>
      ) : <p className="story-card" data-testid="anomaly-no-eligible">{mixi ? "Tutti i giocatori hanno già un Mixi Max." : "Nessun giocatore idoneo allo Spirito Guerriero (servono Mark Evans o Axel Blaze)."} Vincendo otterrete comunque un premio raro.</p>}
      <div className="grid gap-2 mt-auto">
        <Btn data-testid="anomaly-accept" variant="fusion" onClick={() => onAccept(pickUid)}>Entra nello squarcio</Btn>
        <Btn data-testid="anomaly-leave" variant="ghost" onClick={onLeave}>Ignora e prosegui</Btn>
      </div>
    </Frame>
  );
}

// Route summary grouped by act: lanes travelled, rivals, anomalies and checkpoints.
export function JourneyLog({ run }) {
  const journey = run.overworld?.journey || [];
  if (!journey.length) return null;
  return (
    <div data-testid="journey-log" className="space-y-2">
      <div className="font-pixel text-[9px] text-amber-300 uppercase">Il vostro percorso</div>
      {ACTS.filter((a) => journey.some((j) => j.actId === a.id)).map((a) => {
        const steps = journey.filter((j) => j.actId === a.id);
        const lanes = [...new Set(steps.filter((j) => j.type !== "boss").map((j) => j.lane))];
        const boss = steps.find((j) => j.type === "boss");
        const extra = steps.filter((j) => (j.type === "rival" || j.type === "anomaly") && !j.skipped).length;
        return <div key={a.id} data-testid={`journey-${a.id}`} className="border-l-4 border-amber-500 pl-2 font-body text-base leading-tight text-slate-200">
          <b className="text-amber-200">Atto {a.index} · {a.title}</b>
          <div>Strada: {lanes.join(" → ") || "—"}</div>
          {extra > 0 && <div className="text-fuchsia-300">Rivali e anomalie affrontati: {extra}</div>}
          <div className={boss ? "text-emerald-300" : "text-slate-400"}>{boss ? `Checkpoint superato: ${boss.lane}` : "Checkpoint non raggiunto"}</div>
        </div>;
      })}
    </div>
  );
}
