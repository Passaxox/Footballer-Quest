import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import {
  applyHumanApprovals,
  createFetchPlan,
  detectDuplicateCandidates,
  detectImageSignature,
  ensureSafeImports,
  ensureSafeStaging,
  ensureSafeVerified,
  prepareApprovalReview,
  reportStatus,
  runAssetFactory,
  sha256Hex,
  validateApprovals,
  validateManifest
} from './asset-factory.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoImportsRoot = path.join(repoRoot, 'tools/assets/imports');
const repoStagingRoot = path.join(repoRoot, 'tools/assets/staging');
const repoVerifiedRoot = path.join(repoRoot, 'tools/assets/verified');
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
        requiredSourceSuitability: ['GAME-PORTRAIT', 'GAME-SPRITE'],
        sourceType: 'fandom-character-page',
        sourceRef: 'Saginuma_Osamu',
        sourceCandidates: [
          {
            sourceType: 'fandom-character-page',
            sourceRef: 'Saginuma_Osamu',
            sourceSuitability: 'GENERIC-CHARACTER-IMAGE',
            preserveAsEvidence: true
          }
        ],
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

function approvals({ candidatePath = null, sourceFilename = null, sha256 = null } = {}) {
  return {
    schemaVersion: 1,
    manifestId: 'epsilon-ie2-poc',
    approvals: [
      {
        versionId: 'dvalin:epsilon-ie2',
        candidatePath,
        sourceFilename,
        sha256,
        decision: 'ASSET-VERIFIED'
      }
    ]
  };
}

function relativeCandidatePath(stagingRoot, versionId, suitability, fileName, sourceKey = 'source-1') {
  return path.relative(repoRoot, path.join(stagingRoot, 'originals', versionId.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase(), suitability, fileName)).split(path.sep).join('/');
}

test('manifest validation rejects duplicate version IDs and auto-verified assets', () => {
  const duplicated = manifest();
  duplicated.targets.push({ ...duplicated.targets[0] });
  assert.throws(() => validateManifest(duplicated), /Duplicate versionId/);
  const forbidden = manifest();
  forbidden.targets[0].assetStatus = 'ASSET-VERIFIED';
  assert.throws(() => validateManifest(forbidden), /must not start as ASSET-VERIFIED/);
  assert.throws(() => validateApprovals({ ...approvals(), approvals: [{ versionId: 'dvalin:epsilon-ie2', sha256: 'bad', decision: 'ASSET-VERIFIED' }] }), /64 hex chars/);
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

test('fetch plans are machine-readable, side-effect free and constrained to the imports root', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  const manifestPath = path.join(directory, 'manifest.json');
  const importsRoot = path.join(repoImportsRoot, `missing-${path.basename(directory)}`);
  try {
    const input = manifest();
    input.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(input, null, 2)}\n`);
    const plan = await createFetchPlan({ manifestPath, importsRoot });
    assert.equal(plan.targets[0].targetId, 'dvalin:epsilon-ie2');
    assert.deepEqual(plan.targets[0].sources[0], {
      sourceKey: 'source-1',
      expectedSourceFilename: '(E) Desarm sprite.png',
      sourceUrl: 'https://example.invalid/wiki/Special:Redirect/file/File%3A(E)%20Desarm%20sprite.png',
      plannedImportDestination: `tools/assets/imports/missing-${path.basename(directory)}/epsilon-ie2-poc/dvalin-epsilon-ie2/source-1/(E) Desarm sprite.png`
    });
    await assert.rejects(() => readFile(importsRoot), error => error.code === 'ENOENT');
    assert.throws(() => ensureSafeImports({
      importsRoot: path.join(repoRoot, 'tools/assets/staging'),
      runtimeDir: path.join(repoRoot, 'frontend/public/sprites')
    }), /must stay under tools\/assets\/imports/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('import workflow stages one exact binary as CANDIDATE without fetching', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let importsRoot;
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const input = manifest();
    input.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(input, null, 2)}\n`);
    await mkdir(repoImportsRoot, { recursive: true });
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    importsRoot = await mkdtemp(path.join(repoImportsRoot, 'test-imports-'));
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const planned = path.join(importsRoot, 'epsilon-ie2-poc', 'dvalin-epsilon-ie2', 'source-1');
    await mkdir(planned, { recursive: true });
    await writeFile(path.join(planned, '(E) Desarm sprite.png'), png(2, 2));
    const report = await runAssetFactory({
      manifestPath, importsRoot, stagingRoot, reportsRoot, importCandidates: true,
      fetchImpl: async () => { throw new Error('must not fetch imported candidates'); }
    });
    assert.equal(report.status, 'PASS');
    assert.equal(report.targets[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sources[0].importStatus, 'MATCHED');
    assert.match(report.targets[0].sources[0].outputFile, /^tools\/assets\/staging\//);
    assert.ok(report.targets[0].sources[0].verificationEvidence.includes('pre-materialized-import'));
  } finally {
    if (importsRoot) await rm(importsRoot, { recursive: true, force: true });
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('import workflow blocks ambiguous and missing exact candidates without choosing', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let importsRoot;
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const input = manifest();
    input.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(input, null, 2)}\n`);
    await mkdir(repoImportsRoot, { recursive: true });
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    importsRoot = await mkdtemp(path.join(repoImportsRoot, 'test-imports-'));
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    for (const folder of ['one', 'two']) {
      await mkdir(path.join(importsRoot, folder), { recursive: true });
      await writeFile(path.join(importsRoot, folder, '(E) Desarm sprite.png'), png(2, 2));
    }
    const ambiguous = await runAssetFactory({
      manifestPath, importsRoot, stagingRoot, reportsRoot, importCandidates: true,
      fetchImpl: async () => { throw new Error('must not fetch imported candidates'); }
    });
    assert.equal(ambiguous.status, 'BLOCKED');
    assert.equal(ambiguous.targets[0].sources[0].importStatus, 'AMBIGUOUS');
    assert.equal(ambiguous.targets[0].sources[0].outputFile, null);
    await rm(path.join(importsRoot, 'one'), { recursive: true, force: true });
    await rm(path.join(importsRoot, 'two'), { recursive: true, force: true });
    const missing = await runAssetFactory({
      manifestPath, importsRoot, stagingRoot, reportsRoot, importCandidates: true,
      fetchImpl: async () => { throw new Error('must not fetch imported candidates'); }
    });
    assert.equal(missing.status, 'BLOCKED');
    assert.equal(missing.targets[0].sources[0].importStatus, 'MISSING');
    assert.equal(missing.targets[0].sources[0].outputFile, null);
  } finally {
    if (importsRoot) await rm(importsRoot, { recursive: true, force: true });
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('failed source requests are classified without creating candidates', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
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

test('generic character-page images stay REVIEW when game sprite is required', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const fetchImpl = async url => ({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            1: {
              pageimage: 'Saginuma_Osamu.png',
              original: { source: 'https://static.example.invalid/Saginuma_Osamu.png' }
            }
          }
        }
      }),
      arrayBuffer: async () => samplePng,
      status: 200,
      url
    });
    const report = await runAssetFactory({ manifestPath, stagingRoot, reportsRoot, fetchImpl });
    assert.equal(report.status, 'BLOCKED');
    assert.equal(report.targets[0].assetStatus, 'REVIEW');
    assert.equal(report.targets[0].sourceSuitability, 'GENERIC-CHARACTER-IMAGE');
    assert.equal(report.targets[0].sources[0].assetStatus, 'REVIEW');
    assert.match(report.targets[0].sources[0].validationWarnings.join('\n'), /SOURCE_UNSUITABLE:GENERIC-CHARACTER-IMAGE/);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('resolved game sprite candidates stay CANDIDATE and beat generic fallbacks', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [
      {
        sourceType: 'fandom-file',
        sourceAssetId: 'File:(E) Desarm sprite.png',
        sourceSuitability: 'GAME-SPRITE'
      },
      {
        sourceType: 'fandom-character-page',
        sourceRef: 'Saginuma_Osamu',
        sourceSuitability: 'GENERIC-CHARACTER-IMAGE',
        preserveAsEvidence: true
      }
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const fetchImpl = async url => ({
      ok: true,
      json: async () => ({ query: { pages: { 1: { pageimage: 'Saginuma_Osamu.png', original: { source: 'https://static.example.invalid/Saginuma_Osamu.png' } } } } }),
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
    assert.equal(report.targets[0].sourceSuitability, 'GAME-SPRITE');
    assert.equal(report.targets[0].sources.length, 2);
    assert.equal(report.targets[0].sources[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sources[1].assetStatus, 'REVIEW');
    const saved = await readFile(path.resolve(repoRoot, report.targets[0].sources[0].outputFile));
    assert.equal(saved.length, samplePng.length);
    const html = await readFile(path.join(reportsRoot, 'epsilon-ie2-poc.contact-sheet.html'), 'utf8');
    assert.match(html, /<div><dt>Source filename<\/dt><dd>\(E\) Desarm sprite\.png<\/dd><\/div>/);
    assert.match(html, /<div><dt>Suitability<\/dt><dd>GAME-SPRITE<\/dd><\/div>/);
    assert.match(html, /<div><dt>Suitability<\/dt><dd>GENERIC-CHARACTER-IMAGE<\/dd><\/div>/);
    } finally {
      if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
      if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
});

test('fandom-file sources fall back across deterministic exact-file URLs after a 403', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [
      {
        sourceType: 'fandom-file',
        sourceAssetId: 'File:(E) Desarm sprite.png',
        sourceSuitability: 'GAME-SPRITE'
      },
      {
        sourceType: 'fandom-character-page',
        sourceRef: 'Saginuma_Osamu',
        sourceSuitability: 'GENERIC-CHARACTER-IMAGE',
        preserveAsEvidence: true
      }
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const attemptedUrls = [];
    const fetchImpl = async url => {
      attemptedUrls.push(url);
      if (url.includes('api.php?action=query') && url.includes('File%3A(E)%20Desarm%20sprite.png')) {
        return {
          ok: true,
          json: async () => ({
            query: {
              pages: {
                1: {
                  title: 'File:(E) Desarm sprite.png',
                  imageinfo: [{ url: 'https://static.example.invalid/desarm-primary.png' }]
                }
              }
            }
          }),
          status: 200,
          url
        };
      }
      if (url === 'https://static.example.invalid/desarm-primary.png') {
        return { ok: false, status: 403, statusText: 'Forbidden', url };
      }
      if (url.includes('/wiki/Special:Redirect/file/File%3A(E)%20Desarm%20sprite.png')) {
        return {
          ok: true,
          arrayBuffer: async () => samplePng,
          status: 200,
          url
        };
      }
      if (url.includes('Saginuma_Osamu')) {
        return {
          ok: true,
          json: async () => ({ query: { pages: { 1: { pageimage: 'Saginuma_Osamu.png', original: { source: 'https://static.example.invalid/Saginuma_Osamu.png' } } } } }),
          status: 200,
          url
        };
      }
      if (url === 'https://static.example.invalid/Saginuma_Osamu.png') {
        return {
          ok: true,
          arrayBuffer: async () => samplePng,
          status: 200,
          url
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };
    const report = await runAssetFactory({ manifestPath, stagingRoot, reportsRoot, fetchImpl });
    assert.equal(report.targets[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sourceSuitability, 'GAME-SPRITE');
    assert.equal(report.targets[0].sources[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sources[1].assetStatus, 'REVIEW');
    assert.deepEqual(attemptedUrls.slice(0, 3), [
      'https://example.invalid/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url&titles=File%3A(E)%20Desarm%20sprite.png',
      'https://static.example.invalid/desarm-primary.png',
      'https://example.invalid/wiki/Special:Redirect/file/File%3A(E)%20Desarm%20sprite.png'
    ]);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('Dvalin fallback keeps the other exact Epsilon sprite targets unchanged', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const manifestData = JSON.parse(await readFile(path.join(repoRoot, 'tools/assets/manifests/epsilon-ie2-poc.json'), 'utf8'));
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const staticUrls = new Map([
      ['File:(E) Desarm sprite.png', 'https://static.example.invalid/desarm-primary.png'],
      ['File:(E) Tanba Taiji sprite.png', 'https://static.example.invalid/tanba-primary.png'],
      ['File:(E) Kuri Fuuko sprite.png', 'https://static.example.invalid/kuri-primary.png'],
      ['File:(E) Segata Ryuuichirou sprite.png', 'https://static.example.invalid/segata-primary.png']
    ]);
    const fetchImpl = async url => {
      if (url.includes('/api.php?action=query') && url.includes('&prop=imageinfo&iiprop=url&titles=File%3A')) {
        const encodedTitle = url.split('&titles=')[1];
        const fileTitle = decodeURIComponent(encodedTitle);
        return {
          ok: true,
          json: async () => ({
            query: {
              pages: {
                1: {
                  title: fileTitle,
                  imageinfo: [{ url: staticUrls.get(fileTitle) }]
                }
              }
            }
          }),
          status: 200,
          url
        };
      }
      if (url === 'https://static.example.invalid/desarm-primary.png') {
        return { ok: false, status: 403, statusText: 'Forbidden', url };
      }
      if (url.includes('/wiki/Special:Redirect/file/File%3A(E)%20Desarm%20sprite.png')) {
        return { ok: true, arrayBuffer: async () => samplePng, status: 200, url };
      }
      if (url.startsWith('https://static.example.invalid/')) {
        return { ok: true, arrayBuffer: async () => samplePng, status: 200, url };
      }
      if (url.includes('Saginuma_Osamu') || url.includes('Tanba_Taiji') || url.includes('Kuri_Fuuko') || url.includes('Segata_Ryuuichirou')) {
        const name = url.split('/').pop();
        return {
          ok: true,
          json: async () => ({ query: { pages: { 1: { pageimage: `${name}.png`, original: { source: `https://static.example.invalid/${name}.png` } } } } }),
          status: 200,
          url
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };
    const report = await runAssetFactory({ manifestPath, stagingRoot, reportsRoot, fetchImpl });
    assert.equal(report.status, 'PASS');
    const byId = new Map(report.targets.map(target => [target.versionId, target]));
    assert.equal(byId.get('dvalin:epsilon-ie2').sourceFilename, '(E) Desarm sprite.png');
    assert.equal(byId.get('dvalin:epsilon-ie2').assetStatus, 'CANDIDATE');
    assert.equal(byId.get('tytan:epsilon-ie2').sourceFilename, '(E) Tanba Taiji sprite.png');
    assert.equal(byId.get('tytan:epsilon-ie2').assetStatus, 'CANDIDATE');
    assert.equal(byId.get('krypto:epsilon-ie2').sourceFilename, '(E) Kuri Fuuko sprite.png');
    assert.equal(byId.get('krypto:epsilon-ie2').assetStatus, 'CANDIDATE');
    assert.equal(byId.get('zell:epsilon-ie2').sourceFilename, '(E) Segata Ryuuichirou sprite.png');
    assert.equal(byId.get('zell:epsilon-ie2').assetStatus, 'CANDIDATE');
    for (const target of byId.values()) {
      assert.equal(target.sources[0].assetStatus, 'CANDIDATE');
      assert.equal(target.sources[1].assetStatus, 'REVIEW');
    }
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('explicit approval is required before a candidate becomes ASSET-VERIFIED', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    await writeFile(approvalsPath, `${JSON.stringify(approvals(), null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const report = await runAssetFactory({
      manifestPath,
      stagingRoot,
      reportsRoot,
      approvalsPath,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ query: { pages: { 1: { title: 'File:(E) Desarm sprite.png', imageinfo: [{ url: 'https://static.example.invalid/desarm.png' }] } } } }),
        arrayBuffer: async () => samplePng,
        status: 200
      })
    });
    assert.equal(report.targets[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sources[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].verifiedFile, null);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('capture-approval-hashes records the real hash for an explicitly selected candidate only', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let verifiedRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoVerifiedRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const candidatePath = relativeCandidatePath(stagingRoot, 'dvalin:epsilon-ie2', 'game-sprite', '(E) Desarm sprite.png');
    await writeFile(approvalsPath, `${JSON.stringify(approvals({ candidatePath, sourceFilename: '(E) Desarm sprite.png' }), null, 2)}\n`);
    const report = await runAssetFactory({
      manifestPath,
      stagingRoot,
      verifiedRoot,
      reportsRoot,
      approvalsPath,
      captureApprovalHashes: true,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ query: { pages: { 1: { title: 'File:(E) Desarm sprite.png', imageinfo: [{ url: 'https://static.example.invalid/desarm.png' }] } } } }),
        arrayBuffer: async () => samplePng,
        status: 200
      })
    });

    const approvalFile = JSON.parse(await readFile(approvalsPath, 'utf8'));
    assert.equal(report.targets[0].assetStatus, 'CANDIDATE');
    assert.equal(report.targets[0].sources[0].assetStatus, 'CANDIDATE');
    assert.equal(approvalFile.approvals[0].sha256, sha256Hex(samplePng));
    assert.equal(approvalFile.approvals[0].candidatePath, candidatePath);
    assert.equal(report.targets[0].verifiedFile, null);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (verifiedRoot) await rm(verifiedRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('approval preparation auto-binds one deterministic candidate and leaves ambiguity for review', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-approval-review-'));
  try {
    const approvalsPath = path.join(directory, 'approvals.json');
    const approvals = { schemaVersion: 1, manifestId: 'test', approvals: [] };
    const candidate = {
      sourceKey: 'source-1',
      assetStatus: 'CANDIDATE',
      sourceSuitability: 'GAME-SPRITE',
      outputFile: 'tools/assets/staging/test/player.png',
      sourceFilename: 'player.png'
    };
    await prepareApprovalReview({
      approvals,
      approvalsPath,
      targets: [
        { versionId: 'matched:team', sources: [candidate] },
        { versionId: 'ambiguous:team', sources: [candidate, { ...candidate, sourceKey: 'source-2', outputFile: 'tools/assets/staging/test/player-2.png' }] },
        { versionId: 'missing:team', sources: [] }
      ]
    });
    const written = JSON.parse(await readFile(approvalsPath, 'utf8'));
    assert.deepEqual(written.approvals.map(row => [row.versionId, row.reviewStatus, row.candidatePath]), [
      ['matched:team', 'MATCHED', candidate.outputFile],
      ['ambiguous:team', 'AMBIGUOUS', null],
      ['missing:team', 'MISSING', null]
    ]);
    assert.ok(written.approvals.every(row => row.decision === 'REVIEW' && row.sha256 === null));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('complete-approvals captures hashes, promotes safely and is idempotent in one command', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-complete-'));
  let stagingRoot;
  let verifiedRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.manifestId = 'complete-test';
    manifestData.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoVerifiedRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const candidatePath = relativeCandidatePath(stagingRoot, 'dvalin:epsilon-ie2', 'game-sprite', '(E) Desarm sprite.png');
    await writeFile(approvalsPath, `${JSON.stringify({
      schemaVersion: 1,
      manifestId: 'complete-test',
      approvals: [{ versionId: 'dvalin:epsilon-ie2', decision: 'ASSET-VERIFIED', candidatePath, sourceFilename: '(E) Desarm sprite.png', sha256: null }]
    }, null, 2)}\n`);
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ query: { pages: { 1: { title: 'File:(E) Desarm sprite.png', imageinfo: [{ url: 'https://static.example.invalid/desarm.png' }] } } } }),
      arrayBuffer: async () => samplePng,
      status: 200
    });
    const first = await runAssetFactory({ manifestPath, stagingRoot, verifiedRoot, reportsRoot, approvalsPath, completeApprovals: true, fetchImpl });
    const second = await runAssetFactory({ manifestPath, stagingRoot, verifiedRoot, reportsRoot, approvalsPath, completeApprovals: true, fetchImpl: async () => { throw new Error('should not fetch'); } });
    assert.equal(first.targets[0].assetStatus, 'ASSET-VERIFIED');
    assert.equal(first.targets[0].verifiedFile, second.targets[0].verifiedFile);
    assert.equal(JSON.parse(await readFile(approvalsPath, 'utf8')).approvals[0].sha256, sha256Hex(samplePng));
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (verifiedRoot) await rm(verifiedRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('matching GAME-SPRITE approval becomes ASSET-VERIFIED in verified storage', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let verifiedRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoVerifiedRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const candidatePath = relativeCandidatePath(stagingRoot, 'dvalin:epsilon-ie2', 'game-sprite', '(E) Desarm sprite.png');
    await writeFile(approvalsPath, `${JSON.stringify(approvals({ candidatePath, sourceFilename: '(E) Desarm sprite.png' }), null, 2)}\n`);
    await runAssetFactory({
      manifestPath,
      stagingRoot,
      verifiedRoot,
      reportsRoot,
      approvalsPath,
      captureApprovalHashes: true,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ query: { pages: { 1: { title: 'File:(E) Desarm sprite.png', imageinfo: [{ url: 'https://static.example.invalid/desarm.png' }] } } } }),
        arrayBuffer: async () => samplePng,
        status: 200
      })
    });
    const report = await runAssetFactory({
      manifestPath,
      stagingRoot,
      verifiedRoot,
      reportsRoot,
      approvalsPath,
      finalizeApprovals: true,
      fetchImpl: async () => { throw new Error('should not fetch'); }
    });
    assert.equal(report.targets[0].assetStatus, 'ASSET-VERIFIED');
    assert.equal(report.targets[0].sources[0].assetStatus, 'ASSET-VERIFIED');
    assert.match(report.targets[0].verifiedFile, /^tools\/assets\/verified\//);
    assert.ok(report.targets[0].verifiedFile.endsWith('/(E) Desarm sprite.png'));
    assert.ok(report.targets[0].verifiedProvenanceFile.endsWith('.provenance.json'));
    assert.equal(report.targets[0].outputFile, candidatePath);
    assert.notEqual(report.targets[0].verifiedFile, report.targets[0].outputFile);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (verifiedRoot) await rm(verifiedRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('approval hash mismatches are rejected', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let verifiedRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoVerifiedRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const candidatePath = relativeCandidatePath(stagingRoot, 'dvalin:epsilon-ie2', 'game-sprite', '(E) Desarm sprite.png');
    await writeFile(approvalsPath, `${JSON.stringify(approvals({ candidatePath, sourceFilename: '(E) Desarm sprite.png', sha256: 'a'.repeat(64) }), null, 2)}\n`);
    await assert.rejects(() => runAssetFactory({
      manifestPath,
      stagingRoot,
      verifiedRoot,
      reportsRoot,
      approvalsPath,
      finalizeApprovals: true,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ query: { pages: { 1: { title: 'File:(E) Desarm sprite.png', imageinfo: [{ url: 'https://static.example.invalid/desarm.png' }] } } } }),
        arrayBuffer: async () => samplePng,
        status: 200
      })
    }), /Approval hash mismatch/);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (verifiedRoot) await rm(verifiedRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('missing binary approvals are rejected', async () => {
  await assert.rejects(() => applyHumanApprovals({
    approvals: approvals({ candidatePath: 'tools/assets/staging/missing.png', sourceFilename: 'missing.png', sha256: 'a'.repeat(64) }),
    approvalsPath: path.join(repoRoot, 'tools/assets/approvals/epsilon-ie2-poc.approvals.json'),
    verifiedRoot: path.join(repoRoot, 'tools/assets/verified'),
    manifestId: 'epsilon-ie2-poc',
    targets: [{
      versionId: 'dvalin:epsilon-ie2',
      assetStatus: 'CANDIDATE',
      sourceSuitability: 'GAME-SPRITE',
      displayName: 'Dvalin / Desarm',
      sourceGame: 'ie2',
      outputFile: 'tools/assets/staging/missing.png',
      sources: [{
        sourceKey: 'source-1',
        sourceType: 'fandom-file',
        assetStatus: 'CANDIDATE',
        sourceFilename: 'missing.png',
        sourceSuitability: 'GAME-SPRITE',
        sourceAssetId: 'File:missing.png',
        outputFile: 'tools/assets/staging/missing.png'
      }]
    }]
  }), /Missing staged binary/);
});

test('generic sources cannot be approved as runtime assets', async () => {
  const file = path.join(repoRoot, 'tools/assets/reports/test-generic-approval.png');
  try {
    await writeFile(file, png(1, 1));
    await assert.rejects(() => applyHumanApprovals({
      approvals: approvals({ candidatePath: 'tools/assets/reports/test-generic-approval.png', sourceFilename: 'test-generic-approval.png', sha256: sha256Hex(png(1, 1)) }),
      approvalsPath: path.join(repoRoot, 'tools/assets/approvals/epsilon-ie2-poc.approvals.json'),
      verifiedRoot: path.join(repoRoot, 'tools/assets/verified'),
      manifestId: 'epsilon-ie2-poc',
      targets: [{
        versionId: 'dvalin:epsilon-ie2',
        assetStatus: 'CANDIDATE',
        sourceSuitability: 'GENERIC-CHARACTER-IMAGE',
        displayName: 'Dvalin / Desarm',
        sourceGame: 'ie2',
        outputFile: 'tools/assets/reports/test-generic-approval.png',
        sources: [{
          sourceKey: 'source-1',
          sourceType: 'fandom-character-page',
          assetStatus: 'CANDIDATE',
          sourceFilename: 'test-generic-approval.png',
          sourceSuitability: 'GENERIC-CHARACTER-IMAGE',
          outputFile: 'tools/assets/reports/test-generic-approval.png'
        }]
      }]
    }), /not a game portrait\/sprite candidate/);
  } finally {
    await rm(file, { force: true });
  }
});

test('finalization fails as ambiguous when multiple suitable candidates exist and approval does not identify one', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let verifiedRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [
      { sourceKey: 'sprite-a', sourceType: 'fandom-file', sourceAssetId: 'File:(E) Desarm sprite.png', sourceSuitability: 'GAME-SPRITE' },
      { sourceKey: 'sprite-b', sourceType: 'fandom-file', sourceAssetId: 'File:Desarm Portrait Alt.png', sourceSuitability: 'GAME-PORTRAIT' }
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    await writeFile(approvalsPath, `${JSON.stringify(approvals(), null, 2)}\n`);
    const samplePng = png(2, 2);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoVerifiedRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    await assert.rejects(() => runAssetFactory({
      manifestPath,
      stagingRoot,
      verifiedRoot,
      reportsRoot,
      approvalsPath,
      finalizeApprovals: true,
      fetchImpl: async url => ({
        ok: true,
        json: async () => ({ query: { pages: { 1: { title: url.includes('Alt') ? 'File:Desarm Portrait Alt.png' : 'File:(E) Desarm sprite.png', imageinfo: [{ url }] } } } }),
        arrayBuffer: async () => samplePng,
        status: 200,
        url
      })
    }), /Ambiguous approval candidate/);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (verifiedRoot) await rm(verifiedRoot, { recursive: true, force: true });
    if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('finalization is idempotent for the same verified binary and refuses conflicting overwrite', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fq-factory-'));
  let stagingRoot;
  let verifiedRoot;
  let reportsRoot;
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    const approvalsPath = path.join(directory, 'approvals.json');
    const manifestData = manifest();
    manifestData.targets[0].sourceCandidates = [{
      sourceType: 'fandom-file',
      sourceAssetId: 'File:(E) Desarm sprite.png',
      sourceSuitability: 'GAME-SPRITE'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
    const samplePng = png(2, 2);
    const otherPng = png(3, 3);
    await mkdir(repoStagingRoot, { recursive: true });
    await mkdir(repoVerifiedRoot, { recursive: true });
    await mkdir(repoReportsRoot, { recursive: true });
    stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
    verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
    reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
    const candidatePath = relativeCandidatePath(stagingRoot, 'dvalin:epsilon-ie2', 'game-sprite', '(E) Desarm sprite.png');
    await writeFile(approvalsPath, `${JSON.stringify(approvals({ candidatePath, sourceFilename: '(E) Desarm sprite.png' }), null, 2)}\n`);
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ query: { pages: { 1: { title: 'File:(E) Desarm sprite.png', imageinfo: [{ url: 'https://static.example.invalid/desarm.png' }] } } } }),
      arrayBuffer: async () => samplePng,
      status: 200
    });
    await runAssetFactory({ manifestPath, stagingRoot, verifiedRoot, reportsRoot, approvalsPath, captureApprovalHashes: true, fetchImpl });
    const first = await runAssetFactory({ manifestPath, stagingRoot, verifiedRoot, reportsRoot, approvalsPath, finalizeApprovals: true, fetchImpl: async () => { throw new Error('should not fetch'); } });
    const second = await runAssetFactory({ manifestPath, stagingRoot, verifiedRoot, reportsRoot, approvalsPath, finalizeApprovals: true, fetchImpl: async () => { throw new Error('should not fetch'); } });
    assert.equal(first.targets[0].verifiedFile, second.targets[0].verifiedFile);
    const conflictingPath = path.join(repoRoot, second.targets[0].verifiedFile);
    await writeFile(conflictingPath, otherPng);
    await assert.rejects(() => runAssetFactory({
      manifestPath,
      stagingRoot,
      verifiedRoot,
      reportsRoot,
      approvalsPath,
      finalizeApprovals: true,
      fetchImpl: async () => { throw new Error('should not fetch'); }
    }), /Immutable staging collision/);
  } finally {
    if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
    if (verifiedRoot) await rm(verifiedRoot, { recursive: true, force: true });
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
      manifestData.targets[0].sourceCandidates = [{
        sourceType: 'fandom-file',
        sourceAssetId: 'File:Desarm Portrait.png',
        sourceSuitability: 'GAME-SPRITE'
      }];
      await writeFile(manifestPath, `${JSON.stringify(manifestData, null, 2)}\n`);
      await mkdir(repoStagingRoot, { recursive: true });
      await mkdir(repoReportsRoot, { recursive: true });
      stagingRoot = await mkdtemp(path.join(repoStagingRoot, 'test-staging-'));
      reportsRoot = await mkdtemp(path.join(repoReportsRoot, 'test-reports-'));
      const candidateDir = path.join(stagingRoot, 'originals', 'dvalin-epsilon-ie2', 'game-sprite');
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
      assert.equal(report.targets[0].sourceSuitability, 'GAME-SPRITE');
      assert.match(report.targets[0].contactSheetImageUrl, /^\.\.\/\.\.\/staging\/.*Desarm%20Portrait\.png$/);
    } finally {
      if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
      if (reportsRoot) await rm(reportsRoot, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
});

test('staging root must not overlap runtime assets', async () => {
  await mkdir(repoStagingRoot, { recursive: true });
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

test('verified root must not overlap runtime assets', async () => {
  await mkdir(repoVerifiedRoot, { recursive: true });
  const verifiedRoot = await mkdtemp(path.join(repoVerifiedRoot, 'test-verified-'));
  try {
    await assert.rejects(() => ensureSafeVerified({
      verifiedRoot,
      runtimeDir: path.join(repoRoot, 'tools/assets')
    }), /must not overlap runtime assets/);
  } finally {
    await rm(verifiedRoot, { recursive: true, force: true });
  }
});
