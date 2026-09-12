import { RUN_EVENTS } from "./events";
import { advanceRunWave, applyRunEventOutcome, chooseRunEvent, generateWave, newRun } from "./engine";
import { rarityIdForVersion } from "./rarity";
import { resolveVersion } from "./catalog";

export function simulateRunVariety(seeds, waves = 30, starterIds = ["mark", "axel", "jude"]) {
  return seeds.map(seed => {
    let run = newRun(starterIds, "normal", seed);
    const report = { seed, events: [], eventRarity: {}, scenarios: {}, scenarioSequence: [], nodeSequence: [], bosses: [], rarity: {}, versions: {}, recruitOpportunities: 0, repeatedEvents: [] };
    for (let wave = 1; wave <= waves; wave += 1) {
      run = { ...run, wave, pending: null };
      const generated = generateWave(run);
      const { scenarioState, rngState, rngCounter, seed: stableSeed, ...pending } = generated;
      run = { ...run, scenarioState, rngState, rngCounter, seed: stableSeed, pending };
      report.scenarios[scenarioState.id] = (report.scenarios[scenarioState.id] || 0) + 1;
      report.scenarioSequence.push(scenarioState.id);
      report.nodeSequence.push(pending.nodeArchetype || pending.kind || pending.type);
      if (pending.kind === "boss") report.bosses.push({ wave, team: pending.teamName });
      if (pending.type === "event") {
        report.events.push(pending.eventId);
        const event = RUN_EVENTS.find(candidate => candidate.eventId === pending.eventId);
        report.eventRarity[event.rarity] = (report.eventRarity[event.rarity] || 0) + 1;
        run = chooseRunEvent(run, event, 0);
        run = applyRunEventOutcome(run, event, run.pending.result);
        if (run.pending.type === "recruit") report.recruitOpportunities += 1;
      } else if (pending.type === "recruit") {
        report.recruitOpportunities += 1;
      }
      for (const enemy of pending.enemies || []) {
        const rarity = rarityIdForVersion(resolveVersion(enemy.versionId || enemy.baseId));
        report.rarity[rarity] = (report.rarity[rarity] || 0) + 1;
        report.versions[enemy.versionId] = (report.versions[enemy.versionId] || 0) + 1;
      }
      run = advanceRunWave({ ...run, pending: null });
    }
    report.repeatedEvents = [...new Set(report.events.filter((id, index) => report.events.indexOf(id) !== index))];
    return report;
  });
}
