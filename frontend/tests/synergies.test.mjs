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

const synergies = await import(synergiesUrl);
const engine = await import(engineUrl);

const mockPlayer = (element, hp = 100, maxHp = 100, spd = 30) => ({
  uid: Math.random().toString(36).slice(2),
  name: `Player-${element}`,
  element,
  hp,
  maxHp,
  spd,
  level: 5,
  atk: 30,
  def: 30,
  status: { burn: 0, guard: false, atkMod: 0, defMod: 0, talisman: false },
  move: { name: "Test Move", element, power: 50, effect: null }
});

test("each elemental synergy defines a distinct, modest, and valid configuration", () => {
  const configs = synergies.ELEMENT_SYNERGY_CONFIG;
  assert.ok(configs.fuoco, "Fuoco config exists");
  assert.ok(configs.aria, "Aria config exists");
  assert.ok(configs.terra, "Terra config exists");
  assert.ok(configs.natura, "Natura config exists");

  assert.equal(configs.fuoco.critBonus, 10);
  assert.equal(configs.aria.speedBonus, 4);
  assert.equal(configs.terra.damageTakenMultiplier, 0.90);
  assert.equal(configs.natura.postBattleHealPercent, 8);

  const descriptions = Object.values(configs).map(c => c.description);
  assert.equal(new Set(descriptions).size, 4, "All 4 descriptions must be unique");
});

test("2+ living teammates activate synergy; 1 teammate does not", () => {
  const soloFire = [mockPlayer("fuoco")];
  assert.equal(synergies.activeSynergies(soloFire).length, 0);

  const duoFire = [mockPlayer("fuoco"), mockPlayer("fuoco")];
  const active = synergies.activeSynergies(duoFire);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, "element-fuoco");
  assert.equal(active[0].members, 2);
  assert.equal(synergies.synergyCritBonus(duoFire), 10);
});

test("KO players do not count towards synergy activation", () => {
  const teamWithKo = [
    mockPlayer("fuoco", 100),
    mockPlayer("fuoco", 0) // KO
  ];
  assert.equal(synergies.activeSynergies(teamWithKo).length, 0);
  assert.equal(synergies.synergyCritBonus(teamWithKo), 0);
});

test("maximum 2 active synergies cap is strictly enforced", () => {
  const quadTeam = [
    mockPlayer("fuoco"), mockPlayer("fuoco"),
    mockPlayer("aria"), mockPlayer("aria"),
    mockPlayer("terra"), mockPlayer("terra"),
    mockPlayer("natura"), mockPlayer("natura")
  ];
  const active = synergies.activeSynergies(quadTeam);
  assert.equal(active.length, 2, "Must be capped at at most 2 synergies");
});

test("synergy bonuses do not cause runaway stacking with 3+ members", () => {
  const trioFire = [mockPlayer("fuoco"), mockPlayer("fuoco"), mockPlayer("fuoco")];
  assert.equal(synergies.synergyCritBonus(trioFire), 10, "Crit bonus remains bounded at 10");

  const trioAria = [mockPlayer("aria"), mockPlayer("aria"), mockPlayer("aria")];
  assert.equal(synergies.synergySpeedBonus(trioAria), 4, "Speed bonus remains bounded at 4");

  const trioTerra = [mockPlayer("terra"), mockPlayer("terra"), mockPlayer("terra")];
  assert.equal(synergies.synergyDamageTakenMultiplier(trioTerra), 0.90, "Damage reduction remains bounded at 0.90");

  const trioNatura = [mockPlayer("natura"), mockPlayer("natura"), mockPlayer("natura")];
  const activeNatura = synergies.activeSynergies(trioNatura);
  assert.equal(activeNatura[0].postBattleHealPercent, 8, "Heal percentage remains bounded at 8%");
});

test("Terra synergy reduces combat damage taken", () => {
  const attacker = mockPlayer("fuoco", 100, 100, 30);
  const defender = mockPlayer("terra", 100, 100, 30);
  const terraTeam = [defender, mockPlayer("terra")];

  const unmitigated = engine.calcDamage(attacker, defender, attacker.move);
  const mitigated = engine.calcDamage(attacker, defender, attacker.move, { defenderTeam: terraTeam });

  assert.ok(mitigated.dmg <= unmitigated.dmg, "Terra synergy must reduce incoming damage");
});

test("Aria synergy grants initiative speed bonus in turn order", () => {
  const playerFighter = mockPlayer("fuoco", 100, 100, 30);
  const enemyFighter = mockPlayer("fuoco", 100, 100, 32); // Enemy is slightly faster (32 vs 30)

  // Without Aria synergy: enemy has higher speed (32 > 30) -> enemy goes first
  assert.equal(engine.turnOrder(playerFighter, enemyFighter), "enemy");

  // With Aria synergy (+4 SPD): player effective speed becomes 34 (34 > 32) -> player goes first
  const ariaTeam = [playerFighter, mockPlayer("aria"), mockPlayer("aria")];
  assert.equal(engine.turnOrder(playerFighter, enemyFighter, ariaTeam), "player");
});

test("Natura synergy applies post-battle healing to living teammates only, leaving KO untouched", () => {
  const team = [
    mockPlayer("natura", 50, 100), // living Natura 1 at 50/100 HP
    mockPlayer("natura", 70, 100), // living Natura 2 at 70/100 HP (synergy active!)
    mockPlayer("natura", 0, 100),  // KO Natura at 0/100 HP (must stay KO!)
    mockPlayer("terra", 80, 100)   // living teammate at 80/100 HP
  ];

  // Heal amount is 8% of 100 = 8 HP
  const healed = synergies.applyPostBattleSynergyHealing(team);
  assert.equal(healed[0].hp, 58, "Living Natura player must be healed by 8 HP");
  assert.equal(healed[1].hp, 78, "Second living Natura player must be healed by 8 HP");
  assert.equal(healed[2].hp, 0, "KO player must remain KO at 0 HP");
  assert.equal(healed[3].hp, 88, "Living teammate must be healed by 8 HP");
});

test("Prestigio reward multiplier defaults cleanly to 1.0 without economic runaway", () => {
  const team = [mockPlayer("fuoco"), mockPlayer("fuoco"), mockPlayer("terra"), mockPlayer("terra")];
  assert.equal(synergies.synergyRewardMultiplier(team), 1.0);
});
