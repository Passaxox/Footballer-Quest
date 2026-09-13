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
const defaultSeeds = [
  "seed-01-alps", "seed-02-alius", "seed-03-raimon", "seed-04-royal",
  "seed-05-zeus", "seed-06-snow", "seed-07-flame", "seed-08-gemini",
  "seed-09-chaos", "seed-10-genesis", "seed-11-ocean", "seed-12-storm",
  "seed-13-glacier", "seed-14-crater", "seed-15-lab", "seed-16-stadium",
  "seed-17-metropolis", "seed-18-frontier", "seed-19-wild", "seed-20-trio",
  "seed-21-epsilon", "seed-22-prominence", "seed-23-diamond", "seed-24-champion",
];
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : defaultSeeds;
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
  minibosses: report.minibosses,
  routes: report.routes,
  rarity: report.rarity,
  versions: report.versions,
  recruitOpportunities: report.recruitOpportunities,
  repeatedEvents: report.repeatedEvents,
}));

console.log(JSON.stringify({ schemaVersion: 2, wavesPerSeed: 30, seedsSimulated: seeds.length, runs: summary }, null, 2));
