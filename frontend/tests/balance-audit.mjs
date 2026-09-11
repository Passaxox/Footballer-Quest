

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

// Load the production ES modules without adding a bundler or changing CRA's module format.
const source = (name) => readFile(new URL(`../src/game/${name}.js`, import.meta.url), "utf8");
const moduleUrl = (text) => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const dataUrl = moduleUrl(await source("data"));
const rulesUrl = moduleUrl(await source("rules"));
const validationUrl = moduleUrl(await source("catalogValidation"));
const { validateCatalog, validateIdentityAudit } = await import(validationUrl);
const expansionUrl = moduleUrl(await source("catalogExpansion"));
const teamContentUrl = moduleUrl(await source("teamContent.generated"));
const metadataUrl = moduleUrl((await source("catalogMetadata")).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)));
const catalogUrl = moduleUrl((await source("catalog")).replace("\"./catalogExpansion\"", JSON.stringify(expansionUrl)).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./catalogValidation"', JSON.stringify(validationUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)));
const collectionUrl = moduleUrl((await source("collection")).replace('"./catalog"', JSON.stringify(catalogUrl)));
const catalog = await import(catalogUrl);
const collection = await import(collectionUrl);
const scenariosUrl = moduleUrl((await source("scenarios")).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)).replace('"./teamContent.generated"', JSON.stringify(teamContentUrl)));
const scenarios = await import(scenariosUrl);
const engineUrl = moduleUrl((await source("engine")).replace('"./scenarios"', JSON.stringify(scenariosUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./rules"', JSON.stringify(rulesUrl)).replace('"./catalog"', JSON.stringify(catalogUrl)));
const engine = await import(engineUrl);
const data = await import(dataUrl);
const storage = await import(moduleUrl((await source("storage"))
  .replace('"./data"', JSON.stringify(dataUrl)).replace('"./engine"', JSON.stringify(engineUrl)).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./collection"', JSON.stringify(collectionUrl))));

// Progression sensitivity model, NOT a combat simulator. All fights won; no inferred KO rate.
let seed = 20260908;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const originalRandom = Math.random;
Math.random = random;
const rows = [];
const guardrails = process.argv.includes("--guardrails");
try {
 for (const difficulty of ["normal", "easy"]) for (const [profile, rate] of [["few", .25], ["medium", .5], ["many", .75], ["ko-stress", .5]]) {
  const samples = Array.from({length:20}, () => []);
  for (let iteration=0; iteration<300; iteration++) {
   let combatXp=0;
   let run=engine.newRun(data.STARTER_IDS.slice(0,3), difficulty);
   for (let wave=1; wave<=20; wave++) {
    run.wave=wave;
    if(profile === "ko-stress") run.team[2].hp = wave>=4 && wave<=9 ? 0 : run.team[2].maxHp;
    const tier=wave<8?1:wave<18?2:3;
    run.scenarioState=scenarios.scenarioForWave(run.scenarioState,wave,tier,random);
    const boss=data.BOSSES[wave];
    const levels=run.team.map(p=>p.level);
    const mean=levels.reduce((a,b)=>a+b,0)/levels.length;
    const rules=(await import(rulesUrl)).getRules(run.rulesetId);
    const raw=boss ? wave+(rules.checkpoints[wave]?.levelOffset??rules.defaultBossLevelOffset) : engine.enemyLevel(wave,run.rulesetId);
    const reference=engine.teamReferenceLevel(run.team);
    const enemy=guardrails ? engine.cappedEnemyLevel(raw,run.team,run.rulesetId,boss?"boss":"ordinary") : raw;
    const v=scenarios.selectEncounterVersion(run.scenarioState.id,wave,tier,[],random);
    samples[wave-1].push({raw,reference,capped:Number(enemy<raw),combatXp,mean,max:Math.max(...levels),gap:enemy-mean,enemy,ko:run.team.filter(p=>!p.hp).length,scenario:run.scenarioState.id,tier:boss ? boss.ids.reduce((sum,id)=>sum+engine.byId(id).tier,0)/boss.ids.length : v?.encounterTier});
    // Synthetic encounter frequency; noncombat nodes use travel XP only.
    if(boss || wave===1 || random()<rate) {
     const count=boss ? boss.ids.length : random()<.6 ? 1 : wave<5 ? 2 : (random()<.5?2:3);
     for(let i=0;i<count;i++) { const award=engine.grantCombatXp(run.team,run.team[0].uid,enemy,!!boss,run.rulesetId); run.team=award.team; combatXp+=award.report.rows.reduce((sum,row)=>sum+row.total,0); }
     if(boss) run.team=run.team.map(p=>({...p,hp:p.maxHp}));
    } else run=engine.completeNonCombatNode({...run,pending:{type:"shop"}});
    run.pending=null;
   }
  }
  for(let wave=1;wave<=20;wave++) {
   const s=samples[wave-1], avg=k=>s.reduce((a,b)=>a+b[k],0)/s.length;
   rows.push({difficulty,profile,wave,raw:+avg("raw").toFixed(2),reference:+avg("reference").toFixed(2),capPercent:+(100*avg("capped")).toFixed(2),combatXp:+avg("combatXp").toFixed(2),teamMean:+avg("mean").toFixed(2),teamP10:+s.map(r=>r.mean).sort((a,b)=>a-b)[29].toFixed(2),teamP90:+s.map(r=>r.mean).sort((a,b)=>a-b)[269].toFixed(2),gapP90:+s.map(r=>r.gap).sort((a,b)=>a-b)[269].toFixed(2),teamMax:+avg("max").toFixed(2),enemyMean:+avg("enemy").toFixed(2),gap:+avg("gap").toFixed(2),ko:+avg("ko").toFixed(2),scenarioCounts:Object.fromEntries(scenarios.SCENARIOS.map(c=>[c.id,s.filter(r=>r.scenario===c.id).length])),enemyTierMean:+avg("tier").toFixed(2)});
  }
 }
 assert.equal(rows.length,160);
 assert.ok(rows.every(r=>Number.isFinite(r.teamMean)&&r.teamMean>=3));
 console.log(JSON.stringify(rows,null,2));
} finally { Math.random=originalRandom; }
