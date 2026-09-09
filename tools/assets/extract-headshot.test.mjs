import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {cropCoordinates,planCrop} from './extract-headshot.mjs';

const sheet={id:'0400-0599',filename:'sheet.png',startId:400,endId:599,columns:10,rows:20,cellWidth:2,cellHeight:3,originX:1,originY:2,gapX:1,gapY:2};
function png(width,height) {
 const chunk=(type,data)=>{
  const payload=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
  for(const b of payload){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([length,payload,sum]);
 };
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*height))),chunk('IEND',Buffer.alloc(0))]);
}
test('first/last IDs, row-major coordinates and partial final rows',()=>{
 assert.deepEqual(cropCoordinates(sheet,400),{sheet:sheet.id,headshotId:400,index:0,row:0,column:0,x:1,y:2,width:2,height:3,gridWidth:30,gridHeight:100});
 const last=cropCoordinates(sheet,599);
 assert.equal(last.index,199);assert.equal(last.row,19);assert.equal(last.column,9);assert.equal(last.x,28);assert.equal(last.y,97);
 const middle=cropCoordinates(sheet,473);assert.equal(middle.index,73);assert.equal(middle.row,7);assert.equal(middle.column,3);
 assert.deepEqual(middle,cropCoordinates(sheet,473));
 assert.equal(cropCoordinates({...sheet,endId:594},594).column,4);
 for(const id of [399,600,NaN,473.5])assert.throws(()=>cropCoordinates(sheet,id),/outside/);
 assert.throws(()=>cropCoordinates({...sheet,rows:19},400),/capacity/);
 assert.throws(()=>cropCoordinates({...sheet,gapX:-1},400),/gapX/);
});
test('validated manifest is deterministic, read-only, and refuses existing outputs',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'fq-headshots-'));
 try {
  const configPath=path.join(directory,'sheets.json'),source=path.join(directory,'sheet.png'),out=path.join(directory,'crop.json');
  const bytes=png(30,100);await writeFile(source,bytes);await writeFile(configPath,JSON.stringify({sheets:[sheet]}));
  const options={sheetId:sheet.id,id:473,configPath,sourceDir:directory};
  const plan=await planCrop({...options,out});assert.equal(plan.pixelCropPerformed,false);
  assert.deepEqual(plan,await planCrop(options));
  const saved=await readFile(out);await assert.rejects(planCrop({...options,out}),/EEXIST/);assert.deepEqual(await readFile(out),saved);
  await assert.rejects(planCrop({...options,out:source}),/\.json/);
  assert.deepEqual(await readFile(source),bytes);
  await writeFile(configPath,JSON.stringify({sheets:[{...sheet,cellWidth:3}]}));
  await assert.rejects(planCrop(options),/exceeds/);
  await writeFile(configPath,JSON.stringify({sheets:[sheet,sheet]}));await assert.rejects(planCrop(options),/duplicate/);
 } finally {await rm(directory,{recursive:true,force:true});}
});
