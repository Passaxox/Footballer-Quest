import { useEffect, useRef, useState } from "react";
import { ITEMS, ELEMENTS, WILD_INTROS } from "@/game/data";
import { performAttack, applyBurn, turnOrder, resetBattleStatus, gainXp, applyItemTo, canApplyItem, removeItem, pick, chance } from "@/game/engine";
import { sfx } from "@/game/audio";
import { Btn, HpBar, Avatar, ElementBadge, ElementIcon, PlayerCard } from "./ui";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const Fighter = ({ p, side, hit }) => (
  <div className={`flex ${side === "enemy" ? "flex-row-reverse" : "flex-row"} items-end gap-2 ${hit ? "animate-shake" : ""}`}>
    <div className={`${p.hp === 0 ? "animate-ko" : "animate-idle"}`}>
      <Avatar p={p} size={side === "enemy" ? 100 : 120} ko={p.hp === 0} />
    </div>
    <div className={`flex-1 bg-[#0b101d]/90 border-2 border-slate-600 p-2 ${side === "enemy" ? "text-left" : ""}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-pixel text-[9px] text-white truncate" data-testid={`${side}-name`}>{p.name}</span>
        <span className="font-pixel text-[8px] text-amber-300">Lv{p.level}</span>
      </div>
      <div className="flex items-center gap-1 my-1">
        <ElementBadge element={p.element} />
        {p.status.burn > 0 && <span className="font-pixel text-[7px] text-orange-400 border border-orange-500 px-1">BRUCIA</span>}
        {p.status.guard && <span className="font-pixel text-[7px] text-sky-300 border border-sky-500 px-1">PARATA</span>}
        {p.status.atkMod !== 0 && <span className="font-pixel text-[7px] text-slate-300">ATK{p.status.atkMod > 0 ? "+" : ""}{p.status.atkMod}</span>}
        {p.status.defMod !== 0 && <span className="font-pixel text-[7px] text-slate-300">DIF{p.status.defMod > 0 ? "+" : ""}{p.status.defMod}</span>}
      </div>
      <HpBar hp={p.hp} maxHp={p.maxHp} testId={`${side}-hp-bar`} />
    </div>
  </div>
);

const Dots = ({ team, active }) => (
  <div className="flex gap-1">
    {team.map((p, i) => <span key={p.uid} className={`w-2.5 h-2.5 border border-slate-400 ${p.hp === 0 ? "bg-slate-800" : i === active ? "bg-amber-400" : "bg-emerald-500"}`} />)}
  </div>
);

export default function BattleScreen({ run, encounter, onWin, onLose, onFlee }) {
  const s = useRef(null);
  if (!s.current) {
    s.current = {
      team: resetBattleStatus(run.team), items: { ...run.items }, active: run.team.findIndex((p) => p.hp > 0),
      enemies: encounter.enemies.map((e) => ({ ...e })), eIdx: 0, log: [], phase: "intro", hit: null, menu: "main", itemSel: null, xpGained: {},
    };
  }
  const st = s.current;
  const [, force] = useState(0);
  const rr = () => force((n) => n + 1);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const say = async (msg, ms = 750) => {
    if (!mounted.current) return;
    st.log = [...st.log.slice(-5), msg];
    rr();
    await sleep(ms);
  };

  const active = () => st.team[st.active];
  const enemy = () => st.enemies[st.eIdx];
  const setActive = (p) => { st.team = st.team.map((q, i) => (i === st.active ? p : q)); };
  const setEnemy = (p) => { st.enemies = st.enemies.map((q, i) => (i === st.eIdx ? p : q)); };

  useEffect(() => {
    (async () => {
      if (encounter.kind === "boss") await say(encounter.intro, 1600);
      else if (encounter.kind === "team") await say(`La squadra ${encounter.teamName} vi sfida!`, 1000);
      else await say(pick(WILD_INTROS), 1000);
      await say(`${enemy().name} scende in campo!`, 700);
      await say(`Forza ${active().name}!`, 600);
      st.phase = "menu"; rr();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doAttack = async (attackerSide) => {
    const a = attackerSide === "player" ? active() : enemy();
    const d = attackerSide === "player" ? enemy() : active();
    const { att, def, msgs } = performAttack(a, d);
    st.log = [...st.log.slice(-5), msgs[0]]; rr();
    await sleep(450);
    st.hit = attackerSide === "player" ? "enemy" : "player";
    if (attackerSide === "player") { setActive(att); setEnemy(def); } else { setEnemy(att); setActive(def); }
    (msgs.includes("Colpo critico!") ? sfx.crit : sfx.hit)();
    rr();
    await sleep(350);
    st.hit = null; rr();
    for (const m of msgs.slice(1)) { if (m.includes("KO")) sfx.ko(); if (m.includes("recupera")) sfx.heal(); await say(m, 650); }
  };

  const endOfTurn = async () => {
    for (const side of ["player", "enemy"]) {
      const p = side === "player" ? active() : enemy();
      if (p.hp === 0) continue;
      const { p: q, msg } = applyBurn(p);
      if (msg) { side === "player" ? setActive(q) : setEnemy(q); await say(msg); }
    }
  };

  const grantXp = async (defeated) => {
    const base = Math.round((18 + defeated.level * 6) * (encounter.kind === "boss" ? 1.6 : 1));
    for (let i = 0; i < st.team.length; i++) {
      const p = st.team[i];
      if (p.hp === 0) continue;
      const amt = i === st.active ? base : Math.round(base * 0.5);
      const { player, ups } = gainXp(p, amt);
      st.team = st.team.map((q, j) => (j === i ? player : q));
      if (ups) { sfx.levelup(); await say(`${player.name} sale al livello ${player.level}!`, 700); }
    }
    rr();
  };

  const afterAction = async () => {
    await endOfTurn();
    if (enemy().hp === 0) {
      await grantXp(enemy());
      if (st.eIdx < st.enemies.length - 1) {
        st.eIdx += 1;
        await say(`${encounter.teamName || "L'avversario"} manda in campo ${enemy().name}!`, 900);
      } else {
        sfx.win();
        await say(encounter.kind === "boss" ? `Avete sconfitto ${encounter.teamName}!` : "Vittoria!", 1100);
        st.phase = "end"; rr();
        onWin(st.team.map((p) => ({ ...p, status: { ...p.status, atkMod: 0, defMod: 0, guard: false, talisman: false } })), st.items);
        return;
      }
    }
    if (active().hp === 0) {
      if (st.team.some((p) => p.hp > 0)) { st.phase = "forcedSwitch"; st.menu = "switch"; await say("Scegli il prossimo giocatore!", 300); rr(); return; }
      sfx.lose();
      await say("Tutta la squadra è KO... La run finisce qui.", 1500);
      st.phase = "end"; rr();
      onLose();
      return;
    }
    st.phase = "menu"; st.menu = "main"; rr();
  };

  const attack = async () => {
    if (st.phase !== "menu") return;
    sfx.confirm();
    st.phase = "busy"; rr();
    const first = turnOrder(active(), enemy());
    const second = first === "player" ? "enemy" : "player";
    await doAttack(first);
    const defender = first === "player" ? enemy() : active();
    if (defender.hp > 0) await doAttack(second);
    await afterAction();
  };

  const enemyFreeTurn = async () => {
    await doAttack("enemy");
    await afterAction();
  };

  const switchTo = async (idx) => {
    if (idx === st.active || st.team[idx].hp === 0) return;
    const forced = st.phase === "forcedSwitch";
    sfx.confirm();
    st.phase = "busy"; st.menu = "main";
    st.active = idx;
    await say(`Entra in campo ${active().name}!`, 700);
    if (forced) { st.phase = "menu"; rr(); return; }
    await enemyFreeTurn();
  };

  const consumeItem = async (itemId, idx) => {
    st.phase = "busy"; st.menu = "main"; st.itemSel = null;
    const before = st.team[idx];
    const after = applyItemTo(itemId, before);
    st.team = st.team.map((q, j) => (j === idx ? after : q));
    st.items = removeItem(st.items, itemId);
    sfx.heal();
    await say(`Usi ${ITEMS[itemId].name} su ${before.name}!`, 800);
    await enemyFreeTurn();
  };

  const flee = async () => {
    if (encounter.kind === "boss") { await say("Non puoi fuggire da un boss!", 700); return; }
    sfx.cancel();
    st.phase = "busy"; rr();
    const ok = chance(45 + Math.max(-30, Math.min(30, (active().spd - enemy().spd) * 2)));
    if (ok) { await say("Siete fuggiti con successo!", 900); st.phase = "end"; rr(); onFlee(st.team, st.items); return; }
    await say("La fuga è fallita!", 700);
    await enemyFreeTurn();
  };

  const p = active();
  const e = enemy();
  const mult = ELEMENTS[p.move.element].beats === e.element ? "▲" : ELEMENTS[e.element].beats === p.move.element ? "▼" : "";
  const battleItems = Object.entries(st.items).filter(([id, n]) => ITEMS[id].battle && n > 0);

  return (
    <div data-testid="battle-screen" className="flex flex-col flex-1">
      <div className="flex items-center justify-between px-3 py-2 bg-[#111827] border-b-4 border-slate-800">
        <span data-testid="wave-counter-badge" className="font-pixel text-[9px] text-amber-300">ONDATA {run.wave}</span>
        <span className="font-pixel text-[8px] text-slate-400 uppercase truncate mx-2">{encounter.kind === "boss" ? `BOSS: ${encounter.teamName}` : encounter.teamName || "Sfida"}</span>
        <Dots team={st.enemies} active={st.eIdx} />
      </div>

      <div className={`relative flex flex-col justify-between gap-3 p-3 battle-bg ${encounter.kind === "boss" ? "boss-glow" : ""}`}>
        <Fighter p={e} side="enemy" hit={st.hit === "enemy"} />
        <Fighter p={p} side="player" hit={st.hit === "player"} />
      </div>

      <div data-testid="battle-log" className="mx-3 mt-2 bg-[#0b101d] border-4 border-slate-600 p-2 min-h-[84px] font-body text-lg leading-tight text-white">
        {st.log.slice(-3).map((m, i, arr) => (
          <div key={i} className={i === arr.length - 1 ? "text-white" : "text-slate-500"}>{m}{i === arr.length - 1 && st.phase !== "menu" ? <span className="blink">▼</span> : ""}</div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 pt-2">
        <Dots team={st.team} active={st.active} />
        <span className="font-body text-slate-400 text-sm">Squadra {st.team.filter((q) => q.hp > 0).length}/{st.team.length}</span>
      </div>

      <div className="p-3 mt-auto">
        {(st.phase === "menu" || st.phase === "forcedSwitch") && st.menu === "main" && (
          <div className="grid grid-cols-2 gap-2">
            <Btn data-testid="attack-button" variant="primary" onClick={attack} className="col-span-2 flex items-center justify-center gap-2">
              <ElementIcon element={p.move.element} size={14} /> {p.move.name} {mult}
              <span className="text-[8px] opacity-70">POT {p.move.power}</span>
            </Btn>
            <Btn data-testid="switch-button" onClick={() => { sfx.select(); st.menu = "switch"; rr(); }}>Cambia</Btn>
            <Btn data-testid="item-button" onClick={() => { sfx.select(); st.menu = "items"; rr(); }}>Zaino</Btn>
            <Btn data-testid="flee-button" variant="ghost" onClick={flee} className="col-span-2" disabled={encounter.kind === "boss"}>Fuggi</Btn>
          </div>
        )}
        {(st.phase === "menu" || st.phase === "forcedSwitch") && st.menu === "switch" && (
          <div className="space-y-2">
            {st.team.map((q, i) => (
              <PlayerCard key={q.uid} p={q} compact selected={i === st.active} testId={`switch-player-btn-${i}`} onClick={() => switchTo(i)} />
            ))}
            {st.phase === "menu" && <Btn data-testid="switch-cancel" variant="ghost" className="w-full" onClick={() => { sfx.cancel(); st.menu = "main"; rr(); }}>Indietro</Btn>}
          </div>
        )}
        {st.phase === "menu" && st.menu === "items" && !st.itemSel && (
          <div className="space-y-2">
            {battleItems.length === 0 && <div className="font-body text-slate-400 text-lg text-center">Nessun oggetto utilizzabile.</div>}
            {battleItems.map(([id, n]) => (
              <Btn key={id} data-testid={`use-item-${id}`} className="w-full flex justify-between items-center" onClick={() => { sfx.select(); st.itemSel = id; rr(); }}>
                <span>{ITEMS[id].name}</span><span className="text-amber-300">x{n}</span>
              </Btn>
            ))}
            <Btn data-testid="items-cancel" variant="ghost" className="w-full" onClick={() => { sfx.cancel(); st.menu = "main"; rr(); }}>Indietro</Btn>
          </div>
        )}
        {st.phase === "menu" && st.menu === "items" && st.itemSel && (
          <div className="space-y-2">
            <div className="font-body text-slate-300 text-lg">Su chi usare {ITEMS[st.itemSel].name}?</div>
            {st.team.map((q, i) => (
              <div key={q.uid} className={canApplyItem(st.itemSel, q) ? "" : "opacity-40 pointer-events-none"}>
                <PlayerCard p={q} compact testId={`item-target-${i}`} onClick={() => consumeItem(st.itemSel, i)} />
              </div>
            ))}
            <Btn data-testid="item-target-cancel" variant="ghost" className="w-full" onClick={() => { sfx.cancel(); st.itemSel = null; rr(); }}>Indietro</Btn>
          </div>
        )}
        {(st.phase === "busy" || st.phase === "intro" || st.phase === "end") && (
          <div className="grid grid-cols-2 gap-2 opacity-40 pointer-events-none">
            <Btn variant="primary" className="col-span-2">...</Btn>
            <Btn>Cambia</Btn><Btn>Zaino</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
