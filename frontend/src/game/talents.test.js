import { buyTalent, talentFx, resetTalents, challengeResults, runTalentPoints } from "./talents";
import { runPerkFx } from "./perks";
import { runPlan } from "./campaign";
import { PHASE_POOLS } from "./bossPools";
import { newRun } from "./engine";

test("talent tree: prerequisites, mastery, fx snapshot and refund", () => {
  let m = { talentPoints: 20, talents: {} };
  expect(buyTalent(m, "testa")).toBe(m);
  m = buyTalent(m, "tiro-base"); expect(m.talents["tiro-base"]).toBe(1);
  m = buyTalent(m, "testa"); expect(m.talents.testa).toBe(1);
  expect(buyTalent(m, "m-bomber")).toBe(m);
  for (const id of ["tiro-base", "tiro-base", "testa", "testa", "corsa", "corsa", "corsa"]) m = buyTalent(m, id);
  m = buyTalent(m, "m-bomber");
  expect(m.talents["m-bomber"]).toBe(1); expect(m.talentPoints).toBe(20 - 9 - 3);
  const fx = talentFx(m);
  expect(fx.atkPct).toBe(6 + 8); expect(runPerkFx({ talentFx: fx, perks: [] }).critBonus).toBe(12);
  expect(resetTalents(m).talentPoints).toBe(20);
});

test("challenges and talent points", () => {
  const run = { ...newRun(["mark", "axel", "nathan"]), wave: 50, challenges: { perfect: 3, fled: false } };
  const res = challengeResults(run, "win");
  expect(res.find((c) => c.id === "perfect").spirit).toBe(60);
  expect(res.find((c) => c.id === "nofuga").count).toBe(1);
  expect(res.find((c) => c.id === "cuore-raimon").count).toBe(1);
  expect(res.find((c) => c.id === "pochi").count).toBe(1);
  expect(runTalentPoints(run, "win")).toBe(5 + 3);
});

test("no team appears as both miniboss and boss in the same act", () => {
  for (let s = 0; s < 400; s++) {
    const p = runPlan(s * 104729 + 1);
    for (const w of [5, 15, 25, 35, 45]) p[w + 5].forEach((b) => expect(p[w]).not.toContain(b));
    expect(Object.keys(PHASE_POOLS).length).toBe(10);
  }
});
