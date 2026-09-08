import { spawnSync } from "node:child_process";
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

test("current catalog audit preserves all 44 legacy files and surfaces existing identity warnings",async()=>{
 const versions=await loadVersions();
 const fixture=JSON.parse(await readFile(new URL("fixtures/catalog-identity-audit.json",import.meta.url),"utf8"));
 const report=await auditAssets({versions,identities:fixture.entries});
 assert.equal(report.summary.assetCount,44);assert.equal(report.summary.missing,0);assert.equal(report.summary.orphans,0);
 assert.deepEqual(report,await auditAssets({versions,identities:fixture.entries}));
 assert.equal(report.versions.length,versions.length);
 for(const entry of fixture.entries) assert.equal(report.files.find(f=>f.filename===entry.spriteId+".png").sha256,entry.spriteSha256);
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
 assert.equal(report.summary.extensionFormatMismatches,44);
 assert.deepEqual(report.summary.dimensionBuckets,{"256x256":2,"64x64":42});
 for(const file of report.files) {
  assert.equal(file.validAsset,true);
  assert.deepEqual(file.issues.find(i=>i.code==="EXTENSION_FORMAT_MISMATCH"),{
   code:"EXTENSION_FORMAT_MISMATCH",severity:"warning",filename:file.filename,
   declaredExtension:".png",detectedFormat:"WEBP",width:file.width,height:file.height
  });
  assert.ok(!file.issues.some(i=>i.severity==="error"));
 }
 const cli=spawnSync(process.execPath,[fileURLToPath(new URL("../scripts/asset-audit.mjs",import.meta.url))],{encoding:"utf8"});
 assert.equal(cli.status,0,cli.stderr);
 assert.equal(JSON.parse(cli.stdout).summary.extensionFormatMismatches,44);
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
