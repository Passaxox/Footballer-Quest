import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// Test-only evidence boundary. Never imported by the runtime catalog or save path.
export const G2_COMMIT = "44065604a65cc287a20ae0b56d340e69d6c0cccf";
export const G2_AUDIT_SHA256 = "dcbe293aa3de3663df711bc83bcbe10c362b36d138d2ab833df843c8bc2ea065";
const auditPath = "frontend/tests/fixtures/catalog-identity-audit.json";
const approval = { authority: "Product Owner", status: "approved", basis: "Final human visual audit and explicit approval of the existing portrait rotation." };
const approved = {
  sam: { source: "steve", historicalHash: "ebf74578528fba54163bd15831cb92e92235223efbca685f86cb1e7ddd57e4d7", displayName: "Sam Kincaid", canonicalCharacter: "Shishido Sakichi", spriteObservation: "orange hair" },
  steve: { source: "tim", historicalHash: "9fb2690f0ab8cc4e921ce1fb47e3ac150451052ae34a0d3382c28d05b3ccf577", displayName: "Steve Grim", canonicalCharacter: "Handa Shinichi", spriteObservation: "brown hair and eyes" },
  tim: { source: "sam", historicalHash: "9950b1d4268e2e4d3edd3a9e4719dce6e867070516bf4f3d2dcd2930fa12880d", displayName: "Tim Saunders", canonicalCharacter: "Shourinji Ayumu", spriteObservation: "long hair, front tuft, closed eyes" },
};
const spritePath = id => "frontend/public/sprites/" + id + ".png";

export function parseFrozenG2Audit(bytes) {
  // Git may expand LF to CRLF on Windows checkout; pin all Git-normalized bytes.
  const text = bytes.toString("utf8").replace(/\r\n/g, "\n");
  assert.equal(createHash("sha256").update(text).digest("hex"), G2_AUDIT_SHA256, "Frozen G2 audit bytes drift");
  return JSON.parse(text);
}

function freezeEvidence(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeEvidence);
    Object.freeze(value);
  }
  return value;
}

export const frozenIdentityAudit = freezeEvidence(parseFrozenG2Audit(await readFile(new URL("../fixtures/catalog-identity-audit.json", import.meta.url))));
export const assetRemediationLedger = JSON.parse(await readFile(new URL("../../../docs/asset-remediation-ledger.json", import.meta.url), "utf8"));

export function assertCurrentSpriteAssets(audit, ledger, actualHashes) {
  assert.deepEqual(audit, frozenIdentityAudit, "Frozen G2 observations drift");
  assert.equal(ledger.ledgerVersion, 1, "Unapproved ledger version");
  assert.equal(ledger.remediationId, "visual-identity-fix-1b", "Unapproved remediation");
  assert.equal(ledger.baselineCommit, G2_COMMIT, "Wrong G2 baseline");
  assert.equal(ledger.historicalAuditPath, auditPath, "Wrong historical audit");
  assert.equal(ledger.historicalAuditSha256, G2_AUDIT_SHA256, "Wrong historical audit hash");
  assert.ok(Array.isArray(ledger.entries), "Remediation entries must be an array");
  assert.deepEqual(ledger.entries.map(row => row.spriteId).sort(), Object.keys(approved).sort(), "Exactly sam, steve and tim may be remediated");
  const expectedHashes = new Map(audit.entries.map(row => [row.spritePath, row.spriteSha256]));
  for (const entry of ledger.entries) {
    const pin = approved[entry.spriteId];
    const historical = audit.entries.find(row => row.spriteId === entry.spriteId);
    const source = audit.entries.find(row => row.spriteId === pin.source);
    assert.equal(historical.spriteSha256, pin.historicalHash, "G2 historical sprite hash drift: " + entry.spriteId);
    assert.equal(entry.spritePath, spritePath(entry.spriteId), "Unapproved sprite path");
    assert.equal(entry.baselineCommit, G2_COMMIT, "Wrong entry baseline");
    assert.equal(entry.historicalSha256, historical.spriteSha256, "Historical hash mismatch: " + entry.spriteId);
    assert.equal(entry.approvedSha256, approved[pin.source].historicalHash, "Unapproved current hash: " + entry.spriteId);
    assert.equal(entry.approvedSha256, source.spriteSha256, "Approved cyclic permutation mismatch");
    assert.deepEqual(entry.provenance, {
      method: "cyclic-reassignment-of-existing-G2-assets",
      sourceSpriteId: pin.source, sourcePath: spritePath(pin.source),
      sourceCommit: G2_COMMIT, sourceSha256: source.spriteSha256,
    }, "Unapproved source cycle: " + entry.spriteId);
    assert.deepEqual(entry.historicalIdentity, Object.fromEntries(
      ["displayName", "canonicalCharacter", "declaredCharacter", "assetCharacter", "spriteObservation"].map(key => [key, historical[key]])
    ), "Historical identity observations must be preserved");
    assert.deepEqual(entry.correctedIdentity, {
      displayName: pin.displayName, canonicalCharacter: pin.canonicalCharacter, spriteObservation: pin.spriteObservation,
    }, "Unapproved corrected identity: " + entry.spriteId);
    assert.deepEqual(entry.productOwnerVisualApproval, approval, "Missing or altered Product Owner visual approval");
    assert.equal(entry.remediationReason, "Correct the approved Sam/Steve/Tim cyclic portrait misassignment while preserving the G2 audit as historical evidence.", "Missing remediation reason");
    expectedHashes.set(entry.spritePath, entry.approvedSha256);
  }
  // Check every historical row, including disputed identities; no ledger entry can waive drift.
  // The existing Royal/Zeus and Epsilon manifest tests protect the additional 23 sprites.
  for (const row of audit.entries) {
    assert.equal(actualHashes.get(row.spritePath), expectedHashes.get(row.spritePath), "Current sprite content drift: " + row.spriteId);
  }
  return true;
}
