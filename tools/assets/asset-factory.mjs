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
const defaultApprovalsPath = path.resolve(toolsRoot, 'approvals/epsilon-ie2-poc.approvals.json');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const jpegSof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const defaultStatus = { identityStatus: 'VERSION-VERIFIED', sourceStatus: 'UNASSESSED', versionStatus: 'VERSION-VERIFIED', assetStatus: 'UNASSESSED' };
const acceptableSourceSuitability = new Set(['GAME-PORTRAIT', 'GAME-SPRITE']);
const approvableAssetStatus = new Set(['CANDIDATE', 'ASSET-VERIFIED']);

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

function defaultSourceSuitability({ sourceType, sourceAssetId }) {
  if (sourceType === 'fandom-character-page') return 'GENERIC-CHARACTER-IMAGE';
  if (typeof sourceAssetId === 'string' && /\b(sprite|avatar|overworld|character view)\b/i.test(sourceAssetId)) return 'GAME-SPRITE';
  if (typeof sourceAssetId === 'string' && /\b(portrait|headshot)\b/i.test(sourceAssetId)) return 'GAME-PORTRAIT';
  return 'REVIEW';
}

function candidateFileUrls(baseUrl, fileTitle) {
  const encodedTitle = encodeURIComponent(fileTitle);
  const filename = encodeURIComponent(filenameFromFileTitle(fileTitle));
  return unique([
    `${baseUrl}/wiki/Special:Redirect/file/${encodedTitle}`,
    `${baseUrl}/wiki/Special:FilePath/${filename}`
  ]);
}

function encodePathForUrl(file) {
  return file.split(path.sep).map(segment => encodeURIComponent(segment)).join('/');
}

function relativeAssetUrl(fromFile, toFile) {
  return encodePathForUrl(path.relative(path.dirname(fromFile), toFile));
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

export function validateApprovals(document, manifestId = null) {
  if (!document || document.schemaVersion !== 1) throw new Error('Unsupported approvals schemaVersion');
  if (!document.manifestId || typeof document.manifestId !== 'string') throw new Error('approvals manifestId is required');
  if (manifestId && document.manifestId !== manifestId) throw new Error(`Approval manifest mismatch: expected ${manifestId}`);
  if (!Array.isArray(document.approvals)) throw new Error('approvals[] is required');
  const versionIds = new Set();
  for (const approval of document.approvals) {
    if (typeof approval.versionId !== 'string' || !approval.versionId) throw new Error('Approval versionId is required');
    if (versionIds.has(approval.versionId)) throw new Error(`Duplicate approval versionId: ${approval.versionId}`);
    if (approval.decision !== 'ASSET-VERIFIED') throw new Error(`Unsupported approval decision for ${approval.versionId}`);
    if (approval.sha256 !== null && approval.sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(approval.sha256)) {
      throw new Error(`Approval sha256 must be 64 hex chars for ${approval.versionId}`);
    }
    versionIds.add(approval.versionId);
  }
  return document;
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

async function loadPreviousReport(reportPath) {
  try {
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const byVersionId = new Map((report.targets ?? []).map(target => [target.versionId, target]));
    return byVersionId;
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map();
    throw error;
  }
}

async function loadApprovals(approvalsPath, manifestId) {
  if (!approvalsPath) return null;
  const document = JSON.parse(await readFile(approvalsPath, 'utf8'));
  return validateApprovals(document, manifestId);
}

async function writeApprovals(approvalsPath, approvals) {
  await mkdir(path.dirname(approvalsPath), { recursive: true });
  await writeFile(approvalsPath, `${JSON.stringify(approvals, null, 2)}\n`);
}

async function existingOriginalForTarget({ target, originalsDir }) {
  const directory = path.join(originalsDir, safeName(target.versionId));
  try {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));
    if (!entries.length) return null;
    const preferred = filenameFromFileTitle(target.sourceAssetId);
    const filename = preferred && entries.includes(preferred) ? preferred : entries.length === 1 ? entries[0] : null;
    if (!filename) {
      const error = new Error(`Multiple staged originals for ${target.versionId} require explicit sourceAssetId`);
      error.cause = { code: 'MULTIPLE_STAGED_ORIGINALS' };
      throw error;
    }
    const absolutePath = path.join(directory, filename);
    const buffer = await readFile(absolutePath);
    return { absolutePath, filename, buffer, reused: true };
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function sourceSpecsForTarget(target) {
  const candidates = Array.isArray(target.sourceCandidates) && target.sourceCandidates.length
    ? target.sourceCandidates
    : [{
        sourceType: target.sourceType,
        sourceRef: target.sourceRef,
        sourceAssetId: target.sourceAssetId,
        sourceSuitability: target.sourceSuitability
      }];
  return candidates.map((candidate, index) => ({
    sourceKey: candidate.sourceKey ?? `source-${index + 1}`,
    sourceType: candidate.sourceType,
    sourceRef: candidate.sourceRef,
    sourceAssetId: normalizeFileTitle(candidate.sourceAssetId) ?? candidate.sourceAssetId ?? null,
    sourceSuitability: candidate.sourceSuitability ?? defaultSourceSuitability(candidate),
    preserveAsEvidence: candidate.preserveAsEvidence !== false,
    provenanceNote: candidate.provenanceNote ?? null,
    validationWarnings: [...(candidate.validationWarnings ?? [])]
  }));
}

function sourceDirectory(originalsDir, target, source) {
  return path.join(originalsDir, safeName(target.versionId), safeName(source.sourceSuitability || source.sourceKey));
}

async function existingOriginalForSource({ target, source, originalsDir }) {
  const preferred = filenameFromFileTitle(source.sourceAssetId);
  const nested = sourceDirectory(originalsDir, target, source);
  try {
    const files = (await readdir(nested, { withFileTypes: true }))
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));
    if (preferred && files.includes(preferred)) {
      const absolutePath = path.join(nested, preferred);
      return { absolutePath, filename: preferred, buffer: await readFile(absolutePath), reused: true };
    }
    if (!preferred && files.length === 1) {
      const absolutePath = path.join(nested, files[0]);
      return { absolutePath, filename: files[0], buffer: await readFile(absolutePath), reused: true };
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const legacy = await existingOriginalForTarget({ target, originalsDir });
  if (!legacy) return null;
  if (source.sourceSuitability === 'GENERIC-CHARACTER-IMAGE') return legacy;
  if (preferred && legacy.filename === preferred) return legacy;
  return null;
}

function sourceRecordFromSpec(source) {
  return {
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    sourceRef: source.sourceRef ?? null,
    sourceAssetId: source.sourceAssetId ?? null,
    sourceFilename: filenameFromFileTitle(source.sourceAssetId) ?? null,
    sourceSuitability: source.sourceSuitability ?? 'REVIEW',
    sourceStatus: 'UNASSESSED',
    assetStatus: 'UNASSESSED',
    outputFile: null,
    contactSheetImageUrl: null,
    width: null,
    height: null,
    mimeType: null,
    detectedFormat: null,
    hasAlpha: null,
    sha256: null,
    provenanceNote: source.provenanceNote ?? null,
    validationWarnings: [...(source.validationWarnings ?? [])],
    verificationEvidence: []
  };
}

function applyResolvedSourceRecord({ record, reportPath, stagedPath, fileName, buffer, signature, reused }) {
  record.outputFile = relativeFromRoot(stagedPath);
  record.width = signature.width;
  record.height = signature.height;
  record.mimeType = signature.mime;
  record.detectedFormat = signature.format;
  record.hasAlpha = signature.hasAlpha;
  record.sha256 = sha256Hex(buffer);
  record.sourceFilename = fileName;
  record.contactSheetImageUrl = relativeAssetUrl(reportPath, stagedPath);
  record.sourceStatus = 'SOURCE-VERIFIED';
  record.assetStatus = acceptableSourceSuitability.has(record.sourceSuitability) ? 'CANDIDATE' : 'REVIEW';
  record.validationWarnings = unique([
    ...record.validationWarnings,
    reused ? 'IMMUTABLE_REUSE' : null,
    signature.hasAlpha === null ? 'ALPHA_UNCONFIRMED' : null,
    record.assetStatus === 'REVIEW' ? `SOURCE_UNSUITABLE:${record.sourceSuitability}` : null
  ]);
  record.verificationEvidence = unique([
    ...record.verificationEvidence,
    reused ? 'existing-staged-original' : 'binary-signature-validated'
  ]);
  record.provenanceNote = unique([
    record.provenanceNote,
    `Original downloaded filename preserved as ${fileName}.`,
    reused ? 'Regenerated report/contact sheet from existing staged original without redownload.' : null,
    `Detected ${signature.mime} ${signature.width}x${signature.height}; alpha=${signature.hasAlpha === null ? 'unknown' : signature.hasAlpha}.`
  ]).join(' ');
}

function applyCandidateMetadata({ target, reportPath, stagedPath, fileName, buffer, signature, reused }) {
  target.outputFile = relativeFromRoot(stagedPath);
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
  target.sourceFilename = fileName;
  target.contactSheetImageUrl = relativeAssetUrl(reportPath, stagedPath);
  target.validationWarnings = unique([
    ...target.validationWarnings,
    reused ? 'IMMUTABLE_REUSE' : null,
    signature.hasAlpha === null ? 'ALPHA_UNCONFIRMED' : null
  ]);
  target.verificationEvidence = unique([...target.verificationEvidence, reused ? 'existing-staged-original' : 'binary-signature-validated']);
  target.provenanceNote = unique([
    target.provenanceNote,
    `Original downloaded filename preserved as ${fileName}.`,
    reused ? 'Regenerated report/contact sheet from existing staged original without redownload.' : null,
    `Detected ${signature.mime} ${signature.width}x${signature.height}; alpha=${signature.hasAlpha === null ? 'unknown' : signature.hasAlpha}.`
  ]).join(' ');
}

function targetStatusFromSources(target) {
  if (target.sources.some(source => source.assetStatus === 'CANDIDATE')) return 'CANDIDATE';
  if (target.sources.some(source => source.assetStatus === 'REVIEW')) return 'REVIEW';
  if (target.sources.length && target.sources.every(source => source.sourceStatus === 'SOURCE-MISSING')) return 'ASSET-GAP';
  if (target.sources.some(source => source.sourceStatus === 'SOURCE-ACCESS-BLOCKED')) return 'UNASSESSED';
  return 'UNASSESSED';
}

function preferredSourceForTarget(target) {
  return target.sources.find(source => source.assetStatus === 'CANDIDATE')
    ?? target.sources.find(source => source.assetStatus === 'REVIEW')
    ?? target.sources[0]
    ?? null;
}

function applyPreferredSource(target, preferred) {
  if (!preferred) return;
  target.sourceType = preferred.sourceType;
  target.sourceRef = preferred.sourceRef;
  target.sourceAssetId = preferred.sourceAssetId;
  target.sourceFilename = preferred.sourceFilename;
  target.sourceSuitability = preferred.sourceSuitability;
  target.sourceStatus = preferred.sourceStatus;
  target.assetStatus = targetStatusFromSources(target);
  target.outputFile = preferred.outputFile;
  target.contactSheetImageUrl = preferred.contactSheetImageUrl;
  target.width = preferred.width;
  target.height = preferred.height;
  target.mimeType = preferred.mimeType;
  target.detectedFormat = preferred.detectedFormat;
  target.hasAlpha = preferred.hasAlpha;
  target.sha256 = preferred.sha256;
  target.validationWarnings = unique([
    ...(target.validationWarnings ?? []),
    ...target.sources.flatMap(source => source.validationWarnings ?? [])
  ]);
  target.verificationEvidence = unique([
    ...(target.verificationEvidence ?? []),
    ...target.sources.flatMap(source => source.verificationEvidence ?? [])
  ]);
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

  async resolveSource(source) {
    if (source.sourceType === 'fandom-file') {
      const fileTitle = normalizeFileTitle(source.sourceAssetId ?? source.sourceRef);
      if (!fileTitle) return { sourceStatus: 'SOURCE-MISSING', note: 'Missing exact file title' };
      const fallbackUrls = candidateFileUrls(this.baseUrl, fileTitle);
      try {
        const query = `${this.apiUrl}?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(fileTitle)}`;
        const data = await this.request(query);
        const page = Object.values(data?.query?.pages ?? {})[0];
        if (!page || page.missing !== undefined) return { sourceStatus: 'SOURCE-MISSING', note: `Missing exact file title ${fileTitle}` };
        const resolvedTitle = normalizeFileTitle(page.title ?? fileTitle);
        const imageInfoUrl = page.imageinfo?.[0]?.url ?? null;
        const urls = unique([imageInfoUrl, ...candidateFileUrls(this.baseUrl, resolvedTitle)]);
        return {
          sourceStatus: 'SOURCE-CANDIDATE',
          fileTitle: resolvedTitle,
          binaryUrl: urls[0],
          alternateBinaryUrls: urls.slice(1),
          note: `Resolved exact file title ${resolvedTitle} via MediaWiki imageinfo`
        };
      } catch (error) {
        return {
          sourceStatus: 'SOURCE-CANDIDATE',
          fileTitle,
          binaryUrl: fallbackUrls[0],
          alternateBinaryUrls: fallbackUrls.slice(1),
          note: `MediaWiki imageinfo lookup failed for ${fileTitle}; using deterministic file URL fallback`
        };
      }
    }
    return this.resolveTarget(source);
  }

  async downloadBinary(url, alternateUrls = []) {
    const attempts = unique([url, ...alternateUrls]);
    let lastError = null;
    const failures = [];
    for (const candidate of attempts) {
      try {
        return await this.request(candidate, { responseType: 'buffer' });
      } catch (error) {
        lastError = error;
        failures.push(`${candidate}: ${error.message}`);
      }
    }
    const failure = new Error(failures.join(' | ') || 'All source downloads failed');
    failure.cause = lastError?.cause ?? lastError;
    throw failure;
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

async function verifiedBinaryHash(target) {
  if (!target.outputFile) throw new Error(`Missing staged binary for approval target ${target.versionId}`);
  try {
    return sha256Hex(await readFile(path.resolve(root, target.outputFile)));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Missing staged binary for approval target ${target.versionId}`);
    throw error;
  }
}

export async function finalizeApprovalHashes({ approvals, targets, approvalsPath }) {
  const byVersionId = new Map(targets.map(target => [target.versionId, target]));
  for (const approval of approvals.approvals) {
    if (approval.decision !== 'ASSET-VERIFIED' || approval.sha256) continue;
    const target = byVersionId.get(approval.versionId);
    if (!target) throw new Error(`Approval target not found: ${approval.versionId}`);
    if (target.assetStatus !== 'CANDIDATE') throw new Error(`Approval target ${approval.versionId} requires a candidate staged binary`);
    if (!acceptableSourceSuitability.has(target.sourceSuitability)) throw new Error(`Approval target ${approval.versionId} is not a game portrait/sprite candidate`);
    approval.sha256 = await verifiedBinaryHash(target);
  }
  await writeApprovals(approvalsPath, approvals);
}

export async function applyHumanApprovals({ approvals, targets, approvalsPath }) {
  const byVersionId = new Map(targets.map(target => [target.versionId, target]));
  for (const approval of approvals.approvals) {
    if (approval.decision !== 'ASSET-VERIFIED' || !approval.sha256) continue;
    const target = byVersionId.get(approval.versionId);
    if (!target) throw new Error(`Approval target not found: ${approval.versionId}`);
    if (target.assetStatus !== 'CANDIDATE') throw new Error(`Approval target ${approval.versionId} requires a candidate staged binary`);
    if (!acceptableSourceSuitability.has(target.sourceSuitability)) throw new Error(`Approval target ${approval.versionId} is not a game portrait/sprite candidate`);
    const preferred = preferredSourceForTarget(target);
    if (!preferred || preferred.assetStatus !== 'CANDIDATE' || !acceptableSourceSuitability.has(preferred.sourceSuitability)) {
      throw new Error(`Approval target ${approval.versionId} is not a game portrait/sprite candidate`);
    }
    const actualHash = await verifiedBinaryHash(target);
    if (actualHash !== approval.sha256) throw new Error(`Approval hash mismatch for ${approval.versionId}`);
    target.assetStatus = 'ASSET-VERIFIED';
    target.sha256 = actualHash;
    target.verificationEvidence = unique([...(target.verificationEvidence ?? []), 'human-approval']);
    target.provenanceNote = unique([
      target.provenanceNote,
      `Explicit human approval recorded in ${relativeFromRoot(approvalsPath)}.`
    ]).join(' ');
    target.approval = { decision: approval.decision, sha256: actualHash };
    for (const source of target.sources ?? []) {
      if (source.outputFile === target.outputFile && source.assetStatus === 'CANDIDATE' && acceptableSourceSuitability.has(source.sourceSuitability)) {
        source.assetStatus = 'ASSET-VERIFIED';
        source.sha256 = actualHash;
        source.verificationEvidence = unique([...(source.verificationEvidence ?? []), 'human-approval']);
        source.provenanceNote = unique([
          source.provenanceNote,
          `Explicit human approval recorded in ${relativeFromRoot(approvalsPath)}.`
        ]).join(' ');
      }
    }
  }
}

function summarizeResults(results) {
  const count = key => results.filter(item => item.assetStatus === key).length;
  const sourceCount = key => results.filter(item => item.sourceStatus === key).length;
  return {
    targetCount: results.length,
    verifiedCount: count('ASSET-VERIFIED'),
    candidateCount: count('CANDIDATE'),
    reviewCount: count('REVIEW'),
    assetGapCount: count('ASSET-GAP'),
    unassessedCount: count('UNASSESSED'),
    sourceBlockedCount: sourceCount('SOURCE-ACCESS-BLOCKED'),
    sourceMissingCount: sourceCount('SOURCE-MISSING')
  };
}

export function reportStatus(results) {
  if (results.length && results.every(item => approvableAssetStatus.has(item.assetStatus))) return 'PASS';
  if (results.some(item => approvableAssetStatus.has(item.assetStatus))) return 'PARTIAL';
  return 'BLOCKED';
}

function renderContactSheet(report) {
  const cards = report.targets.map(target => {
    const sourceCards = (target.sources?.length ? target.sources : [target]).map(source => {
      const image = source.contactSheetImageUrl ? `<img src="${source.contactSheetImageUrl}" alt="${target.displayName}" />` : `<div class="placeholder">NO CANDIDATE</div>`;
      return `<section class="source">
  <div class="thumb">${image}</div>
  <dl>
    <div><dt>Source filename</dt><dd>${source.sourceFilename ?? filenameFromFileTitle(source.sourceAssetId) ?? 'n/a'}</dd></div>
    <div><dt>Suitability</dt><dd>${source.sourceSuitability ?? 'n/a'}</dd></div>
    <div><dt>Resolution</dt><dd>${source.width && source.height ? `${source.width}×${source.height}` : 'n/a'}</dd></div>
    <div><dt>Status</dt><dd>${source.assetStatus}</dd></div>
  </dl>
</section>`;
    }).join('\n');
    return `<article class="card">
  <h2>${target.displayName}</h2>
  <dl>
    <div><dt>Version</dt><dd>${target.versionId}</dd></div>
    <div><dt>Team/Game</dt><dd>${target.teamId} / ${target.sourceGame}</dd></div>
    <div><dt>Target status</dt><dd>${target.assetStatus}</dd></div>
  </dl>
  <div class="sources">${sourceCards}</div>
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
.sources{display:grid;gap:12px}
.source{border:1px solid #333;border-radius:6px;padding:10px;background:#161616}
.thumb{height:220px;display:flex;align-items:center;justify-content:center;background:#222;border:1px solid #333;margin-bottom:12px}
.thumb img{max-width:100%;max-height:100%;image-rendering:pixelated}
.placeholder{font-weight:700;color:#ffb4b4}
dl{margin:0;display:grid;gap:6px}
dt{font-size:12px;color:#9aa} dd{margin:0}
</style>
</head>
<body>
<h1>${report.title}</h1>
<p>Status: ${report.status}. ASSET-VERIFIED appears only for explicit matching approvals; unapproved candidates still require human review.</p>
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
    `- Approvals: \`${report.approvalsPath ?? 'none'}\``,
    `- Contact sheet: \`${report.contactSheetPath}\``,
    `- Runtime integration performed: **no**`,
    `- ASSET-VERIFIED requires explicit matching approval: **yes**`,
    '',
    '| Target | Source status | Suitability | Asset status | Source file | Candidate path | Warnings |',
    '| --- | --- | --- | --- | --- | --- |'
  ];
  for (const target of report.targets) {
    for (const [index, source] of (target.sources?.length ? target.sources : [target]).entries()) {
      lines.push(`| ${index === 0 ? target.displayName : '↳ source'} | ${source.sourceStatus} | ${source.sourceSuitability ?? 'n/a'} | ${source.assetStatus} | ${source.sourceFilename ?? source.sourceAssetId ?? 'n/a'} | ${source.outputFile ?? 'n/a'} | ${(source.validationWarnings ?? []).join('<br>') || '—'} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export async function runAssetFactory({
  manifestPath = defaultManifestPath,
  stagingRoot = defaultOutputRoot,
  reportsRoot = defaultReportsRoot,
  approvalsPath = null,
  finalizeApprovals = false,
  fetchImpl = globalThis.fetch
} = {}) {
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const adapter = new FandomMediaWikiAdapter({ baseUrl: manifest.wikiBaseUrl ?? 'https://inazuma-eleven.fandom.com', fetchImpl });
  const stagingDir = await ensureSafeStaging({ stagingRoot, runtimeDir: runtimeSpritesDir });
  const originalsDir = path.join(stagingDir, 'originals');
  await mkdir(originalsDir, { recursive: true });
  await mkdir(reportsRoot, { recursive: true });
  const approvals = approvalsPath ? await loadApprovals(approvalsPath, manifest.manifestId) : null;
  const reportPath = path.join(reportsRoot, `${manifest.manifestId}.report.json`);
  const previousTargets = await loadPreviousReport(reportPath);
  const targets = [];
  for (const source of manifest.targets) {
    const target = structuredClone({ ...source, ...defaultStatus, ...source, verificationEvidence: [...(source.verificationEvidence ?? [])], validationWarnings: [...(source.validationWarnings ?? [])] });
    const previous = previousTargets.get(target.versionId);
    if (previous) {
      for (const key of ['sourceAssetId', 'resolvedBinaryUrl', 'sourceFilename', 'provenanceNote', 'sha256']) {
        if (previous[key] && !target[key]) target[key] = previous[key];
      }
      if (Array.isArray(previous.verificationEvidence)) target.verificationEvidence = unique([...target.verificationEvidence, ...previous.verificationEvidence]);
    }
    target.sources = [];
    for (const sourceSpec of sourceSpecsForTarget(target)) {
      const sourceRecord = sourceRecordFromSpec(sourceSpec);
      try {
        const existing = await existingOriginalForSource({ target, source: sourceSpec, originalsDir });
        if (existing) {
          const signature = detectImageSignature(existing.buffer);
          applyResolvedSourceRecord({
            record: sourceRecord,
            reportPath,
            stagedPath: existing.absolutePath,
            fileName: existing.filename,
            buffer: existing.buffer,
            signature,
            reused: true
          });
          target.sources.push(sourceRecord);
          continue;
        }
        const resolved = await adapter.resolveSource(sourceSpec);
        sourceRecord.sourceStatus = resolved.sourceStatus;
        if (resolved.fileTitle) sourceRecord.sourceAssetId = resolved.fileTitle;
        if (resolved.binaryUrl) sourceRecord.resolvedBinaryUrl = resolved.binaryUrl;
        if (resolved.note) sourceRecord.provenanceNote = unique([sourceRecord.provenanceNote, resolved.note]).join(' ');
        if (resolved.sourceStatus !== 'SOURCE-CANDIDATE') {
          sourceRecord.assetStatus = resolved.sourceStatus === 'SOURCE-MISSING' ? 'ASSET-GAP' : 'UNASSESSED';
          target.sources.push(sourceRecord);
          continue;
        }
        const buffer = await adapter.downloadBinary(resolved.binaryUrl, resolved.alternateBinaryUrls);
        const signature = detectImageSignature(buffer);
        const fileName = filenameFromFileTitle(resolved.fileTitle) ?? `${safeName(target.versionId)}${mimeExtension(signature.mime)}`;
        const destination = path.join(sourceDirectory(originalsDir, target, sourceRecord), fileName);
        if (!isSubpath(stagingDir, destination) || isSubpath(runtimeSpritesDir, destination)) throw new Error('Unsafe staging destination');
        await mkdir(path.dirname(destination), { recursive: true });
        const staged = await writeImmutableFile(destination, buffer);
        sourceRecord.verificationEvidence = unique([...sourceRecord.verificationEvidence, 'resolved-file-title']);
        if (sourceRecord.sourceType === 'fandom-character-page') sourceRecord.verificationEvidence = unique([...sourceRecord.verificationEvidence, 'exact-character-page']);
        applyResolvedSourceRecord({
          record: sourceRecord,
          reportPath,
          stagedPath: destination,
          fileName,
          buffer,
          signature,
          reused: staged.reused
        });
      } catch (error) {
        const issue = classificationFromError(error);
        sourceRecord.sourceStatus = issue.sourceStatus;
        sourceRecord.assetStatus = issue.sourceStatus === 'SOURCE-ACCESS-BLOCKED' ? 'UNASSESSED' : 'REVIEW';
        sourceRecord.validationWarnings = unique([...sourceRecord.validationWarnings, `${issue.code}:${issue.message}`]);
      }
      target.sources.push(sourceRecord);
    }
    const preferred = preferredSourceForTarget(target);
    target.assetStatus = targetStatusFromSources(target);
    applyPreferredSource(target, preferred);
    targets.push(target);
  }
  applyDuplicateAnnotations(targets);
  if (approvals && finalizeApprovals) await finalizeApprovalHashes({ approvals, targets, approvalsPath });
  if (approvals) await applyHumanApprovals({ approvals, targets, approvalsPath });
  const report = {
    schemaVersion: 1,
    manifestId: manifest.manifestId,
    title: manifest.title,
    generatedAt: new Date().toISOString(),
    manifestPath: relativeFromRoot(manifestPath),
    approvalsPath: approvalsPath ? relativeFromRoot(approvalsPath) : null,
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
        reports: { type: 'string' },
        approvals: { type: 'string' },
        'finalize-approvals': { type: 'boolean' }
      }
    });
    const report = await runAssetFactory({
      manifestPath: values.manifest ? path.resolve(values.manifest) : defaultManifestPath,
      stagingRoot: values.staging ? path.resolve(values.staging) : defaultOutputRoot,
      reportsRoot: values.reports ? path.resolve(values.reports) : defaultReportsRoot,
      approvalsPath: values.approvals ? path.resolve(values.approvals) : defaultApprovalsPath,
      finalizeApprovals: Boolean(values['finalize-approvals'])
    });
    console.log(JSON.stringify({ status: report.status, manifestId: report.manifestId, summary: report.summary, report: `${report.manifestId}.report.json` }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
