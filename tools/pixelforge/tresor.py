#!/usr/bin/env python3
# Odyssée — PixelForge / trésor : le trésor du Roi Sans Nom (sépulture du Tombeau, labo).
# Un grand tas de pièces d'or (deux cases de large) semé de gemmes, d'une coupe et d'un masque ; un coffre de bois
# cerclé d'or, ouvert et plein à ras bord ; une petite pile de pièces ; une jarre renversée qui déborde. Lumière en
# haut à gauche, comme les décors de donjon.py.
#
#   python3 tools/pixelforge/tresor.py [dossier]      (par défaut tools/pixelforge/donjon/)
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, nuance, bruit, planche
from donjon import OR, BOIS, LAPIS, SABLE, contour_couleur
from pixel import rampe

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'donjon')
RUBIS = rampe('#3a0612', '#7a0e22', '#c21e36', '#f05a6a', '#ffb0b8')
EMERAUDE = rampe('#04281a', '#0a5a36', '#16945a', '#4ccc8a', '#b4f4d0')


def pieces(T, cx, base, rx, ry, graine=1):
    """un tas de pièces : une demi-ellipse bosselée, des pièces rondes en relief, des reflets"""
    for y in range(int(base - ry * 1.1), base + 1):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            u = (x + .5 - cx) / rx
            if abs(u) > 1: continue
            haut = base - ry * math.sqrt(max(0, 1 - u * u)) * (0.9 + 0.12 * bruit(x // 3, 0, graine))
            if y < haut: continue
            prof = (y - haut) / max(1, base - haut)
            t = 0.78 - u * 0.25 - prof * 0.35 + (bruit(x, y, graine + 3) - .5) * 0.18
            T.p(x, y, nuance(OR, t, x, y))
    for i in range(int(rx * ry / 9)):                     # pièces en relief
        a, b = bruit(i, 1, graine + 7), bruit(i, 2, graine + 7)
        x = cx + (a * 2 - 1) * rx * 0.85; u = (x - cx) / rx
        haut = base - ry * math.sqrt(max(0, 1 - u * u))
        y = haut + 2 + b * (base - haut - 3)
        if y > base - 1: continue
        T.p(x, y, OR[5]); T.p(x + 1, y, OR[4]); T.p(x, y + 1, OR[3]); T.p(x + 1, y + 1, OR[2])
        if b < 0.3: T.p(x, y, OR[6])


def gemme(T, x, y, R, grand=False):
    T.p(x, y, R[3]); T.p(x + 1, y, R[2]); T.p(x, y + 1, R[2]); T.p(x + 1, y + 1, R[1]); T.p(x, y - 1, R[4] if len(R) > 4 else R[3])
    if grand: T.p(x - 1, y, R[2]); T.p(x + 2, y, R[1]); T.p(x, y + 2, R[1]); T.p(x + 1, y - 1, R[3])


def tas_or():
    T = Toile(64, 48)
    pieces(T, 32, 45, 30, 24, 3)
    pieces(T, 18, 46, 13, 9, 5)
    # une coupe d'or plantée dans le tas
    for y in range(12, 19):
        w = 6 - (y - 12) * 0.6
        for x in range(int(41 - w), int(41 + w) + 1): T.p(x, y, nuance(OR, 0.85 - (x - 41 + w) / (2 * w) * 0.6, x, y))
    T.vline(41, 19, 23, OR[3]); T.hline(38, 44, 24, OR[2]); T.hline(36, 46, 12, OR[5])
    gemme(T, 40, 15, RUBIS)
    # un masque funéraire couché, bleu et or
    for y in range(20, 30):
        for x in range(16, 27):
            if ((x + .5 - 21.5) / 5.5) ** 2 + ((y + .5 - 25) / 5.5) ** 2 > 1: continue
            T.p(x, y, LAPIS[2] if (y - 20) % 3 == 0 and (x < 18 or x > 25) else nuance(OR, 0.8 - (x - 16) * 0.04, x, y))
    T.p(19, 24, LAPIS[0]); T.p(24, 24, LAPIS[0]); T.hline(20, 23, 27, OR[1])
    for (x, y, R, g) in ((10, 38, EMERAUDE, False), (30, 30, RUBIS, True), (50, 35, LAPIS, False), (36, 40, EMERAUDE, True), (54, 41, RUBIS, False), (24, 39, LAPIS, True)):
        gemme(T, x, y, R, g)
    contour_couleur(T, '#2a1606')
    return T


def montagne_or():
    """le plus gros tas : trois cases de large, un bouclier et une épée plantés dedans"""
    T = Toile(96, 72)
    pieces(T, 48, 69, 46, 40, 21)
    pieces(T, 22, 70, 20, 12, 23); pieces(T, 76, 70, 18, 10, 25)
    # un bouclier rond adossé
    for y in range(26, 46):
        for x in range(60, 80):
            d = ((x + .5 - 70) / 10) ** 2 + ((y + .5 - 36) / 10) ** 2
            if d > 1: continue
            T.p(x, y, LAPIS[3] if d > 0.7 else nuance(OR, 0.85 - (x - 60) * 0.03, x, y) if d < 0.25 else LAPIS[1 + (x + y) % 2])
    # une épée plantée
    T.vline(36, 6, 30, OR[5]); T.vline(37, 6, 30, OR[3]); T.vline(38, 8, 30, OR[1])
    T.hline(32, 42, 30, OR[4]); T.hline(32, 42, 31, OR[2]); T.rect(36, 32, 38, 36, BOIS[3]); T.rect(35, 37, 39, 38, OR[4])
    for (x, y, R, g) in ((20, 52, RUBIS, True), (48, 34, EMERAUDE, True), (56, 56, LAPIS, True), (30, 60, EMERAUDE, False),
                         (70, 60, RUBIS, False), (12, 64, LAPIS, False), (84, 64, EMERAUDE, False), (44, 50, RUBIS, False)):
        gemme(T, x, y, R, g)
    contour_couleur(T, '#2a1606')
    return T


def coffre_or():
    T = Toile(32, 32)
    # caisse
    for y in range(17, 30):
        for x in range(3, 29):
            t = 0.55 - (x - 3) / 26 * 0.3 - (0.15 if y > 26 else 0) + (0.1 if (y - 17) % 4 == 0 else 0)
            T.p(x, y, nuance(BOIS, t, x, y))
    for x in (3, 4, 15, 16, 27, 28):                         # ferrures d'or
        for y in range(17, 30): T.p(x, y, nuance(OR, 0.7 if x < 16 else 0.45, x, y))
    T.hline(3, 28, 17, OR[4]); T.hline(3, 28, 29, OR[1])
    T.rect(14, 21, 17, 24, OR[5]); T.p(15, 23, BOIS[0]); T.p(16, 23, BOIS[0])
    # couvercle relevé à l'arrière
    for y in range(4, 12):
        for x in range(4, 28):
            t = 0.5 - (x - 4) / 24 * 0.3 + (0.15 if y == 4 else 0)
            T.p(x, y, nuance(BOIS, t, x, y))
    for x in (4, 5, 15, 16, 26, 27):
        for y in range(4, 12): T.p(x, y, OR[3])
    T.hline(4, 27, 11, OR[2])
    # l'or qui déborde
    pieces(T, 16, 18, 13, 7, 9)
    gemme(T, 9, 15, RUBIS); gemme(T, 20, 13, EMERAUDE); gemme(T, 13, 16, LAPIS)
    for (x, y) in ((2, 30), (29, 31), (6, 31)):               # pièces tombées par terre
        T.p(x, y, OR[5]); T.p(x + 1, y, OR[3])
    contour_couleur(T, '#2a1606')
    return T


def pile_or():
    T = Toile(32, 24)
    pieces(T, 15, 22, 13, 9, 11)
    for i, x in enumerate((24, 27)):                         # deux piles de pièces bien rangées
        for k in range(5 + i * 2):
            y = 21 - k * 2
            T.hline(x - 2, x + 2, y, OR[4] if k % 2 else OR[3]); T.hline(x - 2, x + 2, y + 1, OR[1])
    gemme(T, 10, 16, RUBIS); gemme(T, 17, 18, EMERAUDE)
    contour_couleur(T, '#2a1606')
    return T


def jarre_or():
    T = Toile(48, 32)
    # la jarre couchée, ouverte vers la droite
    for y in range(8, 28):
        for x in range(4, 26):
            if ((x + .5 - 14) / 11) ** 2 + ((y + .5 - 18) / 10) ** 2 > 1: continue
            t = 0.7 - (y - 8) / 20 * 0.45 + (bruit(x, y, 2) - .5) * 0.1
            T.p(x, y, nuance(SABLE, t, x, y))
    for y in range(12, 25): T.hline(24, 27, y, SABLE[2] if y in (12, 24) else SABLE[0])
    for x in range(5, 24, 6): T.vline(x, 12, 24, SABLE[3])
    pieces(T, 34, 29, 13, 8, 13)
    gemme(T, 30, 24, LAPIS); gemme(T, 40, 26, RUBIS)
    contour_couleur(T, '#2a1606')
    return T


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {'montagne_or': montagne_or(), 'tas_or': tas_or(), 'coffre_or': coffre_or(), 'pile_or': pile_or(), 'jarre_or': jarre_or()}
    for k, T in out.items(): T.save(os.path.join(OUT, k + '.png'))
    planche([T.image() for T in out.values()], echelle=4, fond='#4a3a2c').save(os.path.join(OUT, 'planche_tresor.png'))
    print('écrit dans', OUT, ':', ', '.join(out))


if __name__ == '__main__':
    main()
