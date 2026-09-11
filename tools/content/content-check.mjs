import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyTeamContent } from "./content-factory.mjs";
import { auditAssets, auditExitCode } from "../../frontend/scripts/asset-audit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const hashFile = async file => createHash("sha256").update(await readFile(file)).digest("hex");

export async function contentCheck() {
  const { report: generation, content } = await applyTeamContent({ check: true });
  const assetAudit = await auditAssets();
  const errors = [];
  if (content.reviewItems.length) errors.push(`Unresolved REVIEW items: ${content.reviewItems.map(item => item.versionId).join(", ")}`);
  if (auditExitCode(assetAudit)) errors.push(`Asset audit failed: ${JSON.stringify(assetAudit.summary)}`);
  const versionsById = new Map(content.versions.map(version => [version.versionId, version]));
  const movesById = new Map(content.moves.map(move => [move.moveId, move]));
  for (const version of content.versions) {
    if (!movesById.has(version.primaryMoveId)) errors.push(`Missing generated move for ${version.versionId}`);
    if (!content.provenanceExpectations.some(expected => expected.versionId === version.versionId && expected.spriteId === version.spriteId)) {
      errors.push(`Missing provenance linkage for ${version.versionId}`);
    }
  }
  for (const manifest of content.manifestVersionIds) {
    const scenario = content.scenarios.find(candidate => candidate.id === manifest.scenarioId);
    if (!scenario) {
      errors.push(`Missing generated scenario ${manifest.scenarioId}`);
      continue;
    }
    if (JSON.stringify([...scenario.allowedVersionIds].sort()) !== JSON.stringify([...manifest.versionIds].sort())) {
      errors.push(`Scenario membership mismatch for ${manifest.scenarioId}`);
    }
    for (const versionId of scenario.allowedVersionIds) {
      if (!versionsById.has(versionId)) errors.push(`Unknown generated scenario version ${versionId}`);
    }
  }
  const provenanceCache = new Map();
  for (const expected of content.provenanceExpectations) {
    if (!provenanceCache.has(expected.manifestId)) {
      const file = path.join(root, "tools/assets/runtime-provenance", `${expected.manifestId}.json`);
      provenanceCache.set(expected.manifestId, JSON.parse(await readFile(file, "utf8")));
    }
    const document = provenanceCache.get(expected.manifestId);
    const asset = document.assets?.find(row => row.versionId === expected.versionId);
    if (!asset) {
      errors.push(`Missing provenance for ${expected.versionId}`);
      continue;
    }
    if (path.basename(asset.runtimeSpritePath) !== `${expected.spriteId}.png`) errors.push(`Runtime sprite mismatch for ${expected.versionId}`);
    for (const key of ["verifiedSourcePath", "runtimeSpritePath"]) {
      try {
        const actual = await hashFile(path.join(root, asset[key]));
        if (actual !== asset.sha256) errors.push(`SHA mismatch for ${expected.versionId} ${key}`);
      } catch (error) {
        if (error?.code === "ENOENT") errors.push(`Missing provenance file for ${expected.versionId} ${key}`);
        else throw error;
      }
    }
  }
  const result = {
    schemaVersion: 1,
    status: errors.length ? "BLOCKED" : "PASS",
    generation,
    assets: assetAudit.summary,
    provenanceAssets: content.provenanceExpectations.length,
    errors
  };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  contentCheck().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
