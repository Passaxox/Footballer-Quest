import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyTeamContent, deriveTeamContent, resolveTeamIdentities, validateTeamManifest } from "./content-factory.mjs";

const manifest = () => ({
  schemaVersion: 1,
  manifestId: "test-team-ie2",
  team: {
    teamId: "test-team",
    displayName: "Test Team",
    arcId: "alius",
    eraId: "original",
    gameOrigin: "ie2",
    tags: ["test-team"]
  },
  scenario: {
    id: "test-team-base",
    displayName: "Test Facility",
    locationType: "facility",
    minTier: 2,
    waveFrom: 8
  },
  players: [{
    canonicalCharacterId: "known",
    aliases: ["Known Localized", "Known Canon"],
    expectedIdentity: "reuse",
    versionId: "known:test-team-ie2",
    displayName: "Known Localized",
    role: "C",
    element: "aria",
    spriteTargetId: "known-test-team-ie2",
    encounterTier: 2,
    baseStats: { hp: 70, atk: 30, def: 30, spd: 35 },
    primaryMove: { name: "Test Move", power: 60, effect: "weaken" },
    evidenceStatus: "VERIFIED",
    identityEvidence: [{
      sourceType: "url",
      reference: "https://example.invalid/known",
      claims: ["canonical-identity", "aliases", "team-membership", "game-origin"],
      notes: "Test evidence."
    }],
    assetStatus: "ASSET-VERIFIED",
    provenanceManifestId: "test-assets"
  }]
});

test("team manifest derives identity, version, move and isolated scenario data", () => {
  const input = manifest();
  assert.equal(validateTeamManifest(input), input);
  const result = deriveTeamContent([input], [{ characterId: "known", displayName: "Known Canon" }]);
  assert.deepEqual(result.characters, []);
  assert.equal(result.identityDecisions[0].status, "REUSED");
  assert.equal(result.versions[0].characterId, "known");
  assert.equal(result.moves[0].moveId, "known:test-team-ie2:primary");
  assert.deepEqual(result.scenarios[0].allowedVersionIds, ["known:test-team-ie2"]);
  assert.deepEqual(result.scenarios[0].allowedTeamTags, ["test-team"]);
});

test("alias matching reuses one character and ambiguous aliases remain REVIEW", () => {
  const input = manifest();
  input.players[0].canonicalCharacterId = "localized-id";
  assert.equal(resolveTeamIdentities([input], [{ characterId: "known", displayName: "Known Canon" }])[0].characterId, "known");
  const result = deriveTeamContent([input], [
    { characterId: "known", displayName: "Known Canon" },
    { characterId: "other", displayName: "Known Localized" }
  ]);
  assert.equal(result.identityDecisions[0].status, "REVIEW");
  assert.deepEqual(result.versions, []);
  assert.equal(result.reviewItems[0].identityStatus, "REVIEW");
});

test("exact canonical id remains strongest when aliases overlap", () => {
  const input = manifest();
  const decision = resolveTeamIdentities([input], [
    { characterId: "known", displayName: "Known Canon" },
    { characterId: "other", displayName: "Known Localized" }
  ])[0];
  assert.equal(decision.status, "REUSED");
  assert.equal(decision.characterId, "known");
});

test("VERIFIED identity evidence is mandatory and complete", () => {
  const missing = manifest();
  delete missing.players[0].identityEvidence;
  assert.throws(() => validateTeamManifest(missing), /missing identityEvidence/);
  const incomplete = manifest();
  incomplete.players[0].identityEvidence[0].claims = ["canonical-identity"];
  assert.throws(() => validateTeamManifest(incomplete), /Incomplete identity evidence/);
  const valid = manifest();
  assert.equal(validateTeamManifest(valid), valid);
});

test("duplicate new canonical ids and identity expectation mismatches are blocked", () => {
  const duplicated = manifest();
  duplicated.players[0].canonicalCharacterId = "new-person";
  duplicated.players[0].expectedIdentity = "new";
  duplicated.players.push({
    ...structuredClone(duplicated.players[0]),
    versionId: "new-person:other-team",
    displayName: "Another Form"
  });
  assert.throws(() => resolveTeamIdentities([duplicated], []), /Duplicate new canonical identity/);
  const mismatch = manifest();
  mismatch.players[0].expectedIdentity = "new";
  assert.throws(() => resolveTeamIdentities([mismatch], [{ characterId: "known", displayName: "Known Canon" }]), /Identity expectation mismatch/);
});

test("duplicate team and scenario ids are blocked", () => {
  const first = manifest();
  const duplicateTeam = structuredClone(first);
  duplicateTeam.manifestId = "other-manifest";
  duplicateTeam.scenario.id = "other-scenario";
  duplicateTeam.players[0].versionId = "known:other";
  assert.throws(() => deriveTeamContent([first, duplicateTeam], [{ characterId: "known", displayName: "Known Canon" }]), /teamId/);
  duplicateTeam.team.teamId = "other-team";
  duplicateTeam.team.tags = ["other-team"];
  duplicateTeam.scenario.id = first.scenario.id;
  assert.throws(() => deriveTeamContent([first, duplicateTeam], [{ characterId: "known", displayName: "Known Canon" }]), /scenario id/);
});

test("unverified evidence and assets never enter runtime output", () => {
  const input = manifest();
  input.players[0].evidenceStatus = "REVIEW";
  const result = deriveTeamContent([input], [{ characterId: "known", displayName: "Known Canon" }]);
  assert.deepEqual(result.versions, []);
  assert.deepEqual(result.scenarios[0].allowedVersionIds, []);
});

test("content application is deterministic and idempotent", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "fq-content-"));
  try {
    const manifestsRoot = path.join(directory, "manifests");
    const outputPath = path.join(directory, "generated.js");
    const reportPath = path.join(directory, "report.json");
    await mkdir(manifestsRoot);
    await writeFile(path.join(manifestsRoot, "team.json"), `${JSON.stringify(manifest(), null, 2)}\n`);
    const options = {
      manifestsRoot,
      outputPath,
      reportPath,
      existingCharacters: [{ characterId: "known", displayName: "Known Canon" }]
    };
    const first = await applyTeamContent(options);
    const generated = await readFile(outputPath, "utf8");
    const second = await applyTeamContent(options);
    assert.equal(first.report.changed, true);
    assert.equal(second.report.changed, false);
    assert.equal(await readFile(outputPath, "utf8"), generated);
    await applyTeamContent({ ...options, check: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
