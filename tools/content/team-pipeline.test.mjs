import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { finalizeTeam, prepareTeam, teamPipelinePaths } from "./team-pipeline.mjs";

test("pipeline paths reject traversal and resolve matching team inputs", () => {
  assert.throws(() => teamPipelinePaths("../diamond-dust-ie2"), /kebab-case/);
  const paths = teamPipelinePaths("diamond-dust-ie2");
  assert.ok(paths.contentManifestPath.endsWith("tools\\content\\manifests\\diamond-dust-ie2.json"));
  assert.ok(paths.assetManifestPath.endsWith("tools\\assets\\manifests\\diamond-dust-ie2.json"));
});

test("prepare is safely resumable and preserves explicit approval decisions", async () => {
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
});
