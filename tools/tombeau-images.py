#!/usr/bin/env python3
# tools/tombeau-images.py — dessine les images du Tombeau du Roi Sans Nom (pixel art à 16 pixels par case) :
# sarcophage, socle des lunettes, autel, artefacts posés au sol, icônes du Sac.
#   python3 tools/tombeau-images.py  → testodyssee/img/tombeau/
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.join(os.path.dirname(ICI), 'testodyssee/img/tombeau')
os.makedirs(DOSSIER, exist_ok=True)

NOIR = (24, 18, 28, 255)
PIERRE = [(70, 64, 74, 255), (104, 96, 108, 255), (138, 130, 140, 255), (172, 164, 170, 255)]
OR = [(122, 84, 28, 255), (196, 146, 46, 255), (240, 204, 92, 255), (255, 240, 170, 255)]
VIOLET = [(60, 20, 90, 255), (120, 50, 170, 255), (180, 110, 235, 255), (235, 200, 255, 255)]

def toile(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def rect(im, x, y, w, h, c):
    for j in range(y, y + h):
        for i in range(x, x + w):
            if 0 <= i < im.width and 0 <= j < im.height: im.putpixel((i, j), c)
def contour(im):
    """un trait sombre autour du dessin"""
    src = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            if src.getpixel((x, y))[3]: continue
            if any(0 <= x + dx < im.width and 0 <= y + dy < im.height and src.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), NOIR)
    return im

def pendentif(im, ox, oy, s=1, allume=True):
    """une chaîne d'or et une gemme violette"""
    for i in range(5): im.putpixel((ox + 2 + i, oy + abs(2 - i) // 2), OR[2])
    g = VIOLET if allume else [(40, 30, 50, 255)] * 4
    rect(im, ox + 2, oy + 2, 5, 4, g[1]); rect(im, ox + 3, oy + 2, 3, 1, g[2]); im.putpixel((ox + 3, oy + 3), g[3]); rect(im, ox + 3, oy + 6, 3, 1, g[0])
    rect(im, ox + 1, oy + 3, 1, 2, OR[1]); rect(im, ox + 7, oy + 3, 1, 2, OR[1])

def lunettes(im, ox, oy):
    for cx in (ox, ox + 6):
        rect(im, cx, oy, 5, 4, OR[1]); rect(im, cx + 1, oy + 1, 3, 2, VIOLET[2]); im.putpixel((cx + 1, oy + 1), VIOLET[3])
    rect(im, ox + 5, oy + 1, 1, 1, OR[2])

def sarcophage(plein):
    im = toile(16, 22)
    rect(im, 1, 8, 14, 13, PIERRE[1]); rect(im, 1, 8, 14, 2, PIERRE[2]); rect(im, 1, 19, 14, 2, PIERRE[0])
    rect(im, 2, 2, 12, 8, PIERRE[2]); rect(im, 2, 2, 12, 1, PIERRE[3]); rect(im, 3, 3, 10, 6, PIERRE[1])
    # le visage du roi sur le couvercle
    rect(im, 6, 3, 4, 3, PIERRE[3]); rect(im, 7, 4, 1, 1, PIERRE[0]); rect(im, 9, 4, 1, 1, PIERRE[0])
    rect(im, 5, 11, 6, 1, OR[1]); rect(im, 5, 16, 6, 1, OR[1])
    if plein: pendentif(im, 3, 6)
    return contour(im)

def socle(plein):
    im = toile(16, 18)
    rect(im, 3, 6, 10, 11, PIERRE[1]); rect(im, 2, 5, 12, 2, PIERRE[3]); rect(im, 2, 15, 12, 2, PIERRE[0]); rect(im, 5, 9, 6, 4, PIERRE[2])
    if plein: lunettes(im, 2, 1)
    return contour(im)

def autel(allume):
    im = toile(18, 22)
    rect(im, 2, 10, 14, 11, PIERRE[1]); rect(im, 1, 9, 16, 2, PIERRE[3]); rect(im, 1, 19, 16, 2, PIERRE[0])
    # le soleil gravé
    soleil = OR if allume else [PIERRE[0], PIERRE[1], PIERRE[2], PIERRE[3]]
    rect(im, 7, 1, 4, 4, soleil[2]); rect(im, 8, 2, 2, 2, soleil[3])
    for x, y in ((9, 0), (9, 6), (5, 3), (12, 3), (6, 1), (12, 1), (6, 5), (12, 5)): im.putpixel((x if x < 18 else 17, y), soleil[1])
    rect(im, 6, 12, 6, 5, PIERRE[2]); rect(im, 7, 13, 4, 3, VIOLET[1] if allume else PIERRE[0])
    if allume: im.putpixel((8, 13), VIOLET[3])
    return contour(im)

def au_sol(fn, w, h):
    im = toile(w, h); fn(im); return contour(im)

def icone(fn):
    im = toile(24, 24); fn(im); im = contour(im)
    return im

def sceau(im):
    for y in range(24):
        for x in range(24):
            d = ((x - 11.5) ** 2 + (y - 11.5) ** 2) ** 0.5
            if d <= 9: im.putpixel((x, y), OR[1] if d > 7.5 else OR[2] if d > 4 else VIOLET[1])
    rect(im, 10, 8, 4, 8, VIOLET[2]); rect(im, 8, 10, 8, 4, VIOLET[2]); rect(im, 11, 11, 2, 2, VIOLET[3])

images = {
    'sarcophage': sarcophage(True), 'sarcophage_vide': sarcophage(False),
    'socle_lunettes': socle(True), 'socle_vide': socle(False),
    'autel_soleil': autel(False), 'autel_soleil_on': autel(True),
    'pendentif_sol': au_sol(lambda im: pendentif(im, 1, 2), 11, 10),
    'lunettes_sol': au_sol(lambda im: lunettes(im, 1, 2), 13, 7),
}
def grand(fn, k):
    im = toile(12, 12); fn(im); im = contour(im)
    out = toile(24, 24); out.paste(im.resize((24, 24), Image.NEAREST), (0, 0)); return out
images['objet_pendentif'] = grand(lambda im: pendentif(im, 1, 2), 'p')
images['objet_lunettes'] = grand(lambda im: lunettes(im, 0, 4), 'l')
images['objet_sceau'] = icone(sceau)
def facade():
    """la façade du tombeau (9 cases de large) : deux pylônes, une corniche, des colonnes, la porte fermée, le soleil ailé"""
    import random
    r = random.Random(4)
    W, H = 144, 84
    im = toile(W, H)
    SA = [(120, 86, 46, 255), (170, 128, 74, 255), (206, 166, 104, 255), (232, 200, 140, 255), (246, 224, 176, 255)]
    # le corps : un mur de blocs de grès
    rect(im, 8, 18, 128, 66, SA[2])
    for y in range(18, 84, 6):
        rect(im, 8, y, 128, 1, SA[1])
        dec = 0 if (y // 6) % 2 else 8
        for x in range(8 + dec, 136, 16): rect(im, x, y, 1, 6, SA[1])
    # les deux pylônes, plus hauts, qui s'élargissent vers le bas
    for x0 in (0, 104):
        for y in range(4, 84):
            l = 4 - (y - 4) // 20
            rect(im, x0 + max(0, l), y, 40 - 2 * max(0, l), 1, SA[3] if y < 8 else SA[2])
        for y in range(10, 84, 6): rect(im, x0 + 2, y, 36, 1, SA[1])
        # hiéroglyphes
        for k in range(18):
            hx, hy = x0 + 8 + (k % 3) * 9, 16 + (k // 3) * 9
            c = (60, 40, 20, 255)
            forme = k % 4
            if forme == 0: rect(im, hx, hy, 5, 1, c); rect(im, hx + 2, hy, 1, 5, c)
            elif forme == 1: rect(im, hx, hy, 1, 5, c); rect(im, hx, hy + 4, 5, 1, c); rect(im, hx + 4, hy + 2, 1, 3, c)
            elif forme == 2: rect(im, hx + 1, hy, 3, 3, c); rect(im, hx + 2, hy + 3, 1, 2, c)
            else: rect(im, hx, hy + 2, 5, 1, c); rect(im, hx + 1, hy, 1, 5, c); rect(im, hx + 3, hy, 1, 5, c)
        rect(im, x0, 2, 40, 3, SA[4]); rect(im, x0, 5, 40, 1, SA[0])
    # corniche au-dessus de la porte, et le soleil ailé
    rect(im, 40, 14, 64, 5, SA[4]); rect(im, 40, 19, 64, 1, SA[0])
    rect(im, 66, 8, 12, 6, OR[2]); rect(im, 68, 9, 8, 4, OR[3])
    for i in range(14): rect(im, 52 + i, 10 + i // 5, 1, 2, OR[1]); rect(im, 91 - i, 10 + i // 5, 1, 2, OR[1])
    # deux colonnes à chapiteau
    for cx in (48, 90):
        rect(im, cx, 22, 6, 62, SA[3]); rect(im, cx + 1, 22, 1, 62, SA[4]); rect(im, cx + 5, 22, 1, 62, SA[1])
        rect(im, cx - 2, 20, 10, 3, SA[4]); rect(im, cx - 2, 81, 10, 3, SA[1])
    # la porte, fermée par une dalle
    rect(im, 60, 34, 24, 50, (52, 36, 22, 255)); rect(im, 62, 36, 20, 48, SA[1]); rect(im, 62, 36, 20, 2, SA[0])
    for y in range(42, 84, 8): rect(im, 62, y, 20, 1, SA[0])
    rect(im, 70, 56, 4, 4, OR[1])
    return contour(im)
images['entree_tombeau'] = facade()
def cle_icone(im):
    rect(im, 4, 9, 6, 6, OR[1]); rect(im, 5, 10, 4, 4, (0, 0, 0, 0)); rect(im, 10, 11, 10, 2, OR[2]); rect(im, 16, 13, 2, 3, OR[1]); rect(im, 19, 13, 1, 4, OR[1]); rect(im, 4, 9, 6, 1, OR[3])
images['objet_cle'] = icone(cle_icone)
def cordon():
    im = toile(16, 16)
    for x0 in (0, 13): rect(im, x0 + 1, 4, 2, 12, OR[1]); rect(im, x0, 3, 4, 2, OR[2]); rect(im, x0, 14, 4, 2, OR[0])
    for x in range(3, 14): im.putpixel((x, 6 + (1 if 5 <= x <= 10 else 0)), (170, 30, 40, 255)); im.putpixel((x, 7 + (1 if 5 <= x <= 10 else 0)), (120, 20, 30, 255))
    return contour(im)
images['cordon'] = cordon()
for k, im in images.items(): im.save(os.path.join(DOSSIER, k + '.png'))
print('écrit', len(images), 'images dans', DOSSIER)
