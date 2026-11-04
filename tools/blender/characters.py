"""Soft 3D "clay" characters for the landing page, built and rendered in Blender (headless).

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/characters.py -- --out /tmp/chars [--only gran,dad] [--frames 36] [--still]

Renders transparent PNG frames of a looping idle animation per character into <out>/<name>/. tools/blender/pack.py turns them into the
animated WebP files in art/characters/. Everything is procedural: no downloaded models, no AI generation.
"""
import bpy, math, sys, os, random

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = arg("--out", "/tmp/chars"); ONLY = (arg("--only") or "").split(",") if arg("--only") else None
N = int(arg("--frames", "36")); STILL = "--still" in argv; W, H = int(arg("--w", "420")), int(arg("--h", "560"))

def lin(h):
    h = h.lstrip("#"); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92
    return (f(r), f(g), f(b), 1.0)

BRAND = dict(coral="#e26b3f", honey="#f0b232", leaf="#6db56d", teal="#2fa8a0", sky="#5aa9e6", violet="#7c5ad6", ink="#1d1d1f", cream="#f4f1ea")
SKIN = dict(deep="#5c3a21", brown="#8d5a3b", tan="#c68642", sand="#e0ac69", light="#f1c27d")

def mat(name, color, rough=0.6, sss=0.0, spec=0.35):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = rough
    for k, v in (("Subsurface Weight", sss), ("Specular IOR Level", spec)):
        if k in b.inputs: b.inputs[k].default_value = v
    if sss and "Subsurface Radius" in b.inputs: b.inputs["Subsurface Radius"].default_value = (0.9, 0.35, 0.25)
    return m

def parent(o, p):
    bpy.context.view_layer.update()   # new objects have no world matrix until the scene updates; without this children jump
    o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()

def sphere(name, loc, scale, m, p=None, rot=(0, 0, 0), seg=40):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = scale; o.rotation_euler = rot
    bpy.ops.object.shade_smooth(); o.data.materials.append(m)
    if p: parent(o, p)
    return o

def empty(name, loc, p=None):
    o = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(o); o.location = loc
    if p: parent(o, p)
    return o

def torus(name, loc, major, minor, m, p=None, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=40, minor_segments=14, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; bpy.ops.object.shade_smooth(); o.data.materials.append(m)
    if p: parent(o, p)
    return o

def curve(name, pts, width, m, p=None):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = width; cu.bevel_resolution = 6; cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for bp, (co, hl, hr) in zip(sp.bezier_points, pts):
        bp.co = co; bp.handle_left = hl; bp.handle_right = hr
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    if p: parent(o, p)
    return o

def face(head, hz, mats, mood="smile", brows=True, eye_r=0.095, dy=0.0):
    eyes = []
    for sx in (-1, 1):
        e = sphere("eye", (sx * 0.24, -0.585 + dy, hz + 0.06), (eye_r, eye_r * 0.8, eye_r * 1.1), mats["eye"], head)
        sphere("glint", (sx * 0.24 + 0.03, -0.655 + dy, hz + 0.095), (0.026,) * 3, mats["white"], head)
        eyes.append(e)
        if brows:
            sphere("brow", (sx * 0.25, -0.57 + dy, hz + 0.25), (0.13, 0.03, 0.035), mats["brow"], head, rot=(0, math.radians(sx * -10), math.radians(sx * 8)))
        sphere("blush", (sx * 0.4, -0.5 + dy, hz - 0.12), (0.12, 0.025, 0.075), mats["blush"], head, rot=(math.radians(10), 0, math.radians(sx * 12)))
    sphere("nose", (0, -0.665 + dy, hz - 0.06), (0.075, 0.07, 0.065), mats["skin2"], head)
    if mood == "smile":
        curve("mouth", [((-0.19, -0.62 + dy, hz - 0.2), (-0.23, -0.6 + dy, hz - 0.17), (-0.12, -0.65 + dy, hz - 0.27)),
                        ((0.0, -0.66 + dy, hz - 0.29), (-0.08, -0.66 + dy, hz - 0.29), (0.08, -0.66 + dy, hz - 0.29)),
                        ((0.19, -0.62 + dy, hz - 0.2), (0.12, -0.65 + dy, hz - 0.27), (0.23, -0.6 + dy, hz - 0.17))], 0.024, mats["mouth"], head)
    return eyes

def person(spec):
    """Builds one character; returns the pieces the animation moves."""
    skin = mat("skin", lin(SKIN[spec["skin"]]), 0.55, 0.12)
    sk = lin(SKIN[spec["skin"]]); skin2 = mat("skin2", (sk[0] * 0.88, sk[1] * 0.82, sk[2] * 0.8, 1), 0.55, 0.1)
    shirt = mat("shirt", lin(BRAND[spec["shirt"]]), 0.7, 0.0, 0.2); pants = mat("pants", lin(BRAND["ink"]), 0.7, 0.0, 0.2)
    shoe = mat("shoe", lin(BRAND[spec.get("shoe", "coral")]), 0.5)
    mats = dict(skin2=skin2, eye=mat("eye", lin("#14110f"), 0.15, 0.0, 0.8), white=mat("white", (1, 1, 1, 1), 0.2, 0, 0.5),
                brow=mat("brow", lin("#2b1a12"), 0.8), blush=mat("blush", lin("#e8826e"), 0.9, 0, 0.1), mouth=mat("mouth", lin("#3a1c14"), 0.6))
    root = empty("root", (0, 0, 0)); s = spec.get("scale", 1.0)
    body = empty("body", (0, 0, 0), root)
    sphere("torso", (0, 0.02, 1.12), (0.74, 0.56, 0.88), shirt, body)
    for sx in (-1, 1):
        sphere("leg", (sx * 0.3, 0, 0.42), (0.23, 0.23, 0.42), pants, body)
        sphere("shoe", (sx * 0.3, -0.1, 0.1), (0.27, 0.4, 0.15), shoe, body)
    # arms swing from the shoulder
    arms = []
    for sx in (-1, 1):
        piv = empty("shoulder", (sx * 0.78, 0.0, 1.55), body)
        # parts are placed in world space; parenting keeps them there and the shoulder then swings them
        sphere("arm", (sx * 0.86, 0, 1.13), (0.19, 0.19, 0.52), shirt, piv, rot=(0, math.radians(sx * 6), 0))
        sphere("hand", (sx * 0.88, 0, 0.62), (0.2, 0.2, 0.2), skin, piv)
        arms.append(piv)
    hz = 2.12; head = empty("head", (0, 0, 1.82), body)   # pivots at the neck
    sphere("skull", (0, 0, hz), (0.72, 0.68, 0.7), skin, head)
    sphere("neck", (0, 0, 1.78), (0.26, 0.24, 0.2), skin, body)
    for sx in (-1, 1): sphere("ear", (sx * 0.7, 0.02, hz - 0.02), (0.14, 0.09, 0.17), skin, head)
    eyes = face(head, hz, mats, brows=not spec.get("nobrows"), eye_r=spec.get("eye_r", 0.095))
    kind = spec["hair"]; hc = mat("hair", lin(BRAND.get(spec.get("haircol", "ink"), spec.get("haircol", "#1d1d1f"))), 0.85, 0.0, 0.15)
    if kind == "puff":   # a soft cloud of curls
        for loc, sc in (((0, 0.0, hz + 0.58), 0.5), ((-0.52, 0.04, hz + 0.4), 0.36), ((0.52, 0.04, hz + 0.4), 0.36), ((-0.3, -0.12, hz + 0.72), 0.3), ((0.3, -0.12, hz + 0.72), 0.3), ((0, 0.28, hz + 0.25), 0.5), ((-0.62, 0.08, hz + 0.12), 0.26), ((0.62, 0.08, hz + 0.12), 0.26)):
            sphere("curl", loc, (sc,) * 3, hc, head)
    elif kind == "short":
        sphere("hair", (0, 0.1, hz + 0.3), (0.74, 0.7, 0.5), hc, head)
    elif kind == "bun":
        sphere("hair", (0, 0.1, hz + 0.3), (0.74, 0.7, 0.5), hc, head); sphere("bun", (0, 0.22, hz + 0.92), (0.3, 0.3, 0.3), hc, head)
    elif kind == "wrap":
        w = mat("wrap", lin(BRAND[spec.get("wrapcol", "violet")]), 0.65)
        sphere("wrap", (0, 0.08, hz + 0.34), (0.8, 0.74, 0.5), w, head)
        torus("band", (0, -0.02, hz + 0.26), 0.7, 0.1, w, head, rot=(math.radians(80), 0, 0)).scale = (1, 1, 1)
        for sx in (-1, 1): sphere("knot", (sx * 0.17, -0.2, hz + 0.86), (0.22, 0.2, 0.17), w, head, rot=(0, math.radians(sx * 24), 0))
    if spec.get("beard"):
        sphere("beard", (0, -0.38, hz - 0.36), (0.5, 0.36, 0.3), hc, head)
        curve("mouth2", [((-0.17, -0.7, hz - 0.2), (-0.2, -0.7, hz - 0.18), (-0.12, -0.72, hz - 0.26)), ((0, -0.73, hz - 0.28), (-0.07, -0.73, hz - 0.28), (0.07, -0.73, hz - 0.28)), ((0.17, -0.7, hz - 0.2), (0.12, -0.72, hz - 0.26), (0.2, -0.7, hz - 0.18))], 0.026, mat("tooth", (1, 1, 1, 1), 0.4), head)
    if spec.get("glasses"):
        gm = mat("frame", lin("#1d1d1f"), 0.35, 0, 0.6)
        for sx in (-1, 1): torus("lens", (sx * 0.25, -0.695, hz + 0.065), 0.19, 0.017, gm, head)
        curve("bridge", [((-0.07, -0.7, hz + 0.1), (-0.09, -0.7, hz + 0.1), (-0.05, -0.7, hz + 0.12)), ((0.07, -0.7, hz + 0.1), (0.05, -0.7, hz + 0.12), (0.09, -0.7, hz + 0.1))], 0.017, gm, head)
    if spec.get("earrings"):
        gold = mat("gold", lin("#f0b232"), 0.25, 0, 0.9)
        for sx in (-1, 1): sphere("ring", (sx * 0.72, 0.0, hz - 0.22), (0.06,) * 3, gold, head)
    root.scale = (s, s, s)   # scale last, so the parts are placed at full size first
    return dict(root=root, body=body, head=head, arms=arms, eyes=eyes, wave=spec.get("wave"))

def pebble():
    grey = mat("stone", lin("#9a9aa0"), 0.75, 0.0, 0.25); stone2 = mat("stone2", lin("#b7b7bd"), 0.7)
    mats = dict(skin2=grey, eye=mat("eye", lin("#14110f"), 0.15, 0.0, 0.8), white=mat("white", (1, 1, 1, 1), 0.2, 0, 0.5), brow=grey, blush=mat("blush", lin("#e8826e"), 0.9, 0, 0.1), mouth=mat("mouth", lin("#3a1c14"), 0.6))
    root = empty("root", (0, 0, 0)); body = empty("body", (0, 0, 0), root); head = empty("head", (0, 0, 0.3), body)
    sphere("stone", (0, 0, 1.15), (1.05, 0.9, 0.95), grey, head); sphere("sheen", (-0.35, -0.55, 1.65), (0.3, 0.12, 0.2), stone2, head, rot=(0, 0, math.radians(-25)))
    eyes = face(head, 1.2, mats, brows=False, eye_r=0.125, dy=-0.27)
    for sx in (-1, 1): sphere("foot", (sx * 0.4, -0.1, 0.1), (0.3, 0.38, 0.14), grey, body)
    return dict(root=root, body=body, head=head, arms=[], eyes=eyes, wave=None)

def animate(c, n, who):
    sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, n
    arms = c["arms"]; ph = random.Random(who).random() * 6.28
    for f in range(1, n + 1):
        t = (f - 1) / n * 2 * math.pi
        c["body"].scale = (1 + 0.012 * math.sin(2 * t + ph), 1 + 0.012 * math.sin(2 * t + ph), 1 - 0.028 * math.sin(2 * t + ph)); c["body"].keyframe_insert("scale", frame=f)
        c["body"].location = (0, 0, 0.05 * abs(math.sin(t + ph / 2))); c["body"].keyframe_insert("location", frame=f)
        c["head"].rotation_euler = (0.03 * math.sin(2 * t + 1), 0.05 * math.sin(t + ph), 0.06 * math.sin(t)); c["head"].keyframe_insert("rotation_euler", frame=f)
        for i, a in enumerate(arms):
            base = 0.12 * (1 if i else -1); sw = 0.1 * math.sin(t + i * 3.1 + ph)
            if c["wave"] == "right" and i == 1: a.rotation_euler = (0, -2.55 + 0.32 * math.sin(3 * t), 0)
            elif c["wave"] == "both": a.rotation_euler = (0, (-2.4 if i else 2.4) + (0.3 if i else -0.3) * math.sin(3 * t + i), 0)
            else: a.rotation_euler = (0, base + sw, 0)
            a.keyframe_insert("rotation_euler", frame=f)
        blink = 1.0
        if f in (n - 5, n - 3): blink = 0.55
        if f == n - 4: blink = 0.08
        for e in c["eyes"]: e.scale = (e.scale[0], e.scale[1], e.scale[2]) if False else e.scale
        for e in c["eyes"]:
            e["bz"] = e.get("bz", e.scale[2]); e.scale[2] = e["bz"] * blink; e.keyframe_insert("scale", frame=f)

def setup_render():
    sc = bpy.context.scene
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try: sc.render.engine = eng; break
        except TypeError: pass
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
    sc.render.film_transparent = True; sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
    try: sc.eevee.taa_render_samples = 96
    except Exception: pass
    for k, v in (("use_gtao", True), ("use_raytracing", True)):
        try: setattr(sc.eevee, k, v)
        except Exception: pass
    w = bpy.data.worlds.new("w"); w.use_nodes = True; bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.95, 0.95, 0.97, 1); bg.inputs[1].default_value = 0.55; sc.world = w

def stage():
    cam = bpy.data.cameras.new("cam"); cam.lens = 85; co = bpy.data.objects.new("cam", cam); bpy.context.collection.objects.link(co)
    co.location = (0, -10.4, 1.72); co.rotation_euler = (math.radians(90), 0, 0); bpy.context.scene.camera = co
    tgt = empty("tgt", (0, 0, 1.6))
    def light(name, loc, energy, size, color=(1, 1, 1)):
        l = bpy.data.lights.new(name, "AREA"); l.energy = energy; l.size = size; l.color = color
        o = bpy.data.objects.new(name, l); bpy.context.collection.objects.link(o); o.location = loc
        c = o.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    light("key", (-4.5, -6.5, 6.5), 900, 5, (1, 0.96, 0.9)); light("fill", (5.5, -5, 3), 380, 6, (0.92, 0.95, 1)); light("rim", (3, 5.5, 5), 620, 4)

CAST = {
 "gran":   dict(skin="brown", shirt="violet", hair="puff", haircol="cream", glasses=True, earrings=True, wave="right", shoe="honey"),
 "dad":    dict(skin="deep", shirt="teal", hair="short", beard=True, scale=1.07, shoe="coral"),
 "aunty":  dict(skin="sand", shirt="honey", hair="wrap", wrapcol="violet", earrings=True, wave="both", shoe="teal"),
 "mum":    dict(skin="light", shirt="leaf", hair="bun", haircol="#2b1a12", shoe="violet"),
 "kid":    dict(skin="tan", shirt="coral", hair="puff", haircol="ink", scale=0.8, eye_r=0.115, wave="right", shoe="sky"),
 "pebble": None,
}

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def main():
    for name, spec in CAST.items():
        if ONLY and name not in ONLY: continue
        clear(); setup_render(); stage()
        c = pebble() if spec is None else person(spec)
        animate(c, N, name); sc = bpy.context.scene
        d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
        if "--debug" in argv:
            sc.frame_set(1)
            for o in sc.objects:
                if o.name.startswith(("hand", "shoulder", "skull")): print("DBG", o.name, tuple(round(v, 2) for v in o.matrix_world.translation), tuple(round(v, 2) for v in o.rotation_euler))
        if STILL:
            sc.frame_set(1); sc.render.filepath = os.path.join(d, "still.png"); bpy.ops.render.render(write_still=True)
        else:
            sc.render.filepath = os.path.join(d, "f_"); bpy.ops.render.render(animation=True)
        print("rendered", name)

if "--no-main" not in argv:   # avatar_kit.py imports this file for its helpers and skips the cast
    main()
