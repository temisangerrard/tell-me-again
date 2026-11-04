"""Turn the Blender frames into the files the landing page loads.

  python3 tools/blender/pack.py <frames dir from characters.py> [--size 320]

For each character: art/characters/<name>.webp (looping animation, transparent) and <name>-still.webp (first frame, for reduced motion).
"""
import os, sys, glob
from PIL import Image

src = sys.argv[1]; size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 320
out = os.path.join(os.path.dirname(__file__), "..", "..", "art", "characters"); os.makedirs(out, exist_ok=True)
for d in sorted(glob.glob(os.path.join(src, "*"))):
    name = os.path.basename(d); frames = sorted(glob.glob(os.path.join(d, "f_*.png")))
    if not frames: continue
    ims = [Image.open(f).convert("RGBA").resize((size, size), Image.LANCZOS) for f in frames]
    ims[0].save(os.path.join(out, f"{name}-still.webp"), "WEBP", quality=88, method=6)
    ims[0].save(os.path.join(out, f"{name}.webp"), "WEBP", save_all=True, append_images=ims[1:], duration=66, loop=0, quality=78, method=4)
    print(name, len(ims), "frames", os.path.getsize(os.path.join(out, f"{name}.webp")) // 1024, "KB")
