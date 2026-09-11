const UINT32 = 0x100000000;

export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x6d2b79f5;
}

export const createRunSeed = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * UINT32).toString(36)}`;

export function normalizeRandomState(run) {
  const seed = String(run?.seed || `${run?.startedAt || 0}-${run?.team?.map(player => player.versionId || player.baseId).join("-") || "legacy"}`);
  return {
    seed,
    rngState: Number.isInteger(run?.rngState) ? run.rngState >>> 0 : hashSeed(seed),
    rngCounter: Number.isInteger(run?.rngCounter) && run.rngCounter >= 0 ? run.rngCounter : 0,
  };
}

export function nextSeeded(state) {
  let value = state >>> 0;
  value += 0x6d2b79f5;
  let mixed = value;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { state: value >>> 0, value: ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32 };
}

export function createRunRandomCursor(run) {
  const normalized = normalizeRandomState(run);
  let state = normalized.rngState;
  let counter = normalized.rngCounter;
  return {
    seed: normalized.seed,
    next() {
      const draw = nextSeeded(state);
      state = draw.state;
      counter += 1;
      return draw.value;
    },
    patch() {
      return { seed: normalized.seed, rngState: state, rngCounter: counter };
    },
    uid(prefix = "player") {
      return `${prefix}-${normalized.seed}-${counter}-${Math.floor(this.next() * UINT32).toString(36)}`;
    },
  };
}
