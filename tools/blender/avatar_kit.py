"""Layered bust parts for the avatar creator, rendered in Blender (headless). Reuses the helpers in characters.py.

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/avatar_kit.py -- --no-main --out /tmp/avkit

Every layer is a white clay render with the same camera, so js/avatar.js can tint them (skin, hair, shirt) and stack them.
Layers that hide behind the head (back hair) are cut with holdouts so each one composites cleanly.
"""
import sys, os, math
sys.argv += [] if "--no-main" in sys.argv else ["--no-main"]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import characters as C
from characters import *   # helpers: mat, sphere, torus, curve, empty, lin, parent, face, clear, setup_render, light rig

OUTD = arg("--out", "/tmp/avkit"); S = int(arg("--size", "480"))
C.W = C.H = S
WH = (0.93, 0.93, 0.93, 1)
hz = 2.12

def white(name, rough=0.7): return mat(name, WH, rough, 0.0, 0.2)

def cam():
    c = bpy.data.cameras.new("cam"); c.lens = 105; o = bpy.data.objects.new("cam", c); bpy.context.collection.objects.link(o)
    o.location = (0, -10.4, 2.12); o.rotation_euler = (math.radians(90), 0, 0); bpy.context.scene.camera = o
    tgt = empty("tgt", (0, 0, 2.1))
    def light(name, loc, energy, size, color=(1, 1, 1)):
        l = bpy.data.lights.new(name, "AREA"); l.energy = energy; l.size = size; l.color = color
        ob = bpy.data.objects.new(name, l); bpy.context.collection.objects.link(ob); ob.location = loc
        t = ob.constraints.new("TRACK_TO"); t.target = tgt; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
    light("key", (-4.5, -6.5, 6.5), 900, 5, (1, 0.97, 0.94)); light("fill", (5.5, -5, 3), 420, 6, (0.95, 0.97, 1)); light("rim", (3, 5.5, 5), 520, 4)

def holdout(objs):
    for o in objs: o.is_holdout = True

def base():
    """skull, ears, neck, nose + shoulders/torso. Returns dict of object lists by layer."""
    skin = white("skin", 0.55); shirt = white("shirt")
    head = empty("head", (0, 0, 1.82)); L = {"skin": [], "shirt": [], "face": [], "head": head}
    L["skin"] += [sphere("skull", (0, 0, hz), (0.72, 0.68, 0.7), skin, head), sphere("neck", (0, 0, 1.78), (0.26, 0.24, 0.2), skin)]
    for sx in (-1, 1): L["skin"].append(sphere("ear", (sx * 0.7, 0.02, hz - 0.02), (0.14, 0.09, 0.17), skin, head))
    L["shirt"].append(sphere("torso", (0, 0.02, 1.12), (0.74, 0.56, 0.88), shirt))
    for sx in (-1, 1): L["shirt"].append(sphere("shoulder", (sx * 0.66, 0.0, 1.62), (0.28, 0.3, 0.3), shirt))
    return L

def faceparts(L):
    mats = dict(skin2=white("skin2", 0.55), eye=mat("eye", lin("#14110f"), 0.15, 0, 0.8), white=mat("w", (1, 1, 1, 1), 0.2, 0, 0.5),
                brow=mat("brow", lin("#2b1a12"), 0.8), blush=mat("blush", lin("#e8826e"), 0.9, 0, 0.1), mouth=mat("mouth", lin("#3a1c14"), 0.6))
    n0 = len(bpy.data.objects); face(L["head"], hz, mats)
    mine = [o for o in bpy.data.objects if o.parent is L["head"] and o.name.split(".")[0] in ("eye", "glint", "brow", "blush", "nose", "mouth")]
    L["skin"] += [o for o in mine if o.name.startswith("nose")]   # the nose takes the skin tint
    return [o for o in mine if not o.name.startswith("nose")]

# hair styles: lists of (name, loc, scale) spheres, all one white material, parented to head
HAIR = {
 "puff":  [((0, 0.0, hz + 0.58), (0.5,) * 3), ((-0.52, 0.04, hz + 0.4), (0.36,) * 3), ((0.52, 0.04, hz + 0.4), (0.36,) * 3), ((-0.3, -0.12, hz + 0.72), (0.3,) * 3), ((0.3, -0.12, hz + 0.72), (0.3,) * 3), ((0, 0.28, hz + 0.25), (0.5,) * 3), ((-0.62, 0.08, hz + 0.12), (0.26,) * 3), ((0.62, 0.08, hz + 0.12), (0.26,) * 3)],
 "afro":  [((0, 0.1, hz + 0.5), (0.98, 0.8, 0.82)), ((-0.62, 0.0, hz + 0.1), (0.4,) * 3), ((0.62, 0.0, hz + 0.1), (0.4,) * 3), ((0, -0.12, hz + 0.95), (0.5, 0.4, 0.34))],
 "short": [((0, 0.1, hz + 0.3), (0.74, 0.7, 0.5))],
 "bun":   [((0, 0.1, hz + 0.3), (0.74, 0.7, 0.5)), ((0, 0.22, hz + 0.92), (0.3,) * 3)],
 "long":  [((0, 0.1, hz + 0.3), (0.76, 0.72, 0.52)), ((-0.62, 0.16, hz - 0.5), (0.26, 0.3, 0.9)), ((0.62, 0.16, hz - 0.5), (0.26, 0.3, 0.9)), ((0, 0.34, hz - 0.3), (0.5, 0.24, 0.62))],
 "wrap":  [((0, 0.08, hz + 0.34), (0.8, 0.74, 0.5)), ((-0.17, -0.2, hz + 0.86), (0.22, 0.2, 0.17)), ((0.17, -0.2, hz + 0.86), (0.22, 0.2, 0.17))],
 "locs":  [((0, 0.1, hz + 0.3), (0.74, 0.7, 0.48))] + [((sx * (0.2 + 0.19 * i), 0.0 if abs(i) < 9 else 0, hz - 0.6 - 0.1 * (i % 2)), (0.1, 0.1, 0.62)) for sx in (-1, 1) for i in range(4)],
}

def render_layer(name, objs, hold):
    for o in bpy.data.objects:
        if o.type == "MESH" or o.type == "CURVE": o.hide_render = True; o.is_holdout = False
    for o in objs: o.hide_render = False
    for o in hold: o.hide_render = False; o.is_holdout = True
    sc = bpy.context.scene; sc.render.filepath = os.path.join(OUTD, name + ".png"); bpy.ops.render.render(write_still=True)
    for o in hold: o.is_holdout = False
    print("layer", name)

def main_kit():
    os.makedirs(OUTD, exist_ok=True)
    clear(); setup_render(); sc = bpy.context.scene; sc.render.resolution_x = sc.render.resolution_y = S; cam()
    L = base(); fp = faceparts(L); head_skin = L["skin"]
    render_layer("shirt", L["shirt"], [])
    render_layer("skin", L["skin"], [])
    render_layer("face", fp, head_skin)
    hm = white("hair", 0.85)
    for style, parts in HAIR.items():
        objs = [sphere("h", loc, sc_, hm, L["head"]) for loc, sc_ in parts]
        if style == "wrap":
            objs.append(torus("band", (0, -0.02, hz + 0.26), 0.7, 0.1, hm, L["head"], rot=(math.radians(80), 0, 0)))
        render_layer("hair-" + style, objs, head_skin + fp)
        for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    objs = [sphere("beard", (0, -0.34, hz - 0.44), (0.52, 0.4, 0.3), hm, L["head"])]
    render_layer("beard", objs, head_skin)
    gm = mat("frame", lin("#1d1d1f"), 0.35, 0, 0.6)
    g = [torus("lens", (sx * 0.25, -0.695, hz + 0.065), 0.19, 0.017, gm, L["head"]) for sx in (-1, 1)] + [curve("bridge", [((-0.07, -0.7, hz + 0.1), (-0.09, -0.7, hz + 0.1), (-0.05, -0.7, hz + 0.12)), ((0.07, -0.7, hz + 0.1), (0.05, -0.7, hz + 0.12), (0.09, -0.7, hz + 0.1))], 0.017, gm, L["head"])]
    render_layer("glasses", g, [])
    shade = mat("shade", lin("#1d1d1f"), 0.2, 0, 0.9)
    sh = [sphere("sl", (sx * 0.25, -0.69, hz + 0.065), (0.2, 0.04, 0.15), shade, L["head"]) for sx in (-1, 1)] + [torus("sb", (0, -0.7, hz + 0.1), 0.05, 0.015, shade, L["head"])]
    render_layer("shades", sh, [])
    gold = mat("gold", lin("#f0b232"), 0.25, 0, 0.9)
    render_layer("earrings", [sphere("ring", (sx * 0.72, 0.0, hz - 0.22), (0.06,) * 3, gold, L["head"]) for sx in (-1, 1)], [])

main_kit()
