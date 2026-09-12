import { ITEMS, validateItems } from "./data";
import {
  addNodeStageModifier, advanceRunWave, applyItemTo, applyNodeModifiers, applyRunEventOutcome,
  grantRunItem, newRun, normalizeRun,
} from "./engine";
import { RUN_EVENTS, eventPool, validateEvents } from "./events";
import { NODE_ARCHETYPES, selectNodeArchetype } from "./routeDeck";
import { activeSynergies, synergyRewardMultiplier } from "./synergies";
import { SCENARIOS, scenarioPool } from "./scenarios";

const starters = ["mark", "axel", "jude"];

test("expanded item pool is unique, useful and explicit about node-duration stages", () => {
  expect(validateItems()).toBe(true);
  expect(Object.keys(ITEMS).length).toBeGreaterThanOrEqual(25);
  expect(new Set(Object.values(ITEMS).map(item => item.id)).size).toBe(Object.keys(ITEMS).length);
  for (const item of Object.values(ITEMS).filter(item => item.effect.type === "stages")) {
    expect(item.description).toContain("fine del nodo");
  }
  expect(ITEMS.azzardo.description).toMatch(/ATK \+2.*DIF -1.*\+3.*-3.*fine del nodo/);
  const injured = { ...newRun(starters).team[0], hp: 50 };
  const fed = applyItemTo("pasto", injured);
  expect(fed.maxHp - injured.maxHp).toBe(10);
  expect(fed.hp - injured.hp).toBe(10);
});

test("sponsor voucher auto-redeems and never enters inventory", () => {
  const run = newRun(starters);
  const granted = grantRunItem(run, "buono");
  expect(granted.run.money).toBe(run.money + 35);
  expect(granted.run.items.buono).toBeUndefined();
  expect(granted.feedback).toBe("Buono Sponsor riscattato: +35 P");

  const event = RUN_EVENTS.find(candidate => candidate.eventId === "international-sponsor");
  const eventRun = { ...run, wave: 20, scenarioState: { id: "international", revision: 1, segmentStart: 20, segmentEnd: 25 },
    pending: { type: "event", eventId: event.eventId } };
  const result = applyRunEventOutcome(eventRun, event, event.choices[1].outcomes[0]);
  expect(result.money).toBe(run.money + 35);
  expect(result.items.buono).toBeUndefined();
});

test("node stage modifiers persist between battles, clamp safely, survive saves and reset on advance", () => {
  const run = newRun(starters);
  const uid = run.team[0].uid;
  let modifiers = addNodeStageModifier({}, uid, ITEMS.azzardo.effect);
  modifiers = addNodeStageModifier(modifiers, uid, ITEMS.azzardo.effect);
  expect(modifiers[uid]).toEqual({ atkMod: 3, defMod: -2 });
  expect(applyNodeModifiers(run.team, modifiers)[0].status).toMatchObject({ atkMod: 3, defMod: -2 });
  const loaded = normalizeRun({ ...run, nodeModifiers: modifiers });
  expect(applyNodeModifiers(loaded.team, loaded.nodeModifiers)[0].status.atkMod).toBe(3);
  expect(advanceRunWave({ ...loaded, pending: { type: "battle", kind: "wild" } }).nodeModifiers).toEqual({});
  expect(normalizeRun({ ...run, nodeModifiers: { [uid]: { atkMod: 99, defMod: -99 } } }).nodeModifiers[uid]).toEqual({ atkMod: 3, defMod: -3 });
});

test("event expansion validates presentation, linked gates and consequence weights", () => {
  expect(RUN_EVENTS).toHaveLength(25);
  expect(validateEvents()).toBe(true);
  expect(RUN_EVENTS.every(event => event.presentation.symbol && event.presentation.accentClass)).toBe(true);
  const scenario = SCENARIOS.find(candidate => candidate.id === "urban");
  const base = { ...newRun(starters), wave: 5, scenarioState: { id: "urban", revision: 1, segmentStart: 1, segmentEnd: 6 } };
  expect(eventPool(base, scenario).some(row => row.event.eventId === "analyst-return")).toBe(false);
  const linked = { ...base, storyFlags: { "analysis-started": true, "bold-decisions": 1 } };
  const weighted = eventPool(linked, scenario).find(row => row.event.eventId === "analyst-return");
  const unboosted = eventPool({ ...linked, storyFlags: { "analysis-started": true } }, scenario).find(row => row.event.eventId === "analyst-return");
  expect(weighted.weight).toBeGreaterThan(unboosted.weight);
});

test("rare characters are possible early while scenario coherence gates remain explicit", () => {
  expect(scenarioPool("urban", 1, 4).some(row => ["rare", "special"].includes(row.rarityId))).toBe(true);
  const lateScenario = SCENARIOS.find(scenario => scenario.waveRange.from > 1);
  expect(scenarioPool(lateScenario.id, 1, 4)).toEqual([]);
});

test("node deck selection is deterministic and keeps explicit boss compatibility", () => {
  const run = newRun(starters);
  expect(selectNodeArchetype(run, () => 0).id).toBe("battle");
  expect(selectNodeArchetype({ ...run, wave: 2 }, () => 0.999)).toEqual(NODE_ARCHETYPES.at(-1));
  expect(selectNodeArchetype({ ...run, wave: 2 }, () => 0.4)).toEqual(selectNodeArchetype({ ...run, wave: 2 }, () => 0.4));
});

test("element synergies are visible, modest and capped", () => {
  const run = newRun(["mark", "jack", "axel", "steve", "jude", "nathan"]);
  const synergies = activeSynergies(run.team);
  expect(synergies).toHaveLength(2);
  expect(synergyRewardMultiplier(run.team)).toBeCloseTo(1.1025);
  expect(synergies.every(synergy => synergy.description.includes("+5%"))).toBe(true);
});
