import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultManifestsRoot = path.join(root, "tools/content/manifests");
const defaultOutputPath = path.join(root, "frontend/src/game/teamContent.generated.js");
const defaultReportPath = path.join(root, "tools/content/content-report.json");
const roles = new Set(["P", "D", "C", "A"]);
const elements = new Set(["fuoco", "aria", "terra", "natura"]);
const locations = new Set(["field", "city", "facility", "hq", "stadium", "special", "generic"]);
const identityClaims = new Set(["canonical-identity", "aliases", "team-membership", "game-origin"]);
const evidenceSourceTypes = new Set(["url", "repository"]);

const normalizeIdentity = value => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "");

const uniqueBy = (rows, key, label) => {
  const seen = new Set();
  for (const row of rows) {
    if (!row?.[key] || seen.has(row[key])) throw new Error(`Duplicate or invalid ${label}: ${row?.[key] ?? ""}`);
    seen.add(row[key]);
  }
};

function validateIdentityEvidence(player) {
  if (!Array.isArray(player.identityEvidence) || !player.identityEvidence.length) {
    throw new Error(`VERIFIED player ${player.versionId} missing identityEvidence`);
  }
  const coveredClaims = new Set();
  for (const evidence of player.identityEvidence) {
    if (!evidence || !evidenceSourceTypes.has(evidence.sourceType)) {
      throw new Error(`Invalid identity evidence sourceType: ${player.versionId}`);
    }
    if (typeof evidence.reference !== "string" || !evidence.reference.trim()) {
      throw new Error(`Invalid identity evidence reference: ${player.versionId}`);
    }
    if (!Array.isArray(evidence.claims) || !evidence.claims.length || evidence.claims.some(claim => !identityClaims.has(claim))) {
      throw new Error(`Invalid identity evidence claims: ${player.versionId}`);
    }
    evidence.claims.forEach(claim => coveredClaims.add(claim));
    if (evidence.notes != null && (typeof evidence.notes !== "string" || !evidence.notes.trim())) {
      throw new Error(`Invalid identity evidence notes: ${player.versionId}`);
    }
  }
  const missing = [...identityClaims].filter(claim => !coveredClaims.has(claim));
  if (missing.length) throw new Error(`Incomplete identity evidence for ${player.versionId}: ${missing.join(", ")}`);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function walkJson(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(target);
    }
  }
  await walk(directory);
  return files;
}

export function validateTeamManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1) throw new Error("Unsupported team manifest schemaVersion");
  if (!manifest.manifestId || typeof manifest.manifestId !== "string") throw new Error("manifestId is required");
  const team = manifest.team;
  for (const key of ["teamId", "displayName", "arcId", "eraId", "gameOrigin"]) {
    if (!team?.[key] || typeof team[key] !== "string") throw new Error(`Team missing ${key}`);
  }
  if (!Array.isArray(team.tags) || !team.tags.includes(team.teamId) || new Set(team.tags).size !== team.tags.length) {
    throw new Error(`Team ${team.teamId} must have unique tags including teamId`);
  }
  const scenario = manifest.scenario;
  for (const key of ["id", "displayName", "locationType"]) {
    if (!scenario?.[key] || typeof scenario[key] !== "string") throw new Error(`Scenario missing ${key}`);
  }
  if (!locations.has(scenario.locationType)) throw new Error(`Invalid scenario locationType: ${scenario.locationType}`);
  if (!Number.isInteger(scenario.minTier) || scenario.minTier < 1 || !Number.isInteger(scenario.waveFrom) || scenario.waveFrom < 1) {
    throw new Error(`Invalid scenario gates: ${scenario.id}`);
  }
  if (!Array.isArray(manifest.players) || manifest.players.length < 1) throw new Error("players[] is required");
  uniqueBy(manifest.players, "versionId", "versionId");
  for (const player of manifest.players) {
    for (const key of ["canonicalCharacterId", "versionId", "displayName", "spriteTargetId", "evidenceStatus", "assetStatus"]) {
      if (!player[key] || typeof player[key] !== "string") throw new Error(`Player ${player.versionId ?? "unknown"} missing ${key}`);
    }
    if (!["reuse", "new"].includes(player.expectedIdentity)) throw new Error(`Invalid expectedIdentity: ${player.versionId}`);
    if (!Array.isArray(player.aliases) || !player.aliases.length) throw new Error(`Aliases required: ${player.versionId}`);
    if (!roles.has(player.role) || !elements.has(player.element)) throw new Error(`Invalid role/element: ${player.versionId}`);
    if (!Number.isInteger(player.encounterTier) || player.encounterTier < scenario.minTier) throw new Error(`Invalid encounterTier: ${player.versionId}`);
    if (!["VERIFIED", "REVIEW"].includes(player.evidenceStatus)) throw new Error(`Invalid evidenceStatus: ${player.versionId}`);
    if (player.evidenceStatus === "VERIFIED") validateIdentityEvidence(player);
    if (!["ASSET-VERIFIED", "REVIEW", "MISSING"].includes(player.assetStatus)) throw new Error(`Invalid assetStatus: ${player.versionId}`);
    if (!player.provenanceManifestId) throw new Error(`Missing provenanceManifestId: ${player.versionId}`);
    if (!player.baseStats || !["hp", "atk", "def", "spd"].every(key => Number.isFinite(player.baseStats[key]) && player.baseStats[key] > 0)) {
      throw new Error(`Invalid baseStats: ${player.versionId}`);
    }
    if (!player.primaryMove?.name || !Number.isFinite(player.primaryMove.power) || player.primaryMove.power <= 0) {
      throw new Error(`Invalid primaryMove: ${player.versionId}`);
    }
  }
  return manifest;
}

export function resolveTeamIdentities(manifests, existingCharacters = []) {
  const existing = existingCharacters.map(character => ({
    ...character,
    names: new Set([character.characterId, character.displayName, ...(character.aliases ?? [])].map(normalizeIdentity).filter(Boolean))
  }));
  const requestedNew = new Set();
  const decisions = [];
  for (const manifest of manifests) {
    for (const player of manifest.players) {
      if (player.expectedIdentity === "new" && requestedNew.has(player.canonicalCharacterId)) {
        throw new Error(`Duplicate new canonical identity: ${player.canonicalCharacterId}`);
      }
      const names = new Set([player.canonicalCharacterId, player.displayName, ...player.aliases].map(normalizeIdentity).filter(Boolean));
      const idMatch = existing.find(character => character.characterId === player.canonicalCharacterId);
      const aliasMatches = existing.filter(character => [...names].some(name => character.names.has(name)));
      const matches = idMatch ? [idMatch] : aliasMatches;
      let status;
      let characterId;
      if (matches.length === 1) {
        status = "REUSED";
        characterId = matches[0].characterId;
      } else if (matches.length > 1) {
        status = "REVIEW";
      } else {
        status = "NEW";
        characterId = player.canonicalCharacterId;
      }
      if (status !== "REVIEW" && player.expectedIdentity !== status.toLowerCase().replace("reused", "reuse")) {
        throw new Error(`Identity expectation mismatch for ${player.versionId}: expected ${player.expectedIdentity}, resolved ${status}`);
      }
      if (status === "NEW") {
        requestedNew.add(characterId);
        existing.push({ characterId, displayName: player.displayName, names });
      }
      decisions.push({ manifestId: manifest.manifestId, versionId: player.versionId, requestedCharacterId: player.canonicalCharacterId, characterId: characterId ?? null, status, matches: matches.map(match => match.characterId) });
    }
  }
  return decisions;
}

function scenarioFromManifest(manifest, versionIds) {
  const scenario = manifest.scenario;
  return {
    id: scenario.id,
    displayName: scenario.displayName,
    macroScenarioId: scenario.macroScenarioId ?? null,
    areaId: scenario.areaId ?? null,
    locationType: scenario.locationType,
    minTier: scenario.minTier,
    arcId: manifest.team.arcId,
    eraId: manifest.team.eraId,
    allowedTeamTags: [...manifest.team.tags],
    preferredTeamTags: [...manifest.team.tags],
    excludedTeamTags: [],
    allowedVersionIds: versionIds,
    encounterPool: { baseWeight: 1, preferredWeight: 3, versionWeights: {} },
    eventPool: null,
    bossPool: null,
    managerPool: null,
    presentationProfile: null,
    weight: scenario.weight ?? 1,
    availability: true,
    waveRange: { from: scenario.waveFrom, to: scenario.waveTo ?? null }
  };
}

export function deriveTeamContent(manifests, existingCharacters = []) {
  manifests.forEach(validateTeamManifest);
  uniqueBy(manifests, "manifestId", "manifestId");
  uniqueBy(manifests.map(manifest => manifest.team), "teamId", "teamId");
  uniqueBy(manifests.map(manifest => manifest.scenario), "id", "scenario id");
  const decisions = resolveTeamIdentities(manifests, existingCharacters);
  const decisionByVersion = new Map(decisions.map(decision => [decision.versionId, decision]));
  const characters = [];
  const versions = [];
  const moves = [];
  const scenarios = [];
  const provenanceExpectations = [];
  const reviewItems = [];
  for (const manifest of manifests) {
    const appliedVersionIds = [];
    for (const player of manifest.players) {
      const decision = decisionByVersion.get(player.versionId);
      if (decision.status === "REVIEW" || player.evidenceStatus !== "VERIFIED" || player.assetStatus !== "ASSET-VERIFIED") {
        reviewItems.push({
          manifestId: manifest.manifestId,
          versionId: player.versionId,
          identityStatus: decision.status,
          evidenceStatus: player.evidenceStatus,
          assetStatus: player.assetStatus
        });
        continue;
      }
      if (decision.status === "NEW" && !characters.some(character => character.characterId === decision.characterId)) {
        characters.push({ characterId: decision.characterId, displayName: player.displayName, aliases: [...player.aliases] });
      }
      const primaryMoveId = `${player.versionId}:primary`;
      versions.push({
        versionId: player.versionId,
        characterId: decision.characterId,
        legacyRosterId: null,
        displayName: player.displayName,
        kind: "player",
        role: player.role,
        gender: player.gender ?? null,
        spriteId: player.spriteTargetId,
        teamTags: [...manifest.team.tags],
        element: player.element,
        types: [player.element],
        baseStats: { ...player.baseStats },
        primaryMoveId,
        secondaryMoveId: null,
        rarityId: player.rarityId ?? null,
        variantId: player.variantId ?? manifest.manifestId,
        categoryId: null,
        arcId: manifest.team.arcId,
        eraId: manifest.team.eraId,
        gameOrigin: manifest.team.gameOrigin,
        encounterTier: player.encounterTier
      });
      moves.push({ moveId: primaryMoveId, element: player.element, ...player.primaryMove });
      provenanceExpectations.push({ versionId: player.versionId, spriteId: player.spriteTargetId, manifestId: player.provenanceManifestId });
      appliedVersionIds.push(player.versionId);
    }
    scenarios.push(scenarioFromManifest(manifest, appliedVersionIds));
  }
  uniqueBy(characters, "characterId", "generated characterId");
  uniqueBy(versions, "versionId", "generated versionId");
  uniqueBy(moves, "moveId", "generated moveId");
  return {
    teams: manifests.map(manifest => ({ teamId: manifest.team.teamId, displayName: manifest.team.displayName })),
    characters,
    versions,
    moves,
    scenarios,
    provenanceExpectations,
    manifestVersionIds: manifests.map(manifest => ({
      manifestId: manifest.manifestId,
      scenarioId: manifest.scenario.id,
      versionIds: manifest.players.filter(player => decisionByVersion.get(player.versionId)?.status !== "REVIEW"
        && player.evidenceStatus === "VERIFIED" && player.assetStatus === "ASSET-VERIFIED").map(player => player.versionId)
    })),
    reviewItems,
    identityDecisions: decisions
  };
}

function renderGenerated(content) {
  const value = key => JSON.stringify(content[key], null, 2);
  return `// Generated by tools/content/content-factory.mjs. Do not edit manually.\n`
    + `export const GENERATED_TEAMS = ${value("teams")};\n`
    + `export const GENERATED_CHARACTERS = ${value("characters")};\n`
    + `export const GENERATED_VERSIONS = ${value("versions")};\n`
    + `export const GENERATED_MOVES = ${value("moves")};\n`
    + `export const GENERATED_SCENARIOS = ${value("scenarios")};\n`
    + `export const GENERATED_PROVENANCE_EXPECTATIONS = ${value("provenanceExpectations")};\n`;
}

async function loadExistingCharacters() {
  const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const dataSource = await readFile(path.join(root, "frontend/src/game/data.js"), "utf8");
  const expansionSource = await readFile(path.join(root, "frontend/src/game/catalogExpansion.js"), "utf8");
  const data = await import(asUrl(dataSource));
  const expansion = await import(asUrl(expansionSource));
  return [
    ...data.ROSTER.map(row => ({ characterId: row.id, displayName: row.name })),
    ...expansion.EXPANSION_CHARACTERS
  ];
}

export async function applyTeamContent({
  manifestsRoot = defaultManifestsRoot,
  outputPath = defaultOutputPath,
  reportPath = defaultReportPath,
  existingCharacters,
  check = false
} = {}) {
  const files = await walkJson(manifestsRoot);
  const manifests = await Promise.all(files.map(readJson));
  const content = deriveTeamContent(manifests, existingCharacters ?? await loadExistingCharacters());
  const generated = renderGenerated(content);
  let current = null;
  try { current = await readFile(outputPath, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const changed = current !== generated;
  if (check && changed) throw new Error("Generated team content is stale; run content-factory --apply");
  if (!check && changed) await writeFile(outputPath, generated);
  const report = {
    schemaVersion: 1,
    status: "PASS",
    changed,
    manifestCount: manifests.length,
    teamCount: content.teams.length,
    characterCount: content.characters.length,
    versionCount: content.versions.length,
    moveCount: content.moves.length,
    scenarioCount: content.scenarios.length,
    reviewCount: content.reviewItems.length,
    reviewItems: content.reviewItems,
    identityDecisions: content.identityDecisions,
    manifestVersionIds: content.manifestVersionIds,
    manifests: files.map(file => path.relative(root, file).split(path.sep).join("/"))
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, content };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { apply: { type: "boolean" }, check: { type: "boolean" }, manifests: { type: "string" }, output: { type: "string" }, report: { type: "string" } } });
    if (values.apply && values.check) throw new Error("--apply and --check are mutually exclusive");
    const result = await applyTeamContent({
      manifestsRoot: values.manifests ? path.resolve(values.manifests) : defaultManifestsRoot,
      outputPath: values.output ? path.resolve(values.output) : defaultOutputPath,
      reportPath: values.report ? path.resolve(values.report) : defaultReportPath,
      check: Boolean(values.check)
    });
    console.log(JSON.stringify(result.report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
