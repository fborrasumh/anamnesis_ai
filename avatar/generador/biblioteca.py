"""Monta la biblioteca de MPFB con solo los recursos de los 8 diseños y baja sus texturas (Git LFS)."""
import os, re, shutil, sys, urllib.request, urllib.parse, pathlib
sys.path.insert(0, os.path.dirname(__file__)); from disenos import D
SRC = pathlib.Path('/home/claude/mha/base'); EYES = pathlib.Path('/home/claude/mh/makehuman/data/eyes')
LIB = pathlib.Path('/root/.config/blender/5.3/extensions/.user/user_default/mpfb/data')
MEDIA = 'https://media.githubusercontent.com/media/dmaugis/makehuman-py3-assets/master/base/'
def copia(sub, nombre):
    d = LIB / sub / nombre
    if not d.exists(): shutil.copytree(SRC / sub / nombre, d, ignore=shutil.ignore_patterns('materials'))
    return d
mats = []
for (i, g, y, piel, pelo, color, ropa, cejas, pest, *_ ) in D:
    copia('skins', piel); mats.append(LIB/'skins'/piel/(piel+'.mhmat'))
    d = copia('hair', pelo); (d/'materials').mkdir(exist_ok=True)
    m = SRC/'hair'/pelo/'materials'/f'{pelo}_{color}.mhmat'
    if not m.exists(): m = next((SRC/'hair'/pelo/'materials').glob(f'*_{color}.mhmat'))
    shutil.copy(m, d/'materials'/m.name); mats.append(d/'materials'/m.name)
    for sub, n in (('clothes', ropa), ('eyebrows', cejas), ('eyelashes', pest)):
        d = copia(sub, n); mats += list(d.glob('*.mhmat'))
for sub, n in (('teeth','teeth_base'), ('tongue','tongue01')):
    d = copia(sub, n); mats += list(d.glob('*.mhmat'))
if not (LIB/'teeth'/'materials').exists(): shutil.copytree(SRC/'teeth'/'materials', LIB/'teeth'/'materials'); mats += list((LIB/'teeth'/'materials').glob('*.mhmat'))
if not (LIB/'eyes').exists(): shutil.copytree(EYES, LIB/'eyes')
if not (LIB/'skins'/'textures').exists(): (LIB/'skins'/'textures').mkdir(parents=True)
# texturas que citan los materiales
pend = set()
for m in mats:
    for ln in m.read_text(errors='ignore').splitlines():
        p = ln.split()
        if len(p) == 2 and p[0].endswith('Texture') or (len(p) == 2 and p[0] in ('diffuseTexture','normalmapTexture','aomapTexture','bumpmapTexture','specularmapTexture','transmissionmapTexture')):
            pend.add((m.parent / p[1]).resolve())
for f in sorted(pend):
    rel = f.relative_to(LIB)
    src = SRC / rel
    if not f.exists() and src.exists(): f.parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, f)
    if f.exists() and f.stat().st_size < 300 and f.read_bytes().startswith(b'version https://git-lfs'):
        print('baja', rel); urllib.request.urlretrieve(MEDIA + urllib.parse.quote(str(rel)), f)
    elif not f.exists(): print('FALTA', rel)
# texturas LFS sueltas dentro de las carpetas copiadas (p. ej. png de cejas)
for f in LIB.rglob('*.png'):
    if f.stat().st_size < 300 and f.read_bytes().startswith(b'version https://git-lfs'):
        rel = f.relative_to(LIB); print('baja', rel); urllib.request.urlretrieve(MEDIA + urllib.parse.quote(str(rel)), f)
# rig de TalkingHead como rig personalizado
TH = pathlib.Path('/home/claude/th/blender/MPFB'); (LIB/'rigs').mkdir(exist_ok=True)
import json; r = json.load(open(TH/'talkinghead.mpfbskel')); r['identifying_bones'] = ['LeftToe_End']; json.dump(r, open(LIB/'rigs'/'talkinghead.json','w')); shutil.copy(TH/'talkinghead.mhw', LIB/'rigs'/'weights.talkinghead.json')
print('ok', sum(1 for _ in LIB.rglob('*')), 'ficheros')
