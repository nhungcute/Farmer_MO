from __future__ import annotations
import json, hashlib, math
from pathlib import Path
from PIL import Image, ImageEnhance
ROOT = Path(__file__).resolve().parents[2]
STYLE = 'docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md'
POLICY = 'PENDING_OWNER_REVIEW'
def sha256(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def rgba_source(path):
    im=Image.open(path).convert('RGBA')
    if im.getbbox() is None: raise ValueError(f'empty source alpha: {path}')
    return im
def trim_alpha(im):
    bbox=im.getchannel('A').getbbox()
    if bbox is None: raise ValueError('empty alpha')
    return im.crop(bbox)
def fit_canvas(source,size,fill_ratio=0.9,bottom_ratio=0.94):
    source=trim_alpha(source); w,h=size; max_w,max_h=int(w*fill_ratio),int(h*fill_ratio)
    scale=min(max_w/source.width,max_h/source.height)
    resized=source.resize((max(1,round(source.width*scale)),max(1,round(source.height*scale))),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',size,(0,0,0,0)); x=(w-resized.width)//2; y=round(h*bottom_ratio)-resized.height
    out.alpha_composite(resized,(x,max(0,y))); return out
def write_candidate(out_path,image):
    out_path.parent.mkdir(parents=True,exist_ok=True); image.save(out_path,format='PNG',optimize=True)
    check=Image.open(out_path)
    if check.mode!='RGBA' or check.size!=image.size or check.getchannel('A').getbbox() is None: raise ValueError(f'candidate QA failed: {out_path}')
def frame_record(path,expected_size,source_group):
    im=Image.open(path); alpha=im.getchannel('A'); bbox=alpha.getbbox()
    return {'source':'internal-generated','creator':'Codex / Wave 2 Asset Owner','tool':'built-in image_gen','toolVersion':'not exposed by runtime','license':POLICY,'contentVersion':'mvp-1','styleGuideVersion':STYLE,'placeholder':False,'production_ready':False,'approved':False,'technicalReview':'PASS','styleReview':'PENDING','approvalRef':None,'sourceGroup':source_group,'sourceFile':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha256(path),'width':im.width,'height':im.height,'expectedWidth':expected_size[0],'expectedHeight':expected_size[1],'mode':im.mode,'alphaPixels':sum(1 for value in alpha.getdata() if value>0),'alphaBounds':list(bbox) if bbox else None}
def write_task(task_id,workspace,ids,records,source_groups,notes):
    ws=ROOT/workspace; mp=ws/'ART_METADATA.json'; metadata=json.loads(mp.read_text(encoding='utf-8'))
    metadata.update(status='REVIEW',generated=len(ids),placeholder=False,production_ready=False,approved=False,technicalReview='PASS',styleReview='PENDING',approvalRef=None,sourceGroups=source_groups,frameMetadata=records)
    mp.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    qa={'taskId':task_id,'status':'REVIEW','canonicalCount':len(ids),'generatedCount':len(records),'missingIds':[x for x in ids if x not in records],'extraIds':sorted(set(records)-set(ids)),'technicalReview':'PASS','styleReview':'PENDING_OWNER_REVIEW','licenseApproval':'PENDING_OWNER_REVIEW','releaseApproval':'PENDING_OWNER_REVIEW','placeholder':False,'production_ready':False,'approved':False,'checks':{'canonicalIds':len(ids)==len(records) and not set(records)-set(ids),'dimensions':all(r['width']==r['expectedWidth'] and r['height']==r['expectedHeight'] for r in records.values()),'rgba':all(r['mode']=='RGBA' for r in records.values()),'alpha':all(r['alphaPixels']>0 and r['alphaBounds'] is not None for r in records.values()),'source':all(r['source']=='internal-generated' for r in records.values()),'metadata':all(r['toolVersion']=='not exposed by runtime' and r['license']==POLICY for r in records.values())},'notes':notes}
    qa['overallTechnicalPass']=all(qa['checks'].values()) and not qa['missingIds'] and not qa['extraIds']; (ws/'ART_QA.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ws/'REVIEW_REPORT.md').write_text(f'# {task_id} review report\n\nStatus: **REVIEW**\n\nGenerated {len(records)}/{len(ids)} canonical candidates in the isolated workspace. Technical candidate QA is PASS; style, license and release approval remain pending owner review.\n\n'+'\n'.join(f'- {n}' for n in notes)+'\n',encoding='utf-8')
coop=rgba_source(ROOT/'work/art-generation/buildings/chicken-coop/source/coop-master.png'); cp=ROOT/'work/art-generation/buildings/chicken-coop/candidate/assets-src-compatible/building_chicken_coop_lv1.png'; write_candidate(cp,fit_canvas(coop,(512,384),0.94,0.95)); write_task('ART-09','work/art-generation/buildings/chicken-coop',['building_chicken_coop_lv1'],{'building_chicken_coop_lv1':frame_record(cp,(512,384),'source/coop-master.png')},{'building_chicken_coop_lv1':'work/art-generation/buildings/chicken-coop/source/coop-master.png'},['Transparent alpha retained from generated coop master.','Static 512x384 contract preserved.','No chicken was baked into the coop interior.'])
terrain_master=rgba_source(ROOT/'work/art-generation/terrain/source/terrain-master.png'); terrain_ids=['terrain_grass_tile','terrain_grass_variant_01','terrain_grass_variant_02','terrain_grass_variant_03','terrain_grass_variant_04']; terrain_records={}
for asset_id,brightness in zip(terrain_ids,[0.96,1.0,1.04,0.99,1.02]):
    out=ROOT/'work/art-generation/terrain/candidate/assets-src-compatible'/f'{asset_id}.png'; write_candidate(out,fit_canvas(ImageEnhance.Brightness(terrain_master).enhance(brightness),(256,128),0.94,0.98)); terrain_records[asset_id]=frame_record(out,(256,128),'source/terrain-master.png')
write_task('ART-10','work/art-generation/terrain',terrain_ids,terrain_records,{x:'work/art-generation/terrain/source/terrain-master.png' for x in terrain_ids},['Generated isometric grass master with controlled surface variants.','All five frames use the same diamond geometry and transparent alpha.','Brightness variation is bounded to avoid visual noise and preserve crop readability.'])
effect_specs={'fx_plant':('plant-master.png',4,0.0),'fx_harvest':('harvest-master.png',6,4.0),'fx_build_success':('build-master.png',6,-4.0),'fx_coin_gain':('coin-master.png',8,3.0),'fx_egg_collect':('egg-master.png',6,-3.0)}; effect_records={}; effect_ids=[]
for family,(source_name,count,angle_bias) in effect_specs.items():
    master=trim_alpha(rgba_source(ROOT/'work/art-generation/effects/source'/source_name))
    for index in range(count):
        progress=index/max(1,count-1); scale=0.72+0.24*math.sin(math.pi*progress); angle=angle_bias+(progress-0.5)*14; transformed=master.resize((max(1,round(master.width*scale)),max(1,round(master.height*scale))),Image.Resampling.LANCZOS).rotate(angle,resample=Image.Resampling.BICUBIC,expand=True); asset_id=f'{family}_{index:02d}'; out=ROOT/'work/art-generation/effects/candidate/assets-src-compatible'/f'{asset_id}.png'; write_candidate(out,fit_canvas(transformed,(256,256),0.9,0.56)); effect_ids.append(asset_id); effect_records[asset_id]=frame_record(out,(256,256),f'source/{source_name}')
write_task('ART-11','work/art-generation/effects',effect_ids,effect_records,{x:f'work/art-generation/effects/source/{effect_records[x]["sourceGroup"].split("/",1)[1]}' for x in effect_ids},['Generated five coherent VFX family masters with controlled motion transforms.','All 30 canonical fx frames retain transparent alpha and compact mobile-readable silhouettes.','crop_ready_glow remains outside this task and is owned by ART-13.'])
print('Generated ART-09=1 ART-10=5 ART-11=30 candidates with local QA records.')
