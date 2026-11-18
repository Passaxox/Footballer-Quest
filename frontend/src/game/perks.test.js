import { buyPerk, perkOffer, addRunPerk, runPerkFx, applyPerkBuffs, runSpiritReward, encodeSave, decodeSave, fusionReady, PERK_BY_ID } from "./perks";
import { newRun } from "./engine";

test("buying levels costs team spirit and fusion needs both parts at III", () => {
  let meta = { teamSpirit: 1000, perks: {} };
  meta = buyPerk(meta, "tiro");
  expect(meta.perks.tiro).toBe(1); expect(meta.teamSpirit).toBe(1000);
  meta = buyPerk(buyPerk(meta, "tiro"), "tiro");
  expect(meta.perks.tiro).toBe(3); expect(meta.teamSpirit).toBe(1000 - 20 - 45);
  expect(buyPerk(meta, "tiro")).toBe(meta);
  expect(fusionReady(meta, PERK_BY_ID.inazumabreak)).toBe(false);
  expect(buyPerk(meta, "inazumabreak")).toBe(meta);
  expect(buyPerk({ teamSpirit: 0, perks: {} }, "bomber").perks.bomber).toBeUndefined();
});

test("offer, effects, buffs, spirit reward and save code", () => {
  const meta = { teamSpirit: 0, perks: { tiro: 2, sponsor: 1, raydark: 1, quaderno: 1 } };
  const offer = perkOffer(meta, { perks: [] }, () => 0.3);
  expect(offer.normal).not.toContain("quaderno");
  expect(offer.normal.sort()).toEqual(["sponsor", "tiro"]);
  expect(offer.cursed).toBe("raydark");
  let run = newRun(["mark", "axel", "nathan"]);
  run = addRunPerk(addRunPerk(run, meta, "tiro"), meta, "raydark");
  const fx = runPerkFx(run);
  expect(fx.atkPct).toBe(7 + 15); expect(fx.hpPct).toBe(-15);
  const buffed = applyPerkBuffs(run.team, fx);
  expect(buffed[0].atk).toBeGreaterThan(run.team[0].atk);
  expect(buffed[0].maxHp).toBeLessThan(run.team[0].maxHp);
  expect(runSpiritReward({ ...run, wave: 21 }, "lose")).toBe(Math.round((40 + 30) * 1.25));
  const data = decodeSave(encodeSave({ teamSpirit: 5, note: "àè" }, run));
  expect(data.meta.note).toBe("àè"); expect(data.run.perks).toHaveLength(2);
  expect(() => decodeSave("nope")).toThrow();
});
