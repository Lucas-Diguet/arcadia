#!/usr/bin/env python3
# Odyssée — PixelForge / fourneau : le brasier de la Salle du Brasier (Donjon des Miroirs, labo).
# Un fourneau à charbon en fonte noire, façon foyer de locomotive : un tambour riveté sur quatre pieds, une porte de
# foyer à grille, du charbon dans la gueule du haut, un seau à charbon et sa pelle au pied. Éteint : charbon froid ;
# allumé : braises, flammes et lueur derrière la grille. 64 × 80 (deux cases de large), lumière en haut à gauche.
#
#   python3 tools/pixelforge/fourneau.py [dossier]      (par défaut tools/pixelforge/donjon/)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, nuance, bruit, planche
from donjon import FER, FEU, OR, PIERRE, flamme, contour_couleur

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'donjon')

W, H, CX = 64, 80, 30
R, HAUT, BAS = 19, 30, 68          # rayon du tambour, haut et bas du tambour


def dans(x, y, cx, cy, rx, ry): return ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1


def fourneau(allume=False, phase=0.0):
    T = Toile(W, H)
    for fx in (CX - 15, CX - 6, CX + 6, CX + 15):                   # quatre pieds griffus
        for y in range(BAS, 76):
            for x in range(fx - 2, fx + 2):
                T.p(x, y, nuance(FER, 0.45 - (x - fx + 2) * 0.08 + (0.1 if y == BAS else 0), x, y))
        T.hline(fx - 3, fx + 2, 76, FER[1]); T.hline(fx - 3, fx + 2, 75, FER[2])
    # le tambour : fonte noire, éclairée à gauche
    for y in range(HAUT, BAS + 4):
        for x in range(CX - R, CX + R + 1):
            if y > BAS and not dans(x, y, CX, BAS, R + .5, 4): continue
            u = (x + .5 - CX) / R
            t = 0.42 - u * 0.3 + (0.18 if -0.75 < u < -0.45 else 0) + (bruit(x // 2, y // 3, 7) - .5) * 0.06
            T.p(x, y, nuance(FER, t, x, y))
    for yb in (HAUT + 5, HAUT + 22, BAS - 1):                       # cerclages et rivets
        for x in range(CX - R, CX + R + 1):
            u = (x + .5 - CX) / R; y = yb + int(round(2.5 * (1 - u * u)))
            T.p(x, y, nuance(FER, 0.62 - u * 0.35, x, y)); T.p(x, y + 1, FER[0])
            if (x - CX) % 5 == 0 and abs(u) < 0.9: T.p(x, y, FER[5] if u < 0 else FER[4])
    # la porte du foyer : cadre en fonte, grille, et ce qu'il y a derrière
    x0, x1, y0, y1 = CX - 8, CX + 8, HAUT + 10, HAUT + 28
    for y in range(y0 - 2, y1 + 3):
        for x in range(x0 - 2, x1 + 3):
            arc = y < y0 + 3 and ((x - CX) / 10.5) ** 2 + ((y - y0 - 3) / 5.5) ** 2 > 1
            if arc: continue
            bord = x < x0 or x > x1 or y > y1 or (y < y0 + 3 and ((x - CX) / 8.5) ** 2 + ((y - y0 - 3) / 4) ** 2 > 1)
            if bord: T.p(x, y, nuance(FER, 0.6 if x < CX else 0.35, x, y)); continue
            if allume:
                f = (y - y0) / (y1 - y0)
                t = 0.45 + f * 0.35 + (bruit(x, y + int(phase * 3), 5) - .5) * 0.35
                T.p(x, y, nuance(FEU, t, x, y))
            else:
                T.p(x, y, nuance(FER, 0.06 + bruit(x, y, 5) * 0.12, x, y))
    for x in range(x0 + 2, x1, 3):                                 # barreaux de la grille
        for y in range(y0 + 1, y1 + 1):
            T.p(x, y, FER[3] if allume else FER[2])
    for y in (y0 + 8, y1 - 2): T.hline(x0, x1, y, FER[3] if allume else FER[2])
    T.p(x1 + 1, y0 + 12, FER[5]); T.p(x1 + 2, y0 + 12, FER[4]); T.p(x1 + 2, y0 + 13, FER[3])   # loquet
    for y in (y0 + 3, y1 - 3): T.p(x0 - 2, y, FER[5]); T.p(x0 - 1, y, FER[4])                 # gonds
    # la gueule du haut : un rebord épais, le charbon dedans
    for y in range(HAUT - 7, HAUT + 7):
        for x in range(CX - R - 1, CX + R + 2):
            if not dans(x, y, CX, HAUT, R + 1.5, 6.5): continue
            if dans(x, y, CX, HAUT - .5, R - 2, 4.5):
                v = bruit(x // 2, y // 2, 13 + (int(phase * 2) if allume else 0))
                if allume:
                    T.p(x, y, nuance(FEU, 0.15 + v * 0.75, x, y) if v > 0.45 else nuance(FER, 0.08 + v * 0.2, x, y))
                else:
                    T.p(x, y, nuance(FER, 0.05 + v * 0.3, x, y))
            else:
                T.p(x, y, nuance(FER, 0.7 - (x + .5 - CX) / R * 0.35 - (0.25 if y > HAUT else 0), x, y))
    for (lx, ly) in ((CX - 9, HAUT - 3), (CX + 3, HAUT - 4), (CX - 2, HAUT + 1), (CX + 10, HAUT)):   # morceaux de charbon
        for dy in range(2):
            for dx in range(3):
                T.p(lx + dx, ly + dy, FER[1 + dy] if not allume or dx else FEU[2])
        T.p(lx, ly, FER[3])
    if allume:
        flamme(T, CX - 9, HAUT - 1, 7, 16, phase + 1.3, 11)
        flamme(T, CX + 9, HAUT - 1, 6, 14, phase + 2.6, 17)
        flamme(T, CX, HAUT, 11, 26, phase, 3)
    # le seau à charbon et sa pelle, au pied à droite
    sx = 53
    for y in range(66, 78):
        w = 6 - (77 - y) // 6
        for x in range(sx - w, sx + w + 1):
            T.p(x, y, nuance(FER, 0.5 - (x - sx + w) / (2 * w + 1) * 0.35, x, y))
    for x in range(sx - 5, sx + 6): T.p(x, 66, FER[4]); T.p(x, 65, nuance(FER, 0.1 + bruit(x, 65, 3) * 0.25, x, 65))
    T.ligne(sx + 2, 64, sx + 7, 52, PIERRE[4]); T.ligne(sx + 3, 64, sx + 8, 52, PIERRE[2])   # manche de la pelle
    T.rect(sx + 6, 50, sx + 9, 51, OR[2])
    contour_couleur(T, '#08080c')
    return T


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {'fourneau': fourneau(False)}
    for i in range(4): out['fourneau_%d' % i] = fourneau(True, i * 1.6)
    for k, T in out.items(): T.save(os.path.join(OUT, k + '.png'))
    planche([T.image() for T in out.values()], echelle=4, fond='#d8dee8').save(os.path.join(OUT, 'planche_fourneau.png'))
    print('écrit dans', OUT, ':', ', '.join(out))


if __name__ == '__main__':
    main()
