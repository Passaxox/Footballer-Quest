import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { inspectPng, webpDimensions } from '../../frontend/scripts/asset-audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const toolsRoot = path.resolve(root, 'tools/assets');
const runtimeSpritesDir = path.resolve(root, 'frontend/public/sprites');
const defaultManifestPath = path.resolve(toolsRoot, 'manifests/epsilon-ie2-poc.json');
const defaultOutputRoot = path.resolve(toolsRoot, 'staging/epsilon-ie2-poc');
const defaultReportsRoot = path.resolve(toolsRoot, 'reports');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const jpegSof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const defaultStatus = { identityStatus: 'VERSION-VERIFIED', sourceStatus: 'UNASSESSED', versionStatus: 'VERSION-VERIFIED', assetStatus: 'UNASSESSED' };

const mimeExtension = mime => ({ 'image/png': '.png', 'image/webp': '.webp', 'image/jpeg': '.jpg', 'image/gif': '.gif' }[mime] ?? '');
const toPosix = value => value.split(path.sep).join('/');
const unique = values => [...new Set(values.filter(Boolean))];

function relativeFromRoot(file) {
  return toPosix(path.relative(root, file));
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function isSubpath(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeFileTitle(title) {
  if (!title) return null;
  return /^File:/i.test(title) ? title.replace(/^File:/i, 'File:') : `File:${title}`;
}

function filenameFromFileTitle(title) {
  return normalizeFileTitle(title)?.replace(/^File:/, '') ?? null;
}

function classificationFromError(error) {
  const message = String(error?.message ?? error);
  const cause = String(error?.cause?.code ?? '');
  if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(cause) || /fetch failed|timed out|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|TLS/i.test(message)) {
    return { sourceStatus: 'SOURCE-ACCESS-BLOCKED', code: 'SOURCE_ACCESS_BLOCKED', message };
  }
  return { sourceStatus: 'REVIEW', code: 'SOURCE_RESOLUTION_ERROR', message };
}

function parsePngAlpha(buffer) {
  let offset = 8;
  let color = null;
  let seenTrns = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') color = buffer[offset + 17];
    if (type === 'tRNS') seenTrns = true;
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return color === 4 || color === 6 || seenTrns;
}

function parseJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('JPEG signature missing');
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const size = buffer.readUInt16BE(offset);
    if (size < 2 || offset + size > buffer.length) throw new Error('Invalid JPEG segment size');
    if (jpegSof.has(marker)) {
      if (size < 7) throw new Error('Invalid JPEG SOF');
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3), mime: 'image/jpeg', format: 'JPEG', hasAlpha: false };
    }
    offset += size;
  }
  throw new Error('JPEG dimensions unavailable');
}

function parseGifDimensions(buffer) {
  const header = buffer.toString('ascii', 0, 6);
  if (!['GIF87a', 'GIF89a'].includes(header) || buffer.length < 10) throw new Error('GIF signature missing');
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), mime: 'image/gif', format: 'GIF', hasAlpha: null };
}

function parseWebpMetadata(buffer) {
  const dimensions = webpDimensions(buffer);
  let hasAlpha = false;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const data = buffer.subarray(start, start + size);
    if (type === 'VP8X' && size >= 1) hasAlpha = !!(data[0] & 0x10);
    if (type === 'VP8L') hasAlpha = true;
    offset = start + size + (size % 2);
  }
  return { ...dimensions, mime: 'image/webp', format: 'WEBP', hasAlpha };
}

export function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function detectImageSignature(buffer) {
  if (buffer.subarray(0, 8).equals(pngSignature)) {
    const dimensions = inspectPng(buffer);
    return { ...dimensions, mime: 'image/png', format: 'PNG', hasAlpha: parsePngAlpha(buffer) };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return parseWebpMetadata(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return parseJpegDimensions(buffer);
  if (buffer.toString('ascii', 0, 3) === 'GIF') return parseGifDimensions(buffer);
  throw new Error('Unsupported or unrecognized image signature');
}

export function validateManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1) throw new Error('Unsupported manifest schemaVersion');
  if (!manifest.manifestId || typeof manifest.manifestId !== 'string') throw new Error('manifestId is required');
  if (!Array.isArray(manifest.targets) || !manifest.targets.length) throw new Error('targets[] is required');
  const versionIds = new Set();
  for (const target of manifest.targets) {
    for (const key of ['canonicalCharacterId', 'versionId', 'displayName', 'teamId', 'sourceGame', 'sourceType']) {
      if (typeof target[key] !== 'string' || !target[key]) throw new Error(`Target missing ${key}`);
    }
    if (versionIds.has(target.versionId)) throw new Error(`Duplicate versionId: ${target.versionId}`);
    if (target.assetStatus === 'ASSET-VERIFIED') throw new Error(`Target ${target.versionId} must not start as ASSET-VERIFIED`);
    versionIds.add(target.versionId);
  }
  return manifest;
}

export function detectDuplicateCandidates(targets) {
  const groups = new Map();
  for (const target of targets) {
    if (!target.sha256) continue;
    const list = groups.get(target.sha256) ?? [];
    list.push(target.versionId);
    groups.set(target.sha256, list);
  }
  return [...groups.entries()].filter(([, versionIds]) => versionIds.length > 1).map(([sha256, versionIds]) => ({ sha256, versionIds }));
}

export async function hashDirectory(directory) {
  const entries = [];
  async function walk(current) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) entries.push({ path: relativeFromRoot(target), sha256: sha256Hex(await readFile(target)) });
    }
  }
  await walk(directory);
  return entries;
}

export async function writeImmutableFile(file, buffer) {
  try {
    await writeFile(file, buffer, { flag: 'wx' });
    return { reused: false, file };
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await readFile(file);
    if (!existing.equals(buffer)) throw new Error(`Immutable staging collision: ${relativeFromRoot(file)}`);
    return { reused: true, file };
  }
}

export async function ensureSafeStaging({ stagingRoot, runtimeDir }) {
  const resolvedStaging = path.resolve(stagingRoot);
  const resolvedRuntime = path.resolve(runtimeDir);
  if (!isSubpath(path.resolve(root, 'tools/assets'), resolvedStaging)) throw new Error('Staging root must stay under tools/assets');
  if (isSubpath(resolvedRuntime, resolvedStaging)) throw new Error('Staging root must not overlap runtime assets');
  await mkdir(resolvedStaging, { recursive: true });
  return resolvedStaging;
}

export class FandomMediaWikiAdapter {
  constructor({ baseUrl, fetchImpl = globalThis.fetch } = {}) {
    if (!baseUrl) throw new Error('baseUrl is required');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
    this.apiUrl = `${this.baseUrl}/api.php`;
  }

  async request(url, { responseType = 'json' } = {}) {
    try {
      const response = await this.fetchImpl(url, { redirect: 'follow', headers: { 'user-agent': 'FootballerQuestAssetFactory/1.0' } });
      if (!response.ok) {
        if ([401, 403, 404, 429, 500, 502, 503, 504].includes(response.status)) {
          const error = new Error(`Source request failed: ${response.status}`);
          error.cause = { code: `HTTP_${response.status}` };
          throw error;
        }
        throw new Error(`Unexpected response status ${response.status}`);
      }
      return responseType === 'buffer' ? Buffer.from(await response.arrayBuffer()) : response.json();
    } catch (error) {
      throw Object.assign(new Error(error.message), { cause: error.cause ?? error });
    }
  }

  async resolveTarget(target) {
    const title = encodeURIComponent(target.sourceRef);
    const pageData = await this.request(`${this.apiUrl}?action=query&format=json&prop=pageimages&piprop=name|original&titles=${title}`);
    const page = Object.values(pageData?.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined) return { sourceStatus: 'SOURCE-MISSING', note: `Missing source page ${target.sourceRef}` };
    const fileTitle = normalizeFileTitle(target.sourceAssetId ?? page.pageimage);
    const originalUrl = page?.original?.source ?? (fileTitle ? `${this.baseUrl}/wiki/Special:FilePath/${encodeURIComponent(filenameFromFileTitle(fileTitle))}` : null);
    if (!fileTitle || !originalUrl) return { sourceStatus: 'SOURCE-MISSING', note: `No exact file title resolved for ${target.sourceRef}` };
    return { sourceStatus: 'SOURCE-CANDIDATE', fileTitle, binaryUrl: originalUrl, note: `Resolved from exact character page ${target.sourceRef}` };
  }

  async downloadBinary(url) {
    return this.request(url, { responseType: 'buffer' });
  }
}

function applyDuplicateAnnotations(targets) {
  for (const duplicate of detectDuplicateCandidates(targets)) {
    const [primary, ...rest] = duplicate.versionIds;
    for (const versionId of rest) {
      const target = targets.find(entry => entry.versionId === versionId);
      if (!target) continue;
      target.visualReuseFrom = primary;
      target.validationWarnings = unique([...(target.validationWarnings ?? []), `EXACT_DUPLICATE_BINARY:${primary}`]);
    }
  }
}

function summarizeResults(results) {
  const count = key => results.filter(item => item.assetStatus === key).length;
  const sourceCount = key => results.filter(item => item.sourceStatus === key).length;
  return {
    targetCount: results.length,
    candidateCount: count('CANDIDATE'),
    reviewCount: count('REVIEW'),
    assetGapCount: count('ASSET-GAP'),
    unassessedCount: count('UNASSESSED'),
    sourceBlockedCount: sourceCount('SOURCE-ACCESS-BLOCKED'),
    sourceMissingCount: sourceCount('SOURCE-MISSING')
  };
}

export function reportStatus(results) {
  if (results.length && results.every(item => item.assetStatus === 'CANDIDATE')) return 'PASS';
  if (results.some(item => item.assetStatus === 'CANDIDATE')) return 'PARTIAL';
  return 'BLOCKED';
}

function renderContactSheet(report) {
  const cards = report.targets.map(target => {
    const image = target.outputFile ? `<img src="../../${target.outputFile}" alt="${target.displayName}" />` : `<div class="placeholder">NO CANDIDATE</div>`;
    return `<article class="card">
  <div class="thumb">${image}</div>
  <h2>${target.displayName}</h2>
  <dl>
    <div><dt>Version</dt><dd>${target.versionId}</dd></div>
    <div><dt>Team/Game</dt><dd>${target.teamId} / ${target.sourceGame}</dd></div>
    <div><dt>Source</dt><dd>${target.sourceAssetId ?? target.sourceRef ?? 'unresolved'}</dd></div>
    <div><dt>Resolution</dt><dd>${target.width && target.height ? `${target.width}×${target.height}` : 'n/a'}</dd></div>
    <div><dt>Status</dt><dd>${target.assetStatus}</dd></div>
  </dl>
</article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${report.title}</title>
<style>
body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:24px}
h1{margin-bottom:8px} p{margin-top:0;color:#bbb}
.grid{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:16px}
.card{border:1px solid #444;border-radius:8px;padding:12px;background:#1b1b1b}
.thumb{height:220px;display:flex;align-items:center;justify-content:center;background:#222;border:1px solid #333;margin-bottom:12px}
.thumb img{max-width:100%;max-height:100%;image-rendering:pixelated}
.placeholder{font-weight:700;color:#ffb4b4}
dl{margin:0;display:grid;gap:6px}
dt{font-size:12px;color:#9aa} dd{margin:0}
</style>
</head>
<body>
<h1>${report.title}</h1>
<p>Status: ${report.status}. Human visual approval is still required for every candidate.</p>
<section class="grid">${cards}</section>
</body>
</html>
`;
}

function renderMarkdown(report) {
  const lines = [
    `# ${report.title}`,
    '',
    `- Status: **${report.status}**`,
    `- Manifest: \`${report.manifestPath}\``,
    `- Contact sheet: \`${report.contactSheetPath}\``,
    `- Runtime integration performed: **no**`,
    `- Human review required for every candidate: **yes**`,
    '',
    '| Target | Source status | Asset status | Source file | Candidate path | Warnings |',
    '| --- | --- | --- | --- | --- | --- |'
  ];
  for (const target of report.targets) {
    lines.push(`| ${target.displayName} | ${target.sourceStatus} | ${target.assetStatus} | ${target.sourceAssetId ?? 'n/a'} | ${target.outputFile ?? 'n/a'} | ${(target.validationWarnings ?? []).join('<br>') || '—'} |`);
  }
  return `${lines.join('\n')}\n`;
}

export async function runAssetFactory({ manifestPath = defaultManifestPath, stagingRoot = defaultOutputRoot, reportsRoot = defaultReportsRoot, fetchImpl = globalThis.fetch } = {}) {
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const adapter = new FandomMediaWikiAdapter({ baseUrl: manifest.wikiBaseUrl ?? 'https://inazuma-eleven.fandom.com', fetchImpl });
  const stagingDir = await ensureSafeStaging({ stagingRoot, runtimeDir: runtimeSpritesDir });
  const originalsDir = path.join(stagingDir, 'originals');
  await mkdir(originalsDir, { recursive: true });
  await mkdir(reportsRoot, { recursive: true });
  const targets = [];
  for (const source of manifest.targets) {
    const target = structuredClone({ ...source, ...defaultStatus, ...source, verificationEvidence: [...(source.verificationEvidence ?? [])], validationWarnings: [...(source.validationWarnings ?? [])] });
    try {
      const resolved = await adapter.resolveTarget(target);
      target.sourceStatus = resolved.sourceStatus;
      if (resolved.fileTitle) target.sourceAssetId = resolved.fileTitle;
      if (resolved.binaryUrl) target.resolvedBinaryUrl = resolved.binaryUrl;
      if (resolved.note) target.provenanceNote = unique([target.provenanceNote, resolved.note]).join(' ');
      if (resolved.sourceStatus !== 'SOURCE-CANDIDATE') {
        target.assetStatus = resolved.sourceStatus === 'SOURCE-MISSING' ? 'ASSET-GAP' : 'UNASSESSED';
        targets.push(target);
        continue;
      }
      const buffer = await adapter.downloadBinary(resolved.binaryUrl);
      const signature = detectImageSignature(buffer);
      const fileName = filenameFromFileTitle(resolved.fileTitle) ?? `${safeName(target.versionId)}${mimeExtension(signature.mime)}`;
      const destination = path.join(originalsDir, safeName(target.versionId), fileName);
      if (!isSubpath(stagingDir, destination) || isSubpath(runtimeSpritesDir, destination)) throw new Error('Unsafe staging destination');
      await mkdir(path.dirname(destination), { recursive: true });
      const staged = await writeImmutableFile(destination, buffer);
      target.outputFile = relativeFromRoot(destination);
      target.width = signature.width;
      target.height = signature.height;
      target.mimeType = signature.mime;
      target.detectedFormat = signature.format;
      target.hasAlpha = signature.hasAlpha;
      target.backgroundRemoved = false;
      target.contentBounds = null;
      target.sourceStatus = 'SOURCE-VERIFIED';
      target.assetStatus = 'CANDIDATE';
      target.sha256 = sha256Hex(buffer);
      target.validationWarnings = unique([
        ...target.validationWarnings,
        staged.reused ? 'IMMUTABLE_REUSE' : null,
        signature.hasAlpha === null ? 'ALPHA_UNCONFIRMED' : null
      ]);
      target.verificationEvidence = unique([...target.verificationEvidence, 'exact-character-page', 'resolved-file-title', 'binary-signature-validated']);
      target.provenanceNote = unique([target.provenanceNote, `Original downloaded filename preserved as ${fileName}.`, `Detected ${signature.mime} ${signature.width}x${signature.height}; alpha=${signature.hasAlpha === null ? 'unknown' : signature.hasAlpha}.`]).join(' ');
    } catch (error) {
      const issue = classificationFromError(error);
      target.sourceStatus = issue.sourceStatus;
      target.assetStatus = issue.sourceStatus === 'SOURCE-ACCESS-BLOCKED' ? 'UNASSESSED' : 'REVIEW';
      target.validationWarnings = unique([...target.validationWarnings, `${issue.code}:${issue.message}`]);
    }
    targets.push(target);
  }
  applyDuplicateAnnotations(targets);
  const report = {
    schemaVersion: 1,
    manifestId: manifest.manifestId,
    title: manifest.title,
    generatedAt: new Date().toISOString(),
    manifestPath: relativeFromRoot(manifestPath),
    stagingRoot: relativeFromRoot(stagingDir),
    contactSheetPath: relativeFromRoot(path.join(reportsRoot, `${manifest.manifestId}.contact-sheet.html`)),
    markdownReportPath: relativeFromRoot(path.join(reportsRoot, `${manifest.manifestId}.report.md`)),
    runtimeSpritesPath: relativeFromRoot(runtimeSpritesDir),
    status: reportStatus(targets),
    summary: summarizeResults(targets),
    targets
  };
  await writeFile(path.join(reportsRoot, `${manifest.manifestId}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(reportsRoot, `${manifest.manifestId}.report.md`), renderMarkdown(report));
  await writeFile(path.join(reportsRoot, `${manifest.manifestId}.contact-sheet.html`), renderContactSheet(report));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({
      options: {
        manifest: { type: 'string' },
        staging: { type: 'string' },
        reports: { type: 'string' }
      }
    });
    const report = await runAssetFactory({
      manifestPath: values.manifest ? path.resolve(values.manifest) : defaultManifestPath,
      stagingRoot: values.staging ? path.resolve(values.staging) : defaultOutputRoot,
      reportsRoot: values.reports ? path.resolve(values.reports) : defaultReportsRoot
    });
    console.log(JSON.stringify({ status: report.status, manifestId: report.manifestId, summary: report.summary, report: `${report.manifestId}.report.json` }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
