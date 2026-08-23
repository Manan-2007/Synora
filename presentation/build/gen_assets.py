#!/usr/bin/env python3
"""Generate Synora-palette decorative assets: a low-poly dark texture and
   a few hand-styled illustrations. All tuned to the calm sage/taupe brand."""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter

random.seed(7)
OUT = "img"
os.makedirs(OUT, exist_ok=True)

INK   = (34, 37, 43)
def lerp(a, b, t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))

# ---- 1. Low-poly dark texture -------------------------------------------
def texture(path, W=2000, H=1125, glow=(0.26, 0.30), sage_tint=True):
    base_dark = (24, 26, 31)
    base_lite = (46, 51, 60)
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    cols, rows = 15, 9
    cw, ch = W/cols, H/rows
    pts = {}
    for r in range(rows+1):
        for c in range(cols+1):
            jx = 0 if c in (0, cols) else random.uniform(-0.42, 0.42)*cw
            jy = 0 if r in (0, rows) else random.uniform(-0.42, 0.42)*ch
            pts[(c, r)] = (c*cw+jx, r*ch+jy)
    gx, gy = glow[0]*W, glow[1]*H
    maxd = math.hypot(W, H)
    def shade(p):
        cx = (p[0][0]+p[1][0]+p[2][0])/3
        cy = (p[0][1]+p[1][1]+p[2][1])/3
        dist = math.hypot(cx-gx, cy-gy)/maxd
        t = max(0.0, 1.0-dist*1.55)               # brighter near glow
        col = lerp(base_dark, base_lite, t*0.9)
        col = lerp(col, col, 0)                    # noop
        j = random.uniform(-6, 6)
        col = tuple(max(0, min(255, int(v+j))) for v in col)
        if sage_tint:                              # faint sage warmth near glow
            col = lerp(col, (60, 74, 66), t*0.18)
        return col
    for r in range(rows):
        for c in range(cols):
            a = pts[(c, r)]; b = pts[(c+1, r)]; cc = pts[(c+1, r+1)]; dd = pts[(c, r+1)]
            d.polygon([a, b, cc], fill=shade([a, b, cc]))
            d.polygon([a, cc, dd], fill=shade([a, cc, dd]))
    # soft radial glow overlay
    gl = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(gl)
    gd.ellipse([gx-W*0.34, gy-H*0.5, gx+W*0.34, gy+H*0.5], fill=60)
    gl = gl.filter(ImageFilter.GaussianBlur(160))
    glow_col = Image.new("RGB", (W, H), (72, 88, 79))
    img = Image.composite(glow_col, img, gl.point(lambda v: int(v*0.55)))
    img.save(path)
    print("texture", path)

texture(os.path.join(OUT, "texture_dark.png"))

# ---- 2. Rounded soft-shadow illustration frame helper -------------------
def rrect(d, box, r, fill, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

# ---- 3. Illustration: isometric layered stack (HTML→CSS→JS→DOM→Events) --
def illo_stack(path, W=1500, H=1300, ss=2):
    W*=ss; H*=ss
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # bottom -> top  (HTML the base, Events on top)
    layers = [
        ("HTML5",     (58, 66, 78)),
        ("CSS3",      (120, 138, 128)),
        ("JavaScript",(83, 101, 92)),
        ("DOM",       (99, 122, 108)),
        ("Events",    (176, 159, 149)),
    ]
    cx = W*0.5
    dx, dy = 300*ss, 165*ss        # isometric offsets (top rhombus)
    slab_h = 70*ss                 # thickness of each floating slab
    gap = 150*ss                   # centre-to-centre vertical spacing
    base_y = (1140)*ss
    def face(top_cx, top_cy, col):
        top   = [(top_cx, top_cy-dy), (top_cx+dx, top_cy), (top_cx, top_cy+dy), (top_cx-dx, top_cy)]
        left  = [(top_cx-dx, top_cy), (top_cx, top_cy+dy), (top_cx, top_cy+dy+slab_h), (top_cx-dx, top_cy+slab_h)]
        right = [(top_cx+dx, top_cy), (top_cx, top_cy+dy), (top_cx, top_cy+dy+slab_h), (top_cx+dx, top_cy+slab_h)]
        d.polygon(left,  fill=lerp(col, (0,0,0), 0.20)+(255,))
        d.polygon(right, fill=lerp(col, (0,0,0), 0.38)+(255,))
        d.polygon(top,   fill=col+(255,))
    for i, (label, col) in enumerate(layers):
        face(cx, base_y - i*gap, col)
    im = im.resize((W//ss, H//ss), Image.LANCZOS)
    im.save(path)
    print("illo_stack", path, im.size)

illo_stack(os.path.join(OUT, "illo_stack.png"))

# ---- 4. Illustration: "one workspace" — scattered cards converging ------
def illo_converge(path, W=1400, H=1000):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    hub = (W*0.72, H*0.5)
    small = [(180,180),(150,430),(210,700),(470,150),(500,760)]
    for (x, y) in small:
        rrect(d, [x, y, x+230, y+140], 26, (255, 255, 255, 255), outline=(229, 232, 235, 255), width=3)
        d.line([x+230, y+70, hub[0]-150, hub[1]], fill=(163, 174, 177, 150), width=4)
    d.ellipse([hub[0]-150, hub[1]-150, hub[0]+150, hub[1]+150], fill=(83, 101, 92, 255))
    im.save(path)
    print("illo_converge", path)

print("done")
