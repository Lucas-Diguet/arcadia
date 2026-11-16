#!/usr/bin/env python3
"""La vitrine du Musée des Dunes (labo) : avec le Sceptre du Roi Sans Nom, puis vide après le vol.
python3 tools/musee-images.py  →  testodyssee/img/tombeau/vitrine.png, vitrine_vide.png"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'testodyssee' / 'img' / 'tombeau'
NOIR = (30, 24, 28, 255)


def vitrine(plein):
    im = Image.new('RGBA', (16, 28), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # le socle de pierre
    d.rectangle([2, 18, 13, 27], fill=(150, 132, 110, 255), outline=NOIR)
    d.rectangle([1, 16, 14, 18], fill=(186, 168, 140, 255), outline=NOIR)
    d.line([(3, 22), (12, 22)], fill=(120, 104, 86, 255))
    # le coussin
    d.rectangle([4, 14, 11, 15], fill=(150, 40, 50, 255))
    # le sceptre : une hampe d'or, une tête en croissant, une gemme
    if plein:
        d.line([(8, 5), (8, 14)], fill=(236, 196, 64, 255)); d.line([(7, 6), (7, 13)], fill=(180, 140, 40, 255))
        d.arc([4, 0, 11, 7], 20, 160, fill=(236, 196, 64, 255), width=1)
        d.point((7, 4), fill=(60, 200, 220, 255)); d.point((8, 4), fill=(60, 200, 220, 255))
        d.point((8, 3), fill=(220, 250, 255, 255))
    # la cloche de verre
    d.rectangle([2, 0, 13, 16], outline=(200, 232, 244, 255))
    for (x, y) in [(4, 2), (4, 3), (4, 4), (5, 2), (11, 12), (11, 13), (10, 13)]:
        d.point((x, y), fill=(255, 255, 255, 190))
    for y in range(1, 16):
        for x in range(3, 13):
            r, g, b, a = im.getpixel((x, y))
            if a == 0: im.putpixel((x, y), (200, 232, 244, 46))
    return im


if __name__ == '__main__':
    vitrine(True).save(OUT / 'vitrine.png'); vitrine(False).save(OUT / 'vitrine_vide.png')
    print('écrit vitrine, vitrine_vide')
