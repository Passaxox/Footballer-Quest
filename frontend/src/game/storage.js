import { STARTER_IDS } from "./data";

const RUN_KEY = "inazuma_rogue_run";
const META_KEY = "inazuma_rogue_meta";

const defaultMeta = () => ({ unlocked: [...STARTER_IDS], records: [], runs: 0, bestWave: 0, sound: true });

export const loadMeta = () => {
  try { const m = JSON.parse(localStorage.getItem(META_KEY)); return m ? { ...defaultMeta(), ...m } : defaultMeta(); } catch { return defaultMeta(); }
};
export const saveMeta = (m) => localStorage.setItem(META_KEY, JSON.stringify(m));

export const loadRun = () => {
  try { return JSON.parse(localStorage.getItem(RUN_KEY)); } catch { return null; }
};
export const saveRun = (run) => (run ? localStorage.setItem(RUN_KEY, JSON.stringify(run)) : localStorage.removeItem(RUN_KEY));
export const clearRun = () => localStorage.removeItem(RUN_KEY);
