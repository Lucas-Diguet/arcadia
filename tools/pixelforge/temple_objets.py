#!/usr/bin/env python3
# Odyssée — PixelForge / temple_objets : le Temple des Éléments en solo, redessiné au propre (32 px par case, lumière en
# haut à gauche, vue de trois quarts) : les passages secrets entre les chemins, les obstacles qui les gardent, et les six
# objets qui servent à progresser.
#
#   python3 tools/pixelforge/temple_objets.py [dossier]      (par défaut tools/pixelforge/temple/)
#
# Passages (32 × 48, une ouverture de grotte dans la paroi) : passage_lac (Plante 1, on y entre en surfant),
# passage_sec (Eau 1, l'eau s'est évaporée, roche rougie), passage_tunnel (Feu 1, roche grise étayée de poutres),
# passage_verdure (côté Eau 2, envahi par la Plante), passage (les autres bouts).
# Obstacles (32 × 56, une case) : ronces_geantes, vapeur, mur_flammes, mur_glace, arbre_mort, grille_temple ;
# gouffre (32 × 32, au sol).
# Objets (32 × 32, décor et icône du Sac) : tresor_braise, tresor_graine, tresor_fiole, tresor_pierre, tresor_rosee,
# tresor_corde.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, rampe, hexa, nuance, bruit, planche
from donjon import PIERRE, LAVE, FEU, GLACE, FEUILLE, BOIS, OBSI, OR, FER, VERRE, flamme

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temple')

ROC = rampe('#1e1814', '#33291f', '#4a3c2e', '#62503c', '#7c664c', '#98805e', '#b49c78')
ROUGE = rampe('#2a0e08', '#4a1a10', '#6e2a18', '#8e3c22', '#ae5430', '#c87444', '#e09a66')
GRIS = rampe('#1a1a20', '#2c2c34', '#42424c', '#5a5a66', '#74747e', '#90909a', '#b0b0b8')
EAU = rampe('#0e2e4a', '#184a72', '#24689a', '#3a88bc', '#64aad6', '#a2d2ee', '#e4f6ff')
VAP = rampe('#5a5a62', '#7a7a84', '#9a9aa4', '#bcbcc4', '#dadae0', '#f2f2f6')
TERRE = rampe('#241408', '#3a2210', '#56341a', '#724826', '#8e5e34', '#aa7846')
RONCE = rampe('#0c1a0a', '#18301a', '#264a24', '#36662e', '#4a8238', '#66a046')
EPINE = rampe('#2a1408', '#5a3418', '#8a6038', '#c8a070')
NOIR = hexa('#0c0a0c')


def contour(T, c='#120c0a'): T.contour(hexa(c))


# ------------------------------------------------------------------ passages : une bouche de grotte dans la paroi

def bouche(R, fond_bas=None, ornement=None, graine=1):
    """une paroi de roche R, percée d'une ouverture en arc ; fond_bas(T, x, y) peint le sol de l'ouverture"""
    T = Toile(32, 48)
    cx, top, larg = 16, 12, 11
    for y in range(4, 48):
        for x in range(32):
            # bord haut irrégulier de la paroi
            if y < 4 + int(3 * bruit(x // 3, 0, graine) + 2 * math.sin(x * 0.4)): continue
            v = bruit(x // 4, y // 4, graine + 1) * 0.6 + bruit(x // 9, y // 7, graine + 2) * 0.4
            t = 0.42 + (v - .5) * 0.38 - x / 32 * 0.14 + (0.1 if y < 16 else 0)
            if abs(math.sin(y * 0.5 + x * 0.12 + bruit(x // 6, 0, graine + 3) * 3)) < 0.07: t -= 0.2   # fissures
            T.p(x, y, nuance(R, t, x, y))
    # l'ouverture : un arc noir, plus clair vers le bas (on voit le sol qui s'enfonce)
    for y in range(top, 48):
        for x in range(32):
            dx = (x + .5 - cx) / larg
            hy = top + 9 * (1 - math.sqrt(max(0, 1 - dx * dx))) if abs(dx) < 1 else 99
            if abs(dx) >= 1 or y < hy: continue
            prof = (y - top) / (48 - top)
            T.p(x, y, nuance(OBSI, 0.05 + prof * 0.45 * (1 - abs(dx)), x, y))
            if fond_bas: fond_bas(T, x, y, dx, prof)
    # arête éclairée en haut de l'arc, ombre à droite
    for x in range(cx - larg, cx + larg):
        dx = (x + .5 - cx) / larg
        y = int(top + 9 * (1 - math.sqrt(max(0, 1 - dx * dx))))
        T.p(x, y - 1, R[-1] if dx < 0.3 else R[3]); T.p(x, y - 2, R[-2] if dx < 0 else R[2])
    for y in range(top + 6, 48): T.p(cx + larg, y, R[1]); T.p(cx - larg - 1, y, R[-2])
    if ornement: ornement(T)
    contour(T)
    return T


def passage(): return bouche(ROC, graine=3)


def passage_lac():
    def eau(T, x, y, dx, prof):
        if y >= 36:
            ride = (x * 2 + y * 3) % 11 == 0
            T.p(x, y, nuance(EAU, 0.35 + (y - 36) / 12 * 0.3 + (0.35 if ride else 0), x, y))
    def berge(T):
        for x in range(0, 32):                               # l'eau sort de l'ouverture et lèche le bas de la paroi
            for y in range(44, 48):
                if abs(x - 16) < 15 - (47 - y): T.p(x, y, nuance(EAU, 0.45 + (0.3 if (x + y) % 7 == 0 else 0), x, y))
        for k in range(5): T.p(9 + k * 3, 39 + (k % 2), EAU[6])
    return bouche(ROC, eau, berge, graine=5)


def passage_sec():
    def sol(T, x, y, dx, prof):
        if y >= 34:                                          # fond craquelé d'un lit d'eau évaporée
            c = (x // 4 + y // 3) % 3 == 0 or (x * 3 + y) % 13 == 0
            T.p(x, y, nuance(ROUGE, 0.3 + prof * 0.3 - (0.2 if c else 0), x, y))
    def traces(T):
        for (x, y) in [(5, 30), (25, 28), (7, 40), (26, 41)]:   # traces blanches laissées par l'eau
            T.hline(x - 2, x + 2, y, hexa('#e8d8c8')); T.p(x + 3, y + 1, hexa('#c8b4a0'))
        for k in range(4): T.p(4 + k * 8, 46, hexa('#f0e4d4'))
    return bouche(ROUGE, sol, traces, graine=7)


def passage_tunnel():
    def poutres(T):
        for x in (4, 27):                                    # deux montants de bois et une traverse
            for y in range(14, 48): T.p(x, y, BOIS[4] if x == 4 else BOIS[2]); T.p(x + 1, y, BOIS[3] if x == 4 else BOIS[1])
        for x in range(4, 29): T.p(x, 13, BOIS[4]); T.p(x, 14, BOIS[3]); T.p(x, 15, BOIS[1])
        for x in (5, 26): T.p(x, 14, FER[5])                 # clous
        for x in range(10, 23, 4): T.p(x, 46, GRIS[4]); T.p(x + 1, 46, GRIS[2])   # rail effacé au sol
    return bouche(GRIS, None, poutres, graine=9)


def passage_verdure():
    def lierre(T):
        for i in range(9):                                   # lierre qui retombe sur l'arc
            x = 4 + i * 3 + int(bruit(i, 0, 11) * 2)
            L = 6 + int(bruit(i, 1, 11) * 14)
            for k in range(L):
                xx = x + int(math.sin(k * 0.5 + i) * 1.2); y = 8 + k
                T.p(xx, y, FEUILLE[2])
                if k % 3 == 0: T.p(xx - 1, y, FEUILLE[4]); T.p(xx + 1, y + 1, FEUILLE[3])
        for i in range(14):                                  # touffes sur le haut de la paroi et au pied
            x = int(bruit(i, 2, 11) * 30); y = 5 + int(bruit(i, 3, 11) * 4) if i < 8 else 44 + int(bruit(i, 4, 11) * 3)
            T.ellipse(x + 1, y, 2.5, 1.8, FEUILLE[2 + int(bruit(i, 5, 11) * 3)]); T.p(x, y - 1, FEUILLE[5])
        for (x, y) in [(6, 45), (25, 44)]: T.p(x, y, hexa('#f0d040')); T.p(x + 1, y - 1, hexa('#e070a0'))   # fleurs
    return bouche(ROC, None, lierre, graine=13)


# ------------------------------------------------------------------ obstacles (une case, 32 × 56)

def ronces_geantes():
    T = Toile(32, 56)
    for k in range(7):                                       # tiges épaisses entrelacées
        x0 = 2 + k * 4.5
        for y in range(6, 56):
            x = x0 + math.sin(y * 0.22 + k * 1.7) * 3
            for d in range(-1, 2):
                T.p(x + d, y, nuance(RONCE, 0.5 - d * 0.18 + (0.12 if (y + k) % 9 == 0 else 0), int(x), y))
    for i in range(46):                                      # épines
        x = 2 + int(bruit(i, 0, 21) * 28); y = 6 + int(bruit(i, 1, 21) * 48)
        if T.vide(x, y): continue
        sx = 1 if bruit(i, 2, 21) > .5 else -1
        T.p(x + sx, y - 1, EPINE[2]); T.p(x + 2 * sx, y - 2, EPINE[3])
    for i in range(6):                                       # quelques baies violettes
        x = 4 + int(bruit(i, 3, 21) * 24); y = 10 + int(bruit(i, 4, 21) * 36)
        T.p(x, y, hexa('#8a2a6a')); T.p(x + 1, y, hexa('#6a1a50')); T.p(x, y - 1, hexa('#c05a9a'))
    contour(T, '#081008')
    return T


def vapeur():
    T = Toile(32, 56)
    for y in range(46, 56):                                  # la fissure dans le sol, rougeoyante
        for x in range(6, 26):
            if abs(x - 16 - math.sin(y * 0.8) * 3) < 1.2 + (y - 46) * 0.15: T.p(x, y, nuance(LAVE, 0.6 - (y - 46) * 0.04, x, y))
            elif abs(x - 16 - math.sin(y * 0.8) * 3) < 3 and y > 48: T.p(x, y, ROUGE[2])
    for k in range(12):                                      # le panache : des boules de vapeur qui montent et s'élargissent
        f = k / 11; cy = 46 - f * 40; r = 4 + f * 9
        cx = 16 + math.sin(f * 5) * 2.5 * f
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                d = math.hypot(x + .5 - cx, y + .5 - cy) / r
                if d > 1 or (d > 0.8 and bruit(x, y, 31) > 0.6): continue
                t = 0.85 - d * 0.35 - f * 0.25 + (0.12 if x < cx and y < cy else 0)
                T.p(x, y, nuance(VAP, t, x, y))
    contour(T, '#3a3a44')
    return T


def mur_flammes():
    T = Toile(32, 56)
    for y in range(48, 56):                                  # braises au sol
        for x in range(1, 31): T.p(x, y, nuance(LAVE, 0.3 + bruit(x, y, 41) * 0.4, x, y))
    for i, (cx, h) in enumerate([(5, 34), (12, 46), (19, 40), (26, 44), (9, 26), (23, 30)]):
        flamme(T, cx, 50, 5 if h > 35 else 4, h, i * 1.3, 40 + i)
    contour(T, '#2a0804')
    return T


def mur_glace():
    T = Toile(32, 56)
    pics = [(3, 10), (9, 4), (15, 8), (21, 2), (27, 9)]
    for y in range(56):
        for x in range(1, 31):
            haut = min(p[1] + abs(x - p[0]) * 1.6 for p in pics)
            if y < haut: continue
            t = 0.55 + 0.25 * (1 - x / 31) - (y / 56) * 0.15
            s = (x - y * 0.45) % 9
            if s < 1.2: t += 0.32                            # reflets obliques
            if (x * 7 + y * 3) % 23 == 0: t -= 0.2           # bulles prises dans la glace
            if abs(x - 10 - math.sin(y * 0.3) * 2) < 0.6 and y > 20: t -= 0.25   # une fêlure
            T.p(x, y, nuance(GLACE, t, x, y))
    for x in range(1, 31): T.p(x, 55, GLACE[2])
    contour(T, '#0a2040')
    return T


def arbre_mort():
    T = Toile(32, 56)
    def seg(x0, y0, x1, y1, e0, e1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for k in range(n + 1):
            t = k / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t; e = e0 + (e1 - e0) * t
            for d in range(-int(e), int(e) + 1):
                T.p(x + d, y, nuance(TERRE, 0.5 - d / (e + 1) * 0.3 + (0.12 if d < 0 else 0), int(x + d), int(y)))
    # tronc tordu, deux grosses branches, des rameaux secs qui partent en griffes
    seg(16, 55, 15, 34, 3.2, 2.2); seg(15, 34, 17, 22, 2.2, 1.6)
    seg(15, 36, 6, 24, 1.8, 0.8); seg(16, 30, 27, 20, 1.6, 0.7); seg(17, 22, 14, 8, 1.4, 0.5)
    for (x0, y0, x1, y1) in [(6, 24, 2, 16), (6, 24, 9, 15), (27, 20, 30, 12), (27, 20, 24, 12), (14, 8, 10, 3), (14, 8, 18, 2), (10, 29, 5, 31), (22, 25, 26, 28)]:
        seg(x0, y0, x1, y1, 0.6, 0.3)
    for x in range(9, 24): T.p(x, 55, TERRE[1])              # racines qui affleurent
    for s in (-1, 1):
        for k in range(7): T.p(16 + s * (3 + k), 54 + (k > 3), TERRE[2])
    T.ellipse(15, 44, 1.5, 2.2, TERRE[0])                    # un creux dans le tronc
    contour(T, '#140a04')
    return T


def gouffre():
    T = Toile(32, 32)
    for y in range(32):
        for x in range(32):
            d = math.hypot((x + .5 - 16) / 15, (y + .5 - 16) / 13)
            if d > 1: continue
            if d > 0.86: T.p(x, y, nuance(ROC, 0.6 - (y / 32) * 0.3, x, y)); continue     # le bord, éclairé en haut
            prof = 1 - d / 0.86
            if prof > 0.55: T.p(x, y, nuance(LAVE, 0.2 + (prof - 0.55) * 1.4 + (0.2 if (x + y) % 5 == 0 else 0), x, y))   # la lave tout au fond
            else: T.p(x, y, nuance(ROC, 0.05 + (0.55 - prof) * 0.4 if y < 16 else 0.02, x, y))
    contour(T, '#0c0806')
    return T


def grille_temple():
    T = Toile(32, 56)
    for y in range(0, 56):                                   # deux montants de pierre
        for x in list(range(0, 5)) + list(range(27, 32)):
            T.p(x, y, nuance(PIERRE, 0.6 - (x > 16) * 0.25 + (0.15 if y % 9 == 0 else 0), x, y))
    for x in range(0, 32):                                   # linteau
        for y in range(0, 7): T.p(x, y, nuance(PIERRE, 0.7 - y * 0.03 - x / 32 * 0.2, x, y))
    for x in range(5, 27, 5):                                # barreaux de pierre et traverses
        for y in range(7, 56): T.p(x, y, PIERRE[5]); T.p(x + 1, y, PIERRE[3]); T.p(x + 2, y, PIERRE[2])
    for y in (18, 36):
        for x in range(5, 27): T.p(x, y, PIERRE[5]); T.p(x, y + 1, PIERRE[3]); T.p(x, y + 2, PIERRE[1])
    # le symbole des trois éléments gravé au linteau
    for k, R in enumerate((LAVE, EAU, FEUILLE)): T.p(12 + k * 4, 3, R[4]); T.p(12 + k * 4, 4, R[2])
    contour(T, '#141418')
    return T


# ------------------------------------------------------------------ objets (32 × 32)

def socle(T):
    """une petite pierre plate qui sert de présentoir"""
    T.ellipse(16, 27, 11, 3.6, ROC[2]); T.ellipse(16, 26, 10, 3, ROC[4]); T.ellipse(14, 25.5, 6, 1.6, ROC[5])


def tresor_braise():
    T = Toile(32, 32); socle(T)
    T.ellipse(16, 23, 7, 3.5, OBSI[2]); T.ellipse(15, 22, 5, 2.4, OBSI[4])
    for k in range(9):                                       # charbon rougeoyant
        x = 11 + k; y = 21 + (k % 3)
        T.p(x, y, LAVE[3 + (k % 2)])
    flamme(T, 16, 22, 4, 13, 0.7, 7)
    for (x, y) in [(10, 8), (22, 10), (19, 5)]: T.p(x, y, FEU[5])   # étincelles
    contour(T)
    return T


def tresor_graine():
    T = Toile(32, 32); socle(T)
    for y in range(9, 26):                                   # une grosse graine en goutte, veinée
        for x in range(6, 26):
            dx, dy = (x + .5 - 16) / 7.5, (y + .5 - 18) / 7.5
            if dx * dx + dy * dy * (1.3 if y < 18 else 1) > 1: continue
            t = 0.55 - dx * 0.25 - dy * 0.15 + (0.15 if abs(dx * 3 + dy) < 0.15 else 0)
            T.p(x, y, nuance(TERRE, t, x, y))
    for k in range(7):                                       # la pousse qui sort du haut
        T.p(16 + k // 3, 9 - k, FEUILLE[3]); T.p(17 + k // 3, 9 - k, FEUILLE[2])
    T.ellipse(21, 4, 3.5, 2, FEUILLE[4]); T.p(20, 3, FEUILLE[5])
    T.ellipse(13, 5, 2.5, 1.5, FEUILLE[3])
    for (x, y) in [(10, 13), (21, 20)]: T.p(x, y, FEUILLE[5])   # une lueur verte qui palpite
    contour(T)
    return T


def tresor_fiole():
    T = Toile(32, 32); socle(T)
    for y in range(11, 27):                                  # la panse ronde
        for x in range(7, 25):
            d = math.hypot(x + .5 - 16, (y + .5 - 19) * 1.05)
            if d > 8: continue
            liquide = y >= 15
            R = EAU if liquide else VERRE
            t = (0.55 if liquide else 0.75) - (x - 16) / 16 + (0.3 if d < 3 and x < 15 and y < 18 else 0)
            T.p(x, y, nuance(R, t, x, y))
    for y in range(5, 12): T.hline(14, 18, y, VERRE[4]); T.p(14, y, VERRE[6]); T.p(18, y, VERRE[2])   # le col
    T.rect(13, 3, 19, 5, BOIS[4]); T.hline(13, 19, 3, BOIS[5])                                          # le bouchon
    T.p(11, 15, VERRE[6]); T.p(12, 14, VERRE[6]); T.p(11, 16, VERRE[5])                                   # reflet
    contour(T, '#0a1830')
    return T


def tresor_pierre():
    T = Toile(32, 32); socle(T)
    pts = [(16, 6), (24, 11), (26, 19), (21, 26), (11, 26), (6, 18), (9, 10)]
    T.poly(pts, ROUGE[3])
    for y in range(4, 28):                                   # facettes et cœur brûlant
        for x in range(4, 28):
            if T.vide(x, y): continue
            d = math.hypot(x + .5 - 15, y + .5 - 17)
            t = 0.5 - (x - 16) / 30 - (y - 16) / 40 + (0.45 if d < 3.5 else 0.25 if d < 6 else 0)
            T.p(x, y, nuance(LAVE if d < 7 else ROUGE, t, x, y))
    for a, b in [((16, 6), (15, 17)), ((6, 18), (15, 17)), ((21, 26), (15, 17))]: T.ligne(*a, *b, ROUGE[1])
    T.p(12, 10, LAVE[5]); T.p(11, 11, LAVE[4])
    contour(T, '#200604')
    return T


def tresor_rosee():
    T = Toile(32, 32); socle(T)
    # une feuille en amande, pointe vers la droite, nervure au milieu
    for y in range(8, 28):
        for x in range(3, 30):
            u = (x - 3) / 26
            c = 18 + (u - 0.5) * 6
            w = 6.5 * math.sin(u * math.pi) ** 0.8 * (1 - 0.25 * u)
            if abs(y - c) > w: continue
            t = 0.55 + (c - y) / max(w, 0.5) * 0.25 + (0.25 if abs(y - c) < 0.6 else 0)
            T.p(x, y, nuance(FEUILLE, t, x, y))
    for k in range(5): T.p(2 - k // 3, 21 + k, FEUILLE[1])     # la queue
    for y in range(8, 20):                                     # la goutte, ronde et brillante, au creux de la feuille
        for x in range(10, 21):
            dx, dy = (x + .5 - 15) / 4.2, (y + .5 - 14.5) / 4.2
            if dx * dx + dy * dy * (1.6 if y < 12 else 1) > 1: continue
            T.p(x, y, nuance(GLACE, 0.7 - dx * 0.25 + dy * 0.12, x, y))
    T.p(13, 12, GLACE[6]); T.p(13, 13, GLACE[6]); T.p(14, 11, GLACE[5])
    contour(T, '#082010')
    return T


def tresor_corde():
    T = Toile(32, 32); socle(T)
    for k in range(3):                                       # une liane tressée, enroulée sur trois tours
        rx, ry = 11 - k * 2.2, 5.5 - k * 1.1
        for i in range(90):
            a = i / 90 * math.pi * 2
            x = 16 + math.cos(a) * rx; y = 18 + math.sin(a) * ry - k * 2.2
            tresse = (i + k * 3) % 6 < 3
            T.p(x, y, nuance(FEUILLE, (0.55 if tresse else 0.35) - math.sin(a) * 0.15, int(x), int(y)))
            T.p(x, y + 1, FEUILLE[1])
    for k in range(9):                                       # le bout qui pend, une feuille au bout
        T.p(26 + k // 4, 18 + k, FEUILLE[3]); T.p(27 + k // 4, 18 + k, FEUILLE[2])
    T.ellipse(29, 28, 2.4, 1.5, FEUILLE[4])
    contour(T, '#081408')
    return T


TOUT = {
    'passage': passage, 'passage_lac': passage_lac, 'passage_sec': passage_sec, 'passage_tunnel': passage_tunnel, 'passage_verdure': passage_verdure,
    'ronces_geantes': ronces_geantes, 'vapeur': vapeur, 'mur_flammes': mur_flammes, 'mur_glace': mur_glace, 'arbre_mort': arbre_mort,
    'gouffre': gouffre, 'grille_temple': grille_temple,
    'tresor_braise': tresor_braise, 'tresor_graine': tresor_graine, 'tresor_fiole': tresor_fiole, 'tresor_pierre': tresor_pierre,
    'tresor_rosee': tresor_rosee, 'tresor_corde': tresor_corde,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    I = {}
    for k, f in TOUT.items():
        T = f(); T.save(os.path.join(OUT, k + '.png')); I[k] = T.image()
    planche([I[k] for k in TOUT if k.startswith('passage')], fond='#6a6058', echelle=5).save(os.path.join(OUT, 'planche_passages.png'))
    planche([I[k] for k in ['ronces_geantes', 'vapeur', 'mur_flammes', 'mur_glace', 'arbre_mort', 'gouffre', 'grille_temple']], fond='#6a6058', echelle=5).save(os.path.join(OUT, 'planche_obstacles.png'))
    planche([I[k] for k in TOUT if k.startswith('tresor')], fond='#6a6058', echelle=6).save(os.path.join(OUT, 'planche_objets.png'))
    print('écrit dans', OUT, ':', ', '.join(TOUT))


if __name__ == '__main__':
    main()
