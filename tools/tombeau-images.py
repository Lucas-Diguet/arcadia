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

# ---------------- la Caverne d'Ali Baba : icônes du Sac (24 × 24) ----------------
GRIS = [(70, 74, 82, 255), (120, 126, 136, 255), (180, 186, 196, 255), (230, 234, 240, 255)]
BOIS = [(90, 56, 30, 255), (140, 92, 50, 255), (184, 132, 80, 255)]
ROUGE = [(120, 20, 24, 255), (190, 40, 40, 255), (230, 110, 90, 255)]
def ligne(im, x0, y0, x1, y1, c, e=1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for k in range(n + 1):
        x, y = round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n)
        rect(im, x, y, e, e, c)
def icone24(fn):
    im = toile(24, 24); fn(im); return contour(im)
def seringue(im):
    ligne(im, 5, 18, 15, 8, GRIS[3], 3); ligne(im, 6, 18, 14, 10, (150, 220, 160, 255), 2)
    ligne(im, 15, 8, 20, 3, GRIS[1]); ligne(im, 3, 20, 5, 18, GRIS[1], 2); rect(im, 13, 6, 3, 1, GRIS[1]); rect(im, 17, 9, 1, 3, GRIS[1])
def batte(im):
    ligne(im, 4, 20, 18, 6, BOIS[1], 3); ligne(im, 4, 20, 8, 16, BOIS[0], 3)
    for x, y in ((12, 10), (15, 8), (17, 5), (14, 12), (18, 9)): rect(im, x, y - 2, 1, 2, GRIS[3]); rect(im, x - 2, y, 2, 1, GRIS[2])
    ligne(im, 11, 9, 19, 5, GRIS[1])
def couteau(im, grand=True):
    if grand: ligne(im, 9, 16, 21, 3, GRIS[3], 3); ligne(im, 10, 16, 21, 4, GRIS[2]); ligne(im, 3, 21, 8, 16, BOIS[0], 3)
    else:
        ligne(im, 9, 15, 18, 6, GRIS[2], 2); ligne(im, 4, 20, 8, 16, BOIS[1], 3)
        for x, y in ((13, 11), (16, 8), (11, 13)): rect(im, x, y, 2, 1, ROUGE[1])
def pied_de_biche(im):
    ligne(im, 5, 20, 17, 6, ROUGE[1], 2); ligne(im, 17, 6, 20, 5, ROUGE[1], 2); ligne(im, 20, 5, 21, 8, ROUGE[1], 2); ligne(im, 4, 20, 3, 18, ROUGE[1], 2)
def cagoule(im):
    for y in range(4, 21):
        for x in range(5, 19):
            if ((x - 11.5) / 7) ** 2 + ((y - 12) / 8.5) ** 2 <= 1: im.putpixel((x, y), (40, 40, 46, 255))
    rect(im, 7, 10, 4, 3, (240, 210, 180, 255)); rect(im, 13, 10, 4, 3, (240, 210, 180, 255)); rect(im, 10, 15, 4, 2, (240, 210, 180, 255))
    rect(im, 8, 11, 2, 1, (30, 30, 30, 255)); rect(im, 14, 11, 2, 1, (30, 30, 30, 255))
def bougie(im):
    rect(im, 8, 8, 8, 13, ROUGE[1]); rect(im, 9, 8, 2, 13, ROUGE[2]); rect(im, 8, 12, 8, 1, ROUGE[0]); rect(im, 8, 17, 8, 1, ROUGE[0])
    ligne(im, 12, 8, 15, 3, (60, 60, 60, 255)); rect(im, 15, 1, 3, 3, OR[2]); im.putpixel((16, 2), OR[3])
def carte(im):
    rect(im, 3, 6, 18, 12, (240, 236, 220, 255)); rect(im, 3, 6, 18, 3, (60, 90, 160, 255)); rect(im, 5, 11, 5, 5, (190, 170, 140, 255))
    for y in (12, 14, 16): rect(im, 12, y, 7, 1, (120, 120, 120, 255))
    rect(im, 15, 14, 4, 3, ROUGE[1])
def gants(im):
    for ox in (2, 12):
        rect(im, ox + 1, 10, 8, 9, (30, 30, 40, 255)); rect(im, ox + 1, 5, 2, 6, (30, 30, 40, 255)); rect(im, ox + 4, 4, 2, 7, (30, 30, 40, 255)); rect(im, ox + 7, 5, 2, 6, (30, 30, 40, 255)); rect(im, ox + 1, 18, 8, 2, (90, 30, 50, 255))
def pelle(im):
    ligne(im, 5, 19, 15, 9, BOIS[1], 2); rect(im, 3, 18, 4, 3, BOIS[0])
    for y in range(3, 12):
        for x in range(14, 22):
            if abs(x - 18) + abs(y - 7) <= 4: im.putpixel((x, y), GRIS[2])
def sac(im):
    for y in range(6, 22):
        for x in range(4, 20):
            if ((x - 12) / 8) ** 2 + ((y - 14) / 8) ** 2 <= 1: im.putpixel((x, y), (190, 170, 120, 255))
    rect(im, 9, 3, 6, 4, (160, 140, 90, 255)); rect(im, 11, 11, 2, 8, (60, 90, 40, 255)); rect(im, 9, 12, 6, 1, (60, 90, 40, 255)); rect(im, 9, 17, 6, 1, (60, 90, 40, 255))
def moustache(im):
    for x in range(3, 21):
        h = 3 - abs(x - 12) // 3
        if h > 0: rect(im, x, 12 - (1 if abs(x - 12) > 6 else 0), 1, h + 1, (50, 34, 24, 255))
    rect(im, 2, 10, 2, 2, (50, 34, 24, 255)); rect(im, 20, 10, 2, 2, (50, 34, 24, 255))
def scarabee(im):
    for y in range(5, 21):
        for x in range(6, 18):
            if ((x - 11.5) / 6) ** 2 + ((y - 13) / 8) ** 2 <= 1: im.putpixel((x, y), OR[1] if x < 12 else OR[2])
    rect(im, 11, 8, 1, 12, OR[0]); rect(im, 9, 3, 6, 3, OR[1])
    for y in (9, 13, 17): rect(im, 3, y, 3, 1, OR[0]); rect(im, 18, y, 3, 1, OR[0])
def masque(im):
    for y in range(3, 22):
        for x in range(4, 20):
            if ((x - 12) / 8) ** 2 + ((y - 11) / 9) ** 2 <= 1: im.putpixel((x, y), OR[2])
    for y in range(3, 10): rect(im, 3, y, 2, 1, (40, 70, 160, 255)); rect(im, 19, y, 2, 1, (40, 70, 160, 255))
    rect(im, 8, 9, 3, 2, (20, 20, 30, 255)); rect(im, 13, 9, 3, 2, (20, 20, 30, 255)); rect(im, 11, 12, 2, 4, OR[1]); rect(im, 10, 17, 4, 1, ROUGE[0]); rect(im, 11, 19, 2, 3, OR[1])
def vase(im):
    for y in range(8, 22):
        w = 6 - abs(y - 15) // 2
        rect(im, 12 - w, y, 2 * w, 1, (200, 190, 160, 255))
    rect(im, 8, 3, 8, 5, (70, 60, 50, 255)); rect(im, 10, 2, 4, 2, (70, 60, 50, 255)); rect(im, 9, 4, 1, 1, OR[2])
    for y in (12, 16): rect(im, 7, y, 10, 1, (60, 90, 140, 255))
def papyrus(im):
    rect(im, 4, 5, 16, 14, (230, 210, 160, 255)); rect(im, 3, 4, 2, 16, (190, 160, 110, 255)); rect(im, 19, 4, 2, 16, (190, 160, 110, 255))
    for k in range(9):
        x, y = 7 + (k % 3) * 4, 7 + (k // 3) * 4
        rect(im, x, y, 2, 2, (70, 50, 30, 255))
def chat(im):
    for y in range(5, 22):
        for x in range(7, 17):
            if ((x - 12) / 5) ** 2 + ((y - 14) / 8) ** 2 <= 1: im.putpixel((x, y), (220, 210, 180, 255))
    rect(im, 8, 3, 2, 3, (220, 210, 180, 255)); rect(im, 14, 3, 2, 3, (220, 210, 180, 255))
    for y in range(8, 21, 3): rect(im, 7, y, 10, 1, (170, 150, 110, 255))
    rect(im, 10, 7, 1, 1, (30, 30, 30, 255)); rect(im, 13, 7, 1, 1, (30, 30, 30, 255))
def sceptre(im):
    ligne(im, 6, 21, 16, 5, OR[1], 2); ligne(im, 7, 21, 16, 6, (40, 70, 160, 255))
    rect(im, 14, 2, 6, 4, OR[2]); rect(im, 15, 3, 3, 2, (40, 70, 160, 255))
def cle_fer(im):
    F = [(40, 40, 46, 255), (78, 80, 90, 255), (120, 124, 134, 255)]
    rect(im, 2, 7, 9, 9, F[1]); rect(im, 4, 9, 5, 5, (0, 0, 0, 0)); rect(im, 2, 7, 9, 1, F[2])
    rect(im, 11, 10, 11, 3, F[1]); rect(im, 11, 10, 11, 1, F[2])
    rect(im, 15, 13, 2, 4, F[1]); rect(im, 19, 13, 2, 5, F[1]); rect(im, 19, 17, 2, 1, F[0])
def plan_tombeau(im):
    P = [(150, 110, 60, 255), (214, 180, 120, 255), (236, 210, 156, 255)]
    rect(im, 3, 3, 18, 18, P[1]); rect(im, 3, 3, 18, 1, P[2]); rect(im, 3, 20, 18, 1, P[0]); rect(im, 3, 3, 1, 18, P[0]); rect(im, 20, 3, 1, 18, P[0])
    E = (90, 50, 26, 255)
    for y, x0, w in ((6, 6, 12), (10, 8, 9), (14, 5, 11), (18, 9, 8)): rect(im, x0, y, w, 2, E)
    for x, y in ((12, 8), (10, 12), (14, 16)): rect(im, x, y, 1, 2, E)
    rect(im, 16, 18, 2, 2, (170, 30, 30, 255))
for k, fn in {'seringue': seringue, 'batte': batte, 'couteau': lambda im: couteau(im, True), 'vieux_couteau': lambda im: couteau(im, False),
              'pied_de_biche': pied_de_biche, 'cagoule': cagoule, 'bougie': bougie, 'carte': carte, 'gants': gants, 'pelle': pelle,
              'sac': sac, 'moustache': moustache, 'scarabee': scarabee, 'masque': masque, 'vase': vase, 'papyrus': papyrus,
              'chat': chat, 'sceptre': sceptre, 'cle_fer': cle_fer, 'plan_tombeau': plan_tombeau}.items():
    images['objet_' + k] = icone24(fn)
# torche sur pied : un poteau de bois, une coupelle de bronze, une flamme
def torche():
    im = toile(12, 30)
    rect(im, 5, 10, 2, 19, BOIS[1]); rect(im, 5, 10, 1, 19, BOIS[2]); rect(im, 3, 28, 6, 2, BOIS[0])
    rect(im, 2, 8, 8, 3, OR[0]); rect(im, 2, 8, 8, 1, OR[1])
    for y, x0, w, c in ((7, 3, 6, (200, 70, 20, 255)), (6, 3, 6, (230, 110, 30, 255)), (5, 4, 4, (245, 150, 40, 255)), (4, 4, 4, (250, 190, 70, 255)),
                        (3, 5, 2, (255, 220, 120, 255)), (2, 5, 2, (255, 236, 170, 255)), (1, 6, 1, (255, 245, 200, 255))):
        rect(im, x0, y, w, 1, c)
    return contour(im)
images['torche'] = torche()
# « Zzz » au-dessus d'un gardien endormi
def zzz():
    im = toile(16, 14)
    for ox, oy, t in ((1, 8, 4), (6, 4, 4), (11, 0, 4)):
        rect(im, ox, oy, t, 1, (250, 250, 255, 255)); ligne(im, ox + t - 1, oy + 1, ox, oy + t - 2, (250, 250, 255, 255)); rect(im, ox, oy + t - 1, t, 1, (250, 250, 255, 255))
    return contour(im)
images['zzz'] = zzz()

for k, im in images.items(): im.save(os.path.join(DOSSIER, k + '.png'))
print('écrit', len(images), 'images dans', DOSSIER)
