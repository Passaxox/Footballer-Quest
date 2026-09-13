import {
  newRun,
  advanceRunWave,
  normalizeRun,
  grantRunItem,
  applyRecoveryOption,
  applyRouteChoice,
  generateWave,
} from "./engine";
import {
  createSegment,
  computeSegmentLength,
  isSegmentCheckpoint,
  normalizeSegmentState,
  MAJOR_BOSS_WAVES,
} from "./segment";
import {
  ROUTE_CATALOG,
  getRouteById,
  generateRouteChoices,
} from "./routeChoices";
import {
  MINIBOSS_POOLS,
  selectMiniboss,
} from "./minibosses";
import { NODE_ARCHETYPES, selectNodeArchetype } from "./routeDeck";

const starters = ["mark", "axel", "jude"];

describe("Run Structure 2.0: Multi-Step Segments & Route Choice", () => {
  test("computeSegmentLength respects bounds (2-5) and snaps to major boss checkpoints", () => {
    // Wave 1: next boss is 10, dist = 10. Range [3, 4] gives 3 or 4.
    const lenW1 = computeSegmentLength(1, [3, 4], () => 0.5);
    expect(lenW1).toBeGreaterThanOrEqual(2);
    expect(lenW1).toBeLessThanOrEqual(5);

    // Wave 8: next boss is 10, dist = 3. Snaps directly to 3!
    const lenW8 = computeSegmentLength(8, [3, 4], () => 0.99);
    expect(lenW8).toBe(3);

    // Wave 9: next boss is 10, dist = 2. Snaps to 2!
    const lenW9 = computeSegmentLength(9, [3, 4], () => 0.1);
    expect(lenW9).toBe(2);

    // Wave 10: major boss wave itself, dist = 1.
    const lenW10 = computeSegmentLength(10, [3, 4], () => 0.5);
    expect(lenW10).toBe(1);
  });

  test("createSegment initializes segmentState with valid boundaries and route context", () => {
    const run = newRun(starters);
    const segment = createSegment(run, "strada-montana", () => 0.5);
    expect(segment.step).toBe(1);
    expect(segment.length).toBeGreaterThanOrEqual(2);
    expect(segment.length).toBeLessThanOrEqual(5);
    expect(segment.routeId).toBe("strada-montana");
    expect(segment.theme).toBe("strada-montana");
    expect(segment.checkpointType).toBe("miniboss");
    expect(segment.routeBiases).toBeDefined();
    expect(isSegmentCheckpoint(segment)).toBe(false);
  });

  test("isSegmentCheckpoint detects terminal step accurately", () => {
    expect(isSegmentCheckpoint({ step: 1, length: 3 })).toBe(false);
    expect(isSegmentCheckpoint({ step: 2, length: 3 })).toBe(false);
    expect(isSegmentCheckpoint({ step: 3, length: 3 })).toBe(true);
    expect(isSegmentCheckpoint({ step: 4, length: 3 })).toBe(true);
    expect(isSegmentCheckpoint(null)).toBe(false);
  });

  test("normalizeSegmentState synthesizes valid state for legacy saves without mutating valid state", () => {
    const normalizedLegacy = normalizeSegmentState(null, 5);
    expect(normalizedLegacy).toBeDefined();
    expect(normalizedLegacy.step).toBeGreaterThanOrEqual(1);
    expect(normalizedLegacy.length).toBeGreaterThanOrEqual(1);
    expect(normalizedLegacy.routeId).toBe("area-metropolitana");

    const validState = {
      segmentIndex: 3,
      step: 2,
      length: 4,
      checkpointType: "miniboss",
      routeId: "zona-alius",
      theme: "zona-alius",
      routeTitle: "Zona Alius",
      routeDescription: "Desc",
      tendency: "Élite",
      risk: "alto",
      routeBiases: { elite: 2.5 },
      prestigeMultiplier: 1.15,
      startedAtWave: 7,
      targetCheckpointWave: 10,
    };
    const roundTripped = normalizeSegmentState(validState, 8);
    expect(roundTripped.step).toBe(2);
    expect(roundTripped.length).toBe(4);
    expect(roundTripped.routeId).toBe("zona-alius");
    expect(roundTripped.prestigeMultiplier).toBe(1.15);
  });
});

describe("Section 42: True Node-Bonus Persistence Across Segment Steps", () => {
  test("node modifiers and activeNodeItems persist across internal steps 1..3 and clear at checkpoint boundary", () => {
    // Create a new run starting at wave 1 (step 1 of a 3-step segment)
    let run = newRun(starters);
    run = {
      ...run,
      segmentState: {
        ...run.segmentState,
        step: 1,
        length: 3,
      },
    };

    // Grant a node item: Grinta in Bottiglia (+1 ATK stage)
    const { run: runWithItem } = grantRunItem(run, "grinta");
    expect(runWithItem.activeNodeItems).toContain("grinta");
    expect(runWithItem.nodeModifiers.team.atkMod).toBe(1);

    // Step 1 -> Step 2 (internal step): node modifiers and activeNodeItems MUST PERSIST!
    const step2Run = advanceRunWave({
      ...runWithItem,
      pending: { type: "battle", kind: "wild" },
    });
    expect(step2Run.wave).toBe(2);
    expect(step2Run.segmentState.step).toBe(2);
    expect(step2Run.activeNodeItems).toEqual(["grinta"]);
    expect(step2Run.nodeModifiers.team.atkMod).toBe(1);

    // Step 2 -> Step 3 (internal step to checkpoint): MUST STILL PERSIST!
    const step3Run = advanceRunWave({
      ...step2Run,
      pending: { type: "battle", kind: "wild" },
    });
    expect(step3Run.wave).toBe(3);
    expect(step3Run.segmentState.step).toBe(3);
    expect(step3Run.activeNodeItems).toEqual(["grinta"]);
    expect(step3Run.nodeModifiers.team.atkMod).toBe(1);
    expect(isSegmentCheckpoint(step3Run.segmentState)).toBe(true);

    // Step 3 (Checkpoint terminal) -> Next Segment: MUST EXPIRE AT CHECKPOINT BOUNDARY!
    const step4Run = advanceRunWave({
      ...step3Run,
      pending: { type: "battle", kind: "miniboss", teamName: "Pattuglia Royal" },
    });
    expect(step4Run.wave).toBe(4);
    expect(step4Run.segmentState.step).toBe(1);
    expect(step4Run.activeNodeItems).toEqual([]);
    expect(step4Run.nodeModifiers).toEqual({});
    expect(step4Run.pendingRouteChoices).toBeDefined();
    expect(step4Run.pendingRouteChoices.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Route Choices & Biased Deck Selection", () => {
  test("generateRouteChoices returns 2-3 distinct eligible routes with repeat protection", () => {
    const run = newRun(starters);
    const choices = generateRouteChoices(run, 3, () => 0.5);
    expect(choices.length).toBe(3);
    const ids = choices.map(c => c.id);
    expect(new Set(ids).size).toBe(3);

    // Repeat penalty test: previously chosen routes receive reduced probability
    const runWithHistory = { ...run, chosenRoutes: [choices[0].id] };
    const choices2 = generateRouteChoices(runWithHistory, 3, () => 0.9);
    expect(choices2.length).toBe(3);
  });

  test("applyRouteChoice sets new segment, records choice, and clears pending choices", () => {
    let run = newRun(starters);
    run.pendingRouteChoices = generateRouteChoices(run, 3);
    const chosenId = run.pendingRouteChoices[0].id;

    const nextRun = applyRouteChoice(run, chosenId);
    expect(nextRun.segmentState.routeId).toBe(chosenId);
    expect(nextRun.pendingRouteChoices).toBeNull();
    expect(nextRun.chosenRoutes).toContain(chosenId);
  });

  test("selectNodeArchetype incorporates segment route biases", () => {
    const run = newRun(starters);
    // On wave 1, always returns battle
    expect(selectNodeArchetype(run).id).toBe("battle");

    // Route biased towards recovery
    const recoveryBiasedRun = {
      ...run,
      wave: 2,
      segmentState: {
        ...run.segmentState,
        routeBiases: { recovery: 10.0, battle: 0.1, elite: 0.1, recruit: 0.1, shop: 0.1, training: 0.1 },
      },
    };
    // With high recovery bias, low rolls still land on recovery
    const sampled = Array.from({ length: 20 }, (_, i) =>
      selectNodeArchetype(recoveryBiasedRun, () => i / 20).id
    );
    expect(sampled).toContain("recovery");
  });
});

describe("Miniboss & Checkpoint Encounter Generation", () => {
  test("selectMiniboss picks eligible squad with repeat protection", () => {
    const run = newRun(starters);
    const m1 = selectMiniboss(run, 3, () => 0.1);
    expect(m1).toBeDefined();
    expect(m1.team).toBeDefined();
    expect(m1.ids.length).toBeGreaterThanOrEqual(2);
    expect(m1.captainId).toBeDefined();

    // With history of facing m1, selects another
    const runWithHistory = { ...run, routeHistory: [{ minibossId: m1.id, teamName: m1.team }] };
    const m2 = selectMiniboss(runWithHistory, 3, () => 0.05);
    expect(m2).toBeDefined();
  });

  test("generateWave at segment checkpoint generates miniboss with captain badge and reward item", () => {
    const run = {
      ...newRun(starters),
      wave: 3,
      segmentState: {
        step: 3,
        length: 3,
        checkpointType: "miniboss",
        theme: "area-metropolitana",
      },
    };

    const node = generateWave(run, () => 0.5);
    expect(node.type).toBe("battle");
    expect(node.kind).toBe("miniboss");
    expect(node.teamName).toBeDefined();
    expect(node.rewardItem).toBeDefined();
    expect(node.enemies.length).toBeGreaterThanOrEqual(2);
    expect(node.enemies.some(e => e.isCaptain)).toBe(true);
  });
});

describe("Recovery Nodes & Medical Options", () => {
  test("applyRecoveryOption handles rest, physio, and medical treatments correctly", () => {
    const run = newRun(starters);
    // Inflict damage and burn
    run.team[0].hp = Math.round(run.team[0].maxHp * 0.4);
    run.team[0].status.burn = 3;
    run.team[1].hp = 0; // KO
    run.money = 100;

    // 1. Rest option (Free): heals 35% living
    const rested = applyRecoveryOption(run, "rest");
    expect(rested.money).toBe(100);
    expect(rested.team[0].hp).toBeGreaterThan(run.team[0].hp);
    expect(rested.team[1].hp).toBe(0); // Remains KO

    // 2. Physio option (35 P): heals 70% living and cures burns
    const physio = applyRecoveryOption(run, "physio");
    expect(physio.money).toBe(65);
    expect(physio.team[0].status.burn).toBe(0);
    expect(physio.team[1].hp).toBe(0);

    // 3. Medical option (60 P): revives KO with 50% HP, full heals living, cures burns
    const medical = applyRecoveryOption(run, "medical");
    expect(medical.money).toBe(40);
    expect(medical.team[0].hp).toBe(medical.team[0].maxHp);
    expect(medical.team[0].status.burn).toBe(0);
    expect(medical.team[1].hp).toBeGreaterThan(0);

    // Insufficient money throws
    expect(() => applyRecoveryOption({ ...run, money: 10 }, "physio")).toThrow();
    expect(() => applyRecoveryOption({ ...run, money: 10 }, "medical")).toThrow();
  });
});
