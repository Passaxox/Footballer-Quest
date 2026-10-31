import { useEffect, useRef, useState } from "react";

const SPEED_KEY = "inazuma_rogue_battle_speed";
const loadSpeed = () => {
  try {
    const value = localStorage.getItem(SPEED_KEY);
    return ["1", "2", "3"].includes(value) ? Number(value) : 1;
  } catch { return 1; }
};

// Presentation only. Never reads RNG or writes run/meta storage.
export default function useBattlePace(manualMoment) {
  const [, render] = useState(0);
  const ref = useRef(null);
  if (!ref.current) ref.current = { speed: loadSpeed(), auto: false, hidden: false, alive: true, waits: new Set(), acknowledged: null };
  const state = ref.current;
  state.blocked = !!manualMoment && state.acknowledged !== manualMoment.id;
  const refresh = () => { if (state.alive) render(n => n + 1); };
  const stop = () => { state.auto = false; refresh(); };
  useEffect(() => {
    state.alive = true;
    const background = () => { state.hidden = true; state.auto = false; refresh(); };
    const foreground = () => { state.hidden = document.hidden; refresh(); };
    const visibility = () => document.hidden ? background() : foreground();
    window.addEventListener("blur", background);
    window.addEventListener("focus", foreground);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      state.alive = false; state.auto = false;
      window.removeEventListener("blur", background);
      window.removeEventListener("focus", foreground);
      document.removeEventListener("visibilitychange", visibility);
      for (const wait of state.waits) { clearTimeout(wait.timer); wait.resolve(false); }
      state.waits.clear();
    };
    // One controller per mounted battle, including StrictMode cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!state.blocked) for (const entry of state.waits) if (entry.ready) {
      state.waits.delete(entry); entry.resolve(state.alive);
    }
  });
  const wait = (ms, important = false) => new Promise(resolve => {
    if (!state.alive) { resolve(false); return; }
    const entry = { resolve, ready: false };
    entry.timer = setTimeout(() => {
      entry.ready = true;
      if (!state.blocked) { state.waits.delete(entry); resolve(state.alive); }
    }, ms / (important || state.blocked ? 1 : state.speed));
    state.waits.add(entry);
  });
  return { state, wait, stop,
    cycle: () => {
      state.speed = state.speed % 3 + 1;
      // Save only the explicit FAST choice, never temporary x1 overrides or AUTO.
      try { localStorage.setItem(SPEED_KEY, String(state.speed)); }
      catch { /* Storage may be denied/full; the current battle stays usable. */ }
      refresh();
    },
    toggle: () => { state.auto = !state.auto; refresh(); },
    acknowledge: () => {
      state.acknowledged = manualMoment.id; state.blocked = false;
      for (const entry of state.waits) if (entry.ready) { state.waits.delete(entry); entry.resolve(state.alive); }
      refresh();
    },
  };
}
