// Local production-build smoke/layout audit. Requires Playwright, optionally via
// PLAYWRIGHT_MODULE, and a server at FQ_PREVIEW_URL (default localhost:4194).
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const babel = require("@babel/core");
const base = path.resolve(__dirname, ".."), game = path.join(base, "src", "game");
const originalLoad = require.extensions[".js"];
require.extensions[".js"] = (module, filename) => {
  if (!filename.startsWith(game + path.sep)) return originalLoad(module, filename);
  module._compile(babel.transformSync(fs.readFileSync(filename, "utf8"), { filename, babelrc: false, configFile: false, plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")] }).code, filename);
};
const engine = require(path.join(game, "engine.js"));
const state = require(path.join(game, "overworldRunV2.js"));
const { STARTER_IDS } = require(path.join(game, "data.js"));
const actions = require(path.join(game, "overworldActionsV2.js"));
const fresh = () => engine.newRunV2(STARTER_IDS.slice(0, 3), 42);
function pending(type) {
  const run = fresh(), graph = state.graphForRunV2(run), node = graph.nodes.find(n => n.type === type && !n.boss), route = [];
  let current = node;
  while (current.wave > 1) { current = graph.nodes.find(n => n.next.includes(current.nodeId)); route.unshift(current.nodeId); }
  return engine.beginOverworldNode({ ...run, wave: node.wave, overworld: { ...run.overworld, completedWave: node.wave - 1, path: route } }, node.nodeId);
}
const fixtures = { hub: fresh(), battle: pending("battle"), shop: pending("shop"), recruit: pending("recruit"), training: pending("training"), event: pending("event") };
fixtures.forcedSwitch = JSON.parse(JSON.stringify(fixtures.battle));
fixtures.forcedSwitch.team[0].hp = 1;
fixtures.forcedSwitch.pending = { ...fixtures.forcedSwitch.pending, kind: "team", teamName: "Switch playtest", enemies: [engine.createPlayer("darren", 50)] };
const battle = fixtures.battle;
battle.pending = { ...battle.pending, kind: "team", teamName: "Playtest", enemies: [engine.createPlayer("darren", 1)] };
fixtures.reward = actions.resolveOverworldActionV2(battle, { ...state.actionTokenV2(battle), type: "battleResult", result: "win", team: battle.team, items: battle.items, activeUid: battle.activeUid });
const output = path.resolve(process.env.FQ_VIEWPORT_OUTPUT || path.join(base, "..", ".cache", "viewport"));
fs.mkdirSync(output, { recursive: true });
const findings = [], errors = [];
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.FQ_BROWSER_PATH ? { executablePath: process.env.FQ_BROWSER_PATH } : {}) });
  try {
    for (const [width, height] of [[320, 480], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      page.on("pageerror", error => errors.push(error.message));
      const url = process.env.FQ_PREVIEW_URL || "http://127.0.0.1:4194";
      await page.goto(url);
      const inset = async () => page.evaluate(() => {
        document.documentElement.style.setProperty("--safe-area-inset-bottom", "24px");
        document.documentElement.style.setProperty("--safe-area-inset-top", "24px");
      });
      const capture = async name => {
        await page.screenshot({ path: path.join(output, `${width}x${height}-${name}.png`), fullPage: true });
        const horizontal = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(horizontal, false, `${name} overflows horizontally at ${width}x${height}`);
      };
      const safe = async (id, anchored = false) => {
        const element = page.getByTestId(id); if (!anchored) await element.scrollIntoViewIfNeeded();
        const rect = await element.boundingBox(); assert(rect, `${id} missing`);
        assert(rect.y >= 0 && rect.y + rect.height <= height - 24 + 1, `${id} overlaps Android bottom inset: ${JSON.stringify(rect)}`);
        findings.push({ width, height, id, bottom: Math.round(rect.y + rect.height), safeBottom: height - 24, anchored });
      };
      await page.evaluate(() => localStorage.clear()); await page.reload(); await inset();
      await page.getByTestId("new-run-btn").click();
      assert.equal(await page.getByTestId("overworld-v2-opt-in").isChecked(), false);
      await safe("start-run-btn", true); await capture("selector");
      await page.getByTestId("overworld-v2-opt-in").check();
      for (const id of STARTER_IDS.slice(0, 3)) await page.getByTestId(`add-${id}`).click();
      await safe("start-run-btn", true); await capture("selector-ready");
      await page.getByTestId("start-run-btn").click(); await page.getByTestId("overworld-v2-hub").waitFor();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("inazuma_rogue_run")).overworld.revision), 2);
      for (const [name, run] of Object.entries(fixtures)) {
        await page.evaluate(snapshot => {
          localStorage.clear(); localStorage.setItem("inazuma_rogue_run", JSON.stringify(snapshot));
          localStorage.setItem("inazuma_rogue_meta", JSON.stringify({ sound: false }));
        }, run);
        await page.reload(); await inset(); await page.locator(".v2-shell").waitFor();
        if (name === "hub") { await safe("pause-run-btn", true); await safe("v2-team-btn", true); }
        if (name === "battle") {
          await page.getByTestId("pre-battle-keep").waitFor();
          for (const id of ["battle-speed", "pre-battle-keep", "pre-battle-change"]) await safe(id, true);
          for (const speed of [2, 3, 1]) {
            await page.getByTestId("battle-speed").click();
            assert.equal((await page.getByTestId("battle-speed").textContent()).trim(), `FAST x${speed}`);
          }
          await capture("pre-battle");
          await page.getByTestId("pre-battle-keep").click();
          for (const id of ["attack-button", "switch-button", "item-button", "flee-button"]) await safe(id, true);
          await page.getByTestId("switch-button").click(); await safe("switch-cancel", true);
          await page.getByTestId("switch-cancel").click(); await page.getByTestId("item-button").click(); await safe("items-cancel", true);
          await page.getByTestId("items-cancel").click();
        }
        if (name === "forcedSwitch") {
          // Make the exchange reproducible; this is a disposable browser profile.
          await page.evaluate(() => { Math.random = () => 0.5; });
          await page.getByTestId("pre-battle-keep").click(); await page.getByTestId("attack-button").click();
          await page.getByTestId("switch-player-btn-1").waitFor();
          assert.equal(await page.getByTestId("switch-cancel").count(), 0);
          await safe("switch-player-btn-1"); await capture("forced-switch-choice");
          await page.getByTestId("switch-player-btn-1").click(); await safe("attack-button", true);
        }
        if (name === "shop") await safe("shop-leave-btn");
        if (name === "recruit") await safe("recruit-skip-btn");
        if (name === "training") await safe("training-team-xp");
        if (name === "event") { await safe("event-choice-0"); await page.getByTestId("event-choice-0").click(); await safe("event-continue-btn"); }
        if (name === "reward") await safe("reward-skip");
        await capture(name);
      }
      await page.close();
    }
    assert.deepEqual(errors, [], "Browser page errors");
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify({ findings, errors }, null, 2));
    console.log(`PASS: ${findings.length} CTA checks; 2 viewports; top/bottom Android insets 24px; no horizontal overflow or page errors.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
