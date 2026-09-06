let ctx = null;
let enabled = true;

export const setSoundEnabled = (v) => { enabled = v; };

const getCtx = () => {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
};

const tone = (freq, dur, type = "square", vol = 0.08, when = 0) => {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur);
};

export const sfx = {
  select: () => tone(880, 0.06),
  confirm: () => { tone(660, 0.07); tone(990, 0.1, "square", 0.08, 0.07); },
  cancel: () => tone(220, 0.12, "sawtooth", 0.06),
  hit: () => { tone(200, 0.12, "sawtooth", 0.1); tone(120, 0.15, "square", 0.08, 0.05); },
  crit: () => { tone(300, 0.08, "sawtooth", 0.12); tone(150, 0.2, "square", 0.1, 0.06); tone(90, 0.25, "square", 0.08, 0.12); },
  heal: () => { tone(523, 0.08, "triangle"); tone(659, 0.08, "triangle", 0.08, 0.08); tone(784, 0.14, "triangle", 0.08, 0.16); },
  ko: () => { tone(400, 0.1, "square"); tone(300, 0.1, "square", 0.08, 0.1); tone(200, 0.2, "square", 0.08, 0.2); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, "square", 0.08, i * 0.12)); },
  lose: () => { [400, 350, 300, 200].forEach((f, i) => tone(f, 0.25, "sawtooth", 0.06, i * 0.2)); },
  levelup: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.1, "triangle", 0.08, i * 0.08)); },
  fusion: () => { [200, 300, 450, 600, 900, 1200].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, i * 0.07)); },
};
