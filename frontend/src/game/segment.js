// Segment model and boundary calculations for Footballer Quest Run Structure 2.0.
import { getRouteById } from "./routeChoices";

export const MAJOR_BOSS_WAVES = [10, 20, 30, 40, 50];

export function computeSegmentLength(wave, lengthRange = [3, 4], rng = Math.random) {
  const [minL, maxL] = lengthRange;
  let rawLen = minL + Math.floor(rng() * (maxL - minL + 1));

  // Align seamlessly with major boss waves
  const nextBoss = MAJOR_BOSS_WAVES.find(w => w >= wave);
  if (nextBoss) {
    const stepsToBoss = nextBoss - wave + 1;
    if (stepsToBoss <= 5 && stepsToBoss >= 2) {
      // Natural snap to the boss wave as segment terminal
      rawLen = stepsToBoss;
    } else if (stepsToBoss < 2) {
      rawLen = 1;
    } else if (rawLen >= stepsToBoss) {
      // Do not overshoot the boss
      rawLen = Math.max(2, stepsToBoss - 2);
    }
  }

  return Math.max(1, Math.min(5, rawLen));
}

export function createSegment(run, routeChoiceOrId = "area-metropolitana", rng = Math.random) {
  const route = typeof routeChoiceOrId === "object" ? routeChoiceOrId : getRouteById(routeChoiceOrId);
  const wave = run?.wave || 1;
  const length = computeSegmentLength(wave, route.segmentLengthRange || [3, 4], rng);
  const targetCheckpointWave = wave + length - 1;
  const checkpointType = MAJOR_BOSS_WAVES.includes(targetCheckpointWave) ? "boss" : "miniboss";

  return {
    segmentIndex: (run?.segmentState?.segmentIndex || 0) + 1,
    step: 1,
    length,
    checkpointType,
    routeId: route.id,
    theme: route.theme,
    routeTitle: route.name,
    routeDescription: route.description,
    tendency: route.tendency,
    risk: route.risk,
    routeBiases: route.archetypeWeights || {},
    prestigeMultiplier: route.prestigeMultiplier || 1,
    startedAtWave: wave,
    targetCheckpointWave,
  };
}

export function isSegmentCheckpoint(segmentState) {
  if (!segmentState) return false;
  return segmentState.step >= segmentState.length;
}

export function normalizeSegmentState(segmentState, wave = 1) {
  if (!segmentState) {
    const nextBoss = MAJOR_BOSS_WAVES.find(w => w >= wave) || 50;
    const dist = nextBoss - wave + 1;
    const segLen = Math.min(3, Math.max(1, dist));
    const stepInThree = ((wave - 1) % 3) + 1;
    const segStep = Math.min(stepInThree, segLen);

    return {
      segmentIndex: Math.max(1, Math.ceil(wave / 3)),
      step: segStep,
      length: segLen,
      checkpointType: MAJOR_BOSS_WAVES.includes(wave + segLen - segStep) ? "boss" : "miniboss",
      routeId: "area-metropolitana",
      theme: "area-metropolitana",
      routeTitle: "Area Metropolitana",
      routeDescription: "Percorso bilanciato tra sfide cittadine.",
      tendency: "Percorso Bilanciato",
      risk: "medio",
      routeBiases: {},
      prestigeMultiplier: 1,
      startedAtWave: Math.max(1, wave - (segStep - 1)),
      targetCheckpointWave: wave + (segLen - segStep),
    };
  }

  const length = Math.max(1, Math.min(5, Number(segmentState.length) || 3));
  const step = Math.max(1, Math.min(length, Number(segmentState.step) || 1));
  const segmentIndex = Math.max(1, Number(segmentState.segmentIndex) || 1);

  return {
    ...segmentState,
    segmentIndex,
    step,
    length,
    checkpointType: segmentState.checkpointType || (MAJOR_BOSS_WAVES.includes(wave + length - step) ? "boss" : "miniboss"),
    routeId: segmentState.routeId || "area-metropolitana",
    theme: segmentState.theme || "area-metropolitana",
    routeTitle: segmentState.routeTitle || "Area Metropolitana",
    routeDescription: segmentState.routeDescription || "Percorso ordinario.",
    tendency: segmentState.tendency || "Bilanciato",
    risk: segmentState.risk || "medio",
    routeBiases: segmentState.routeBiases && typeof segmentState.routeBiases === "object" ? segmentState.routeBiases : {},
    prestigeMultiplier: Number(segmentState.prestigeMultiplier) || 1,
    startedAtWave: Number(segmentState.startedAtWave) || wave,
    targetCheckpointWave: Number(segmentState.targetCheckpointWave) || (wave + length - step),
  };
}
