#!/usr/bin/env python3
# Odyssée — PixelForge / contes : la maison en pain d'épice de la vieille dame (Bois des Contes, labo), le puits et la
# cabane à outils de son jardin, et les cibles du stand de tir de Poussière-Ville. Vue 3/4 façon HeartGold / SoulSilver,
# 32 px par case, lumière en haut à gauche ; mêmes outils que batiments.py.
#
#   python3 tools/pixelforge/contes_jardin.py [dossier]      (par défaut tools/pixelforge/donjon/)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from batiments import Toile, rgb, h, OUT, toit_tuiles, fenetre, ombre_sol, ramp_from

DOSSIER = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'donjon')
R = lambda *cs: [rgb(c) for c in cs]
PAIN = R('#4a2410', '#7a3e1a', '#a85c28', '#c87a3a', '#e09a52')      # pain d'épice
CHOCO = R('#24120a', '#3e2214', '#5a3420', '#784a2e', '#986a46')     # chocolat
GLACAGE = R('#a8a0b8', '#d0cadc', '#eeeaf4', '#fcfaff', '#ffffff')   # sucre glace
BOIS = R('#2e1a0e', '#4c2c18', '#6e4426', '#8e5e36', '#ae7a4a')
PIERRE = R('#2e2c30', '#4e4a50', '#6e6a70', '#908c90', '#b6b2b4')
TUILE_V = R('#1e3a24', '#2e5a34', '#447e48', '#62a05e', '#8cc47e')
BONBONS = [rgb(c) for c in ('#e8384a', '#f8c838', '#3aa8e8', '#58c858', '#c858e0', '#f88a2c')]


def glacage_zigzag(T, x0, x1, y):
    """une frise de sucre glace qui coule : festons blancs"""
    for x in range(x0, x1 + 1):
        T.p(x, y, GLACAGE[3]); T.p(x, y + 1, GLACAGE[2])
        f = (x - x0) % 8
        if f in (2, 3, 4, 5): T.p(x, y + 2, GLACAGE[2])
        if f in (3, 4): T.p(x, y + 3, GLACAGE[1])
    T.hl(x0, x1, y - 1, GLACAGE[4])


def bonbon(T, x, y, c):
    """une boule de gomme : rond de 3 × 3 avec un reflet"""
    T.rect(x - 1, y - 1, x + 1, y + 1, c); T.p(x - 1, y - 1, GLACAGE[4]); T.p(x + 1, y + 1, tuple(int(v * 0.6) for v in c[:3]) + (255,))


def sucre_orge(T, x, y0, y1):
    """un sucre d'orge : un poteau rayé rouge et blanc, crosse en haut"""
    for y in range(y0, y1 + 1):
        T.p(x, y, OUT); T.p(x + 3, y, OUT)
        for k in (1, 2): T.p(x + k, y, rgb('#e8384a') if ((y + k) // 3) % 2 else GLACAGE[3])
    for (dx, dy) in ((0, -1), (1, -2), (2, -3), (3, -3), (4, -3), (5, -2), (6, -1), (6, 0), (6, 1)):
        T.p(x + dx, y0 + dy, rgb('#e8384a') if dx % 2 else GLACAGE[3])


def maison_pain_epice():
    W, H = 176, 176
    T = Toile(W, H)
    # cheminée en chocolat, fumée de sucre filé
    T.box(124, 10, 138, 40, CHOCO[2], CHOCO[3], CHOCO[1])
    for y in range(14, 40, 6): T.hl(125, 137, y, CHOCO[1])
    glacage_zigzag(T, 123, 139, 10)
    # le toit : des tuiles de pain d'épice vertes (biscuits à la pistache), glaçage sur les bords
    toit_tuiles(T, 16, 20, 160, 92, TUILE_V, seed=4)
    for x in range(14, 163, 2):
        if h(x, 1, 6) < 0.7: T.p(x, 93, GLACAGE[3]); T.p(x, 94, GLACAGE[2])
        if h(x, 2, 6) < 0.3: T.p(x, 95, GLACAGE[1])
    for i, x in enumerate(range(26, 152, 14)): bonbon(T, x, 52 + (i % 2) * 18, BONBONS[i % len(BONBONS)])
    for i, x in enumerate(range(33, 152, 14)): bonbon(T, x, 36 + (i % 2) * 34, BONBONS[(i + 3) % len(BONBONS)])
    # la façade : grandes plaques de pain d'épice, joints de sucre glace
    T.rect(18, 96, 158, 152, PAIN[2])
    for y in range(96, 153):
        for x in range(18, 159):
            u = h(x, y, 8)
            if u < 0.06: T.p(x, y, PAIN[1])
            elif u > 0.95: T.p(x, y, PAIN[3])
            if (y - 96) % 19 == 0 or (x - 18) % 28 == 0: T.p(x, y, GLACAGE[2])
    T.rect(18, 96, 158, 99, PAIN[1])                        # ombre du toit
    T.vl(18, 96, 152, OUT); T.vl(158, 96, 152, OUT)
    # fenêtres rondes en sucre filé, entourées de glaçage
    for cx in (44, 132):
        for y in range(108, 130):
            for x in range(cx - 11, cx + 12):
                d = ((x - cx) / 11) ** 2 + ((y - 119) / 11) ** 2
                if d <= 1: T.p(x, y, GLACAGE[3] if d > 0.72 else rgb('#f8d878') if (x + y) % 5 else rgb('#fff4b8'))
        T.vl(cx, 109, 129, GLACAGE[2]); T.hl(cx - 10, cx + 10, 119, GLACAGE[2])
    # la porte : une tablette de chocolat, poignée en bonbon
    T.box(76, 112, 100, 152, CHOCO[2], CHOCO[3], CHOCO[0])
    for y in range(116, 150, 9):
        for x in (79, 89):
            T.box(x, y, x + 8, y + 7, CHOCO[3], CHOCO[4], CHOCO[1])
    for y in range(104, 112):                               # arche de glaçage au-dessus de la porte
        hw = 14 - (y - 104)
        T.hl(88 - hw, 88 + hw, y, GLACAGE[3] if y < 108 else GLACAGE[2])
    bonbon(T, 96, 132, BONBONS[1])
    # soubassement de biscuits ronds
    for x in range(18, 158, 10):
        T.box(x, 152, x + 9, 160, PAIN[3], PAIN[4], PAIN[1])
        T.p(x + 3, 155, CHOCO[2]); T.p(x + 6, 157, CHOCO[2])
    T.hl(18, 158, 160, OUT)
    # deux sucres d'orge de part et d'autre, une sucette plantée devant
    sucre_orge(T, 8, 108, 160); sucre_orge(T, 162, 108, 160)
    for y in range(146, 166): T.p(112, y, GLACAGE[2]); T.p(113, y, GLACAGE[1])
    for y in range(132, 147):
        for x in range(104, 122):
            d = ((x - 112.5) / 8.5) ** 2 + ((y - 139.5) / 7.5) ** 2
            if d <= 1: T.p(x, y, BONBONS[int((x - 104 + y) / 3) % 3] if d < 0.85 else OUT)
    # marche de nougat
    T.box(72, 160, 104, 165, rgb('#f2e6c8'), rgb('#fff8e8'), rgb('#c8b890'))
    ombre_sol(T, 18, 158, 166)
    return T.img()


def puits():
    W, H = 72, 92
    T = Toile(W, H)
    # le toit de bardeaux, sur deux poteaux, le treuil et la corde
    for x in (12, 58): T.box(x, 18, x + 3, 66, BOIS[2], BOIS[3], BOIS[1])
    for y in range(8, 24):
        hw = 10 + (y - 8) * 1.6
        for x in range(int(36 - hw), int(36 + hw) + 1):
            k = 3 if (y - 8) < 3 else 1 if (y - 8) % 4 == 3 else 2
            if ((x + (y // 4) * 3) % 6) == 0: k = max(0, k - 1)
            T.p(x, y, R('#3a1e14', '#6a3424', '#8e4a32', '#b0664a')[min(3, k)])
        T.p(int(36 - hw), y, OUT); T.p(int(36 + hw), y, OUT)
    T.hl(10, 62, 24, OUT)
    T.box(14, 30, 58, 34, BOIS[2], BOIS[3], BOIS[1])         # le treuil
    T.box(56, 28, 62, 36, BOIS[1], BOIS[2], BOIS[0]); T.hl(62, 66, 32, BOIS[1]); T.vl(66, 32, 38, BOIS[1])   # la manivelle
    T.vl(35, 35, 50, rgb('#c8b080')); T.vl(36, 35, 50, rgb('#9a8456'))
    T.box(31, 50, 40, 58, BOIS[3], BOIS[4], BOIS[1]); T.hl(31, 40, 53, rgb('#7a7a82'))   # le seau
    # la margelle de pierres, ronde
    for y in range(56, 84):
        for x in range(6, 66):
            dx = (x - 36) / 30
            haut = 56 + 6 * (1 - dx * dx) ** 0.5 if abs(dx) <= 1 else 999
            if y < 66 - 10 * (1 - dx * dx) ** 0.5 + 6 or abs(dx) > 1: continue
            row = (y - 56) // 6; off = 4 if row % 2 else 0
            k = 2 + int(h((x + off) // 8, row, 3) * 2)
            if (y - 56) % 6 == 0 or (x + off) % 8 == 0: k = 0
            if x < 14: k = min(4, k + 1)
            if x > 58: k = max(1, k - 1)
            T.p(x, y, PIERRE[k])
    for x in range(10, 63):                                 # l'ouverture sombre, vue d'en haut
        dx = (x - 36) / 26
        if abs(dx) <= 1:
            for y in range(int(60 - 5 * (1 - dx * dx) ** 0.5), int(60 + 5 * (1 - dx * dx) ** 0.5)): T.p(x, y, rgb('#10161e') if y > 58 else rgb('#1e2a36'))
    T.hl(8, 64, 84, OUT)
    for (x, y) in ((4, 80), (64, 82), (2, 86)): T.rect(x, y, x + 3, y + 2, rgb('#4c8c3c'))   # touffes d'herbe
    ombre_sol(T, 8, 62, 85)
    return T.img()


def cabane():
    W, H = 112, 112
    T = Toile(W, H)
    PLANCHE = R('#3a2414', '#5a3820', '#7a5030', '#9a6c44', '#b8885a')
    toit_tuiles(T, 12, 14, 100, 46, R('#262a30', '#3e444e', '#5a626e', '#7a8490', '#a0aab4'), seed=11, over=5)
    # les planches verticales du mur, la porte entrouverte
    for x in range(12, 101):
        for y in range(48, 98):
            k = 2 if (x - 12) % 9 else 0
            if (x - 12) % 9 == 1: k = 3
            if h(x, y // 6, 5) < 0.08: k = 1
            T.p(x, y, PLANCHE[k])
    T.rect(12, 48, 100, 51, PLANCHE[1])
    T.vl(12, 48, 98, OUT); T.vl(100, 48, 98, OUT); T.hl(12, 100, 98, OUT)
    T.box(48, 60, 72, 98, PLANCHE[0], PLANCHE[1], PLANCHE[0])   # l'ouverture sombre
    T.box(66, 60, 76, 98, PLANCHE[3], PLANCHE[4], PLANCHE[1])   # le battant entrouvert
    T.p(68, 80, rgb('#c8a040'))
    # une petite fenêtre, des outils accrochés et appuyés
    fenetre(T, 22, 62, 14, 12, PLANCHE)
    T.vl(86, 54, 96, BOIS[3]); T.vl(87, 54, 96, BOIS[2])         # râteau
    T.hl(82, 91, 54, rgb('#7a7a82')); [T.p(x, 55, rgb('#5a5a62')) for x in range(82, 92, 2)]
    T.vl(93, 62, 96, BOIS[3]); T.vl(94, 62, 96, BOIS[2])         # pelle
    T.box(91, 88, 97, 97, rgb('#8a8a92'), rgb('#b0b0b8'), rgb('#5a5a62'))
    T.vl(40, 76, 97, BOIS[3])                                    # fourche
    T.hl(37, 43, 76, rgb('#7a7a82')); [T.vl(x, 70, 76, rgb('#7a7a82')) for x in (37, 40, 43)]
    # un arrosoir et des pots devant
    T.box(4, 92, 14, 102, rgb('#4a8a5a'), rgb('#6ab07a'), rgb('#2e5a3a')); T.hl(14, 18, 94, rgb('#2e5a3a'))
    for x in (102, 106):
        T.box(x - 3, 96, x + 3, 103, rgb('#b8603a'), rgb('#d8805a'), rgb('#7a3a20')); T.rect(x - 2, 93, x + 2, 95, rgb('#4c8c3c'))
    ombre_sol(T, 12, 100, 99)
    return T.img()


def cible(tombee=False):
    """une cible de stand de tir : disque rouge et blanc cloué sur un piquet ; tombée : le disque à plat au pied du piquet"""
    W, H = 32, 48
    T = Toile(W, H)
    T.box(14, 22, 17, 44, BOIS[2], BOIS[3], BOIS[1])
    if not tombee:
        for y in range(2, 28):
            for x in range(3, 29):
                d = ((x - 15.5) / 12.5) ** 2 + ((y - 14.5) / 12.5) ** 2
                if d > 1: continue
                r = d ** 0.5
                c = OUT if r > 0.93 else rgb('#d83a3a') if r > 0.72 or 0.36 < r < 0.55 else rgb('#f4eee0') if r > 0.18 else rgb('#d83a3a')
                if c != OUT and x < 12 and y < 10 and r > 0.6: c = tuple(min(255, int(v * 1.15)) for v in c[:3]) + (255,)
                T.p(x, y, c)
    else:
        for y in range(38, 46):
            for x in range(2, 30):
                d = ((x - 16) / 13.5) ** 2 + ((y - 42) / 3.6) ** 2
                if d > 1: continue
                r = d ** 0.5
                T.p(x, y, OUT if r > 0.9 else rgb('#a82a2a') if r > 0.7 or 0.36 < r < 0.55 else rgb('#d8d0c0'))
        T.p(15, 22, rgb('#f8f0d8')); T.p(16, 23, rgb('#f8f0d8'))     # des éclats de bois en haut du piquet
    T.hl(12, 19, 45, OUT)
    return T.img()


def main():
    os.makedirs(DOSSIER, exist_ok=True)
    out = {'maison_pain_epice': maison_pain_epice(), 'puits_jardin': puits(), 'cabane_outils': cabane(), 'cible': cible(), 'cible_tombee': cible(True)}
    for k, im in out.items(): im.save(os.path.join(DOSSIER, k + '.png'))
    z, pad = 3, 16
    ims = list(out.values())
    W = sum(im.width * z + pad for im in ims) + pad; Hh = max(im.height for im in ims) * z + 2 * pad
    sheet = Image.new('RGBA', (W, Hh), (116, 168, 96, 255)); x = pad
    for im in ims: sheet.alpha_composite(im.resize((im.width * z, im.height * z), Image.NEAREST), (x, Hh - pad - im.height * z)); x += im.width * z + pad
    sheet.save(os.path.join(DOSSIER, 'planche_contes_jardin.png'))
    print('écrit dans', DOSSIER, ':', ', '.join(out))


if __name__ == '__main__':
    main()
