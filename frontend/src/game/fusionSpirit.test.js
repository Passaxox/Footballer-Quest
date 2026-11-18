import { newRun, fuseRunPlayers, generateRewards, calcDamage, freshStatus } from "./engine";
import { playerTeamIds, computeSynergyPoints } from "./traits";
import { spiritFor, canSummonSpirit, summonSpirit } from "./spirits";

test("fusion is once per run, keeps base identity/team and frees a slot", () => {
  const run = { ...newRun(["mark", "axel", "jude"]), items: { cuneo: 1 } };
  const next = fuseRunPlayers(run, 0, 1, "b");
  expect(next.team).toHaveLength(2);
  expect(next.team[0].name).toBe("Mark Evans");
  expect(next.team[0].move.name).toBe(run.team[1].move.name);
  expect(playerTeamIds(next.team[0])).toEqual(playerTeamIds(run.team[0]));
  expect(() => fuseRunPlayers({ ...next, items: { cuneo: 1 } }, 0, 1, "a")).toThrow();
  for (let i = 0; i < 50; i++) expect(generateRewards(next)).not.toContain("cuneo");
});

test("warrior spirit: canonical only, once, boosts damage and synergy point", () => {
  const [mark, , jude] = newRun(["mark", "axel", "jude"]).team;
  expect(spiritFor(mark)).toBeTruthy();
  expect(spiritFor(jude)).toBeNull();
  expect(canSummonSpirit(mark, true)).toBe(false);
  const on = summonSpirit(mark);
  expect(canSummonSpirit(on, false)).toBe(false);
  const pts = computeSynergyPoints([{ ...mark, spiritTeamId: playerTeamIds(mark)[0] }], { duringMatch: true });
  expect(pts[playerTeamIds(mark)[0]]).toBe(2);
  const target = { ...jude, status: freshStatus() };
  const avg = (a) => { let s = 0; for (let i = 0; i < 300; i++) s += calcDamage(a, target, a.move).dmg; return s / 300; };
  expect(avg(on)).toBeGreaterThan(avg(mark));
});
