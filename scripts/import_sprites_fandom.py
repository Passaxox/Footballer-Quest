"""Second pass: Fandom wiki 'File:<Name>.png' portraits for entries unmatched by import_sprites.py (private use)."""
import json, io, urllib.request, urllib.parse
from PIL import Image
API = "https://inazuma-eleven.fandom.com/api.php"
UA = {"User-Agent": "Mozilla/5.0 (private fan project)"}
rep = json.load(open("/app/memory/sprite_import_report.json"))
# Re-run safe: Fandom matches are recomputed every time.
rep["unmatched"] += [m for m in rep["matched"] if "wikia" in m["source"]]
rep["matched"] = [m for m in rep["matched"] if "wikia" not in m["source"]]
v3 = json.load(open("/app/memory/ref/canon3.json"))
alts = {}
for t in v3["teams"]:
    for x in t.get("roster_main") if isinstance(t.get("roster_main"), list) else []:
        names = [x.get(k) for k in ("name_jp", "name_en", "alias") if x.get(k) and "UNVERIFIED" not in str(x.get(k))]
        for n in names: alts.setdefault(n, names)
def get(params):
    return json.load(urllib.request.urlopen(urllib.request.Request(API + "?" + urllib.parse.urlencode({**params, "format": "json"}), headers=UA), timeout=30))
still = []
for e in rep["unmatched"]:
    # Prefer in-game portraits/sprites; never cut-ins, artwork or anime screenshots.
    titles = []
    for n in alts.get(e["name"], [e["name"]]):
        found = [x["title"] for x in get({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 40, "srsearch": n})["query"]["search"]]
        ok = [t for t in found if n.lower() in t.lower() and ("portrait" in t.lower() or "sprite" in t.lower()) and not any(b in t.lower() for b in ("cut-in", "artwork", "versus", "save icon"))]
        titles += sorted(ok, key=lambda t: ("portrait" not in t.lower(), len(t)))
    urls = []
    if titles:
        pages = get({"action": "query", "titles": "|".join(titles[:10]), "prop": "imageinfo", "iiprop": "url|size"})["query"]["pages"].values()
        info = {p["title"]: p["imageinfo"][0] for p in pages if "imageinfo" in p}
        urls = [info[t]["url"] for t in titles if t in info and info[t]["width"] <= info[t]["height"] * 1.3]
    if not urls: still.append(e); continue
    img = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(urls[0], headers=UA), timeout=30).read())).convert("RGBA")
    img.thumbnail((256, 256), Image.NEAREST)
    img.save(f"/app/frontend/public/sprites/{e['spriteId']}.png")
    rep["matched"].append({**e, "source": urls[0]})
rep["unmatched"] = still
json.dump(rep, open("/app/memory/sprite_import_report.json", "w"), ensure_ascii=False, indent=1)
print(len(rep["matched"]), "matched,", len(still), "unmatched:", ", ".join(x["name"] for x in still))
