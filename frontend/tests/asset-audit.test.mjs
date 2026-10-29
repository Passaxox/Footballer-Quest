import { frozenIdentityAudit, assetRemediationLedger, assertCurrentSpriteAssets, parseFrozenG2Audit } from "./helpers/asset-remediation.mjs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cropCoordinates } from "../../tools/assets/extract-headshot.mjs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { inspectPng, auditExitCode, auditAssets, loadVersions, webpDimensions } from "../scripts/asset-audit.mjs";

function png(width,height) {
  const chunk=(type,data)=>{
    const payload=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
    for(const b of payload) { crc^=b;for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
    const length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);
    return Buffer.concat([length,payload,sum]);
  };
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(Buffer.alloc((width*4+1)*height))),chunk("IEND",Buffer.alloc(0))]);
}

test("valid PNG sources accept 64, 256 and non-square dimensions without conversion",()=>{
 for(const [width,height] of [[64,64],[256,256],[80,64]]) assert.deepEqual(inspectPng(png(width,height)),{width,height,aspectRatio:width/height});
 const damaged=png(64,64);damaged[20]^=1;
 assert.throws(()=>inspectPng(damaged),/CRC/);
 assert.throws(()=>inspectPng(png(64,64).subarray(0,40)),/Truncated/);
 assert.throws(()=>inspectPng(Buffer.from("not an image")),/signature/);
});

test("Royal/Zeus manifest pins all native crops and agrees with the preserved planner", async () => {
 const manifest=JSON.parse(await readFile(new URL("../../docs/royal-zeus-assets.json",import.meta.url),"utf8"));
 assert.equal(manifest.entries.length,19);
 assert.equal(new Set(manifest.entries.map(r=>r.cell)).size,19);
 assert.equal(new Set(manifest.entries.map(r=>r.spriteId)).size,19);
 assert.equal(manifest.sourceSha256,"fdae76e3f4b7fd30857055155685fea40764d1508adfb7095192226a0736560b");
 for(const row of manifest.entries) {
  assert.equal(row.cell,`s01-r${String(row.row).padStart(2,"0")}-c${String(row.column).padStart(2,"0")}`);
  const crop=cropCoordinates(manifest.sheet,(row.row-1)*10+row.column-1);
  assert.equal(crop.x,2+(row.column-1)*66);assert.equal(crop.y,2+(row.row-1)*66);
  const bytes=await readFile(new URL(`../public/sprites/${row.spriteId}.png`,import.meta.url));
  assert.deepEqual(inspectPng(bytes),{width:64,height:64,aspectRatio:1});
  assert.equal(createHash("sha256").update(bytes).digest("hex"),row.sha256);
 }
 assert.deepEqual(manifest.reused.map(r=>r.versionId),["byron:base"]);
});

test("cross-check detects missing, orphan, invalid, shared and non-square assets deterministically without writes",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"footballer-assets-"));
 try {
  await writeFile(path.join(directory,"known.png"),png(64,64));
  await writeFile(path.join(directory,"orphan.png"),png(256,256));
  await writeFile(path.join(directory,"wide.png"),png(80,64));
  await writeFile(path.join(directory,"broken.png"),"broken");
  const versions=[{versionId:"a",characterId:"person",displayName:"One",spriteId:"known"},
   {versionId:"b",characterId:"person",displayName:"Two",spriteId:"known"},
   {versionId:"c",characterId:"missing",displayName:"Missing",spriteId:"missing"}];
  const snapshot=async()=>Promise.all((await readdir(directory)).sort().map(async name=>[name,(await readFile(path.join(directory,name))).toString("hex")]));
  const before=await snapshot();const result=await auditAssets({directory,versions});
  assert.deepEqual(result,await auditAssets({directory,versions}));assert.deepEqual(await snapshot(),before);
  assert.equal(result.summary.missing,1);assert.equal(result.summary.orphans,3);assert.equal(result.summary.invalidAssets,1);assert.equal(auditExitCode(result),1);
  assert.equal(result.versions.find(v=>v.versionId==="c").status,"MISSING");
  assert.ok(result.files.find(f=>f.filename==="known.png").issues.some(i=>i.code==="MULTIPLE_VERSION_REFERENCE"));
  assert.ok(result.files.find(f=>f.filename==="wide.png").issues.some(i=>i.code==="NON_SQUARE_SOURCE" && i.severity==="warning"));
  assert.equal(result.files.find(f=>f.filename==="orphan.png").status,"ORPHAN");
 } finally { await rm(directory,{recursive:true,force:true}); }
});

test("current catalog audit checks all 44 legacy files with only the approved Visual 1B remediations",async()=>{
 const versions=await loadVersions();
 const fixture=frozenIdentityAudit;
 const report=await auditAssets({versions,identities:fixture.entries});
 assert.equal(report.summary.assetCount,67);assert.equal(report.summary.missing,0);assert.equal(report.summary.orphans,0);
 assert.deepEqual(report,await auditAssets({versions,identities:fixture.entries}));
 assert.equal(report.versions.length,versions.length);
 assertCurrentSpriteAssets(fixture,assetRemediationLedger,new Map(report.files.map(file=>["frontend/"+file.path,file.sha256])));
 for(const id of ["jonas:base","austin:base","joseph:base"]) assert.ok(report.versions.find(v=>v.versionId===id).issues.some(i=>i.code==="KNOWN_IDENTITY_WARNING"));
 const image=await readFile(new URL("../public/sprites/mark.png",import.meta.url));
 assert.deepEqual(webpDimensions(image),{width:64,height:64,aspectRatio:1});
 assert.throws(()=>webpDimensions(image.subarray(0,image.length-1)),/RIFF/);
 assert.equal(report.files.find(f=>f.filename==="mark.png").validPng,false);
 assert.ok(report.files.find(f=>f.filename==="mark.png").issues.some(i=>i.code==="EXTENSION_FORMAT_MISMATCH"));
});

test("legacy WebP payloads are warnings and the actual audit CLI exits zero",async()=>{
 const report=await auditAssets();
 assert.equal(auditExitCode(report),0);
 assert.equal(report.summary.invalidPng,0);
 assert.equal(report.summary.invalidAssets,0);
 assert.equal(report.summary.extensionFormatMismatches,48);
 assert.deepEqual(report.summary.dimensionBuckets,{"256x256":2,"64x64":65});
 for(const file of report.files.filter(f=>f.sourceFormat==="WEBP")) {
  assert.equal(file.validAsset,true);
  assert.deepEqual(file.issues.find(i=>i.code==="EXTENSION_FORMAT_MISMATCH"),{
   code:"EXTENSION_FORMAT_MISMATCH",severity:"warning",filename:file.filename,
   declaredExtension:".png",detectedFormat:"WEBP",width:file.width,height:file.height
  });
  assert.ok(!file.issues.some(i=>i.severity==="error"));
 }
 const cli=spawnSync(process.execPath,[fileURLToPath(new URL("../scripts/asset-audit.mjs",import.meta.url))],{encoding:"utf8"});
 assert.equal(cli.status,0,cli.stderr);
 assert.equal(JSON.parse(cli.stdout).summary.extensionFormatMismatches,48);
});

test("corrupt image alone produces a nonzero audit exit code",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"footballer-assets-"));
 try {
  await writeFile(path.join(directory,"broken.png"),"broken");
  const report=await auditAssets({directory,versions:[{versionId:"broken",spriteId:"broken"}]});
  assert.equal(report.summary.missing,0);
  assert.equal(auditExitCode(report),1);
  assert.equal(report.files[0].validAsset,false);
  assert.deepEqual(report,await auditAssets({directory,versions:[{versionId:"broken",spriteId:"broken"}]}));
 } finally { await rm(directory,{recursive:true,force:true}); }
});


test("Epsilon runtime assets preserve approved source bytes and provenance", async () => {
 const root = new URL("../../", import.meta.url);
 const manifest = JSON.parse(await readFile(new URL("docs/epsilon-batch-1a-assets.json", root), "utf8"));
 assert.equal(manifest.entries.length, 4);
 for (const entry of manifest.entries) {
  const source = await readFile(new URL(entry.sourcePath, root));
  const runtime = await readFile(new URL(entry.runtimePath, root));
  const provenance = JSON.parse(await readFile(new URL(entry.provenancePath, root), "utf8"));
  assert.deepEqual(runtime, source);
  assert.equal(createHash("sha256").update(runtime).digest("hex"), entry.sha256);
  assert.equal(provenance.sha256, entry.sha256);
  assert.equal(provenance.versionId, entry.versionId);
  assert.equal(provenance.decision, "ASSET-VERIFIED");
  assert.deepEqual(webpDimensions(runtime), { width:64, height:64, aspectRatio:1 });
 }
});

const currentSpriteHashes = new Map(await Promise.all(frozenIdentityAudit.entries.map(async row => [row.spritePath,
  createHash("sha256").update(await readFile(new URL("../../" + row.spritePath, import.meta.url))).digest("hex")])));

test("Visual 1B pins the untouched G2 fixture, including its incorrect historical identity observations", async () => {
  const bytes = await readFile(new URL("fixtures/catalog-identity-audit.json", import.meta.url));
  assert.deepEqual(parseFrozenG2Audit(bytes), frozenIdentityAudit);
  const text = bytes.toString("utf8"), sam = frozenIdentityAudit.entries.find(row => row.spriteId === "sam");
  for (const [before, after] of [
    [sam.spriteSha256, "0".repeat(64)],
    ['"canonicalCharacter": "Shourinji Ayumu"', '"canonicalCharacter": "Shishido Sakichi"'],
  ]) {
    const changed = text.replace(before, after);
    assert.notEqual(changed, text, "the intended evidence field was changed without reformatting");
    assert.throws(() => parseFrozenG2Audit(Buffer.from(changed)), /Frozen G2 audit bytes drift/);
  }
  assert.throws(() => parseFrozenG2Audit(Buffer.concat([bytes, Buffer.from(" ")])), /Frozen G2 audit bytes drift/);
});

test("Visual 1B checks the approved current cycle without mutating historical evidence or inputs", () => {
  const audit = structuredClone(frozenIdentityAudit), ledger = structuredClone(assetRemediationLedger);
  const hashes = new Map(currentSpriteHashes);
  assert.equal(assertCurrentSpriteAssets(audit, ledger, hashes), true);
  assert.deepEqual(audit, frozenIdentityAudit);
  assert.deepEqual(ledger, assetRemediationLedger);
  assert.deepEqual(hashes, currentSpriteHashes);
});

test("Visual 1B rejects unauthorized, missing, duplicate and redirected remediation entries", () => {
  for (const mutate of [
    l => { l.entries.push({ ...l.entries[0], spriteId: "mark" }); },
    l => { l.entries.pop(); },
    l => { l.entries[1] = structuredClone(l.entries[0]); },
    l => { l.entries[0].spriteId = "mark"; },
    l => { l.entries[0].spritePath = "frontend/public/sprites/mark.png"; },
    l => { l.ledgerVersion++; },
    l => { l.baselineCommit = "0".repeat(40); },
    l => { l.entries[0].baselineCommit = "0".repeat(40); },
    l => { l.historicalAuditSha256 = "0".repeat(64); },
  ]) {
    const ledger = structuredClone(assetRemediationLedger); mutate(ledger);
    assert.throws(() => assertCurrentSpriteAssets(frozenIdentityAudit, ledger, currentSpriteHashes), { name: "AssertionError" });
  }
});

test("Visual 1B rejects altered hashes, provenance, identities and approval for each remediated sprite", () => {
  for (let index = 0; index < 3; index++) {
    for (const mutate of [
      e => { e.historicalSha256 = "0".repeat(64); },
      e => { e.approvedSha256 = "0".repeat(64); },
      e => { e.provenance.sourceSpriteId = e.spriteId; },
      e => { e.provenance.sourceSha256 = "0".repeat(64); },
      e => { e.provenance.sourceCommit = "0".repeat(40); },
      e => { e.historicalIdentity.canonicalCharacter = e.correctedIdentity.canonicalCharacter; },
      e => { e.correctedIdentity.canonicalCharacter = e.historicalIdentity.canonicalCharacter; },
      e => { e.productOwnerVisualApproval.status = "pending"; },
      e => { delete e.productOwnerVisualApproval; },
    ]) {
      const ledger = structuredClone(assetRemediationLedger); mutate(ledger.entries[index]);
      assert.throws(() => assertCurrentSpriteAssets(frozenIdentityAudit, ledger, currentSpriteHashes), { name: "AssertionError" });
    }
  }
});

test("Visual 1B rejects coordinated ledger/file tampering and a reversed three-way cycle", () => {
  const ledger = structuredClone(assetRemediationLedger), hashes = new Map(currentSpriteHashes);
  const entry = ledger.entries[0];
  entry.approvedSha256 = "0".repeat(64);
  entry.provenance.sourceSha256 = entry.approvedSha256;
  hashes.set(entry.spritePath, entry.approvedSha256);
  assert.throws(() => assertCurrentSpriteAssets(frozenIdentityAudit, ledger, hashes), /Unapproved current hash: sam/);

  const reversed = structuredClone(assetRemediationLedger), reversedHashes = new Map(currentSpriteHashes);
  const sources = { sam: "tim", steve: "sam", tim: "steve" };
  for (const entry of reversed.entries) {
    const source = frozenIdentityAudit.entries.find(row => row.spriteId === sources[entry.spriteId]);
    entry.approvedSha256 = source.spriteSha256;
    Object.assign(entry.provenance, { sourceSpriteId: source.spriteId, sourcePath: source.spritePath, sourceSha256: source.spriteSha256 });
    reversedHashes.set(entry.spritePath, entry.approvedSha256);
  }
  assert.throws(() => assertCurrentSpriteAssets(frozenIdentityAudit, reversed, reversedHashes), /Unapproved current hash/);
});

test("Visual 1B rejects reverted, missing and byte-tampered approved portraits", async () => {
  for (const entry of assetRemediationLedger.entries) {
    const bytes = await readFile(new URL("../../" + entry.spritePath, import.meta.url));
    bytes[bytes.length - 1] ^= 1;
    const tamperedHash = createHash("sha256").update(bytes).digest("hex");
    for (const value of [entry.historicalSha256, tamperedHash, undefined]) {
      const hashes = new Map(currentSpriteHashes);
      if (value === undefined) hashes.delete(entry.spritePath);
      else hashes.set(entry.spritePath, value);
      assert.throws(() => assertCurrentSpriteAssets(frozenIdentityAudit, assetRemediationLedger, hashes),
        new RegExp("Current sprite content drift: " + entry.spriteId));
    }
  }
});

test("Visual 1B rejects drift or removal of every unrelated historical sprite, including disputed identities", () => {
  const remediated = new Set(["sam", "steve", "tim"]);
  for (const row of frozenIdentityAudit.entries.filter(row => !remediated.has(row.spriteId))) {
    for (const remove of [false, true]) {
      const hashes = new Map(currentSpriteHashes);
      if (remove) hashes.delete(row.spritePath);
      else hashes.set(row.spritePath, "0".repeat(64));
      assert.throws(() => assertCurrentSpriteAssets(frozenIdentityAudit, assetRemediationLedger, hashes),
        new RegExp("Current sprite content drift: " + row.spriteId));
    }
  }
});
