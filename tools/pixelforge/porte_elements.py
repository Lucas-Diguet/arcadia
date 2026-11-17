#!/usr/bin/env python3
# Odyssée — PixelForge / porte_elements : la porte de la salle du Gardien, au Temple des Éléments (3 cases × 4, 96 × 128 px,
# 32 px par case, lumière en haut à gauche, vue de trois quarts).
#
#   python3 tools/pixelforge/porte_elements.py [dossier]      (par défaut tools/pixelforge/donjon/)
#
# Une arche de temple taillée dans la roche de la grotte : à gauche le feu (veines de lave, brasier), à droite l'eau
# (filet de cascade, bassin, cristaux), en couronne la forêt (racines, lierre qui retombe). Sur les battants de pierre,
# un triangle de trois gemmes : rouge (feu) en bas à gauche, bleue (eau) en bas à droite, verte (forêt) en haut.
# Écrit porte_elements[_<gemmes allumées>].png pour chaque combinaison (f, e, p, fe, fp, ep, fep),
# porte_elements_ouverte.png et une planche d'aperçu.
import math, os, sys
from itertools import combinations
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, rampe, hexa, nuance, bruit, planche
from donjon import PIERRE, LAVE, FEU, GLACE, FEUILLE, BOIS, OBSI, OR, flamme

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'donjon')

W, H, CX = 96, 128, 48
ROC = rampe('#1e1814', '#33291f', '#4a3c2e', '#62503c', '#7c664c', '#98805e', '#b49c78')
TAILLE = rampe('#26242c', '#3c3a44', '#55525c', '#6e6a74', '#8a8690', '#a8a4ac', '#cac6cc')
EAU = rampe('#123a5a', '#1c5a84', '#2a7eaa', '#48a2cc', '#7ac6e4', '#b8e6f6', '#f0fcff')
RACINE = rampe('#1a0e08', '#2e1a0e', '#4a2c16', '#663e20', '#84542c', '#a06c3a')
GEMMES = {'f': rampe('#3a0a0c', '#7a1418', '#c02428', '#ec4a3a', '#ff8a6a', '#ffd8c8'),
          'e': rampe('#0a1a3a', '#14347a', '#2058c0', '#3a8aec', '#7ac0ff', '#d8f0ff'),
          'p': rampe('#0a2a10', '#145a1e', '#22902e', '#3cc444', '#86ec7a', '#dcffd0')}
ETEINTE = rampe('#18161c', '#2a2830', '#3e3c46', '#56545e', '#706e78', '#8a8892')

R_EXT, R_INT, YA = 34, 21, 54            # arche : rayon extérieur, rayon de l'ouverture, centre de l'arc
X0, X1 = CX - R_INT, CX + R_INT - 1      # ouverture


def dedans_roche(x, y):
    """la masse de roche de la grotte, au bord haut irrégulier"""
    bord = 10 + 3 * math.sin(x * 0.13) + 2 * math.sin(x * 0.31 + 1.3) + (abs(x - CX) / 48) ** 2 * 8
    return y >= bord


def voute(x):
    d = (x - CX + .5)
    return YA - math.sqrt(max(0, R_INT ** 2 - d * d))


def dans_arche(x, y):
    d = math.hypot(x - CX + .5, (y - YA) * 1.0) if y < YA else abs(x - CX + .5)
    return d < R_EXT


def roche(T):
    for y in range(H):
        for x in range(W):
            if not dedans_roche(x, y): continue
            v = bruit(x // 5, y // 4, 61) * 0.6 + bruit(x // 11, y // 9, 62) * 0.4
            t = 0.38 + (v - .5) * 0.35 - x / W * 0.12 + (0.08 if y < 30 else 0)
            # strates et fissures
            if abs(math.sin(y * 0.33 + x * 0.05 + bruit(x // 8, 0, 63) * 2)) < 0.06: t -= 0.2
            if bruit(x, y, 64) > 0.97: t += 0.15
            T.p(x, y, nuance(ROC, t, x, y))


def arche(T):
    """piliers et arc de pierres taillées ; claveaux rayonnants, piédroits en assises"""
    for y in range(12, H):
        for x in range(W):
            if not dans_arche(x, y): continue
            if y >= voute(x) and X0 <= x <= X1: continue
            if y >= YA:                                              # piédroits
                u = (x - (CX - R_EXT)) if x < CX else ((CX + R_EXT) - x)
                rang = (y - YA) // 9; xx = (y - YA) % 9
                t = 0.55 + (bruit(rang, x < CX, 71) - .5) * 0.15
                if xx == 0: t -= 0.3
                elif xx == 1: t += 0.15
                if u <= 1: t -= 0.2
                if x == X0 - 1 or x == X1 + 1: t -= 0.25                 # ombre de l'embrasure
                t -= 0.18 * (x > CX)
            else:                                                    # claveaux
                a = math.atan2(YA - y, x - CX + .5); k = int(a / math.pi * 13)
                r = math.hypot(x - CX + .5, y - YA)
                t = 0.6 + (bruit(k, 0, 72) - .5) * 0.18 - 0.15 * (x > CX)
                if abs(a / math.pi * 13 - round(a / math.pi * 13)) < 0.06: t -= 0.3
                if r > R_EXT - 2: t += 0.12
                if r < R_INT + 2: t -= 0.15
            T.p(x, y, nuance(TAILLE, t, x, y))
    # clé de voûte : trois symboles gravés (flamme, goutte, feuille)
    for x in range(CX - 6, CX + 6):
        for y in range(YA - R_EXT - 1, YA - R_INT + 3):
            if dans_arche(x, y) or y <= YA - R_EXT + 2: T.p(x, y, nuance(TAILLE, 0.7 - (x > CX) * 0.15, x, y))
    T.hline(CX - 6, CX + 5, YA - R_EXT - 2, TAILLE[6])
    for dx, R in ((-4, LAVE), (0, EAU), (4, FEUILLE)):
        bx, by = CX + dx, YA - R_EXT + 6
        T.p(bx, by - 2, R[3]); T.p(bx - 1, by - 1, R[2]); T.p(bx, by - 1, R[4]); T.p(bx + 1, by - 1, R[2])
        T.p(bx - 1, by, R[2]); T.p(bx, by, R[3]); T.p(bx + 1, by, R[1]); T.p(bx, by + 1, R[1])


def feu(T, phase=0.0):
    """à gauche : veines de lave qui descendent dans la roche, brasier au pied du pilier"""
    for v in range(3):
        x = 4 + v * 3 + int(bruit(v, 1, 81) * 3); y = 14 + v * 9
        while y < 118:
            for d in range(2 if v == 1 else 1):
                if dedans_roche(x + d, y) and not dans_arche(x + d, y):
                    T.p(x + d, y, nuance(LAVE, 0.45 + bruit(x, y, 82) * 0.5, x, y))
                    if T.get(x + d + 1, y)[3]: T.p(x + d + 1, y, ROC[1])
            y += 1
            if bruit(v, y, 83) > 0.8: x += 1 if bruit(v, y, 84) > 0.5 else -1
            x = max(1, min(x, 11))
    # brasier de pierre, au pied
    bx, by = 6, 112
    for y in range(by, by + 12):
        w = 5 if y < by + 4 else 2
        for x in range(bx - w, bx + w + 1): T.p(x, y, nuance(TAILLE, 0.6 - (x - bx + w) / (2 * w + 1) * 0.35 + (0.2 if y == by else 0), x, y))
    T.hline(bx - 5, bx + 5, by + 3, TAILLE[1])
    flamme(T, bx, by, 7, 16, phase, 5)


def eau(T, phase=0.0):
    """à droite : un filet de cascade qui sort de la roche, un petit bassin, des cristaux sur le pilier"""
    x0 = 87
    for y in range(18, 119):
        ondule = int(math.sin(y * 0.3 + phase) * 0.8)
        for d in range(3):
            x = x0 + d + ondule
            if not dedans_roche(x, y): continue
            t = 0.55 + (0.3 if (y * 2 + d * 3 + int(phase * 4)) % 9 < 2 else 0) - d * 0.08
            T.p(x, y, nuance(EAU, t, x, y))
    for y in range(118, 128):                                         # vasque taillée où tombe l'eau
        w = 6 if y < 124 else 6 - (y - 123)
        for x in range(x0 + 1 - w, x0 + 2 + w):
            T.p(x, y, nuance(TAILLE, 0.6 - (x - x0 + w) / (2 * w + 2) * 0.35 + (0.25 if y == 118 else 0), x, y))
    for x in range(x0 - 4, x0 + 6):
        T.p(x, 119, nuance(EAU, 0.75 if (x + int(phase * 3)) % 4 == 0 else 0.5, x, 119)); T.p(x, 120, EAU[2])
    # stalactites de glace sous le bord de la roche, au-dessus de la cascade
    for k, (cx, L) in enumerate([(84, 6), (91, 9), (94, 5)]):
        y0 = 16
        while not dedans_roche(cx, y0): y0 += 1
        for d in range(L):
            w = 1 if d < L * 0.5 else 0
            for e in range(-w, w + 1): T.p(cx + e, y0 + d, GLACE[6 - min(4, d // 2) - (e > 0)])


def foret(T):
    """en couronne : racines qui enserrent l'arc, lierre qui retombe des deux côtés"""
    for i in range(7):
        a0 = math.pi * (0.08 + i * 0.14)
        r = R_EXT + 1 + bruit(i, 0, 91) * 3
        for k in range(26):
            a = a0 + (k - 13) * 0.025 * (1 if i % 2 else -1)
            x = CX - math.cos(a) * (r + math.sin(k * 0.5) * 2); y = YA - math.sin(a) * (r + math.sin(k * 0.5) * 2) + k * 0.15
            for d in range(2):
                T.p(x + d, y, nuance(RACINE, 0.6 - d * 0.25 + bruit(k, i, 92) * 0.15, int(x), int(y)))
    # touffes de feuilles le long du sommet de l'arc
    for i in range(26):
        a = math.pi * (0.04 + 0.92 * bruit(i, 1, 93)); rr = R_EXT + bruit(i, 2, 93) * 5 - 1
        x = CX - math.cos(a) * rr; y = YA - math.sin(a) * rr
        T.ellipse(x, y, 3, 2.4, FEUILLE[2 + int(bruit(i, 3, 93) * 3)]); T.p(x - 1, y - 1, FEUILLE[5])
    # lierre qui retombe sur les piédroits
    for i, (x, L) in enumerate([(CX - R_EXT + 3, 30), (CX - R_EXT + 8, 18), (CX + R_EXT - 5, 26), (CX + R_EXT - 10, 14)]):
        for k in range(L):
            y = YA - 6 + k; xx = x + int(math.sin(k * 0.4 + i) * 1.5)
            T.p(xx, y, FEUILLE[1])
            if k % 3 == 0: T.p(xx - 1, y, FEUILLE[3]); T.p(xx + 1, y + 1, FEUILLE[4])
        T.ellipse(x, YA - 6 + L, 1.6, 1.6, FEUILLE[3])


def gemme(T, x, y, R, allumee):
    """gemme taillée de 5 px de rayon, sertie d'or ; allumée : halo et éclat"""
    if allumee:                                  # lueur tramée sur la pierre autour, de plus en plus clairsemée
        for yy in range(int(y - 10), int(y + 11)):
            for xx in range(int(x - 10), int(x + 11)):
                d = math.hypot(xx + .5 - x, yy + .5 - y)
                if 5.5 < d < 10 and (xx + yy) % 2 == 0 and bruit(xx, yy, 7) < 1.15 - d / 9:
                    if T.get(xx, yy)[3]: T.p(xx, yy, R[2] if d > 7.5 else R[3])
    T.ellipse(x, y, 5.6, 5.6, OR[1]); T.ellipse(x, y, 4.8, 4.8, OR[3])
    C = R if allumee else ETEINTE
    for yy in range(int(y - 4), int(y + 5)):
        for xx in range(int(x - 4), int(x + 5)):
            dx, dy = xx + .5 - x, yy + .5 - y
            if abs(dx) + abs(dy) * 0.9 > 4.6: continue
            t = 0.55 - dx * 0.06 - dy * 0.07 + (0.12 if dx < 0 and dy < 0 else 0) - (0.15 if dx > 0 and dy > 0 else 0)
            T.p(xx, yy, nuance(C, t, xx, yy))
    T.p(x - 2, y - 2, C[-1]); T.p(x - 1, y - 2, C[-2])


def battants(T, allumees='', ouvert=False):
    y0, y1 = int(YA - R_INT), H - 2
    xm = CX
    for y in range(y0, y1 + 1):
        for x in range(X0, X1 + 1):
            if y < voute(x): continue
            if ouvert:
                # le passage vers la salle du Gardien : un fond sombre, une lueur des trois couleurs tout au fond
                f = (y - y0) / (y1 - y0); dc = abs(x - CX) / R_INT
                t = 0.15 + 0.35 * (1 - dc) * max(0, 1 - abs(f - 0.55) * 2.2)
                T.p(x, y, nuance(OBSI, t, x, y)); continue
            u = (x - X0) / (X1 - X0)
            assise = (y - y0) // 12
            t = 0.58 - 0.22 * u + (bruit(assise, x < xm, 101) - .5) * 0.08
            if (y - y0) % 12 == 0: t -= 0.18
            if x in (xm - 1, xm): t = 0.12 if x == xm - 1 else 0.7               # joint central
            if x in (X0, X1): t -= 0.25
            if 60 <= y - 0 < 63 or 112 <= y < 115: t -= 0.12 if y in (60, 112) else -0.12   # frises
            # bordure en creux de chaque battant
            bx = min(x - X0, xm - 2 - x) if x < xm else min(x - xm - 1, X1 - x)
            if bx == 3: t -= 0.2
            elif bx == 4: t += 0.1
            T.p(x, y, nuance(TAILLE, t, x, y))
    if ouvert:
        # au fond de la salle, les trois lueurs mêlées : rouge à gauche, verte au milieu, bleue à droite
        for y in range(76, 104):                                           # la salle du Gardien, éclairée, tout au fond
            for x in range(CX - 7, CX + 7):
                if y < 82 and math.hypot(x + .5 - CX, y - 82) > 7: continue
                d = max(abs(x + .5 - CX) / 7, (y - 76) / 28 * 0.6)
                T.p(x, y, OR[6] if d < 0.3 else OR[5] if d < 0.55 else OR[4] if d < 0.8 else OR[3])
        for y in range(104, 112):                                          # sa lumière qui coule sur le sol
            for x in range(CX - 7 - (y - 104), CX + 7 + (y - 104)):
                if (x + y) % 2 == 0: T.p(x, y, OBSI[3])
        for k in range(5):                                                 # marches qui descendent
            y = y1 - k * 4; w = R_INT - 4 - k * 3
            T.hline(CX - w, CX + w, y, TAILLE[3 - min(3, k // 2)]); T.hline(CX - w, CX + w, y - 1, TAILLE[1])
        return
    # le triangle qui relie les gemmes, gravé et incrusté d'or
    pf, pe, pp = (CX - 11, 92), (CX + 11, 92), (CX, 72)
    for a, b in ((pf, pe), (pe, pp), (pp, pf)):
        T.ligne(a[0], a[1], b[0], b[1], OR[2]); T.ligne(a[0], a[1] + 1, b[0], b[1] + 1, TAILLE[1])
    for k, p in (('f', pf), ('e', pe), ('p', pp)): gemme(T, p[0], p[1], GEMMES[k], k in allumees)
    # poignées : deux anneaux de bronze
    for dx in (-5, 4):
        T.ellipse(CX + dx + .5, 106, 2.6, 2.6, OR[3], plein=False); T.p(CX + dx, 103, OR[5])


def porte(allumees='', ouvert=False, phase=0.0):
    T = Toile(W, H)
    roche(T); feu(T, phase); eau(T, phase); arche(T); foret(T)
    battants(T, allumees, ouvert)
    T.contour(hexa('#120e0c'))
    # seuil : dalle au pied
    for x in range(CX - R_EXT, CX + R_EXT): T.p(x, H - 1, TAILLE[2 if x < CX else 1])
    return T


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {'porte_elements': porte('')}
    for n in (1, 2, 3):
        for c in combinations('fep', n): out['porte_elements_' + ''.join(c)] = porte(''.join(c))
    out['porte_elements_ouverte'] = porte('fep', True)
    for k, T in out.items(): T.save(os.path.join(OUT, k + '.png'))
    I = [out[k].image() for k in ('porte_elements', 'porte_elements_f', 'porte_elements_fe', 'porte_elements_fep', 'porte_elements_ouverte')]
    planche(I, fond='#6a6058', echelle=3).save(os.path.join(OUT, 'planche_porte_elements.png'))
    print('écrit dans', OUT, ':', ', '.join(out))


if __name__ == '__main__':
    main()
