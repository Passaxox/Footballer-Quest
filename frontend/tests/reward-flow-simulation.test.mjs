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
const catalogUrl = moduleUrl((await source("catalog")).replace("\"./catalogExpansion\"", JSON.stringify(expansionUrl)).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./catalogValidation"', JSON.stringify(validationUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)).replace('"./rarity"', JSON.stringify(rarityUrl)));
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
  advanceRunWave,
  performAttack,
  fuseRunPlayers,
  createPlayer,
} = engine;

test("Item definitions have comprehensive family, targetType, and valid presentation", () => {
  for (const [id, def] of Object.entries(ITEMS)) {
    assert.ok(def.name, `Item ${id} must have name`);
    assert.ok(def.family, `Item ${id} must have family`);
    assert.ok(
      [ITEM_FAMILIES.INSTANT, ITEM_FAMILIES.SEGMENT, ITEM_FAMILIES.TRIGGER, ITEM_FAMILIES.RESOURCE].includes(def.family),
      `Item ${id} has valid family ${def.family}`
    );
    const pres = itemFamilyPresentation(id);
    assert.ok(pres.label, `Item ${id} presentation must have label`);
    assert.ok(pres.badgeClass, `Item ${id} presentation must have badgeClass`);

    if (isTargetItem(id)) {
      assert.equal(def.family, ITEM_FAMILIES.INSTANT, `Target item ${id} must be INSTANT`);
      assert.equal(def.targetType, "player", `Target item ${id} targetType must be player`);
    }
  }
});

test("24+ full-run seeds confirm loot quality hierarchy: Boss > Miniboss >= Elite > Standard", () => {
  const seeds = Array.from({ length: 28 }, (_, i) => `sim-seed-${i + 1}-test`);
  const tierQualityTotals = { boss: 0, miniboss: 0, elite: 0, standard: 0 };
  const tierCounts = { boss: 0, miniboss: 0, elite: 0, standard: 0 };

  for (const seed of seeds) {
    const run = newRun(data.STARTER_IDS.slice(0, 3), "normal", { seed });
    const cursor = createRunRandomCursor(run);

    for (const tier of ["boss", "miniboss", "elite", "standard"]) {
      const rewards = generateRewards(cursor.next, tier, run);
      assert.equal(rewards.length, 3, `Tier ${tier} must generate exactly 3 rewards`);
      assert.equal(new Set(rewards).size, 3, `Tier ${tier} rewards must be 3 unique items`);

      for (const itemId of rewards) {
        assert.ok(ITEMS[itemId], `Item ${itemId} must exist in ITEMS`);
        const quality = getItemQuality(itemId);
        tierQualityTotals[tier] += quality;
        tierCounts[tier] += 1;

        if (tier === "boss" || tier === "miniboss") {
          assert.ok(
            quality >= 2,
            `${tier} reward ${itemId} quality ${quality} must not be below floor (2)`
          );
        }
      }
    }
  }

  const bossAvg = tierQualityTotals.boss / tierCounts.boss;
  const minibossAvg = tierQualityTotals.miniboss / tierCounts.miniboss;
  const eliteAvg = tierQualityTotals.elite / tierCounts.elite;
  const standardAvg = tierQualityTotals.standard / tierCounts.standard;

  assert.ok(bossAvg > minibossAvg, `Boss avg quality (${bossAvg.toFixed(2)}) must exceed Miniboss (${minibossAvg.toFixed(2)})`);
  assert.ok(minibossAvg >= eliteAvg, `Miniboss avg quality (${minibossAvg.toFixed(2)}) must be >= Elite (${eliteAvg.toFixed(2)})`);
  assert.ok(eliteAvg > standardAvg, `Elite avg quality (${eliteAvg.toFixed(2)}) must exceed Standard (${standardAvg.toFixed(2)})`);
});

test("Target preview computes accurate before/after diffs and respects application rules", () => {
  const p1 = createPlayer("mark", 5);
  p1.hp = 20;
  const p2 = createPlayer("axel", 5);
  p2.hp = 0;

  // Barretta (heal)
  const barrettaLiving = getItemTargetPreview("barretta", p1);
  assert.equal(barrettaLiving.valid, true);
  assert.ok(barrettaLiving.diffs.some(d => d.label === "HP" && d.after > d.before));

  const barrettaKo = getItemTargetPreview("barretta", p2);
  assert.equal(barrettaKo.valid, false);
  assert.equal(barrettaKo.reason, "Giocatore KO");

  // Pallone d'oro (revive)
  const palloneLiving = getItemTargetPreview("pallone", p1);
  assert.equal(palloneLiving.valid, false);
  assert.equal(palloneLiving.reason, "Solo su giocatori KO");

  const palloneKo = getItemTargetPreview("pallone", p2);
  assert.equal(palloneKo.valid, true);
  assert.ok(palloneKo.diffs.some(d => d.label === "HP" && d.after > 0));
  assert.ok(palloneKo.diffs.some(d => d.label === "Parata" && d.after === "Attiva"));

  // Manual permanent stat booster (fascia)
  const fasciaPreview = getItemTargetPreview("fascia", p1);
  assert.equal(fasciaPreview.valid, true);
  assert.ok(fasciaPreview.diffs.some(d => d.label === "ATK" && d.diff === 5));
});

test("INSTANT items apply immediately and resolveRewardChoice records telemetry", () => {
  const run = newRun(data.STARTER_IDS.slice(0, 3));
  run.team[0].hp = 10;

  // Single target instant reward
  const res1 = resolveRewardChoice(run, "barretta", run.team[0].uid);
  assert.ok(res1.run.team[0].hp > 10, "Target received instant healing");
  assert.deepEqual(res1.run.telemetry.itemsChosen, ["barretta"]);

  // Team-wide instant reward
  run.team[1].hp = 10;
  const res2 = resolveRewardChoice(run, "borraccia");
  assert.ok(res2.run.team[0].hp > 10);
  assert.ok(res2.run.team[1].hp > 10);
});

test("SEGMENT items chosen at checkpoint queue for the next segment and activate across boundaries", () => {
  const run = newRun(data.STARTER_IDS.slice(0, 3));
  run.wave = 3;
  run.segmentState = { segmentIndex: 1, step: 3, length: 3, checkpointType: "miniboss" };

  // Reward chosen at checkpoint
  const res = resolveRewardChoice(run, "grinta");
  assert.deepEqual(res.run.nextSegmentNodeItems, ["grinta"]);
  assert.equal(res.run.activeNodeItems.length, 0);

  // Advance wave across checkpoint boundary into segment 2
  const nextRun = advanceRunWave(res.run);
  assert.equal(nextRun.wave, 4);
  assert.deepEqual(nextRun.activeNodeItems, ["grinta"]);
  assert.equal(nextRun.nodeModifiers.team.atkMod, 1);
  assert.equal(nextRun.nextSegmentNodeItems.length, 0);
});

test("TRIGGER items auto-arm, fire automatically in combat without bag interaction, and update state", () => {
  const run = newRun(data.STARTER_IDS.slice(0, 3));
  const granted = grantRunItem(run, "stendardo");
  assert.equal(granted.run.armedTriggers.stendardo, 1);
  assert.equal(granted.run.items.stendardo, 1);

  // Perform attack with armed stendardo
  let triggerUsed = null;
  const attacker = { ...granted.run.team[0] };
  const defender = createPlayer("axel", 5);
  const result = performAttack(attacker, defender, {
    firstStrike: true,
    hasStendardo: granted.run.armedTriggers.stendardo > 0,
    onTriggerUsed: (id) => { triggerUsed = id; },
  });

  assert.equal(triggerUsed, "stendardo");
  assert.ok(result.msgs.some(m => m.includes("Stendardo Tattico")));
});

test("Special resources (Cuneo DNA) isolate to specialResources and preserve fusion", () => {
  const run = newRun(data.STARTER_IDS.slice(0, 3));
  const res = resolveRewardChoice(run, "cuneo");
  assert.equal(res.run.specialResources.cuneo, 1);
  assert.equal(res.run.items.cuneo, 1);

  // Fusion uses cuneo and decrements
  const fusedRun = fuseRunPlayers(res.run, 0, 1, "a");
  assert.equal(fusedRun.specialResources.cuneo, 0);
  assert.equal(fusedRun.items.cuneo || 0, 0);
  assert.equal(fusedRun.team[0].fused, true);
});

test("Reload determinism: pending reward choice and target selection survive serialization without reroll exploit", () => {
  const run = newRun(data.STARTER_IDS.slice(0, 3));
  const cursor = createRunRandomCursor(run);
  const rewards = generateRewards(cursor.next, "elite", run);

  const pendingContext = {
    rewards: [...rewards],
    bonus: null,
    money: 120,
    selectedRewardId: "barretta",
  };
  const runWithPending = {
    ...run,
    pending: { type: "rewardTarget", context: pendingContext },
  };

  // Simulate JSON serialization (storage save/load)
  const serialized = JSON.parse(JSON.stringify(runWithPending));
  const restored = normalizeRun(serialized);

  assert.equal(restored.pending.type, "rewardTarget");
  assert.deepEqual(restored.pending.context.rewards, rewards);
  assert.equal(restored.pending.context.selectedRewardId, "barretta");
});
