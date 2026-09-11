import { CHARACTER_VERSIONS, resolveVersion } from "./catalog";
import { RUN_EVENTS, eventEligible, eventPool, getRunEvent, resolveEventChoice, validateEvents } from "./events";
import { advanceRunWave, applyRunEventOutcome, chooseRunEvent, createPlayer, generateWave, newRun } from "./engine";
import { RARITIES, rarityIdForVersion } from "./rarity";
import { SCENARIOS, scenarioPool, selectEncounterVersion } from "./scenarios";
import { simulateRunVariety } from "./varietySimulation";

const starters = ["mark", "axel", "jude"];
const event = id => RUN_EVENTS.find(candidate => candidate.eventId === id);
const runIn = (scenarioId, wave = 18, seed = "event-test") => ({
  ...newRun(starters, "normal", seed),
  wave,
  scenarioState: { id: scenarioId, revision: 1, segmentStart: wave, segmentEnd: wave + 5 },
});

test("event schema accepts the authored pack and rejects duplicates and unknown outcomes", () => {
  expect(RUN_EVENTS).toHaveLength(17);
  expect(validateEvents()).toBe(true);
  expect(() => validateEvents([RUN_EVENTS[0], RUN_EVENTS[0]])).toThrow(/Duplicate/);
  const invalid = [{ ...RUN_EVENTS[0], eventId: "invalid", choices: [{ label: "No", outcomes: [{ text: "No", weight: 1, effects: [{ type: "executeCode" }] }] }] }];
  expect(() => validateEvents(invalid)).toThrow(/Unknown outcome type/);
  expect(getRunEvent("camelia").eventId).toBe("camelia");
});

test("scenario, wave, prerequisite, once-per-run, exclusion and cooldown gates are enforced", () => {
  const epsilon = runIn("epsilon-lab");
  expect(eventEligible(event("epsilon-console"), epsilon, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(true);
  expect(eventEligible(event("epsilon-console"), { ...epsilon, wave: 1 }, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(true);
  expect(eventEligible(event("epsilon-console"), epsilon, SCENARIOS.find(s => s.id === "urban"))).toBe(false);
  expect(eventEligible(event("epsilon-defector"), epsilon, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(false);
  const linked = { ...epsilon, storyFlags: { "epsilon-signal": true } };
  expect(eventEligible(event("epsilon-defector"), linked, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(true);
  expect(eventEligible(event("epsilon-defector"), { ...linked, storyFlags: { ...linked.storyFlags, "epsilon-contact": true } }, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(false);
  expect(eventEligible(event("epsilon-console"), { ...epsilon, eventHistory: { "epsilon-console": { count: 1, lastWave: 12 } } }, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(false);
  const recovery = event("sideline-clinic");
  expect(eventEligible(recovery, { ...epsilon, eventHistory: { [recovery.eventId]: { count: 1, lastWave: 16 } } }, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(false);
  expect(eventEligible(recovery, { ...epsilon, wave: 21, eventHistory: { [recovery.eventId]: { count: 1, lastWave: 16 } } }, SCENARIOS.find(s => s.id === "epsilon-lab"))).toBe(true);
  expect(eventPool(runIn("urban"), SCENARIOS.find(s => s.id === "urban")).every(row => !row.event.scenarioIds?.some(id => id.includes("epsilon") || id.includes("gemini") || id.includes("diamond")))).toBe(true);
});

test("seeded generation and weighted outcome selection repeat exactly", () => {
  const sequence = seed => {
    let run = newRun(starters, "normal", seed);
    return Array.from({ length: 12 }, (_, index) => {
      run = { ...run, wave: index + 1, pending: null };
      const generated = generateWave(run);
      const { scenarioState, rngState, rngCounter, seed: stableSeed, ...pending } = generated;
      run = { ...run, scenarioState, rngState, rngCounter, seed: stableSeed, pending };
      return [scenarioState.id, pending.type, pending.eventId || pending.player?.versionId || pending.enemies?.map(player => player.versionId)];
    });
  };
  expect(sequence("same-seed")).toEqual(sequence("same-seed"));
  expect(sequence("same-seed")).not.toEqual(sequence("another-seed"));
  expect(resolveEventChoice(event("sideline-clinic"), 0, () => 0)).toEqual(event("sideline-clinic").choices[0].outcomes[0]);
  expect(resolveEventChoice(event("honest-wallet"), 1, () => 0.99)).toEqual(event("honest-wallet").choices[1].outcomes[1]);
});

test("rarity affects occurrence without changing combat stats and null rarity stays compatible", () => {
  const common = resolveVersion("mark");
  const original = common.rarityId;
  const before = createPlayer(common.versionId, 7, "before");
  common.rarityId = "special";
  const after = createPlayer(common.versionId, 7, "after");
  expect(after.base).toEqual(before.base);
  expect([after.maxHp, after.atk, after.def, after.spd, after.move.power]).toEqual([before.maxHp, before.atk, before.def, before.spd, before.move.power]);
  common.rarityId = original;
  expect(rarityIdForVersion(common)).toBe("common");
  expect(RARITIES.common.selectionWeight).toBeGreaterThan(RARITIES.rare.selectionWeight);
});

test("scenario eligibility dominates rarity while contextual preference can outweigh it", () => {
  const template = resolveVersion("mark");
  const rareId = "rarity-test:rare";
  const commonId = "rarity-test:common";
  CHARACTER_VERSIONS[rareId] = { ...template, versionId: rareId, legacyRosterId: null, rarityId: "rare", teamTags: ["raimon"] };
  CHARACTER_VERSIONS[commonId] = { ...template, versionId: commonId, legacyRosterId: null, rarityId: "common", teamTags: [] };
  const scenario = {
    ...SCENARIOS.find(candidate => candidate.id === "urban"),
    id: "rarity-test", allowedVersionIds: [rareId, commonId], allowedTeamTags: [], preferredTeamTags: ["raimon"], excludedTeamTags: [],
    encounterPool: { baseWeight: 1, preferredWeight: 5, versionWeights: {} },
  };
  SCENARIOS.push(scenario);
  try {
    const pool = scenarioPool(scenario.id, 20, 4);
    expect(pool.find(row => row.version.versionId === rareId).weight).toBeGreaterThan(pool.find(row => row.version.versionId === commonId).weight);
    scenario.excludedTeamTags = ["raimon"];
    expect(scenarioPool(scenario.id, 20, 4).some(row => row.version.versionId === rareId)).toBe(false);
    expect(selectEncounterVersion(scenario.id, 20, 4, [], () => 0).versionId).toBe(commonId);
  } finally {
    SCENARIOS.pop();
    delete CHARACTER_VERSIONS[rareId];
    delete CHARACTER_VERSIONS[commonId];
  }
});

test("choice application persists flags, cooldown history, modifiers and linked eligibility", () => {
  let run = runIn("epsilon-lab", 18, "linked-events");
  const first = event("epsilon-console");
  run.pending = { type: "event", eventId: first.eventId };
  run = chooseRunEvent(run, first, 0);
  run = applyRunEventOutcome(run, first, run.pending.result);
  expect(run.storyFlags["epsilon-signal"]).toBe(true);
  expect(run.eventHistory[first.eventId]).toEqual({ count: 1, lastWave: 18 });
  expect(eventPool(run, SCENARIOS.find(s => s.id === "epsilon-lab")).some(row => row.event.eventId === "epsilon-defector")).toBe(true);
  const route = event("route-split");
  run.pending = { type: "event", eventId: route.eventId };
  run = chooseRunEvent(run, route, 0);
  run = applyRunEventOutcome(run, route, run.pending.result);
  expect(run.temporaryModifiers[0].remainingWaves).toBe(3);
  expect(advanceRunWave(run).temporaryModifiers[0].remainingWaves).toBe(3);
});

test("legacy event saves resolve through the compatibility adapter without a schema bump", () => {
  const legacy = getRunEvent("camelia");
  let run = runIn("urban", 8, "legacy-event");
  run.pending = { type: "event", eventId: legacy.eventId };
  run = chooseRunEvent(run, legacy, 0);
  run = applyRunEventOutcome(run, legacy, run.pending.result);
  expect(run.saveVersion).toBe(2);
  expect(run.money).toBe(50);
  expect(run.eventHistory.camelia).toEqual({ count: 1, lastWave: 8 });
});

test("event encounter and recruit outcomes preserve contextual CharacterVersion identity", () => {
  let battleRun = runIn("gemini-crash-site", 20, "gemini-event");
  const battleEvent = event("gemini-fragment");
  battleRun.pending = { type: "event", eventId: battleEvent.eventId };
  battleRun = applyRunEventOutcome(battleRun, battleEvent, battleEvent.choices[0].outcomes[0]);
  expect(battleRun.pending.type).toBe("battle");
  expect(battleRun.pending.enemies.every(player => resolveVersion(player.versionId).teamTags.includes("gemini-storm"))).toBe(true);

  let recruitRun = runIn("diamond-dust-glacier", 26, "diamond-recruit");
  const recruitEvent = event("diamond-scout");
  recruitRun.storyFlags["glacier-shelter"] = true;
  recruitRun.pending = { type: "event", eventId: recruitEvent.eventId };
  recruitRun = applyRunEventOutcome(recruitRun, recruitEvent, recruitEvent.choices[0].outcomes[0]);
  expect(recruitRun.pending.type).toBe("recruit");
  expect(resolveVersion(recruitRun.pending.context.offer.versionId).teamTags).toContain("diamond-dust");
  expect(recruitRun.pending.context.offer.characterId).toBe(resolveVersion(recruitRun.pending.context.offer.versionId).characterId);
});

test("representative seeds vary while rare content stays contextual and non-dominant", () => {
  const reports = simulateRunVariety(["alpha", "bravo", "charlie", "delta"], 30);
  expect(new Set(reports.map(report => report.events.join(","))).size).toBeGreaterThan(1);
  expect(reports.every(report => report.events.length >= 6 && report.events.length <= 10)).toBe(true);
  for (const report of reports) {
    const rare = (report.rarity.rare || 0) + (report.rarity.special || 0);
    const total = Object.values(report.rarity).reduce((sum, count) => sum + count, 0);
    expect(total === 0 || rare / total < 0.8).toBe(true);
  }
});
