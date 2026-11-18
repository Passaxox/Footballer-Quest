"""Import DS-style portraits from inazumasprites.netlify.app for catalog players without sprites (private use).
Matches by normalized EN name/alias/JP name from canon dataset v3; writes frontend/public/sprites/<spriteId>.png
and a JSON report of matched/unmatched entries. Re-runnable."""
import json, re, io, sys, urllib.request, unicodedata
from PIL import Image

BASE = "https://inazumasprites.netlify.app/"
ROOT = "/app/frontend"
norm = lambda s: re.sub(r"[^a-z]", "", unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower())

html = urllib.request.urlopen(BASE, timeout=30).read().decode("utf-8", "ignore")
paths = sorted(set(re.findall(r"icons/equipos/[^\"' )]+\.png", html)))
stems = {}
for p in paths:
    folder, file = p.split("/")[2], p.split("/")[-1]
    stems.setdefault(norm(re.sub(r"_\d+\.png$", "", file)), []).append((folder, p))

v3 = json.load(open("/app/memory/ref/canon3.json"))
variants = []
for t in v3["teams"]:
    for x in t.get("roster_main") or [] if isinstance(t.get("roster_main"), list) else []:
        vs = {norm(x.get(k)) for k in ("name_en", "alias", "name_jp") if x.get(k) and "UNVERIFIED" not in str(x.get(k))}
        variants.append(vs - {""})

def candidates(name):
    n = norm(name)
    out = {n, norm(" ".join(reversed(name.split())))}
    for vs in variants:
        if n in vs: out |= vs
    return out

rows = json.loads(open(f"{ROOT}/src/game/catalogCanonV2.js").read().split("CANON_V2_ROWS = ", 1)[1].rstrip().rstrip(";"))
targets = [(f"canon-{r[0]}", r[1], r[4]) for r in rows]
extra = json.load(open("/app/scripts/sprite_targets_extra.json"))
targets += [(t["spriteId"], t["name"], t["folder"]) for t in extra]

report = {"matched": [], "unmatched": []}
for sprite_id, name, team in targets:
    hits = [h for c in candidates(name) for h in stems.get(c, [])]
    # Prefer the folder of the expected team (e.g. Dark Emperors variants), then the lowest-numbered file.
    hits.sort(key=lambda h: (h[0] != team, h[1]))
    if not hits:
        report["unmatched"].append({"spriteId": sprite_id, "name": name, "team": team}); continue
    url = BASE + hits[0][1]
    img = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read())).convert("RGBA")
    img.thumbnail((256, 256), Image.NEAREST)
    img.save(f"{ROOT}/public/sprites/{sprite_id}.png")
    report["matched"].append({"spriteId": sprite_id, "name": name, "source": url})

json.dump(report, open("/app/memory/sprite_import_report.json", "w"), ensure_ascii=False, indent=1)
print(len(report["matched"]), "matched,", len(report["unmatched"]), "unmatched")
