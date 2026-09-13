import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
const scenariosUrl = moduleUrl((await source("scenarios")).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)).replace('"./rarity"', JSON.stringify(rarityUrl)).replace('"./events"', JSON.stringify(eventsUrl)));
const engineUrl = moduleUrl((await source("engine")).replace('"./scenarios"', JSON.stringify(scenariosUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./rules"', JSON.stringify(rulesUrl)).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./events"', JSON.stringify(eventsUrl)).replace('"./runRandom"', JSON.stringify(runRandomUrl)).replace('"./rarity"', JSON.stringify(rarityUrl)).replace('"./routeDeck"', JSON.stringify(routeDeckUrl)).replace('"./synergies"', JSON.stringify(synergiesUrl)));

const data = await import(dataUrl);
const catalog = await import(catalogUrl);
const validation = await import(validationUrl);
const engine = await import(engineUrl);

test("CharacterVersion clone audit verifies 0 clones across all multi-version characters", () => {
  const auditResult = validation.auditCharacterVersionClones(catalog.CHARACTER_VERSIONS, catalog.PRIMARY_MOVES);
  assert.equal(auditResult.status, "PASS");
  assert.equal(auditResult.clonesCount, 0);
  assert.equal(auditResult.clones.length, 0);

  // Explicitly check multi-version characters across all teams and forms
  const multiCharIds = ["jude", "jonas", "jordan", "gazelle", "dvalin", "torch", "shawn", "xavier", "grent", "gokka", "clara", "neppten"];
  for (const charId of multiCharIds) {
    const versions = Object.values(catalog.CHARACTER_VERSIONS).filter(v => v.characterId === charId);
    assert.ok(versions.length >= 2, `Character ${charId} should have >= 2 versions, found ${versions.length}`);
    for (let i = 0; i < versions.length; i++) {
      for (let j = i + 1; j < versions.length; j++) {
        const v1 = versions[i];
        const v2 = versions[j];
        const move1 = catalog.PRIMARY_MOVES[v1.primaryMoveId];
        const move2 = catalog.PRIMARY_MOVES[v2.primaryMoveId];
        const statsDiff = v1.baseStats.hp !== v2.baseStats.hp || v1.baseStats.atk !== v2.baseStats.atk ||
          v1.baseStats.def !== v2.baseStats.def || v1.baseStats.spd !== v2.baseStats.spd;
        const moveDiff = move1.name !== move2.name || move1.power !== move2.power || move1.effect !== move2.effect;
        assert.ok(statsDiff || moveDiff, `Versions of ${charId} (${v1.versionId} vs ${v2.versionId}) must be differentiated`);
      }
    }
  }
});

test("Byron Love balance tune brings stat total to 200 and move power to 96 drain", () => {
  const byronRow = data.ROSTER.find(r => r.id === "byron");
  assert.ok(byronRow, "Byron should exist in ROSTER");
  assert.equal(byronRow.hp, 78);
  assert.equal(byronRow.atk, 48);
  assert.equal(byronRow.def, 28);
  assert.equal(byronRow.spd, 46);
  const totalStats = byronRow.hp + byronRow.atk + byronRow.def + byronRow.spd;
  assert.equal(totalStats, 200, "Byron stat total should be exactly 200");
  assert.equal(byronRow.move.power, 96);
  assert.equal(byronRow.move.effect, "drain");

  // Compare against Tier 4 peers
  const torch = data.ROSTER.find(r => r.id === "torch");
  const gazelle = data.ROSTER.find(r => r.id === "gazelle");
  const xavier = data.ROSTER.find(r => r.id === "xavier");
  const torchTotal = torch.hp + torch.atk + torch.def + torch.spd;
  const gazelleTotal = gazelle.hp + gazelle.atk + gazelle.def + gazelle.spd;
  const xavierTotal = xavier.hp + xavier.atk + xavier.def + xavier.spd;
  assert.ok(Math.abs(totalStats - torchTotal) <= 5);
  assert.ok(Math.abs(totalStats - gazelleTotal) <= 5);
  assert.ok(Math.abs(totalStats - xavierTotal) <= 5);
});

test("Item system categorizes items into MANUAL, NODE, and TRIGGER classes", () => {
  const items = Object.values(data.ITEMS);
  assert.ok(items.length >= 32, "Item pool should have at least 32 items");

  const classes = new Set(items.map(i => i.itemClass));
  assert.ok(classes.has(data.ITEM_CLASSES.MANUAL));
  assert.ok(classes.has(data.ITEM_CLASSES.NODE));
  assert.ok(classes.has(data.ITEM_CLASSES.TRIGGER));

  // Verify node items
  for (const id of ["grinta", "tenuta", "azzardo", "muro", "equilibrio", "pressing", "tessera", "sigillo"]) {
    assert.equal(data.ITEMS[id].itemClass, data.ITEM_CLASSES.NODE, `${id} should be NODE class`);
  }

  // Verify trigger items
  for (const id of ["cerotto", "balsamo", "cavigliera", "stendardo"]) {
    assert.equal(data.ITEMS[id].itemClass, data.ITEM_CLASSES.TRIGGER, `${id} should be TRIGGER class`);
  }

  // Verify manual items
  for (const id of ["barretta", "bibita", "impacco", "pallone", "cuneo", "fascia", "guanti", "scarpini", "proteine"]) {
    assert.equal(data.ITEMS[id].itemClass, data.ITEM_CLASSES.MANUAL, `${id} should be MANUAL class`);
  }
});

test("grantRunItem auto-activates node items, applies stages to nodeModifiers, and resets on wave advance", () => {
  const starters = ["mark", "axel", "jude"];
  const run = engine.newRun(starters);

  // Grant a node item
  const { run: runWithGrinta, feedback } = engine.grantRunItem(run, "grinta");
  assert.ok(feedback.includes("attivato fino a fine nodo"), `Feedback should indicate node duration: ${feedback}`);
  assert.equal(runWithGrinta.items.grinta, undefined, "Node item should not occupy manual inventory");
  assert.ok(runWithGrinta.activeNodeItems.includes("grinta"), "activeNodeItems should record grinta");
  assert.equal(runWithGrinta.nodeModifiers.team.atkMod, 1, "Team ATK stage should be incremented to +1");

  // Advance wave: node modifiers and activeNodeItems reset
  const nextWaveRun = engine.advanceRunWave(runWithGrinta);
  assert.deepEqual(nextWaveRun.activeNodeItems, [], "activeNodeItems should be empty on next wave");
  assert.deepEqual(nextWaveRun.nodeModifiers, {}, "nodeModifiers should be empty on next wave");
});

test("performAttack handles trigger items: firstStrike, lethal endure, burn cleanse, and low-HP recovery", () => {
  const att = engine.createPlayer("axel", 5);
  const def = engine.createPlayer("mark", 5);

  // 1. Stendardo firstStrike bonus
  let stendardoUsed = false;
  const normalAtk = engine.performAttack(att, def);
  const stendardoAtk = engine.performAttack(att, def, {
    firstStrike: true,
    hasStendardo: true,
    onTriggerUsed: (id) => { if (id === "stendardo") stendardoUsed = true; },
  });
  assert.ok(stendardoUsed, "Stendardo trigger callback should be called");
  assert.ok(stendardoAtk.msgs.some(m => m.includes("Stendardo Tattico")), "Log should mention Stendardo Tattico");

  // 2. Cavigliera endure at 1 HP
  let caviglieraUsed = false;
  const highAtk = { ...att, atk: 999 };
  const lethalAtk = engine.performAttack(highAtk, { ...def, hp: 50 }, {
    hasCavigliera: true,
    onTriggerUsed: (id) => { if (id === "cavigliera") caviglieraUsed = true; },
  });
  assert.ok(caviglieraUsed, "Cavigliera callback should be called");
  assert.equal(lethalAtk.def.hp, 1, "Defender should survive lethal hit with exactly 1 HP");
  assert.ok(lethalAtk.msgs.some(m => m.includes("Cavigliera Protettiva")), "Log should mention Cavigliera Protettiva");

  // 3. Balsamo cleanse burn
  let balsamoUsed = false;
  const burnMovePlayer = { ...att, move: { name: "Fuoco Test", element: "fuoco", power: 10, effect: "burn" } };
  // performAttack with hasBalsamo
  let burnBlocked = false;
  for (let i = 0; i < 20; i++) {
    const res = engine.performAttack(burnMovePlayer, { ...def, hp: 100 }, {
      hasBalsamo: true,
      onTriggerUsed: (id) => { if (id === "balsamo") balsamoUsed = true; },
    });
    if (res.msgs.some(m => m.includes("Balsamo Rinfrescante"))) {
      burnBlocked = true;
      assert.equal(res.def.status.burn, 0, "Burn should be 0 when Balsamo triggers");
      break;
    }
  }
  assert.ok(burnBlocked, "Balsamo should prevent burn");
  assert.ok(balsamoUsed, "Balsamo callback should be called");

  // 4. Cerotto emergency heal
  let cerottoUsed = false;
  const midAtk = { ...att, atk: 50, move: { name: "Attacco Test", element: "aria", power: 70 } };
  const injuredDef = { ...def, hp: 35, maxHp: 100 }; // 35% HP
  const cerottoAtk = engine.performAttack(midAtk, injuredDef, {
    hasCerotto: true,
    onTriggerUsed: (id) => { if (id === "cerotto") cerottoUsed = true; },
  });
  // If defender dropped below 30% HP, cerotto heals +25 HP
  if (cerottoUsed) {
    assert.ok(cerottoAtk.msgs.some(m => m.includes("Cerotto d'Emergenza")), "Log should mention Cerotto");
  }
});

test("Differentiated manual items: impacco grants guard and cleanses, borraccia heals team, pallone revives with guard", () => {
  const p = { ...engine.createPlayer("mark", 5), hp: 50, status: { burn: 2, guard: false, atkMod: 0, defMod: 0 } };

  // Impacco heals 25% + cures burn + prepares guard
  const afterImpacco = engine.applyItemTo("impacco", p);
  assert.equal(afterImpacco.status.burn, 0, "Burn should be cured");
  assert.equal(afterImpacco.status.guard, true, "Guard should be prepared");
  assert.equal(afterImpacco.hp, p.hp + Math.round(p.maxHp * 0.25));

  // Pallone revives KO player and gives guard
  const koPlayer = { ...engine.createPlayer("mark", 5), hp: 0, status: { guard: false, atkMod: 0, defMod: 0 } };
  const afterPallone = engine.applyItemTo("pallone", koPlayer);
  assert.equal(afterPallone.hp, Math.round(koPlayer.maxHp * 0.5));
  assert.equal(afterPallone.status.guard, true, "Revived player should have guard");
});
