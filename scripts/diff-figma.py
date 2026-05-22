#!/usr/bin/env python3
"""
Smoke-test visual parity: overlay-diff a rendered screenshot against a Figma
reference image. Highlights regions that differ so big structural mismatches
(wrong layout, missing element) jump out. NOT a pixel-perfect gate — font
rendering differs between Figma and Chrome, so expect low-level noise.

Usage:
    python scripts/diff-figma.py <rendered.png> <figma-reference.png> [out-diff.png]

Prints a mean-difference score (0 = identical). Writes a heatmap PNG.
"""
import sys
from PIL import Image, ImageChops

def main(render_path, ref_path, out_path="shots/diff.png"):
    render = Image.open(render_path).convert("RGB")
    ref = Image.open(ref_path).convert("RGB")
    # Scale the Figma reference to the render width, preserving aspect.
    w = render.width
    ref = ref.resize((w, round(ref.height * w / ref.width)))
    h = min(render.height, ref.height)
    render, ref = render.crop((0, 0, w, h)), ref.crop((0, 0, w, h))
    diff = ImageChops.difference(render, ref)
    # mean difference across all pixels/channels, normalised 0..1
    hist = diff.histogram()
    total = sum(i % 256 * v for i, v in enumerate(hist))
    score = total / (w * h * 3 * 255)
    print(f"mean diff: {score:.4f}  (compared {w}x{h}px)")
    diff.save(out_path)
    print(f"heatmap -> {out_path} (bright areas = mismatches to inspect)")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    main(*sys.argv[1:4])
