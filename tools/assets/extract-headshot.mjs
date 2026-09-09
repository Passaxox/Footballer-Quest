import { readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { inspectPng } from '../../frontend/scripts/asset-audit.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
// Row-major geometry only. A headshot number makes no claim about character identity.
export function cropCoordinates(sheet, id) {
  for (const key of ['startId','endId','columns','rows','cellWidth','cellHeight']) {
    if (!Number.isSafeInteger(sheet[key]) || sheet[key] < (['startId','endId'].includes(key) ? 0 : 1)) throw Error(`Invalid ${key}`);
  }
  const { startId, endId, columns, rows, cellWidth, cellHeight } = sheet;
  if (endId < startId || endId-startId+1 > columns*rows) throw Error('Range exceeds grid capacity');
  if (!Number.isSafeInteger(id) || id < startId || id > endId) throw Error('Headshot ID outside sheet range');
  const offsets = {};
  for (const key of ['originX','originY','gapX','gapY']) {
    offsets[key] = sheet[key] ?? 0;
    if (!Number.isSafeInteger(offsets[key]) || offsets[key] < 0) throw Error(`Invalid ${key}`);
  }
  const index=id-startId, row=Math.floor(index/columns), column=index%columns;
  const x=offsets.originX+column*(cellWidth+offsets.gapX), y=offsets.originY+row*(cellHeight+offsets.gapY);
  const gridWidth=offsets.originX+columns*cellWidth+(columns-1)*offsets.gapX;
  const gridHeight=offsets.originY+rows*cellHeight+(rows-1)*offsets.gapY;
  if (![x,y,gridWidth,gridHeight].every(Number.isSafeInteger)) throw Error('Geometry overflow');
  return {sheet:sheet.id,headshotId:id,index,row,column,x,y,width:cellWidth,height:cellHeight,gridWidth,gridHeight};
}

export async function planCrop({sheetId,id,configPath=path.join(root,'sheets.json'),sourceDir=path.join(root,'sources'),out}) {
  const config=JSON.parse(await readFile(configPath,'utf8'));
  if (!Array.isArray(config.sheets) || config.sheets.some(s=>typeof s.id!=='string' || !s.id) || new Set(config.sheets.map(s=>s.id)).size!==config.sheets.length) throw Error('Invalid or duplicate sheet IDs');
  const sheet=config.sheets.find(s=>s.id===sheetId);
  if (!sheet) throw Error(`Sheet not configured: ${sheetId}`);
  if (typeof sheet.filename!=='string' || !sheet.filename || /[\\/]/.test(sheet.filename) || path.extname(sheet.filename).toLowerCase()!=='.png') throw Error('Expected a PNG filename inside sources');
  const coordinates=cropCoordinates(sheet,id);
  const source=await realpath(path.join(sourceDir,sheet.filename));
  if (path.dirname(source)!==await realpath(sourceDir)) throw Error('Source must remain inside sources directory');
  const bytes=await readFile(source), dimensions=inspectPng(bytes);
  if (coordinates.gridWidth>dimensions.width || coordinates.gridHeight>dimensions.height) throw Error('Configured grid exceeds source dimensions');
  const {gridWidth,gridHeight,...crop}=coordinates;
  const manifest={...crop,sourceFile:sheet.filename,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceWidth:dimensions.width,sourceHeight:dimensions.height,outputType:'crop-manifest',pixelCropPerformed:false};
  if (out) {
    if (path.extname(out).toLowerCase()!=='.json') throw Error('Manifest output must use .json (no image crop performed)');
    // Exclusive creation also refuses symlinks and never overwrites sources or prior output.
    await writeFile(out,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  }
  return manifest;
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const {values}=parseArgs({options:{sheet:{type:'string'},id:{type:'string'},out:{type:'string'},config:{type:'string'},sources:{type:'string'}}});
    if (!values.sheet || !/^\d+$/.test(values.id ?? '')) throw Error('Usage: --sheet RANGE --id DECIMAL_ID [--out crop.json] [--config sheets.json] [--sources directory]');
    const manifest=await planCrop({sheetId:values.sheet,id:Number(values.id),out:values.out,configPath:values.config,sourceDir:values.sources});
    console.log(JSON.stringify(manifest,null,2));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
