#!/usr/bin/env python3
"""
Figma REST API helper — rate-limit-friendly alternative to the Figma MCP server.

Token (treated as a secret, never inlined in commands): read from the
FIGMA_TOKEN env var, else from `design-reference/.figma-token` (gitignored).
Generate one at Figma → Settings → Security → Personal access tokens
(scope: file content read).

Usage:
  python scripts/figma-api.py nodes <fileKey> <nodeId> [--fresh] # dump exact specs (cache-first)
  python scripts/figma-api.py image <fileKey> <nodeId> [scale] [--fresh] # export node PNG (cache-first)
  python scripts/figma-api.py cached                              # list everything already cached

RATE LIMITS: the Figma REST API is cost-rate-limited. To avoid 429s this tool
is CACHE-FIRST — `nodes`/`image` reuse design-reference/api-<id>.json (or the
PNG) if present and make ZERO network calls. Pass --fresh to force a refetch.
Re-walk a frame's specs as many times as you like for free once it's cached.

Spec dump prints, per node: type/name/size, auto-layout (gap + padding),
fills (bg), strokes (border + per-side weights), cornerRadius, and for TEXT:
fontSize / weight / line-height / letter-spacing / align / color.
"""
import json, os, sys, urllib.request, urllib.parse

STOREFRONT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(STOREFRONT)
CACHE = os.path.join(REPO, "design-reference")

def token():
    t = os.environ.get("FIGMA_TOKEN")
    if t:
        return t.strip()
    p = os.path.join(CACHE, ".figma-token")
    if os.path.exists(p):
        return open(p, encoding="utf-8").read().strip()
    sys.exit("No token: set FIGMA_TOKEN env or create design-reference/.figma-token")

def api(url):
    """GET. Fails fast on HTTP 429 (no auto-retry) — when rate-limited, wait and
    rerun manually. Cached frames re-walk for free, so 429 only hits NEW frames."""
    req = urllib.request.Request(url, headers={"X-Figma-Token": token()})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 429:
            sys.exit("HTTP 429: Figma rate limit. Wait a bit, then rerun this command.")
        raise

def col(c, opacity=None):
    r, g, b = round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255)
    a = c.get("a", 1) if opacity is None else opacity
    return f"#{r:02x}{g:02x}{b:02x}" if a >= 0.999 else f"rgba({r},{g},{b},{round(a,3)})"

def paints(fills):
    out = []
    for f in fills or []:
        if f.get("visible", True) is False:
            continue
        out.append(col(f["color"], f.get("opacity")) if f["type"] == "SOLID" else f["type"])
    return out

def walk(node, depth=0):
    pad = "  " * depth
    if node.get("type") == "TEXT":
        s = node.get("style", {})
        print(f"{pad}TEXT '{node.get('characters','')[:44]}' "
              f"{s.get('fontSize')}px w{s.get('fontWeight')} "
              f"lh{round(s.get('lineHeightPx',0),1)} ls{round(s.get('letterSpacing',0),3)} "
              f"{s.get('textAlignHorizontal','')} {paints(node.get('fills'))}")
    else:
        bits = [node.get("type"), repr(node.get("name", ""))]
        bb = node.get("absoluteBoundingBox") or {}
        if bb:
            bits.append(f"{round(bb.get('width',0))}x{round(bb.get('height',0))}")
        if node.get("layoutMode"):
            bits.append(f"{node['layoutMode'][:4]} gap={node.get('itemSpacing')} "
                        f"pad={node.get('paddingTop')}/{node.get('paddingRight')}/"
                        f"{node.get('paddingBottom')}/{node.get('paddingLeft')}")
        fills = paints(node.get("fills"))
        if fills:
            bits.append(f"bg={fills}")
        if node.get("strokes"):
            sw = node.get("individualStrokeWeights") or node.get("strokeWeight")
            bits.append(f"border={paints(node['strokes'])} w={sw}")
        cr = node.get("cornerRadius") or node.get("rectangleCornerRadii")
        if cr:
            bits.append(f"radius={cr}")
        print(pad + " ".join(str(b) for b in bits if b not in (None, "")))
    for c in node.get("children", []):
        walk(c, depth + 1)

def cmd_nodes(fk, nid, fresh=False):
    nid = nid.replace("-", ":")
    raw = os.path.join(CACHE, f"api-{nid.replace(':','-')}.json")
    if os.path.exists(raw) and not fresh:
        data = json.load(open(raw, encoding="utf-8"))
        walk(data["nodes"][nid]["document"])
        print(f"\n[from cache -> {raw}  (no API call; --fresh to refetch)]")
        return
    data = api(f"https://api.figma.com/v1/files/{fk}/nodes?ids={urllib.parse.quote(nid)}")
    json.dump(data, open(raw, "w", encoding="utf-8"), indent=2)
    walk(data["nodes"][nid]["document"])
    print(f"\n[fetched + cached -> {raw}]")

def cmd_image(fk, nid, scale="2", fresh=False):
    nid = nid.replace("-", ":")
    out = os.path.join(CACHE, "screenshots", f"api-{nid.replace(':','-')}.png")
    if os.path.exists(out) and not fresh:
        print(f"image (cached, no API call) -> {out}")
        return
    data = api(f"https://api.figma.com/v1/images/{fk}?ids={urllib.parse.quote(nid)}&format=png&scale={scale}")
    urllib.request.urlretrieve(data["images"][nid], out)
    print(f"image -> {out}")

def cmd_cached():
    jsons = sorted(f for f in os.listdir(CACHE) if f.startswith("api-") and f.endswith(".json"))
    shots = os.path.join(CACHE, "screenshots")
    pngs = sorted(f for f in os.listdir(shots) if f.endswith(".png")) if os.path.isdir(shots) else []
    print(f"Cached node specs ({len(jsons)}) — re-walk free with `nodes <fk> <id>`:")
    for f in jsons:
        print("  " + f[4:-5])
    print(f"\nCached screenshots ({len(pngs)}):")
    for f in pngs:
        print("  " + f)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if a != "--fresh"]
    fresh = "--fresh" in sys.argv
    if not args:
        sys.exit(__doc__)
    if args[0] == "nodes":
        cmd_nodes(args[1], args[2], fresh)
    elif args[0] == "image":
        a = args[1:4]
        cmd_image(*a, fresh=fresh) if len(a) == 3 else cmd_image(a[0], a[1], fresh=fresh)
    elif args[0] == "cached":
        cmd_cached()
    else:
        sys.exit(__doc__)
