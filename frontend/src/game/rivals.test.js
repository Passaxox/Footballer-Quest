import { recordRival, rivalEntries } from "./rivals";
import { challengeResults, ROTATING_CHALLENGES, bonusChallenge } from "./talents";
import { resolveVersion } from "./catalog";

test("rival diary keeps wins, best wave and fewest KO", () => {
  let m = recordRival({}, { kind: "boss", bossId: "dark-emperors" }, 30, 2);
  m = recordRival(m, { kind: "boss", bossId: "dark-emperors" }, 20, 0);
  m = recordRival(m, { kind: "team", miniboss: true, bossId: "occult" }, 5, 1);
  expect(m.rivals["boss:dark-emperors"]).toMatchObject({ wins: 2, bestWave: 30, fewestKo: 0, teamId: "dark-emperors" });
  expect(rivalEntries(m).map((e) => e.key)).toEqual(["boss:dark-emperors", "miniboss:occult"]);
  expect(recordRival(m, { kind: "wild" }, 3, 0)).toBe(m);
});

test("rotating challenge is seeded and pays double spirit without penalty", () => {
  const run = { wave: 25, team: [1, 2, 3], stats: { fusions: 1, recruits: 5 }, challenges: { perfect: 2, minis: 3 }, overworld: { contentSeed: 0 } };
  expect(bonusChallenge(run).id).toBe(ROTATING_CHALLENGES[0].id);
  const bonus = challengeResults(run, "lose").find((c) => c.bonus);
  expect(bonus.spirit).toBe(ROTATING_CHALLENGES[0].spirit * 2);
  const failed = challengeResults({ ...run, wave: 3 }, "lose").find((c) => c.bonus);
  expect(failed).toMatchObject({ count: 0, spirit: 0 });
});

test("recovered Dark Emperors are neutral and Feldt is the goalkeeper", () => {
  expect(resolveVersion("thomas-feldt:dark-emperors")).toMatchObject({ role: "P", element: "neutro", spriteId: "de-thomas-feldt" });
  expect(resolveVersion("shadow-cimmerian:dark-emperors").element).toBe("neutro");
  expect(resolveVersion("bomber:prominence").primaryTeamId).toBe("prominence");
});
