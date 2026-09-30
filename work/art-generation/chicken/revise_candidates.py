from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageChops
import json, math, shutil

ROOT=Path('work/art-generation/chicken')
CAND=ROOT/'candidate/assets-src-compatible'
REV=ROOT/'candidate/reviews'
DIRECTIONS=('ne','se','sw','nw')
STATES={'idle':4,'walk':6,'eat':5,'happy':4,'sleep':2,'product_ready':2}

# targeted soft illustrated pass: preserve alpha and silhouette, lower specular contrast

def soften(im):
    im=im.convert('RGBA')
    rgb=im.convert('RGB')
    # A restrained low-pass blend removes small feather ridges without blurring silhouette.
    smooth=rgb.filter(ImageFilter.GaussianBlur(radius=0.58))
    smooth=Image.blend(rgb,smooth,0.22)
    smooth=ImageEnhance.Contrast(smooth).enhance(0.90)
    # Compress only near-white highlights; preserve approved warm palette.
    px=smooth.load(); alpha=im.getchannel('A')
    for y in range(im.height):
        for x in range(im.width):
            r,g,b=px[x,y]
            lum=(0.299*r+0.587*g+0.114*b)/255
            if lum>0.88:
                factor=1.0-0.06*((lum-0.88)/0.12)
                px[x,y]=(round(r*factor),round(g*factor),round(b*factor))
    out=Image.merge('RGBA',(*smooth.split(),alpha))
    return out

def color_mask(im):
    w,h=im.size
    mask=Image.new('L',(w,h),0)
    p=im.load(); m=mask.load()
    for y in range(201, min(236,h)):
        for x in range(w):
            r,g,b,a=p[x,y]
            if a>=35 and r>=120 and g>=55 and b<=135 and r>g*1.12 and g>b*1.12:
                m[x,y]=255
    # connect anti-aliased edges while retaining only lower limb area
    return mask.filter(ImageFilter.MaxFilter(3))

def components(mask, min_count=20):
    w,h=mask.size; pix=mask.load(); seen=set(); comps=[]
    for y in range(h):
      for x in range(w):
        if pix[x,y]<128 or (x,y) in seen: continue
        stack=[(x,y)]; seen.add((x,y)); pts=[]
        while stack:
          a,b=stack.pop(); pts.append((a,b))
          for nx,ny in ((a-1,b),(a+1,b),(a,b-1),(a,b+1),(a-1,b-1),(a+1,b+1),(a-1,b+1),(a+1,b-1)):
            if 0<=nx<w and 0<=ny<h and pix[nx,ny]>=128 and (nx,ny) not in seen:
              seen.add((nx,ny)); stack.append((nx,ny))
        if len(pts)>=min_count: comps.append(pts)
    return sorted(comps,key=len,reverse=True)

def patch_component(im, pts):
    # use component bbox plus 2px padding and keep alpha/color only within component mask
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    x0=max(0,min(xs)-2); y0=max(0,min(ys)-2); x1=min(im.width,max(xs)+3); y1=min(im.height,max(ys)+3)
    crop=im.crop((x0,y0,x1,y1)).convert('RGBA')
    mask=Image.new('L',im.size,0); mp=mask.load()
    for x,y in pts: mp[x,y]=255
    mask=mask.filter(ImageFilter.MaxFilter(3)).crop((x0,y0,x1,y1))
    crop.putalpha(Image.composite(crop.getchannel('A'),Image.new('L',crop.size,0),mask))
    return crop,(x0,y0,x1,y1),mask

def apply_walk(im, frame, direction):
    # Keep all upper-body pixels and replace only lower leg/feet components with a clear alternating stride.
    base=im.copy().convert('RGBA')
    mask=color_mask(base)
    comps=components(mask)
    if len(comps)<2:
        return base
    # choose two largest components and order by x center
    comps=sorted(comps[:4], key=lambda c: sum(x for x,y in c)/len(c))[:2]
    comps=sorted(comps,key=lambda c: sum(x for x,y in c)/len(c))
    patches=[]
    remove=Image.new('L',base.size,0); rp=remove.load()
    for c in comps:
        patch,bbox,pm=patch_component(base,c)
        patches.append((patch,bbox,c))
        # remove original colored pixels (dilated component) before placing moved leg
        for x,y in c:
            for nx in range(max(0,x-1),min(base.width,x+2)):
                for ny in range(max(0,y-1),min(base.height,y+2)):
                    rp[nx,ny]=255
    # Keep body intact; remove only leg color mask. 
    cleared=base.copy(); cleared.putalpha(ImageChops.subtract(cleared.getchannel('A'),remove))
    # phase: planted foot alternates; raised foot leaves visible clearance. Angles exaggerate readable contact.
    phase=[((-4,0,-7,230),(4,-7,8,224)),((-2,-2,-4,230),(3,-2,6,230)),((2,-6,6,224),(-2,0,-5,230)),((4,-2,8,230),(-4,-6,-7,224)),((2,0,5,230),(-3,-3,-6,230)),((0,0,0,230),(0,0,0,230))][frame]
    out=cleared
    for (patch,bbox,c),(dx,dy,ang,target_bottom) in zip(patches,phase):
        # rotate around patch center, then place by center/bottom targets
        rot=patch.rotate(ang,resample=Image.Resampling.BICUBIC,expand=True)
        rb=rot.getchannel('A').getbbox()
        if not rb: continue
        visible=rot.crop(rb)
        old_cx=(bbox[0]+bbox[2])/2
        cx=old_cx+dx
        x=round(cx-visible.width/2)
        y=round(target_bottom-visible.height)
        out.alpha_composite(visible,(x,y))
    return out

def apply_eat(im, frame, direction):
    # Stronger head-down pose around feet; frame 2 receives a visible feed-contact cue.
    src=im.convert('RGBA')
    # Preserve alpha, rotate around bottom center. Existing image already has baseline at 230.
    angle={0:-1.0,1:-5.0,2:-10.0,3:-5.5,4:-1.0}[frame]
    # rotate the whole visible sprite around feet; expand then baseline-place
    box=src.getchannel('A').getbbox(); vis=src.crop(box)
    rot=vis.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True,center=(vis.width/2,vis.height-1))
    rot=soften(rot)
    rb=rot.getchannel('A').getbbox(); rot=rot.crop(rb)
    canvas=Image.new('RGBA',(256,256),(0,0,0,0))
    x=round(128-rot.width/2)
    y=230-rot.height
    canvas.alpha_composite(rot,(x,y))
    if frame==2:
        # Locate a direction-specific lower beak region from reference beak orange pixels.
        # Add a small warm feed cluster directly below the contact point.
        # Head x is near center for NE/SE and left of center for SW/NW.
        if direction in ('ne','se'):
            fx=154 if direction=='se' else 151
        else:
            fx=103 if direction=='sw' else 106
        fy=176
        d=ImageDraw.Draw(canvas)
        # three tiny grains, intentionally subtle and within sprite footprint
        for ox,oy,rx in ((0,0,3),(7,2,2),(-6,3,2)):
            d.ellipse((fx+ox-rx,fy+oy-rx,fx+ox+rx,fy+oy+rx),fill=(201,148,65,235))
            d.ellipse((fx+ox-rx+1,fy+oy-rx+1,fx+ox+rx-1,fy+oy+rx-1),fill=(245,206,122,220))
    return canvas

# Process all existing frames in place, retaining canonical files and metadata.
for state,count in STATES.items():
  for direction in DIRECTIONS:
    for frame in range(count):
      name=f'animal_chicken_{state}_{direction}_{frame:02d}.png'; p=CAND/(name)
      im=Image.open(p).convert('RGBA')
      if state=='walk': out=apply_walk(im,frame,direction)
      elif state=='eat': out=apply_eat(im,frame,direction)
      else: out=soften(im)
      out.save(p,format='PNG',optimize=True)

# Proof sheets.
REV.mkdir(parents=True,exist_ok=True)
def label_sheet(path, state, direction, cols, scale=1):
  n=STATES[state]; cell=256; margin=30
  sheet=Image.new('RGBA',(cols*cell,n//cols*cell+margin*((n+cols-1)//cols)),(240,232,216,255))

# walk 4 directions x 6 frames
sheet=Image.new('RGBA',(6*256,4*286),(240,232,216,255)); d=ImageDraw.Draw(sheet)
for row,direction in enumerate(DIRECTIONS):
 for frame in range(6):
  im=Image.open(CAND/f'animal_chicken_walk_{direction}_{frame:02d}.png').convert('RGBA')
  x=frame*256; y=row*286; sheet.alpha_composite(im,(x,y+28)); d.text((x+8,y+7),f'WALK {direction.upper()} {frame}',fill=(55,42,32,255))
sheet.convert('RGB').save(REV/'walk-proof-v2.png',quality=95)
# EAT all directions 4x5
sheet=Image.new('RGBA',(5*256,4*286),(240,232,216,255)); d=ImageDraw.Draw(sheet)
for row,direction in enumerate(DIRECTIONS):
 for frame in range(5):
  im=Image.open(CAND/f'animal_chicken_eat_{direction}_{frame:02d}.png').convert('RGBA')
  x=frame*256; y=row*286; sheet.alpha_composite(im,(x,y+28)); d.text((x+8,y+7),f'EAT {direction.upper()} {frame}'+(' FEED_CONSUMED' if frame==2 else ''),fill=(55,42,32,255))
sheet.convert('RGB').save(REV/'eat-proof-v2.png',quality=95)
# state/direction and runtime-size revised sheets
sheet=Image.new('RGBA',(4*256,6*286),(240,232,216,255)); d=ImageDraw.Draw(sheet)
for row,state in enumerate(STATES):
 for col,direction in enumerate(DIRECTIONS):
  im=Image.open(CAND/f'animal_chicken_{state}_{direction}_00.png').convert('RGBA')
  x=col*256; y=row*286; sheet.alpha_composite(im,(x,y+28)); d.text((x+8,y+7),f'{state.upper()} {direction.upper()}',fill=(55,42,32,255))
sheet.convert('RGB').save(REV/'state-direction-sheet-v2.png',quality=95)
print('revised 92 candidate frames and v2 proof sheets')
