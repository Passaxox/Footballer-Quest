process.env.BABEL_ENV = "test";
process.env.NODE_ENV = "test";

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const babel = require("@babel/core");
const gameRoot = path.resolve(__dirname, "../src/game") + path.sep;
const defaultLoader = Module._extensions[".js"];
Module._extensions[".js"] = (module, filename) => {
  if (!filename.startsWith(gameRoot)) return defaultLoader(module, filename);
  const source = fs.readFileSync(filename, "utf8");
  const transformed = babel.transformSync(source, {
    filename,
    presets: [require.resolve("babel-preset-react-app")],
    babelrc: false,
    configFile: false,
  });
  module._compile(transformed.code, filename);
};

const { simulateRunVariety } = require("../src/game/varietySimulation");
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ["beta-01", "beta-02", "beta-03", "beta-04", "beta-05", "beta-06", "beta-07", "beta-08"];
const reports = simulateRunVariety(seeds);
const summary = reports.map(report => ({
  seed: report.seed,
  eventCount: report.events.length,
  eventSequence: report.events,
  eventRarity: report.eventRarity,
  scenarios: report.scenarios,
  scenarioSequence: report.scenarioSequence,
  nodeSequence: report.nodeSequence,
  bosses: report.bosses,
  rarity: report.rarity,
  versions: report.versions,
  recruitOpportunities: report.recruitOpportunities,
  repeatedEvents: report.repeatedEvents,
}));

console.log(JSON.stringify({ schemaVersion: 1, wavesPerSeed: 30, runs: summary }, null, 2));
