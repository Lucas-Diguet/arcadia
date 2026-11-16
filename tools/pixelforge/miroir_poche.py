#!/usr/bin/env python3
# Odyssée — PixelForge / miroir_poche : le miroir de poche du Donjon des Miroirs (labo), à ramasser au sol.
# Un poudrier rond ouvert, vu de trois quarts : le fond posé à plat (couvercle d'argent émaillé de bleu), le couvercle
# relevé à l'arrière avec sa glace. Une case de 32 × 32, lumière en haut à gauche, comme les décors de donjon.py.
#
#   python3 tools/pixelforge/miroir_poche.py [dossier]      (par défaut tools/pixelforge/donjon/)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, nuance, planche
from donjon import ARGENT, VERRE, LAPIS, OR, contour_couleur

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'donjon')


def dans(x, y, cx, cy, rx, ry): return ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1


def miroir_poche():
    T = Toile(32, 32)
    # le fond : un disque d'argent posé à plat (ellipse aplatie), avec son épaisseur vers le bas
    bx, by, brx, bry = 16, 24, 12, 5.5
    for y in range(T.h):
        for x in range(T.w):
            if dans(x, y + 2, bx, by, brx, bry) and not dans(x, y, bx, by, brx, bry): T.p(x, y, ARGENT[1])        # tranche
    for y in range(T.h):
        for x in range(T.w):
            if dans(x, y, bx, by, brx, bry):
                t = 0.55 + 0.3 * (bx - x) / brx + 0.15 * (by - y) / bry
                T.p(x, y, nuance(ARGENT, t, x, y, True))
    # l'émail bleu au centre du fond, un liseré d'or
    for y in range(T.h):
        for x in range(T.w):
            if dans(x, y, bx, by + 0.5, 8, 3.4): T.p(x, y, OR[3])
            if dans(x, y, bx, by + 0.5, 7, 2.6): T.p(x, y, nuance(LAPIS, 0.45 + 0.4 * (bx - x) / 7, x, y))
    T.p(bx - 3, by - 1, LAPIS[4]); T.p(bx - 2, by - 1, LAPIS[4])
    # le couvercle relevé à l'arrière : un disque presque debout, la glace face à nous
    cx, cy, crx, cry = 16, 10, 9.5, 8.5
    for y in range(T.h):
        for x in range(T.w):
            if dans(x, y, cx, cy, crx, cry):
                if not dans(x, y, cx, cy, crx - 2, cry - 2):                                                   # cerclage d'argent
                    t = 0.5 + 0.35 * (cx - x) / crx + 0.25 * (cy - y) / cry
                    T.p(x, y, nuance(ARGENT, t, x, y, True))
                else:                                                                                           # la glace
                    t = 0.7 - 0.45 * (y - (cy - cry)) / (2 * cry) + 0.1 * (cx - x) / crx
                    s = (x - cx) + (y - cy) * 0.9
                    if -5 < s < -3 or 0 < s < 1: t += 0.35                                                      # reflets
                    T.p(x, y, nuance(VERRE, t, x, y))
    # la charnière qui relie le couvercle au fond
    for x in range(cx - 3, cx + 3): T.p(x, by - bry, ARGENT[2])
    T.p(cx - 3, by - bry, ARGENT[4])
    # une petite étincelle sur le cerclage
    T.p(cx - 7, cy - 6, ARGENT[6]); T.p(cx - 6, cy - 7, ARGENT[6])
    contour_couleur(T, '#161a26')
    return T


def main():
    os.makedirs(OUT, exist_ok=True)
    T = miroir_poche(); T.save(os.path.join(OUT, 'miroir_poche.png'))
    planche([T.image()], echelle=8).save(os.path.join(OUT, 'planche_miroir_poche.png'))
    print('écrit dans', OUT, ': miroir_poche, planche_miroir_poche')


if __name__ == '__main__':
    main()
