import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import {
  detectDuplicateCandidates,
  detectImageSignature,
  ensureSafeStaging,
  reportStatus,
  runAssetFactory,
  sha256Hex,
  validateManifest
} from './asset-factory.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoStagingRoot = path.join(repoRoot, 'tools/assets/staging');
const repoReportsRoot = path.join(repoRoot, 'tools/assets/reports');

function png(width, height, { alpha = true } = {}) {
  const chunk = (type, data) => {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4);
    const sum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    sum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = alpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.alloc((width * (alpha ? 4 : 3) + 1) * height))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function jpeg(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x0b,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01,
    0x01, 0x11, 0x00,
    0xff, 0xd9
  ]);
}

function manifest() {
  return {
    schemaVersion: 1,
    manifestId: 'epsilon-ie2-poc',
    title: 'Test manifest',
    wikiBaseUrl: 'https://example.invalid',
    targets: [
      {
        canonicalCharacterId: 'dvalin',
        versionId: 'dvalin:epsilon-ie2',
        displayName: 'Dvalin / Desarm',
        teamId: 'epsilon',
        gameOrigin: 'footballer-quest',
        sourceGame: 'ie2',
        sourceType: 'fandom-character-page',
        sourceRef: 'Saginuma_Osamu',
        sourceSheet: null,
        sourceAssetId: null,
        row: null,
        column: null,
        cropRect: null,
        outputFile: null,
        width: null,
        height: null,
        contentBounds: null,
        backgroundRemoved: false,
        identityStatus: 'VERSION-VERIFIED',
        sourceStatus: 'UNASSESSED',
        versionStatus: 'VERSION-VERIFIED',
        assetStatus: 'UNASSESSED',
        visualReuseFrom: null,
        verificationEvidence: ['canonical-record'],
        provenanceNote: 'Proof of concept',
        validationWarnings: [],
        sha256: null
      }
    ]
  };
}

test('manifest validation rejects duplicate version IDs and auto-verified assets', () => {
  const duplicated = manifest();
  duplicated.targets.push({ ...duplicated.targets[0] });
  assert.throws(() => validateManifest(duplicated), /Duplicate versionId/);
  const forbidden = manifest();
  forbidden.targets[0].assetStatus = 'ASSET-VERIFIED';
  assert.throws(() => validateManifest(forbidden), /must not start as ASSET-VERIFIED/);
});

test('sha256 and real file signature detection work for PNG and JPEG', () => {
  const samplePng = png(3, 2);
  assert.equal(sha256Hex(samplePng).length, 64);
  assert.deepEqual(detectImageSignature(samplePng), { width: 3, height: 2, aspectRatio: 1.5, mime: 'image/png', format: 'PNG', hasAlpha: true });
  const sampleJpeg = detectImageSignature(jpeg(1, 1));
  assert.equal(sampleJpeg.mime, 'image/jpeg');
  assert.equal(sampleJpeg.width, 1);
  assert.equal(sampleJpeg.height, 1);
  assert.equal(sampleJpeg.hasAlpha, false);
});

test('exact duplicate detection groups matching hashes', () => {
  assert.deepEqual(detectDuplicateCandidates([
    { versionId: 'a', sha256: 'same' },
    { versionId: 'b', sha256: 'same' },
    { versionId: 'c', sha256: 'other' }
  ]), [{ sha256: 'same', versionIds: ['a', 'b'] }]);
});

test('failed source requests are classified without creating candidates', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const report = await runAssetFactory({
      manifestPath,
      stagingRoot,
      reportsRoot,
      fetchImpl: async () => {
        const error = new Error('fetch failed');
        error.cause = { code: 'ENOTFOUND' };
        throw error;
      }
    });
    assert.equal(report.status, 'BLOCKED');
    assert.equal(report.targets[0].sourceStatus, 'SOURCE-ACCESS-BLOCKED');
    assert.equal(report.targets[0].assetStatus, 'UNASSESSED');
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('resolved candidates stay CANDIDATE and staging is immutable', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const samplePng = png(2, 2);
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const fetchImpl = async url => ({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            1: {
              pageimage: 'Desarm.png',
              original: { source: 'https://static.example.invalid/Desarm.png' }
            }
          }
        }
      }),
      arrayBuffer: async () => samplePng,
      status: 200,
      url
    });
    const report = await runAssetFactory({
      manifestPath,
      stagingRoot,
      reportsRoot,
      fetchImpl
    });
    assert.equal(reportStatus(report.targets), 'PASS');
    assert.equal(report.targets[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sourceStatus, 'SOURCE-VERIFIED');
    const saved = await readFile(path.resolve(repoRoot, report.targets[0].outputFile));
    assert.equal(saved.length, samplePng.length);
    const html = await readFile(path.join(reportsRoot, 'epsilon-ie2-poc.contact-sheet.html'), 'utf8');
    assert.match(html, /<img src="\.\.\/staging\/[^"]+\/Desarm\.png"/);
    assert.match(html, /<div><dt>Source filename<\/dt><dd>Desarm\.png<\/dd><\/div>/);
    } finally {
      if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
      if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
});

test('existing staged originals can regenerate a contact sheet without refetching', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
    let stagingRoot;
    let reportsRoot;
    try {
      const manifestPath = path.join(directory, 'manifest.json');
      const manifestData = manifest();
      manifestData.targets[0].sourceAssetId = 'File:Desarm Portrait.png';
      await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
      stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
      reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
      const candidateDir = path.join(stagingRoot, 'originals', 'dvalin-epsilon-ie2');
      await mkdir(candidateDir, { recursive: true });
      await writeFile(path.join(candidateDir, 'Desarm Portrait.png'), png(4, 4));
      const report = await runAssetFactory({
        manifestPath,
        stagingRoot,
        reportsRoot,
        fetchImpl: async () => { throw new Error('should not fetch'); }
      });
      assert.equal(report.status, 'PASS');
      assert.equal(report.targets[0].assetStatus, 'CANDIDATE');
      assert.equal(report.targets[0].sourceStatus, 'SOURCE-VERIFIED');
      assert.equal(report.targets[0].sourceFilename, 'Desarm Portrait.png');
      assert.match(report.targets[0].contactSheetImageUrl, /^\.\.\/staging\/.*Desarm%20Portrait\.png$/);
    } finally {
      if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
      if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
});

test('staging root must not overlap runtime assets', async () => {
  const stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
  try {
    await assert.rejects(() => ensureSafeStaging({
      stagingRoot,
      runtimeDir: path.join(repoRoot, 'tools/assets')
    }), /must not overlap runtime assets/);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
});
