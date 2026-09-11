import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const frontend = fileURLToPath(new URL("../", import.meta.url));
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const crc32 = buffer => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
// Technical integrity, not visual/canonical identity. No decoding, resizing or writes.
export function inspectPng(buffer) {
  if (!buffer.subarray(0,8).equals(signature)) throw new Error("PNG signature missing");
  let offset=8, header=null, ended=false, palette=false;
  const idat=[];
  while (offset < buffer.length) {
    if (offset+12>buffer.length) throw new Error("Truncated PNG chunk");
    const length=buffer.readUInt32BE(offset), end=offset+12+length;
    if (end>buffer.length) throw new Error("Truncated PNG data");
    const type=buffer.toString("ascii",offset+4,offset+8), data=buffer.subarray(offset+8,offset+8+length);
    if (crc32(buffer.subarray(offset+4,offset+8+length))!==buffer.readUInt32BE(offset+8+length)) throw new Error("PNG CRC mismatch");
    if (!header && type!=="IHDR") throw new Error("IHDR must be first");
    if (type==="IHDR") {
      if (header || length!==13) throw new Error("Invalid IHDR");
      const width=data.readUInt32BE(0), height=data.readUInt32BE(4), depth=data[8], color=data[9];
      const depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
      if (!width || !height || width>0x7fffffff || height>0x7fffffff || !depths[color]?.includes(depth) || data[10] || data[11] || data[12]>1) throw new Error("Invalid PNG dimensions/format");
      header={width,height,depth,color,interlace:data[12]};
    }
    if (type==="PLTE") palette=true;
    if (type==="IDAT") idat.push(data);
    offset=end;
    if (type==="IEND") { if (length || offset!==buffer.length) throw new Error("Invalid IEND/trailing bytes"); ended=true; break; }
  }
  if (!header || !ended || !idat.length || (header.color===3 && !palette)) throw new Error("Incomplete PNG");
  const raw=inflateSync(Buffer.concat(idat),{maxOutputLength:64*1024*1024});
  const channels={0:1,2:3,3:1,4:2,6:4}[header.color];
  const passes=header.interlace ? [[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]] : [[0,0,1,1]];
  let pos=0;
  for(const [x,y,dx,dy] of passes) {
    const w=Math.max(0,Math.ceil((header.width-x)/dx)),h=Math.max(0,Math.ceil((header.height-y)/dy));
    if(!w || !h) continue;
    const rowBytes=Math.ceil(w*channels*header.depth/8);
    for(let row=0;row<h;row++) { if(pos>=raw.length || raw[pos]>4) throw new Error("Invalid PNG scanline"); pos+=1+rowBytes; }
  }
  if(pos!==raw.length) throw new Error("Invalid PNG decompressed size");
  return {width:header.width,height:header.height,aspectRatio:header.width/header.height};
}

// Inventory fallback for legacy WebP payloads with .png filenames. Header dimensions only;
// this does not certify WebP decoding and never makes validPng=true.
export function webpDimensions(buffer) {
  if(buffer.toString("ascii",0,4)!=="RIFF" || buffer.toString("ascii",8,12)!=="WEBP") return null;
  if(buffer.length<20 || buffer.readUInt32LE(4)+8!==buffer.length) throw new Error("Invalid WebP RIFF size");
  let dimensions=null, imagePayload=false, offset=12;
  for(;offset+8<=buffer.length;) {
    const type=buffer.toString("ascii",offset,offset+4),size=buffer.readUInt32LE(offset+4),start=offset+8;
    if(start+size+(size%2)>buffer.length) throw new Error("Truncated WebP chunk");
    const data=buffer.subarray(start,start+size);
    let width,height;
    if(type==="VP8L" && size>=5 && data[0]===0x2f) {
      width=1+data[1]+((data[2]&63)<<8);height=1+(data[2]>>6)+(data[3]<<2)+((data[4]&15)<<10);
    } else if(type==="VP8X" && size>=10) {
      width=1+data.readUIntLE(4,3);height=1+data.readUIntLE(7,3);
    } else if(type==="VP8 " && size>=10 && data.subarray(3,6).equals(Buffer.from([0x9d,1,0x2a]))) {
      width=data.readUInt16LE(6)&0x3fff;height=data.readUInt16LE(8)&0x3fff;
    }
    if(width && height) dimensions ??= {width,height,aspectRatio:width/height};
    if((type==="VP8L" && size>5 && width && height) || (type==="VP8 " && size>10 && width && height)) imagePayload=true;
    offset=start+size+(size%2);
  }
  if(offset!==buffer.length || !dimensions || !imagePayload) throw new Error("Incomplete or invalid WebP image structure");
  return dimensions;
}

// Load the actual production catalog, following the existing Node test module adapter.
export async function loadVersions() {
  const url = text => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
  const source = name => readFile(path.join(frontend,"src/game",name+".js"),"utf8");
  const dependencies={};
  for(const name of ["data","catalogValidation","catalogExpansion","teamContent.generated"]) dependencies[name]=url(await source(name));
  dependencies.catalogMetadata=url((await source("catalogMetadata")).replace('"./teamContent.generated"',JSON.stringify(dependencies["teamContent.generated"])));
  let catalog=await source("catalog");
  for(const [name,value] of Object.entries(dependencies)) catalog=catalog.replace(`"./${name}"`,JSON.stringify(value));
  return Object.values((await import(url(catalog))).CHARACTER_VERSIONS);
}

export async function auditAssets({directory=path.join(frontend,"public/sprites"),versions,identities=[]}={}) {
  versions ??= await loadVersions();
  const files=[];
  for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)) {
    if(!entry.isFile()) continue;
    const bytes=await readFile(path.join(directory,entry.name));
    const file={filename:entry.name,extension:path.extname(entry.name).toLowerCase(),path:`public/sprites/${entry.name}`,sizeBytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),validPng:false,sourceFormat:"UNKNOWN",width:null,height:null,aspectRatio:null,versionIds:[],issues:[]};
    try {
      if(bytes.subarray(0,8).equals(signature)) {
        file.sourceFormat="PNG";
        Object.assign(file,inspectPng(bytes)); file.validPng=true;
      } else {
        file.sourceFormat=bytes.toString("ascii",0,4)==="RIFF" && bytes.toString("ascii",8,12)==="WEBP" ? "WEBP" : "UNKNOWN";
        const dimensions=webpDimensions(bytes);
        if(!dimensions) throw new Error("Unsupported or unrecognizable image payload");
        Object.assign(file,dimensions);
      }
      file.validAsset=true;
    } catch(error) {
      file.validAsset=false;
      file.issues.push({code:file.sourceFormat==="PNG"?"INVALID_PNG":file.sourceFormat==="WEBP"?"INVALID_WEBP":"UNSUPPORTED_FORMAT",severity:"error",message:error.message});
    }
    if(file.validAsset && file.extension!==`.${file.sourceFormat.toLowerCase()}`) {
      file.issues.push({code:"EXTENSION_FORMAT_MISMATCH",severity:"warning",filename:file.filename,declaredExtension:file.extension,detectedFormat:file.sourceFormat,width:file.width,height:file.height});
    }
    if(file.width && file.width!==file.height) file.issues.push({code:"NON_SQUARE_SOURCE",severity:"warning"});
    files.push(file);
  }
  const references=[...versions].sort((a,b)=>a.versionId<b.versionId?-1:a.versionId>b.versionId?1:0).map(v=>{
    const filename=v.spriteId+".png",file=files.find(f=>f.filename===filename);
    const issues=[];
    if(!file) issues.push({code:"MISSING_ASSET",severity:"error"});
    const identity=identities.find(i=>i.versionId===v.versionId);
    if(identity && ["suspicious","unresolved"].includes(identity.identityStatus)) {
      const warning={code:"KNOWN_IDENTITY_WARNING",severity:"warning",identityStatus:identity.identityStatus,note:identity.notes};
      issues.push(warning);if(file) file.issues.push({...warning,versionId:v.versionId});
    }
    if(file) file.versionIds.push(v.versionId);
    return {versionId:v.versionId,characterId:v.characterId,displayName:v.displayName,spriteId:v.spriteId,filename,present:!!file,status:!file?"MISSING":!file.validAsset || issues.length?"WARNING":"READY",issues};
  });
  for(const file of files) {
    if(!file.versionIds.length) file.issues.push({code:"ORPHAN_ASSET",severity:"warning"});
    if(file.versionIds.length>1) file.issues.push({code:"MULTIPLE_VERSION_REFERENCE",severity:"warning"});
    file.status=!file.versionIds.length?"ORPHAN":file.issues.length?"WARNING":"READY";
    for(const reference of references.filter(r=>r.filename===file.filename)) if(file.issues.length) reference.status="WARNING";
  }
  const dimensionBuckets={};
  for(const f of files.filter(f=>f.width && f.height)) {const key=`${f.width}x${f.height}`;dimensionBuckets[key]=(dimensionBuckets[key]||0)+1;}
  return {reportVersion:1,summary:{assetCount:files.length,versionCount:references.length,missing:references.filter(r=>!r.present).length,orphans:files.filter(f=>!f.versionIds.length).length,invalidPng:files.filter(f=>f.issues.some(i=>i.code==="INVALID_PNG")).length,invalidAssets:files.filter(f=>!f.validAsset).length,extensionFormatMismatches:files.filter(f=>f.issues.some(i=>i.code==="EXTENSION_FORMAT_MISMATCH")).length,warningCount:files.reduce((n,f)=>n+f.issues.filter(i=>i.severity==="warning").length,0),warnings:files.filter(f=>f.issues.some(i=>i.severity==="warning")).length,dimensionBuckets},files,versions:references};
}

export const auditExitCode = report => report.summary.missing || report.files.some(f=>f.issues.some(i=>i.severity==="error")) ? 1 : 0;

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const identities=JSON.parse(await readFile(path.join(frontend,"tests/fixtures/catalog-identity-audit.json"),"utf8")).entries;
  const report=await auditAssets({identities});
  console.log(JSON.stringify(report,null,2));
  console.error(`Asset audit: ${JSON.stringify(report.summary)}`);
  process.exitCode=auditExitCode(report);
}
