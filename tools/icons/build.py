"""Builds the Tell Me Again icon family from one drawing: an open book of stories, with a ring of family gathered above it, joined by a single line.
The dots are the app's five colours and the middle one is larger, like an elder; the line is what keeps them together.

  python3 tools/icons/build.py        # writes art/icons/*.svg and the PNG sizes (needs rsvg-convert)
"""
import os, subprocess, math

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "art", "icons"); os.makedirs(OUT, exist_ok=True)
INK, CREAM, PAPER = "#1d1d1f", "#f4f1ea", "#fcfcfa"
DOTS = ["#7c5ad6", "#e26b3f", "#f0b232", "#6db56d", "#2fa8a0"]   # violet, coral, honey, leaf, teal

def family(cx=256, cy=300, r=150, radii=(22, 27, 35, 27, 22), spread=60, line=INK, lw=9, ring_fill=None, dots=DOTS):
    """The arc of people. Returns svg for the joining line and the dots."""
    pts = [(cx + r * math.sin(math.radians(a)), cy - r * math.cos(math.radians(a))) for a in (-spread, -spread / 2, 0, spread / 2, spread)]
    arc = f'<path d="M{pts[0][0]:.1f} {pts[0][1]:.1f} A{r} {r} 0 0 1 {pts[-1][0]:.1f} {pts[-1][1]:.1f}" fill="none" stroke="{line}" stroke-width="{lw}" stroke-linecap="round"/>'
    return arc + "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr}" fill="{c}"/>' for (x, y), rr, c in zip(pts, radii, dots))

def book(page=PAPER, stroke=INK, sw=10, lines=INK, y=0, scale=1.0, lined=True, cx=256):
    """Two open pages, a gap at the spine, and a rim beneath."""
    left = f"M{cx} 392 L{cx} 292 C{cx-34} 268 {cx-84} 262 {cx-132} 278 L{cx-132} 378 C{cx-84} 362 {cx-34} 368 {cx} 392 Z"
    right = f"M{cx} 392 L{cx} 292 C{cx+34} 268 {cx+84} 262 {cx+132} 278 L{cx+132} 378 C{cx+84} 362 {cx+34} 368 {cx} 392 Z"
    st = f'fill="{page}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else f'fill="{page}"'
    s = f'<path d="{left}" {st}/><path d="{right}" {st}/>'
    if lined:
        for k, dy in enumerate((0, 20, 40)):
            w = 70 - k * 12
            s += f'<path d="M{cx-112} {304+dy} q{w/2} -9 {w} 5" fill="none" stroke="{lines}" stroke-width="5" stroke-linecap="round" opacity=".55"/>'
            s += f'<path d="M{cx+112-w} {309+dy} q{w/2} -9 {w} -5" fill="none" stroke="{lines}" stroke-width="5" stroke-linecap="round" opacity=".55"/>'
    if stroke:
        s += f'<path d="M{cx-140} 384 C{cx-84} 368 {cx-34} 374 {cx} 398 C{cx+34} 374 {cx+84} 368 {cx+140} 384" fill="none" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round"/>'
    return s

def svg(body, size=512, bg=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">{bg}{body}</svg>'

def centred(inner, k, cy_shift=0):  # scale the whole drawing about the middle of the canvas
    return f'<g transform="translate(256 {256 + cy_shift}) scale({k}) translate(-256 -256)">{inner}</g>'

files = {}
# the emblem: a seal for the landing page, the profile and anywhere it has room
ring = f'<circle cx="256" cy="256" r="238" fill="{PAPER}" stroke="{INK}" stroke-width="16"/><circle cx="256" cy="256" r="206" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="1 15" stroke-linecap="round"/>'
files["emblem.svg"] = svg(ring + family() + book())
# the mark: the same drawing without the seal, on transparent, for headers
files["mark.svg"] = svg(centred(family() + book(), 1.12, -8))
# the app icon: ink, with the book in cream and the family in colour
files["app-icon.svg"] = svg(centred(family(line=CREAM, lw=8) + book(page=CREAM, stroke=None, lines=INK, lined=True), 0.9, 6), bg=f'<rect width="512" height="512" rx="116" fill="{INK}"/>')
# maskable: full bleed, content kept inside the safe zone (the middle 80%)
files["app-icon-maskable.svg"] = svg(centred(family(line=CREAM, lw=8) + book(page=CREAM, stroke=None, lines=INK, lined=True), 0.7, 6), bg=f'<rect width="512" height="512" fill="{INK}"/>')
# favicon: just the essentials so it reads at 16 px
files["favicon.svg"] = svg(centred(family(line=CREAM, lw=14, radii=(30, 38, 48, 38, 30), dots=["#e26b3f", "#f0b232", "#2fa8a0", "#f0b232", "#e26b3f"][:5]) + book(page=CREAM, stroke=None, lined=False), 0.92, 4), bg=f'<rect width="512" height="512" rx="116" fill="{INK}"/>')
# the mark for dark surfaces: the book cream, the line cream, the dots in colour
files["mark-light.svg"] = svg(centred(family(line=CREAM) + book(page=CREAM, stroke=None, lines=INK), 1.12, -8))
# one colour, for stamps, print and the PDF magazine
files["mark-mono.svg"] = svg(centred(family(dots=[INK] * 5) + book(page="none", lined=True), 1.12, -8))

for name, body in files.items():
    open(os.path.join(OUT, name), "w").write(body)
for src, dst, px in (("app-icon.svg", "icon-192.png", 192), ("app-icon.svg", "icon-512.png", 512), ("app-icon-maskable.svg", "icon-maskable-512.png", 512),
                     ("app-icon.svg", "apple-touch-icon.png", 180), ("favicon.svg", "favicon-32.png", 32), ("emblem.svg", "emblem-512.png", 512)):
    subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), os.path.join(OUT, src), "-o", os.path.join(OUT, dst)], check=True)
print("built", len(files), "svgs and the png sizes in", os.path.normpath(OUT))
