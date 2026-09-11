import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createFetchPlan, runAssetFactory } from "../assets/asset-factory.mjs";
import { applyTeamContent } from "./content-factory.mjs";
import { contentCheck } from "./content-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function teamPipelinePaths(team) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(team)) throw new Error("team must be a lowercase kebab-case manifest id");
  return {
    contentManifestPath: path.join(root, "tools/content/manifests", `${team}.json`),
    assetManifestPath: path.join(root, "tools/assets/manifests", `${team}.json`),
    approvalsPath: path.join(root, "tools/assets/approvals", `${team}.approvals.json`),
    stagingRoot: path.join(root, "tools/assets/staging", team),
    fetchPlanPath: path.join(root, "tools/assets/reports", `${team}.fetch-plan.json`)
  };
}

async function assertMatchingManifests(paths, team) {
  const [content, asset] = await Promise.all([
    readFile(paths.contentManifestPath, "utf8").then(JSON.parse),
    readFile(paths.assetManifestPath, "utf8").then(JSON.parse)
  ]);
  if (content.manifestId !== team || asset.manifestId !== team) throw new Error(`Manifest id mismatch for ${team}`);
  const contentVersions = [...content.players.map(player => player.versionId)].sort();
  const assetVersions = [...asset.targets.map(target => target.versionId)].sort();
  if (JSON.stringify(contentVersions) !== JSON.stringify(assetVersions)) throw new Error(`Content/asset target mismatch for ${team}`);
}

export async function prepareTeam(team, { importCandidates = false } = {}) {
  const paths = teamPipelinePaths(team);
  await assertMatchingManifests(paths, team);
  const fetchPlan = await createFetchPlan({ manifestPath: paths.assetManifestPath });
  await writeFile(paths.fetchPlanPath, `${JSON.stringify(fetchPlan, null, 2)}\n`);
  const report = await runAssetFactory({
    manifestPath: paths.assetManifestPath,
    stagingRoot: paths.stagingRoot,
    approvalsPath: paths.approvalsPath,
    prepareApprovals: true,
    importCandidates
  });
  return { phase: "prepare", team, fetchPlanPath: path.relative(root, paths.fetchPlanPath), assetStatus: report.status, summary: report.summary };
}

export async function finalizeTeam(team) {
  const paths = teamPipelinePaths(team);
  await assertMatchingManifests(paths, team);
  const assets = await runAssetFactory({
    manifestPath: paths.assetManifestPath,
    stagingRoot: paths.stagingRoot,
    approvalsPath: paths.approvalsPath,
    completeApprovals: true
  });
  if (assets.summary.verifiedCount !== assets.summary.targetCount) {
    throw new Error(`Not all ${team} assets are explicitly approved`);
  }
  const content = await applyTeamContent();
  const check = await contentCheck();
  if (check.status !== "PASS") throw new Error(`Content check failed for ${team}`);
  return { phase: "finalize", team, assetStatus: assets.status, generatedChanged: content.report.changed, contentStatus: check.status };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({
      options: {
        team: { type: "string" },
        prepare: { type: "boolean" },
        finalize: { type: "boolean" },
        "import-candidates": { type: "boolean" }
      }
    });
    if (!values.team || Boolean(values.prepare) === Boolean(values.finalize)) {
      throw new Error("Usage: team-pipeline --team <manifest-id> (--prepare | --finalize) [--import-candidates]");
    }
    const result = values.prepare
      ? await prepareTeam(values.team, { importCandidates: Boolean(values["import-candidates"]) })
      : await finalizeTeam(values.team);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
