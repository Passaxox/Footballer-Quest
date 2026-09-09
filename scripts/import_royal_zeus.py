"""Reproducible native portrait import; originals and existing outputs are never overwritten."""
import argparse
from collections import deque
import hashlib
from io import BytesIO
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def portrait(image, row):
    x, y = 2 + (row['column'] - 1) * 66, 2 + (row['row'] - 1) * 66
    crop = image.crop((x, y, x + 64, y + 64)).convert('RGBA')
    background = crop.getpixel((0, 0))[:3]
    if background not in [(232, 0, 184), (248, 56, 192), (248, 0, 248)]:
        raise ValueError('Unexpected cell background')
    # Remove only the exact flat background connected to a cell edge. No RGB edits.
    pending = deque([(i, j) for i in range(64) for j in (0, 63)] +
                    [(i, j) for i in (0, 63) for j in range(64)])
    visited = set()
    while pending:
        px, py = pending.popleft()
        if (px, py) in visited or not (0 <= px < 64 and 0 <= py < 64):
            continue
        visited.add((px, py))
        if crop.getpixel((px, py))[:3] != background:
            continue
        crop.putpixel((px, py), (*background, 0))
        pending.extend([(px-1, py), (px+1, py), (px, py-1), (px, py+1)])
    output = BytesIO()
    crop.save(output, format='PNG')
    return output.getvalue(), [x, y, 64, 64]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--verify', action='store_true', help='Verify only; write nothing')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'docs/royal-zeus-assets.json').read_text())
    source = args.source.read_bytes()
    if hashlib.sha256(source).hexdigest() != manifest['sourceSha256']:
        raise ValueError('Source SHA-256 mismatch: original sheet required')
    with Image.open(BytesIO(source)) as check:
        if check.format != 'PNG' or check.size != (662, 1350) or check.mode != 'RGB':
            raise ValueError('Expected original RGB PNG, 662x1350')
        check.verify()
    image = Image.open(BytesIO(source))
    image.load()
    # Verify every separator; labels/footer lie outside the portrait grid.
    for x in range(662):
        for y in range(1322):
            if x % 66 < 2 or y % 66 < 2:
                if image.getpixel((x, y)) != (0, 128, 128):
                    raise ValueError('Unexpected grid separator')
    outputs = []
    for row in manifest['entries']:
        data, rect = portrait(image, row)
        target = ROOT / 'frontend/public/sprites' / (row['spriteId'] + '.png')
        if target.exists() and target.read_bytes() != data:
            raise ValueError(f'Refusing to overwrite {target.name}')
        if args.verify and not target.exists():
            raise ValueError(f'Missing {target.name}')
        outputs.append((target, data, rect, row))
    for target, data, rect, row in outputs:
        if not args.verify and not target.exists():
            with target.open('xb') as handle:
                handle.write(data)
        print(json.dumps({'cell': row['cell'], 'file': target.name,
                          'crop': rect, 'sha256': hashlib.sha256(data).hexdigest()}))


if __name__ == '__main__':
    main()
