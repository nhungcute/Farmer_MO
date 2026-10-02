import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as canonical from '../../packages/content/index.mjs';
import {content,legacyCrops,levelProgress,isUnlocked,attributes,FarmButton,FarmPanel,FarmProgress,FarmShell,PRIMITIVES,ICON_REGISTRY,createScreenRegistry} from '../../apps/web/src/ui/foundation/index.js';

test('browser content is a packaging copy of the canonical module',async()=>{
  const source=(await readFile(new URL('../../packages/content/index.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  const generated=(await readFile(new URL('../../apps/web/src/ui/foundation/content.generated.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  assert.equal(generated,'// GENERATED from packages/content/index.mjs. DO NOT EDIT.\n'+source);
  for(const key of ['FARM','CROPS','ITEMS','BUILDINGS','CHICKEN','LEVEL_THRESHOLDS','LEVEL_UNLOCKS','QUESTS']) assert.deepEqual(content[key],canonical[key]);
  assert.equal(legacyCrops.carrot.cost,canonical.CROPS.carrot.plantCost);
  assert.equal(isUnlocked({level:1},content.CROPS.carrot),false);
  assert.equal(isUnlocked({level:2},content.CROPS.carrot),true);
  assert.deepEqual(levelProgress({level:2,xp:110}),{value:10,max:160,maxLevel:false});
});
test('view text and attributes cannot introduce executable markup',()=>{
  const button=FarmButton({label:'<img src=x onerror=alert(1)>',attrs:{onclick:'alert(1)','data-item':'"><script>x</script>'}});
  assert.ok(!button.includes('<img')); assert.ok(!button.includes('<script>')); assert.ok(!button.includes(' onclick='));
  assert.match(FarmPanel({title:'<script>x</script>'}),/&lt;script&gt;/);
  assert.equal(attributes({style:'color:red',onfocus:'x',disabled:true}),' disabled');
});
test('busy actions are disabled and progress values stay within accessible bounds',()=>{
  assert.match(FarmButton({label:'Mua',busy:true}),/ disabled/);
  assert.match(FarmButton({busy:true}),/aria-busy="true"/);
  assert.match(FarmProgress({value:-8,max:10}),/aria-valuenow="0"/);
  assert.match(FarmProgress({value:99,max:10}),/aria-valuenow="10"/);
  assert.match(FarmProgress({value:4,max:0}),/aria-valuemax="1"/);
});
test('registered sprite icons reference already approved production frames',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../../apps/web/public/assets/manifests/animation-manifest.json',import.meta.url),'utf8'));
  assert.equal(Object.keys(manifest.assets).length,188);
  for(const id of Object.values(ICON_REGISTRY)){
    assert.equal(manifest.assets[id]?.approved,true,id);
    assert.notEqual(manifest.assets[id]?.placeholder,true,id);
  }
});
test('shared shell has unique renderer hosts and twelve required primitives',()=>{
  assert.equal(Object.keys(PRIMITIVES).length,12);
  const html=FarmShell();
  assert.equal((html.match(/id="farm-canvas"/g)||[]).length,1);
  assert.equal((html.match(/id="game-renderer-host"/g)||[]).length,1);
  for(const region of ['hud','navigation','toolbar','canvas','context','modal','toast']) assert.ok(html.includes(`data-region="${region}"`));
});
test('screen registration rejects duplicate ownership and unknown routes',()=>{
  const registry=createScreenRegistry(); registry.register('ui01-login',props=>String(props.name));
  assert.equal(registry.render('ui01-login',{name:'Mỡ'}),'Mỡ');
  assert.throws(()=>registry.register('ui01-login',()=>''),/already registered/);
  assert.throws(()=>registry.render('ui90-unknown'),/not registered/);
});
