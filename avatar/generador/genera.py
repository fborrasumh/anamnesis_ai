"""Genera un paciente con MPFB + rig y visemas de TalkingHead y lo exporta a GLB.
Uso: python3 genera.py <id>   (un proceso por paciente; ids en disenos.py)"""
import os, sys, importlib.util, pathlib
import bpy
sys.path.insert(0, os.path.dirname(__file__)); from disenos import D, edad

ID = sys.argv[1]; OUT = pathlib.Path('/home/claude/gen/out'); OUT.mkdir(exist_ok=True)
(i, gen, anos, piel, pelo, color, ropa, cejas, pest, peso, musc) = next(d for d in D if d[0] == ID)

import addon_utils
bpy.ops.wm.read_userpref()
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
import bl_ext.user_default.mpfb as mpfb
from bl_ext.user_default.mpfb.services import HumanService, ExportService, TargetService, ObjectService, AssetService
from bl_ext.user_default.mpfb.entities.clothes.mhclo import Mhclo
TH = pathlib.Path('/home/claude/th/blender/MPFB')
spec = importlib.util.spec_from_file_location('th_addon', TH / 'talkinghead-addon.py'); th = importlib.util.module_from_spec(spec); spec.loader.exec_module(th)

bpy.ops.wm.read_homefile(use_empty=True)
pelo_mhclo = AssetService.find_asset_absolute_path(f'{pelo}/{pelo}.mhclo', 'hair')
m = Mhclo(); m.load(pelo_mhclo)
info = {
    'name': ID,
    'phenotype': {'gender': gen, 'age': edad(anos), 'muscle': musc, 'weight': peso, 'proportions': 0.5,
                  'height': 0.5, 'cupsize': 0.5, 'firmness': 0.5 if anos < 50 else 0.3,
                  'race': {'asian': 0.0, 'caucasian': 1.0, 'african': 0.0}},
    'rig': 'custom.talkinghead',
    'eyes': 'high-poly/high-poly.mhclo', 'eyebrows': f'{cejas}/{cejas}.mhclo', 'eyelashes': f'{pest}/{pest}.mhclo',
    'teeth': 'teeth_base/teeth_base.mhclo', 'tongue': 'tongue01/tongue01.mhclo', 'hair': f'{pelo}/{pelo}.mhclo',
    'proxy': '', 'targets': [], 'expressions': [], 'clothes': [f'{ropa}/{ropa}.mhclo'],
    'skin_mhmat': f'{piel}/{piel}.mhmat', 'skin_material_type': 'GAMEENGINE', 'clothes_material_type': 'GAMEENGINE',
    'eyes_material_type': 'GAMEENGINE', 'skin_material_settings': {}, 'eyes_material_settings': {},
    'alternative_materials': {m.uuid: f'{pelo}/materials/{pelo}_{color}.mhmat'},
}
ajustes = HumanService.get_default_deserialization_settings()
ajustes.update({'subdiv_levels': 0, 'material_instances': 'NEVER'})
basemesh = HumanService.deserialize_from_dict(info, ajustes)

# copia de exportación: bake de modelado + ARKit/visemas de TalkingHead + quitar helpers y máscaras
copia = ExportService.create_character_copy(basemesh, name_suffix='_x', place_in_collection=bpy.context.scene.collection)
nb = ObjectService.find_object_of_type_amongst_nearest_relatives(copia)
TargetService.bake_targets(nb)
arm = nb.parent
mallas = [o for o in arm.children if o.type == 'MESH']
th.build_targets(mpfb, mallas, TH / 'talkinghead-targets.zip')
ExportService.bake_modifiers_remove_helpers(nb, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)

# borra el diseño original; deja solo la copia
for o in list(bpy.data.objects):
    if o != arm and o.parent != arm:
        bpy.data.objects.remove(o, do_unlink=True)
arm.name = 'Armature'
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
th.scale_character([arm], 'Hips', 1.0)
th.fix_bone_axes([arm], th.BONE_AXES_DATA_A)
bpy.ops.object.mode_set(mode='OBJECT')
for o in [arm] + list(arm.children): o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# materiales para glTF: opacos salvo pelo, cejas, pestañas y ojos (recorte alfa)
RECORTE = ('hair', 'eyebrow', 'eyelash', 'high-poly', pelo, cejas, pest)   # high-poly = ojos (córnea transparente)
for o in arm.children:
    if o.type != 'MESH': continue
    for s in o.material_slots:
        mat = s.material
        if not mat or not mat.use_nodes: continue
        nt = mat.node_tree; bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf: continue
        a = bsdf.inputs['Alpha']
        if not a.is_linked: continue
        src = a.links[0].from_socket
        for l in list(a.links): nt.links.remove(l)
        if any(k in o.name.lower() or k in mat.name.lower() for k in RECORTE):
            gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.4
            nt.links.new(src, gt.inputs[0]); nt.links.new(gt.outputs[0], a)

bpy.ops.object.select_all(action='SELECT')
dest = OUT / f'{ID}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', use_selection=True, export_animations=False,
                          export_morph=True, export_morph_normal=False, export_skins=True, export_apply=False)
print('EXPORTADO', dest, dest.stat().st_size, [o.name for o in arm.children])
print('VISEMAS', {o.name: len([k for k in (o.data.shape_keys.key_blocks.keys() if o.data.shape_keys else []) if k.startswith('viseme_')]) for o in arm.children if o.type == 'MESH'})
