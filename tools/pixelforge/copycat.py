#!/usr/bin/env python3
# PixelForge — Copycat hors combat (Donjon des Miroirs) : mime au masque blanc lisse, combinaison de losanges miroir,
# collerette blanche, miroir à main. 64 × 64 par image (densité 2, comme les personnages d'Odyssée),
# 4 directions × 3 images (debout, pas gauche, pas droit), dans l'ordre de chars.png : bas, gauche, droite, haut.
# python3 tools/pixelforge/copycat.py  →  tools/pixelforge/copycat/
import os
import numpy as np
from PIL import Image
from pixel import Toile, rampe, hexa, planche

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, 'copycat')

CONTOUR = hexa('#17141f')
ARGENT = rampe('#3a3f55', '#5d6680', '#8a93ad', '#b9c0d2', '#dfe4ee', '#f6f8fc')
ACIER = rampe('#2a2e40', '#454c66', '#6a7290', '#949cb6', '#b9c0d2')
MASQUE = rampe('#7d869e', '#b4bccd', '#dde2ec', '#f4f6fa', '#ffffff')
COLLANT = rampe('#15172a', '#232842', '#343c5c', '#4a5378')
CHAUSSURE = rampe('#0e0d16', '#1f1e2c', '#3a3a50')
GANT = rampe('#9aa2b8', '#d5dae6', '#f7f9fc')
CEINTURE = rampe('#241c34', '#3d2f58', '#5e4a86')
VERRE = rampe('#3d7fa8', '#6fb6d8', '#b8e6f6', '#f0fbff')
CADRE = rampe('#4a3a70', '#7560a6', '#a892d6')
YEUX = hexa('#14101c')
REFLET = hexa('#ffffff')

# étiquettes des zones
COL, CHA, COMBI, CEI, MAN, GAN, FRA, CAP, MAS, YEU, CAD, VER, BER, LAR = range(1, 15)
CAGOULE = rampe('#141225', '#25223d', '#3a3658', '#55507a')
BERET = rampe('#10101c', '#22213a', '#3a3960')
LARME = hexa('#7fd8f4')
RAMPES = {COL: COLLANT, CHA: CHAUSSURE, COMBI: None, CEI: CEINTURE, MAN: ACIER, GAN: GANT, FRA: GANT,
          CAP: CAGOULE, MAS: MASQUE, CAD: CADRE, VER: VERRE, BER: BERET}
PRIO = {COL: 1, CHA: 2, COMBI: 3, CEI: 4, MAN: 5, GAN: 6, FRA: 6, CAP: 4, BER: 8, MAS: 7, YEU: 9, LAR: 9, CAD: 7, VER: 8}


class Pantin:
    def __init__(self):
        self.L = np.zeros((64, 64), int)

    def poly(self, pts, lab):
        t = Toile(64, 64); t.poly(pts, hexa('#ffffff')); self.L[t.a[..., 3] > 0] = lab

    def rect(self, x0, y0, x1, y1, lab):
        self.L[max(0, y0):y1 + 1, max(0, x0):x1 + 1] = lab

    def ellipse(self, cx, cy, rx, ry, lab):
        t = Toile(64, 64); t.ellipse(cx, cy, rx, ry, hexa('#ffffff')); self.L[t.a[..., 3] > 0] = lab

    def px(self, x, y, lab):
        if 0 <= x < 64 and 0 <= y < 64: self.L[y, x] = lab


def nuancer(L, regard):
    """couleurs : lumière en haut à gauche, losanges miroir sur la combinaison"""
    a = np.zeros((64, 64, 4), np.uint8)
    for lab in np.unique(L):
        if lab == 0: continue
        ys, xs = np.nonzero(L == lab)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        for x, y in zip(xs, ys):
            fx = (x - x0) / max(1, x1 - x0); fy = (y - y0) / max(1, y1 - y0)
            t = 0.78 - 0.55 * fx - 0.2 * fy
            # bord droit et bas dans l'ombre
            if x + 1 < 64 and L[y, x + 1] != lab: t -= 0.15
            if x - 1 >= 0 and L[y, x - 1] != lab: t += 0.12
            if lab == COMBI:
                u, v = (x - 32) + y, (x - 32) - y
                clair = (u // 6 + v // 6) % 2 == 0
                R = ARGENT if clair else ACIER
                t = (0.82 if clair else 0.55) - 0.35 * fx
                if clair and (u % 6 == 1) and (v % 6 == 2): t = 1   # éclat de miroir
            elif lab == YEU:
                a[y, x] = YEUX; continue
            elif lab == LAR:
                a[y, x] = LARME; continue
            elif lab == MAS:
                t = 0.95 - 0.7 * fx ** 1.5 - 0.15 * fy
            elif lab == VER:
                t = 0.9 - 0.8 * fx - 0.2 * fy
            else:
                R = RAMPES[lab]
            if lab in (MAS, VER): R = RAMPES[lab]
            if lab == FRA:
                t = 0.95 - 0.5 * fx - (0.35 if (x + (y // 2)) % 3 == 0 else 0)
            t = min(max(t, 0), 1)
            a[y, x] = R[min(len(R) - 1, int(round(t * (len(R) - 1))))]
    return a


def finir(a, L, regard):
    T = Toile(64, 64); T.a = a
    for y in range(64):
        for x in range(64):
            l = L[y, x]
            if not l or l in (YEU, LAR): continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < 64 and 0 <= y + dy < 64:
                    m = L[y + dy, x + dx]
                    if m and m not in (YEU, LAR) and PRIO[m] > PRIO[l] and not (l == CAP and m == BER):
                        c = T.a[y, x].astype(float); c[:3] = c[:3] * 0.45 + np.array([23, 20, 31]) * 0.55
                        T.a[y, x] = c.astype(np.uint8); break
    T.contour(CONTOUR)
    return T


def masque_face(P, cx, cy, profil=0):
    """cagoule sombre, masque blanc lisse, béret ; profil : -1 regarde à gauche, 1 à droite, 0 de face, 2 de dos"""
    if profil == 2:
        P.ellipse(cx, cy, 8, 9, CAP)
        P.ellipse(cx + 1, cy - 7, 9, 3.2, BER); P.px(cx + 1, cy - 11, BER)
        return
    if profil == 0:
        P.ellipse(cx, cy, 8, 9, CAP)
        P.ellipse(cx, cy + 1, 6.4, 7.6, MAS)
        P.ellipse(cx + 1, cy - 7, 9, 3.2, BER); P.px(cx + 1, cy - 11, BER)
        for sx in (-1, 1):  # yeux en croissant
            ex = cx + sx * 3 - (1 if sx < 0 else 0)
            P.px(ex - 1, cy + 1, YEU); P.px(ex, cy, YEU); P.px(ex + 1, cy, YEU); P.px(ex + 2, cy + 1, YEU)
        for k in range(-2, 2): P.px(cx + k, cy + 5, YEU)          # sourire peint
        P.px(cx - 3, cy + 5, YEU); P.px(cx + 2, cy + 4, YEU)
        P.px(cx + 4, cy + 3, LAR); P.px(cx + 4, cy + 4, LAR)     # larme bleue
    else:
        s = profil
        P.ellipse(cx - s, cy, 7.5, 9, CAP)
        P.ellipse(cx + s * 2.5, cy + 1, 5, 7.6, MAS)
        P.poly([(cx + s * 6.5, cy - 1), (cx + s * 8.6, cy + 2), (cx + s * 6.5, cy + 3)], MAS)
        P.ellipse(cx - s * 0, cy - 7, 8.5, 3.2, BER); P.px(cx - s * 1, cy - 11, BER)
        ex = cx + s * 4
        P.px(ex, cy, YEU); P.px(ex + s, cy, YEU); P.px(ex - s, cy + 1, YEU)
        P.px(cx + s * 4, cy + 5, YEU); P.px(cx + s * 5, cy + 5, YEU)
        if s > 0: P.px(cx + s * 4, cy + 3, LAR)


def collerette(P, cx, y, l=9):
    pts = []
    for i in range(-l, l + 1, 2):
        pts += [(cx + i, y + (3 if (i // 2) % 2 == 0 else 1))]
    P.poly([(cx - l, y - 1), (cx + l, y - 1)] + pts[::-1] + [(cx - l, y + 2)], FRA)


def miroir_main(P, x, y):
    P.rect(int(x) - 1, int(y) + 3, int(x), int(y) + 7, CAD); P.ellipse(x, y, 3.2, 4.2, CAD); P.ellipse(x, y, 2.1, 3.0, VER)


def face(pas):
    """de face (bas) ; pas : 0 debout, 1 et -1 en marche"""
    P = Pantin(); cx = 32; bob = 1 if pas else 0
    # jambes
    for s, j in ((-1, 0), (1, 1)):
        lev = 2 if (pas == 1 and j == 0) or (pas == -1 and j == 1) else 0
        x0 = cx + (-6 if s < 0 else 2)
        P.rect(x0, 45 + bob, x0 + 3, 59 - lev, COL)
        P.poly([(x0 - 1, 59 - lev), (x0 + 4, 59 - lev), (x0 + 5 + (0 if s > 0 else -2), 61 - lev), (x0 - 2 + (2 if s > 0 else 0), 61 - lev)], CHA)
    # buste
    y = 27 + bob
    P.poly([(cx - 8, y + 1), (cx + 8, y + 1), (cx + 6, y + 15), (cx + 6, y + 19), (cx - 6, y + 19), (cx - 6, y + 15)], COMBI)
    P.rect(cx - 6, y + 14, cx + 6, y + 15, CEI)
    # bras (balancés à l'opposé des jambes)
    for s in (-1, 1):
        sw = (pas * s) * 1
        bx = cx + s * 9
        P.poly([(bx - 2, y + 1), (bx + 2, y + 1), (bx + 2 + s, y + 13 + sw), (bx - 1 + s, y + 13 + sw)], MAN)
        P.rect(bx - 1 + s, y + 13 + sw, bx + 2 + s, y + 15 + sw, GAN)
    miroir_main(P, cx + 12, y + 12 + pas)
    collerette(P, cx, y)
    masque_face(P, cx, 15 + bob, 0)
    return P


def dos(pas):
    P = Pantin(); cx = 32; bob = 1 if pas else 0
    for s, j in ((-1, 0), (1, 1)):
        lev = 2 if (pas == 1 and j == 1) or (pas == -1 and j == 0) else 0
        x0 = cx + (-6 if s < 0 else 2)
        P.rect(x0, 45 + bob, x0 + 3, 59 - lev, COL)
        P.rect(x0 - 1, 59 - lev, x0 + 4, 60 - lev, CHA)
    y = 27 + bob
    P.poly([(cx - 8, y + 1), (cx + 8, y + 1), (cx + 6, y + 15), (cx + 6, y + 19), (cx - 6, y + 19), (cx - 6, y + 15)], COMBI)
    P.rect(cx - 6, y + 14, cx + 6, y + 15, CEI)
    for s in (-1, 1):
        sw = -(pas * s)
        bx = cx + s * 9
        P.poly([(bx - 2, y + 1), (bx + 2, y + 1), (bx + 2 + s, y + 13 + sw), (bx - 1 + s, y + 13 + sw)], MAN)
        P.rect(bx - 1 + s, y + 13 + sw, bx + 2 + s, y + 15 + sw, GAN)
    miroir_main(P, cx - 12, y + 12 - pas)
    collerette(P, cx, y)
    masque_face(P, cx, 15 + bob, 2)
    return P


def profil(pas, s=-1):
    """de profil, regarde vers s (-1 gauche)"""
    P = Pantin(); cx = 32; bob = 1 if pas else 0
    y = 27 + bob
    e = 4 if pas else 0
    pieds = [cx - s * e, cx + s * e] if pas == 1 else [cx + s * e, cx - s * e]
    for k, xf in enumerate(pieds):   # jambe arrière puis jambe avant
        top = 44 + bob
        P.poly([(cx - 2, top), (cx + 2, top), (xf + 2, 59), (xf - 2, 59)], COL)
        P.poly([(xf - 2, 58), (xf + 2, 58), (xf + 2 + (s > 0) * 2, 61), (xf - 2 - (s < 0) * 2, 61)], CHA)
    sw = 3 if pas == 1 else -3 if pas == -1 else 0
    # bras arrière, derrière le corps
    P.poly([(cx - 1, y + 2), (cx + 2, y + 2), (cx + 2 - s * sw, y + 13), (cx - 1 - s * sw, y + 13)], MAN)
    P.rect(cx - 1 - s * sw, y + 13, cx + 2 - s * sw, y + 15, GAN)
    P.poly([(cx - 5, y + 1), (cx + 5, y + 1), (cx + 4, y + 15), (cx + 4, y + 18), (cx - 4, y + 18), (cx - 4, y + 15)], COMBI)
    P.rect(cx - 4, y + 14, cx + 4, y + 15, CEI)
    # bras avant, tient le miroir
    P.poly([(cx - 1, y + 2), (cx + 2, y + 2), (cx + 2 + s * sw, y + 13), (cx - 1 + s * sw, y + 13)], MAN)
    P.rect(cx - 1 + s * sw, y + 13, cx + 2 + s * sw, y + 15, GAN)
    miroir_main(P, cx + 1 + s * sw + s * 2, y + 10)
    collerette(P, cx, y, 6)
    masque_face(P, cx, 15 + bob, s)
    return P


def image(P, regard):
    a = nuancer(P.L, regard)
    T = finir(a, P.L, regard)
    # reflet du masque et du miroir : un trait clair en diagonale
    ys, xs = np.nonzero(P.L == MAS)
    if len(xs):
        x0, y0 = xs.min(), ys.min()
        for k in range(4):
            x, y = x0 + 2 + k, y0 + 5 - k
            if P.L[y, x] == MAS: T.a[y, x] = REFLET
    ys, xs = np.nonzero(P.L == VER)
    if len(xs): T.a[ys.min() + 1, xs.min()] = REFLET
    return T.image()


def main():
    os.makedirs(SORTIE, exist_ok=True)
    pas = [0, 1, -1]
    images = {'bas': [image(face(p), 'bas') for p in pas],
              'gauche': [image(profil(p, -1), 'gauche') for p in pas],
              'haut': [image(dos(p), 'haut') for p in pas]}
    images['droite'] = [im.transpose(Image.FLIP_LEFT_RIGHT) for im in images['gauche']]
    ordre = ['bas', 'gauche', 'droite', 'haut']
    feuille = Image.new('RGBA', (64 * 12, 64))
    for i, d in enumerate(ordre):
        for j, im in enumerate(images[d]): feuille.alpha_composite(im, (64 * (i * 3 + j), 0))
        images[d][0].save(os.path.join(SORTIE, f'copycat_{d}.png'))
        for j in (1, 2): images[d][j].save(os.path.join(SORTIE, f'copycat_{d}_{j}.png'))
    feuille.save(os.path.join(SORTIE, 'copycat_marche.png'))
    toutes = [im for d in ordre for im in images[d]]
    planche(toutes, fond='#d8dce6', colonnes=12, echelle=3).save(os.path.join(SORTIE, 'planche_copycat.png'))
    print('écrit', SORTIE)


if __name__ == '__main__':
    main()
