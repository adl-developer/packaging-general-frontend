import os, sys
from PIL import Image
src = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
prefix = sys.argv[3] if len(sys.argv) > 3 else "_strip"
im = Image.open(src)
W, H = im.size
h = -(-H // n)  # ceil
out_dir = os.path.dirname(src)
for i in range(n):
    y = i * h
    th = min(h, H - y)
    if th <= 0:
        break
    strip = im.crop((0, y, W, y + th))
    out = os.path.join(out_dir, f"{prefix}-{i}.png")
    strip.save(out)
    print(f"{out}  {W}x{th}")
