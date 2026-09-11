import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeTeam, prepareTeam, teamPipelinePaths } from "./team-pipeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pipelineArtifacts = [
  "tools/assets/approvals/diamond-dust-ie2.approvals.json",
  "tools/assets/reports/diamond-dust-ie2.contact-sheet.html",
  "tools/assets/reports/diamond-dust-ie2.fetch-plan.json",
  "tools/assets/reports/diamond-dust-ie2.report.json",
  "tools/assets/reports/diamond-dust-ie2.report.md",
  "tools/assets/runtime-provenance/diamond-dust-ie2.json",
  "frontend/src/game/teamContent.generated.js",
  "tools/content/content-report.json"
].map(file => path.join(root, file));

async function snapshotArtifacts() {
  return Promise.all(pipelineArtifacts.map(async file => {
    try {
      return await readFile(file);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }));
}

async function restoreArtifacts(snapshot) {
  await Promise.all(pipelineArtifacts.map((file, index) => (
    snapshot[index] === null
      ? rm(file, { force: true })
      : writeFile(file, snapshot[index])
  )));
}

test("pipeline paths reject traversal and resolve matching team inputs", () => {
  assert.throws(() => teamPipelinePaths("../diamond-dust-ie2"), /kebab-case/);
  const paths = teamPipelinePaths("diamond-dust-ie2");
  assert.ok(paths.contentManifestPath.endsWith("tools\\content\\manifests\\diamond-dust-ie2.json"));
  assert.ok(paths.assetManifestPath.endsWith("tools\\assets\\manifests\\diamond-dust-ie2.json"));
});

test("prepare is safely resumable and preserves explicit approval decisions", async () => {
  const artifactSnapshot = await snapshotArtifacts();
  try {
    const before = JSON.parse(await readFile(teamPipelinePaths("diamond-dust-ie2").approvalsPath, "utf8"));
    const first = await prepareTeam("diamond-dust-ie2");
    const second = await prepareTeam("diamond-dust-ie2");
    const after = JSON.parse(await readFile(teamPipelinePaths("diamond-dust-ie2").approvalsPath, "utf8"));
    assert.equal(first.assetStatus, "PASS");
    assert.deepEqual(second, first);
    assert.deepEqual(after, before);
    assert.ok(after.approvals.every(approval => approval.decision === "ASSET-VERIFIED" && approval.sha256));
    const finalized = await finalizeTeam("diamond-dust-ie2");
    assert.equal(finalized.assetStatus, "PASS");
    assert.equal(finalized.contentStatus, "PASS");
  } finally {
    await restoreArtifacts(artifactSnapshot);
  }
  assert.deepEqual(await snapshotArtifacts(), artifactSnapshot);
});
