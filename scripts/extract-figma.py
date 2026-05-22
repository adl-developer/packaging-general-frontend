#!/usr/bin/env python3
"""
Extract exact, build-ready specs from a cached Figma `get_design_context`
result so we build to numbers instead of eyeballing.

Usage:
    python scripts/extract-figma.py <path-to-cached-context.txt> [--section "Heading text"]

The input file is the raw `get_design_context` output (either the JSON array
[{type,text}] that the harness saves when output is large, or plain text).
Prints: typography per text node, layout per container, unique colors, assets.
"""
import json, re, html, sys

def load(path):
    raw = open(path, encoding="utf-8").read()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return "".join(p.get("text", "") for p in data)
    except Exception:
        pass
    return raw

def typography(code):
    print("=== TYPOGRAPHY (size / weight / line-height / tracking | text) ===")
    seen = set()
    for m in re.finditer(r'<p\b[^>]*?className="([^"]*)"[^>]*>(.*?)</p>', code, re.S):
        cls, frag = m.group(1), m.group(2)
        txt = re.sub(r"\{`([^`]*)`\}", r"\1", re.sub(r"<[^>]+>", "", frag))
        txt = re.sub(r"\s+", " ", html.unescape(txt)).strip()
        if not txt or txt in seen:
            continue
        seen.add(txt)
        w = re.search(r"Inter:([A-Za-z_ ]+?)'", cls)
        size = re.search(r"text-\[(\d+)px\]", cls)
        lh = re.search(r"leading-\[([\d.]+)px\]", cls)
        tr = re.search(r"tracking-\[(-?[\d.]+)px\]", cls)
        print(f"{(size.group(1) if size else '?'):>3}px  "
              f"{(w.group(1).strip() if w else '?'):<10} "
              f"lh={(lh.group(1) if lh else ('normal' if 'leading-[normal]' in cls else '?')):<7} "
              f"tr={(tr.group(1) if tr else '0'):<8} | {txt[:54]}")

def layout(code, section=None):
    print("\n=== LAYOUT (containers: flex/grid, gap, padding, size, border, radius, bg) ===")
    chunk = code
    if section:
        i = code.find(section)
        if i >= 0:
            chunk = code[max(0, i - 600):i + 9000]
    rx = re.compile(r"(flex|grid|content|items|justify|gap-\[|p[xytrbl]?-\[|rounded|size-|w-\[|h-\[|aspect|object|overflow|bg-\[|border|max-w|shrink|backdrop)")
    for m in re.finditer(r'<(div|img)\b[^>]*?(?:data-name="([^"]*)")?[^>]*?className="([^"]*)"', chunk):
        tag, name, cls = m.group(1), m.group(2) or "", m.group(3)
        keep = " ".join(c for c in cls.split() if rx.match(c))
        if tag == "img" or keep:
            print(f"[{tag}] {name}: {keep[:200]}")

def colors(code):
    print("\n=== UNIQUE COLORS ===")
    cols = set(re.findall(r"#[0-9a-fA-F]{6}", code)) | set(re.findall(r"rgba\([^)]*\)", code))
    print("\n".join(sorted(cols)))

def assets(code):
    print("\n=== ASSETS ===")
    for n, u in re.findall(r'const (\w+) = "(https://www\.figma\.com/api/mcp/asset/[^"]+)";', code):
        print(n, "=", u)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    section = None
    if "--section" in sys.argv:
        section = sys.argv[sys.argv.index("--section") + 1]
    code = load(sys.argv[1])
    typography(code)
    layout(code, section)
    colors(code)
    assets(code)
