"""Packs the avatar_kit.py renders into art/avatar/*.webp (cropped to the bust, 360 px).  python3 tools/blender/pack_avatar.py /tmp/avkit"""
import sys, os
from PIL import Image
src = sys.argv[1]; out = os.path.join(os.path.dirname(__file__), "..", "..", "art", "avatar"); os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(src)):
    if f.endswith(".png") and f != "sheet.png" and f != "t.png":
        im = Image.open(os.path.join(src, f)).convert("RGBA").crop((40, 50, 440, 450)).resize((360, 360), Image.LANCZOS)
        im.save(os.path.join(out, f[:-4] + ".webp"), quality=85, method=4)
