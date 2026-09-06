import json, re, sys, urllib.request, urllib.parse, os

API = "https://inazuma-eleven.fandom.com/api.php"
OUT = "/app/frontend/public/sprites"
os.makedirs(OUT, exist_ok=True)

NAMES = {
    "mark": ["Endou Mamoru"], "axel": ["Gouenji Shuuya"], "jude": ["Kidou Yuuto"], "nathan": ["Kazemaru Ichirouta"],
    "shawn": ["Fubuki Shirou"], "jack": ["Kabeyama Heigorou"], "kevin": ["Someoka Ryuugo"], "darren": ["Tachimukai Yuuki"],
    "tod": ["Kurimatsu Teppei"], "sam": ["Shourinji Ayumu"], "steve": ["Shishido Sakichi"], "bobby": ["Domon Asuka"],
    "maxwell": ["Matsuno Kuusuke"], "tim": ["Handa Shinichi"], "willy": ["Megane Kakeru"], "erik": ["Ichinose Kazuya"],
    "austin": ["Kira Hiroto"], "caleb": ["Fudou Akio"], "hurley": ["Tsunami Jousuke"], "scotty": ["Kogure Yuuya"],
    "thor": ["Hijikata Raiden"], "archer": ["Tobitaka Seiya"], "joseph": ["Sakuma Jirou"], "david": ["Genda Koujirou"],
    "byron": ["Afuro Terumi"], "jonas": ["Poseidon", "Poseidon (Zeus)"], "xavier": ["Kiyama Hiroto"], "jordan": ["Midorikawa Ryuuji"],
    "torch": ["Nagumo Haruya"], "gazelle": ["Suzuno Fuusuke"], "janus": ["Saginuma Osamu"], "rococo": ["Rococo Urupa", "Rococo Ulpa"],
    "canon": ["Endou Canon"], "paolo": ["Hide Nakata", "Nakata Hidetoshi"], "fidio": ["Fideo Ardena", "Fidio Ardena", "Fideo Aldena"], "kruger": ["Mark Krueger", "Mark Kruger"],
    "dylan": ["Dylan Keith"], "edgar": ["Edgar Valtinas"], "teres": ["Teles Torrue", "Teres Tolue"], "chae": ["Choi Chang Soo", "Chae Chan-soo"],
    "malcolm": ["Kageno Jin"], "hector": ["Urabe Rika"], "silvia": ["Kino Aki"], "aiden": ["Fubuki Atsuya"],
}

BAD = re.compile(r"\((E|X|S|MM|CS|GX|VR|GO)\)\.png$|coach|casual|young|adult|\bkid\b|child|Shin |emblem| OW|\(OW|versus|\(\d\)|Atsuya\"|unmerged", re.I)

import time
def get(params):
    params.update({"format": "json"})
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception:
            time.sleep(1.5)
    raise RuntimeError("api fail")

def sprites_for(page):
    d = get({"action": "query", "titles": page, "prop": "images", "imlimit": "500", "redirects": "1"})
    titles = [i["title"] for p in d["query"]["pages"].values() for i in p.get("images", [])]
    return [t for t in titles if "sprite" in t.lower() and not BAD.search(t)]

def info(titles):
    d = get({"action": "query", "titles": "|".join(titles), "prop": "imageinfo", "iiprop": "url|size"})
    out = []
    for p in d["query"]["pages"].values():
        for i in p.get("imageinfo", []):
            out.append((p["title"], i["width"], i["height"], i["url"]))
    return out

def score(t):
    s = 0
    if " IE" in t or "IE)" in t or "IE-" in t: s += 5
    if "(R" in t: s += 2
    return s

result = {}
ONLY = sys.argv[1:]
for pid, cands in NAMES.items():
    if ONLY and pid not in ONLY: continue
    found = None
    for page in cands:
        try:
            sp = sprites_for(page)
        except Exception as e:
            sp = []
        if not sp:
            try:
                s = get({"action": "opensearch", "search": page.split()[0], "limit": "5"})
                for alt in s[1]:
                    sp = sprites_for(alt)
                    if sp:
                        break
            except Exception:
                pass
        if not sp:
            continue
        infos = info(sp[:40])
        small = [x for x in infos if x[1] <= 96 and x[2] <= 96]
        pool = small or infos
        pool.sort(key=lambda x: (-score(x[0]), x[1]))
        found = pool[0]
        break
    if found:
        title, w, h, url = found
        try:
            data = None
            for attempt in range(4):
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                    data = urllib.request.urlopen(req, timeout=30).read(); break
                except Exception:
                    time.sleep(1.5)
            if data is None: raise RuntimeError("download fail")
            open(f"{OUT}/{pid}.png", "wb").write(data)
            result[pid] = f"{title} {w}x{h}"
            print("OK ", pid, title, w, h)
        except Exception as e:
            print("DL FAIL", pid, e)
    else:
        print("MISSING", pid)
json.dump(result, open("/tmp/sprites_result.json", "w"), indent=1)
