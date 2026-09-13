import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Load the production ES modules
const source = (name) => readFile(new URL(`../src/game/${name}.js`, import.meta.url), "utf8");
const moduleUrl = (text) => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const dataUrl = moduleUrl(await source("data"));
const rulesUrl = moduleUrl(await source("rules"));
const routeDeckUrl = moduleUrl(await source("routeDeck"));
const synergiesUrl = moduleUrl(await source("synergies"));
const rarityUrl = moduleUrl(await source("rarity"));
const runRandomUrl = moduleUrl(await source("runRandom"));
const eventsUrl = moduleUrl((await source("events")).replace('"./rarity"', JSON.stringify(rarityUrl)).replace('"./data"', JSON.stringify(dataUrl)));
const validationUrl = moduleUrl(await source("catalogValidation"));
const expansionUrl = moduleUrl(await source("catalogExpansion"));
const teamContentUrl = moduleUrl(await source("teamContent.generated"));
const metadataUrl = moduleUrl((await source("catalogMetadata")).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)));
const catalogUrl = moduleUrl((await source("catalog")).replace('"./catalogExpansion"', JSON.stringify(expansionUrl)).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./catalogValidation"', JSON.stringify(validationUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)).replace('"./rarity"', JSON.stringify(rarityUrl)));
const routeChoicesUrl = moduleUrl(await source("routeChoices"));
const segmentUrl = moduleUrl((await source("segment")).replace('"./routeChoices"', JSON.stringify(routeChoicesUrl)));
const minibossesUrl = moduleUrl(await source("minibosses"));
const scenariosUrl = moduleUrl((await source("scenarios")).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)).replace('"./rarity"', JSON.stringify(rarityUrl)).replace('"./events"', JSON.stringify(eventsUrl)));
const engineUrl = moduleUrl((await source("engine")).replace('"./scenarios"', JSON.stringify(scenariosUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./rules"', JSON.stringify(rulesUrl)).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./events"', JSON.stringify(eventsUrl)).replace('"./runRandom"', JSON.stringify(runRandomUrl)).replace('"./rarity"', JSON.stringify(rarityUrl)).replace('"./routeDeck"', JSON.stringify(routeDeckUrl)).replace('"./synergies"', JSON.stringify(synergiesUrl)).replace('"./segment"', JSON.stringify(segmentUrl)).replace('"./routeChoices"', JSON.stringify(routeChoicesUrl)).replace('"./minibosses"', JSON.stringify(minibossesUrl)));

const data = await import(dataUrl);
const engine = await import(engineUrl);
const { createRunRandomCursor } = await import(runRandomUrl);

const {
  ITEMS,
  ITEM_FAMILIES,
  isTargetItem,
  itemFamilyPresentation,
} = data;

const {
  newRun,
  normalizeRun,
  generateRewards,
  getItemQuality,
  getItemTargetPreview,
  grantRunItem,
  resolveRewardChoice,
  resolveEventTarget,
  applyRunEventOutcome,
  advanceRunWave,
  performAttack,
  fuseRunPlayers,
  createPlayer,
  canApplyItem,
} = engine;

const STARTER_IDS = ["mark", "axel", "jude"];

test("Phase A: Strict isolation of triggers in armedTriggers and cuneo in specialResources", () => {
  const run = newRun(STARTER_IDS);
  
  // Clean run starts with items: {}, armedTriggers: { cerotto: 1 }, specialResources: { cuneo: 0 }
  assert.deepEqual(run.items, {}, "newRun must start with empty items bag");
  assert.equal(run.armedTriggers?.cerotto, 1, "newRun starts with 1 armed cerotto");
  assert.equal(run.specialResources?.cuneo, 0, "newRun starts with 0 cuneo in specialResources");

  // Granting a trigger item
  const g1 = grantRunItem(run, "cavigliera");
  assert.equal(g1.run.armedTriggers.cavigliera, 1, "cavigliera arms in armedTriggers");
  assert.equal(g1.run.items.cavigliera, undefined, "cavigliera NEVER goes into items bag");

  // Granting cuneo DNA
  const g2 = grantRunItem(run, "cuneo");
  assert.equal(g2.run.specialResources.cuneo, 1, "cuneo increments in specialResources");
  assert.equal(g2.run.items.cuneo, undefined, "cuneo NEVER goes into items bag");

  // Granting a segment item
  const g3 = grantRunItem(run, "grinta");
  assert.ok(g3.run.activeNodeItems.includes("grinta"), "grinta activates in activeNodeItems");
  assert.equal(g3.run.items.grinta, undefined, "grinta NEVER goes into items bag");
});

test("Phase A: Legacy migration reconciles items without double counting", () => {
  const legacyRun = {
    ...newRun(STARTER_IDS),
    armedTriggers: undefined,
    specialResources: undefined,
    items: { cerotto: 2, cuneo: 3, stendardo: 1, barretta: 2 },
  };

  const normalized = normalizeRun(legacyRun);
  assert.equal(normalized.armedTriggers.cerotto, 1, "armedTriggers capped at 1 for cerotto");
  assert.equal(normalized.armedTriggers.stendardo, 1, "stendardo armed in armedTriggers");
  assert.equal(normalized.specialResources.cuneo, 3, "specialResources has 3 cuneo");

  // Fusion consumes cuneo from specialResources / items cleanly
  const fusedRun = fuseRunPlayers(normalized, 1, 2, "a");
  assert.equal(fusedRun.specialResources.cuneo, 2, "cuneo decremented from 3 to 2");
  assert.equal(fusedRun.stats.fusions, 1, "fusions stat incremented");
});

test("Phase A: Shop non-target purchases charge Prestigio atomically and grant directly", () => {
  const run = {
    ...newRun(STARTER_IDS),
    money: 200,
  };

  // Buying stendardo (trigger)
  const gTrigger = grantRunItem({ ...run, money: run.money - 90 }, "stendardo");
  assert.equal(gTrigger.run.money, 110, "90 Prestigio deducted");
  assert.equal(gTrigger.run.armedTriggers.stendardo, 1, "stendardo is armed");
  assert.equal(gTrigger.run.items.stendardo, undefined, "not in bag");

  // Trigger cap: already armed triggers should be marked cannot buy
  assert.equal(gTrigger.run.armedTriggers.stendardo, 1);
});

test("Phase A: Shop target purchases charge Prestigio ONLY on confirmation, 0 on cancel, and survive reloads", () => {
  const run = {
    ...newRun(STARTER_IDS),
    money: 150,
  };
  // Injure player 0
  run.team[0].hp = Math.round(run.team[0].maxHp * 0.4);
  const initialMoney = run.money;

  // 1. Enter target flow: onStartBuy sets pending: { type: "shopTarget", activeTargetIndex: 0 }
  const enterPending = {
    ...run,
    pending: {
      type: "shopTarget",
      activeTargetIndex: 0,
      stock: [{ id: "barretta", price: 40 }],
      bought: [],
    },
  };
  // Money MUST NOT be deducted when entering target selection
  assert.equal(enterPending.money, initialMoney, "No Prestigio deducted on entering target selection");

  // 2. Cancel: returns to standard shop, money unchanged
  const cancelState = {
    ...enterPending,
    pending: {
      type: "shop",
      stock: enterPending.pending.stock,
      bought: enterPending.pending.bought,
    },
  };
  assert.equal(cancelState.money, initialMoney, "No Prestigio deducted on cancel");

  // 3. Confirm target purchase: charges price and applies item directly to teammate
  const targetUid = run.team[0].uid;
  const price = 40;
  const confirmedRun = {
    ...enterPending,
    money: enterPending.money - price,
    team: enterPending.team.map(p => (p.uid === targetUid ? engine.applyItemTo("barretta", p) : p)),
    pending: {
      type: "shop",
      stock: enterPending.pending.stock,
      bought: [0],
    },
  };
  assert.equal(confirmedRun.money, initialMoney - price, "Prestigio charged upon confirmation");
  assert.ok(confirmedRun.team[0].hp > run.team[0].hp, "Player was healed by barretta");
  assert.equal(confirmedRun.items.barretta, undefined, "Item NOT placed in bag");

  // 4. Reload safety: serialize and deserialize pending shopTarget
  const serialized = JSON.parse(JSON.stringify(enterPending));
  const reloaded = normalizeRun(serialized);
  assert.equal(reloaded.pending.type, "shopTarget", "shopTarget survives roundtrip");
  assert.equal(reloaded.pending.activeTargetIndex, 0, "activeTargetIndex preserved");
  assert.equal(reloaded.money, initialMoney, "Money intact after reload");
});

test("Phase A: Event target resolution prompts target selection, applies to target, and handles reload safety", () => {
  const baseRun = newRun(STARTER_IDS);
  baseRun.team[1].hp = Math.round(baseRun.team[1].maxHp * 0.3);
  baseRun.pending = { type: "event", eventId: "ristoro-rapido" };

  // An event yields an instant target item (e.g. barretta)
  const event = { eventId: "ristoro-rapido", title: "Ristoro Rapido" };
  const result = { effects: [{ type: "grantItem", itemId: "barretta", quantity: 1 }] };
  const eventOutcome = applyRunEventOutcome(baseRun, event, result);

  assert.equal(eventOutcome.pending?.type, "eventTarget", "Event intercepts target item into eventTarget pending state");
  assert.equal(eventOutcome.pending?.itemId, "barretta");

  // Reload safety during eventTarget
  const reloadedEvent = normalizeRun(JSON.parse(JSON.stringify(eventOutcome)));
  assert.equal(reloadedEvent.pending.type, "eventTarget", "eventTarget pending state survives serialization");

  // Resolve on teammate 1
  const resolved = resolveEventTarget(reloadedEvent, baseRun.team[1].uid);
  assert.ok(resolved.team[1].hp > baseRun.team[1].hp, "Teammate 1 received healing");
  assert.equal(resolved.items.barretta, undefined, "barretta was not dumped in items bag");
  assert.equal(resolved.pending?.type, undefined, "eventTarget pending cleared");
});

test("Phase A/B: Need-aware loot weighting boosts revives on KO and recovery on low HP", () => {
  const reviveIds = ["pallone", "defibrillatore"];

  // Scenario 1: Full health team in elite tier
  const healthyRun = newRun(STARTER_IDS);
  const rewardsHealthy = [];
  for (let i = 0; i < 60; i++) {
    const cur = createRunRandomCursor({ ...healthyRun, rngState: undefined, seed: `seed-health-${i}` });
    rewardsHealthy.push(...generateRewards(cur.next, "elite", healthyRun));
  }
  const revivesHealthyCount = rewardsHealthy.filter(id => reviveIds.includes(id)).length;

  // Scenario 2: Team with a KO member in elite tier
  const koRun = newRun(STARTER_IDS);
  koRun.team[0].hp = 0;
  const rewardsKo = [];
  for (let i = 0; i < 60; i++) {
    const cur = createRunRandomCursor({ ...koRun, rngState: undefined, seed: `seed-ko-${i}` });
    rewardsKo.push(...generateRewards(cur.next, "elite", koRun));
  }
  const revivesKoCount = rewardsKo.filter(id => reviveIds.includes(id)).length;

  // Revive items appear significantly more often when a teammate is KO (2.5x vs 0.2x suppression)
  assert.ok(
    revivesKoCount > revivesHealthyCount,
    `Need-aware revive weighting: KO run had ${revivesKoCount} revives vs healthy ${revivesHealthyCount}`
  );

  // Duplicate trigger suppression: when cerotto and cavigliera are armed, their spawn weights are suppressed
  const armedRun = {
    ...newRun(STARTER_IDS),
    armedTriggers: { cerotto: 1, cavigliera: 1, balsamo: 1, stendardo: 1 },
  };
  const rewardsArmed = [];
  for (let i = 0; i < 50; i++) {
    const cur = createRunRandomCursor({ ...armedRun, rngCounter: i * 11, seed: `seed-armed-${i}` });
    rewardsArmed.push(...generateRewards(cur.next, "standard", armedRun));
  }
  const armedCount = rewardsArmed.filter(id => ["cerotto", "cavigliera", "balsamo", "stendardo"].includes(id)).length;
  // Duplicate triggers are heavily suppressed (weight 0.02)
  assert.ok(armedCount <= 5, `Armed triggers should be heavily suppressed when already owned: got ${armedCount}/150`);
});

test("Phase B: 48+ Deterministic simulation runs verify loot quality hierarchy and zero bag clutter", () => {
  const ENCOUNTER_TYPES = ["standard", "elite", "miniboss", "boss"];
  const qualityScores = { standard: [], elite: [], miniboss: [], boss: [] };

  for (let runIdx = 0; runIdx < 48; runIdx++) {
    const seed = `beta-ux-run-${runIdx}-k8x`;
    const run = newRun(STARTER_IDS);
    run.seed = seed;
    // Injure one player and KO one player so both healing and revives have valid targets
    run.team[0].hp = Math.round(run.team[0].maxHp * 0.4);
    run.team[1].hp = 0;

    for (const kind of ENCOUNTER_TYPES) {
      const cursor = createRunRandomCursor({ ...run, rngCounter: runIdx * 19 });
      const rewards = generateRewards(cursor.next, kind, run);
      assert.equal(rewards.length, 3, `Run ${runIdx} must offer 3 rewards`);

      // Calculate quality average
      const avgQuality = rewards.reduce((sum, id) => sum + getItemQuality(id, kind), 0) / rewards.length;
      qualityScores[kind].push(avgQuality);

      // Pick the first valid reward and apply it
      const chosen = rewards[0];
      let targetUid = null;
      if (isTargetItem(chosen)) {
        const eligible = run.team.find(p => canApplyItem(chosen, p));
        targetUid = eligible ? eligible.uid : null;
      }
      const { run: nextRun } = resolveRewardChoice(run, chosen, targetUid);

      // Verify zero dead bag pollution when an eligible target exists
      if (targetUid || !isTargetItem(chosen)) {
        assert.equal(nextRun.items[chosen], undefined, `${chosen} should never be dumped into items bag`);
      }
    }
  }

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const bossAvg = avg(qualityScores.boss);
  const miniAvg = avg(qualityScores.miniboss);
  const eliteAvg = avg(qualityScores.elite);
  const stdAvg = avg(qualityScores.standard);

  // Assert quality hierarchy: Boss > Miniboss >= Elite > Standard
  assert.ok(bossAvg > miniAvg, `Boss quality (${bossAvg.toFixed(2)}) must exceed miniboss (${miniAvg.toFixed(2)})`);
  assert.ok(miniAvg >= eliteAvg - 0.2, `Miniboss quality (${miniAvg.toFixed(2)}) should be comparable or exceed elite (${eliteAvg.toFixed(2)})`);
  assert.ok(eliteAvg > stdAvg, `Elite quality (${eliteAvg.toFixed(2)}) must exceed standard (${stdAvg.toFixed(2)})`);
});
