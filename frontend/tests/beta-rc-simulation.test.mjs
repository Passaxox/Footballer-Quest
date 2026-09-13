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
const rulesModule = await import(rulesUrl);
const eventsModule = await import(eventsUrl);
const engine = await import(engineUrl);
const { createRunRandomCursor } = await import(runRandomUrl);

const {
  ITEMS,
  FINAL_WAVE,
  STARTER_IDS,
  isTargetItem,
} = data;

const {
  newRun,
  normalizeRun,
  generateWave,
  generateRewards,
  getItemQuality,
  grantRunItem,
  resolveRewardChoice,
  advanceRunWave,
  fuseRunPlayers,
  applyRouteChoice,
  applyRunEventOutcome,
  chooseRunEvent,
  resolveEventTarget,
  canApplyItem,
  canReleasePlayer,
  completeNonCombatNode,
} = engine;

const { getRunEvent } = eventsModule;

test("48 Full-Run Simulations (24 Easy, 24 Normal) — 50-Wave Progression & Zero Dead Bag Pollution", () => {
  const totalRuns = 48;
  const completedRuns = [];

  for (let runIdx = 0; runIdx < totalRuns; runIdx++) {
    const difficultyId = runIdx < 24 ? "easy" : "normal";
    const seed = `rc-harden-seed-${runIdx + 1}-${difficultyId}`;
    let run = newRun(STARTER_IDS.slice(0, 3), difficultyId, { seed });

    assert.equal(run.wave, 1);
    assert.equal(run.difficultyId, difficultyId);

    // Play all 50 waves
    while (run && run.wave <= FINAL_WAVE) {
      const currentWave = run.wave;

      // 1. Handle pending route choices if any
      if (run.pendingRouteChoices && run.pendingRouteChoices.length > 0) {
        const choice = run.pendingRouteChoices[0];
        run = applyRouteChoice(run, choice.id);
        assert.equal(run.pendingRouteChoices, null);
      }

      // 2. Generate wave if no pending
      if (!run.pending) {
        const generated = generateWave(run);
        const { scenarioState, seed: s, rngState, rngCounter, ...pending } = generated;
        run = normalizeRun({ ...run, scenarioState, seed: s, rngState, rngCounter, pending });
      }

      assert.ok(run.pending, `Wave ${currentWave} must have a pending state`);

      // 3. Resolve pending node
      const p = run.pending;

      if (p.type === "battle") {
        const cursor = createRunRandomCursor(run);
        const tier = p.kind === "boss" ? "boss" : p.kind === "miniboss" ? "miniboss" : p.kind === "elite" ? "elite" : "standard";

        if (currentWave >= FINAL_WAVE) {
          // Final wave (50): victory immediately finishes the run
          assert.equal(currentWave, 50);
          completedRuns.push({ seed, difficultyId, finalWave: currentWave, status: "win" });
          run = null;
          break;
        }

        // Generate rewards
        const rewards = generateRewards(cursor.next, tier, run);
        assert.equal(rewards.length, 3, "Battle must offer 3 rewards");
        const chosenReward = rewards[0];

        // Find suitable target if needed
        const targetPlayer = isTargetItem(chosenReward)
          ? run.team.find(pl => canApplyItem(chosenReward, pl))
          : null;

        const resolvedReward = resolveRewardChoice(run, chosenReward, targetPlayer?.uid, p.rewardItem);
        run = resolvedReward.run;

        // Advance wave
        run = advanceRunWave(run);
      } else if (p.type === "event") {
        const event = getRunEvent(p.eventId);
        assert.ok(event, `Event ${p.eventId} must exist`);
        const choiceIdx = event.choices.findIndex(c => !c.cost || run.money >= c.cost);
        const chosen = chooseRunEvent(run, event, choiceIdx >= 0 ? choiceIdx : 0);
        const next = applyRunEventOutcome(chosen, event, chosen.pending.result);
        if (next.pending?.type === "eventTarget") {
          const resolved = resolveEventTarget(next, null);
          run = advanceRunWave(completeNonCombatNode(resolved));
        } else if (next.pending?.type === "battle") {
          run = advanceRunWave(completeNonCombatNode(next));
        } else {
          run = advanceRunWave(completeNonCombatNode(next));
        }
      } else if (p.type === "shop") {
        if (p.stock && p.stock.length > 0 && run.money >= p.stock[0].price) {
          const entry = p.stock[0];
          const charged = { ...run, money: run.money - entry.price };
          const target = isTargetItem(entry.id) ? run.team.find(pl => canApplyItem(entry.id, pl)) : null;
          const granted = grantRunItem(charged, entry.id, 1, { targetUid: target?.uid });
          run = granted.run;
        }
        run = advanceRunWave(completeNonCombatNode(run));
      } else if (p.type === "training" || p.type === "recovery" || p.type === "recruit") {
        run = advanceRunWave(completeNonCombatNode(run));
      } else {
        run = advanceRunWave(completeNonCombatNode(run));
      }

      if (run) {
        // Verify zero dead bag pollution:
        // Trigger items must never be in run.items
        for (const triggerId of ["cerotto", "balsamo", "cavigliera", "stendardo"]) {
          assert.equal(run.items?.[triggerId] || 0, 0, `Trigger item ${triggerId} must never pollute items bag`);
        }
        // Segment items must never be in run.items
        for (const segId of ["grinta", "tenuta", "azzardo", "muro", "equilibrio", "pressing", "tessera", "sigillo"]) {
          assert.equal(run.items?.[segId] || 0, 0, `Segment item ${segId} must never pollute items bag`);
        }
        // Cuneo must never be in run.items
        assert.equal(run.items?.cuneo || 0, 0, "Cuneo DNA must be tracked in specialResources, not items bag");
      }
    }
  }

  assert.equal(completedRuns.length, 48, "All 48 runs must reach and complete wave 50");
  for (const finished of completedRuns) {
    assert.equal(finished.finalWave, 50, "Run must end at wave 50, never wave 51");
    assert.equal(finished.status, "win");
  }
});

test("Loot Quality Hierarchy: Boss (mean > 3.0) > Miniboss >= Elite > Standard", () => {
  const qualityScores = { boss: [], miniboss: [], elite: [], standard: [] };
  const sampleRun = newRun(STARTER_IDS.slice(0, 3), "normal", { seed: "quality-audit-seed" });

  for (let i = 0; i < 60; i++) {
    const cursor = createRunRandomCursor({ ...sampleRun, rngCounter: i * 7 });
    for (const tier of ["boss", "miniboss", "elite", "standard"]) {
      const rewards = generateRewards(cursor.next, tier, sampleRun);
      assert.equal(rewards.length, 3);
      for (const id of rewards) {
        qualityScores[tier].push(getItemQuality(id));
      }
    }
  }

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const bossAvg = avg(qualityScores.boss);
  const minibossAvg = avg(qualityScores.miniboss);
  const eliteAvg = avg(qualityScores.elite);
  const standardAvg = avg(qualityScores.standard);

  assert.ok(bossAvg > 3.0, `Boss avg quality must exceed 3.0 (got ${bossAvg.toFixed(2)})`);
  assert.ok(bossAvg > minibossAvg, `Boss avg (${bossAvg.toFixed(2)}) > Miniboss (${minibossAvg.toFixed(2)})`);
  assert.ok(minibossAvg >= eliteAvg, `Miniboss avg (${minibossAvg.toFixed(2)}) >= Elite (${eliteAvg.toFixed(2)})`);
  assert.ok(eliteAvg > standardAvg, `Elite avg (${eliteAvg.toFixed(2)}) > Standard (${standardAvg.toFixed(2)})`);
});

test("Easy vs Normal difficulty distinction", () => {
  const easyRules = rulesModule.getRules("easy-v2");
  const normalRules = rulesModule.getRules("normal-v1");

  assert.equal(easyRules.difficultyId, "easy");
  assert.equal(normalRules.difficultyId, "normal");
  assert.ok(easyRules.combatXpMultiplier > normalRules.combatXpMultiplier, "Easy must give higher combat XP multiplier than Normal");
  assert.ok(easyRules.ordinaryEnemyLevelOffset < normalRules.ordinaryEnemyLevelOffset, "Easy has lower ordinary enemy level offset than Normal");
});

test("State-Machine Edge Cases: fuseRunPlayers input validation and rapid-tap safety", () => {
  const run = newRun(STARTER_IDS.slice(0, 3), "normal");
  run.specialResources = { cuneo: 1 };

  // 1. Same indices a === b
  assert.throws(() => {
    fuseRunPlayers(run, 0, 0, "a");
  }, /non validi/i);

  // 2. Out of bounds index
  assert.throws(() => {
    fuseRunPlayers(run, 0, 99, "a");
  }, /non validi/i);

  // 3. Fusing an already fused player
  const fusedRun = fuseRunPlayers(run, 0, 1, "a");
  assert.equal(fusedRun.team[0].fused, true);
  fusedRun.specialResources.cuneo = 1; // grant another cuneo

  assert.throws(() => {
    fuseRunPlayers(fusedRun, 0, 1, "a");
  }, /non validi/i);

  // 4. Missing Cuneo
  fusedRun.specialResources.cuneo = 0;
  assert.throws(() => {
    fuseRunPlayers(fusedRun, 1, 0, "a");
  }, /Cuneo DNA/i);
});

test("State-Machine Edge Cases: canApplyItem and canReleasePlayer guards", () => {
  const run = newRun(STARTER_IDS.slice(0, 3), "normal");
  const livingFullHp = run.team[0]; // 100% HP
  const livingInjured = { ...run.team[1], hp: 5 };
  const deadPlayer = { ...run.team[2], hp: 0 };

  // Heal on full HP without burn
  assert.equal(canApplyItem("barretta", livingFullHp), false);
  assert.equal(canApplyItem("barretta", livingInjured), true);
  assert.equal(canApplyItem("barretta", deadPlayer), false);

  // Revive item
  assert.equal(canApplyItem("pallone", livingFullHp), false);
  assert.equal(canApplyItem("pallone", deadPlayer), true);
  assert.equal(canApplyItem("defibrillatore", livingFullHp), false);
  assert.equal(canApplyItem("defibrillatore", deadPlayer), true);

  // Stat item
  assert.equal(canApplyItem("fascia", livingFullHp), true);
  assert.equal(canApplyItem("fascia", deadPlayer), false);

  // Trigger item cannot be directly consumed on a player
  assert.equal(canApplyItem("stendardo", livingFullHp), false);
  assert.equal(canApplyItem("cerotto", livingFullHp), false);

  // canReleasePlayer guard
  const team2 = [livingFullHp, deadPlayer];
  assert.equal(canReleasePlayer(team2, deadPlayer.uid), true);
  assert.equal(canReleasePlayer(team2, livingFullHp.uid), false, "Cannot release only living teammate");
});

test("Checkpoint Segment Reward Preservation Across Boundary", () => {
  const run = newRun(STARTER_IDS.slice(0, 3), "normal");
  run.wave = 3;
  run.segmentState = { segmentIndex: 1, step: 3, length: 3, checkpointType: "miniboss" };

  // Reward obtained after checkpoint victory
  const res = resolveRewardChoice(run, "grinta");
  assert.deepEqual(res.run.nextSegmentNodeItems, ["grinta"]);
  assert.deepEqual(res.run.activeNodeItems, []);

  // Wave advance across boundary
  const wave4 = advanceRunWave(res.run);
  assert.equal(wave4.wave, 4);
  assert.deepEqual(wave4.nextSegmentNodeItems, []);
  assert.deepEqual(wave4.activeNodeItems, ["grinta"]);
  assert.equal(wave4.nodeModifiers.team.atkMod, 1);

  // Next step within segment 2 (internal step: wave 4 -> wave 5)
  const wave5 = advanceRunWave(wave4);
  assert.equal(wave5.wave, 5);
  // Must STILL be active within segment!
  assert.deepEqual(wave5.activeNodeItems, ["grinta"]);
  assert.equal(wave5.nodeModifiers.team.atkMod, 1);
});
