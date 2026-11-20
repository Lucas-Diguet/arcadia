#!/usr/bin/env python3
# Odyssée — PixelForge / horloge : l'escalier de l'étage 1 de la Tour de l'Horloge (TestOdyssée), lumière en haut à gauche.
#
#   python3 tools/pixelforge/horloge.py [dossier]      (par défaut testodyssee/img/horloge/)
#
# marche_horloge.png (112 × 48) : le dessus d'une marche de pierre claire, en dalles de calcaire, le nez de marche
#   arrondi et éclairé devant, l'usure au milieu (posée sur chaque marche de l'escalier, en volumes).
# contremarche_horloge.png (112 × 16) : le devant d'une marche, plus sombre.
# balustre_horloge.png (16 × 32) : un balustre de pierre de la rambarde.
# porte_horloge.png (96 × 128, 3 × 4 cases) : la grande porte de l'étage 2, deux battants de chêne cloutés et cerclés de
#   fer, dans un encadrement de pierre en plein cintre, un cadran de laiton dans le tympan.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, rampe, hexa, nuance, bruit, planche

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RACINE, 'testodyssee', 'img', 'horloge')

CALCAIRE = rampe('#4a4038', '#6e6254', '#8e8270', '#aa9e88', '#c2b69e', '#d6ccb4', '#e8e0cc', '#f6f0e2')
CHENE = rampe('#1c0f08', '#2e1a0e', '#452816', '#5e3820', '#784a2a', '#925e36', '#ac7444')
FER = rampe('#121218', '#22222a', '#34343e', '#4c4c58', '#6a6a76', '#8e8e9a')
LAITON = rampe('#3a2408', '#6a4612', '#9a6c1e', '#c8962e', '#e8bc4a', '#f8e08a', '#fff6cc')


def marche():
    W, H = 112, 48
    T = Toile(W, H)
    # trois dalles de calcaire, joints droits, une de biais
    joints = [0, 38, 74, W]
    for y in range(H):
        for x in range(W):
            v = bruit(x // 3, y // 2, 11) * 0.5 + bruit(x // 9, y // 6, 12) * 0.5
            t = 0.62 + (v - .5) * 0.18 - y / H * 0.08
            # usure au milieu (plus lisse et plus claire là où l'on marche)
            if 30 < x < 82 and 10 < y < 40: t += 0.05
            T.p(x, y, nuance(CALCAIRE, t, x, y, True))
    for jx in joints[1:-1]:
        for y in range(0, H - 8):
            T.p(jx, y, CALCAIRE[1]); T.p(jx + 1, y, CALCAIRE[5])
    # quelques fissures et taches
    for (x0, y0, n) in [(14, 12, 9), (90, 20, 7), (55, 6, 5)]:
        x, y = x0, y0
        for k in range(n):
            T.p(x, y, CALCAIRE[2]); x += 1; y += 1 if bruit(k, x0, 13) > .5 else 0
    # le nez de marche : bande éclairée, arrondi, et son ombre dessous
    for x in range(W):
        T.p(x, H - 9, CALCAIRE[7]); T.p(x, H - 8, CALCAIRE[6]); T.p(x, H - 7, CALCAIRE[6])
        T.p(x, H - 6, CALCAIRE[5]); T.p(x, H - 5, CALCAIRE[4]); T.p(x, H - 4, CALCAIRE[3])
        T.p(x, H - 3, CALCAIRE[2]); T.p(x, H - 2, CALCAIRE[1]); T.p(x, H - 1, CALCAIRE[0])
    # l'arrière, contre la marche suivante : un peu d'ombre
    for x in range(W):
        T.p(x, 0, CALCAIRE[2]); T.p(x, 1, CALCAIRE[3])
    return T


def contremarche():
    W, H = 112, 16
    T = Toile(W, H)
    for y in range(H):
        for x in range(W):
            t = 0.32 + (bruit(x // 4, y // 3, 21) - .5) * 0.15 - y / H * 0.1
            T.p(x, y, nuance(CALCAIRE, t, x, y, True))
    for x in range(W): T.p(x, 0, CALCAIRE[4]); T.p(x, H - 1, CALCAIRE[0])
    for jx in (38, 74):
        for y in range(H): T.p(jx, y, CALCAIRE[0])
    return T


def balustre():
    W, H = 16, 32
    T = Toile(W, H)
    # profil tourné : base, panse, col, chapiteau (largeur en fonction de la hauteur)
    def largeur(y):
        if y < 4: return 7
        if y < 7: return 4
        if y < 12: return 3 + (y - 7) * 0.5
        if y < 22: return 5.5 - abs(y - 17) * 0.25
        if y < 27: return 3
        return 7
    for y in range(H):
        l = largeur(y)
        for x in range(W):
            d = (x + .5 - W / 2)
            if abs(d) <= l:
                t = 0.75 - (d + l) / (2 * l) * 0.5 + (0.08 if y in (3, 27) else 0)
                T.p(x, y, nuance(CALCAIRE, t, x, y, True))
    T.contour(CALCAIRE[0])
    return T


def porte():
    W, H, CX = 96, 128, 48
    T = Toile(W, H)
    R_EXT, R_INT, YA = 46, 34, 48           # encadrement en plein cintre : rayon extérieur, rayon de l'ouverture, centre
    def dans(x, y, R): return (y >= YA and abs(x + .5 - CX) < R) or math.hypot(x + .5 - CX, y + .5 - YA) < R
    # l'encadrement de pierre : claveaux autour de l'arc, montants en assises
    for y in range(H):
        for x in range(W):
            if not dans(x, y, R_EXT) or dans(x, y, R_INT): continue
            if y < YA:
                a = math.atan2(y + .5 - YA, x + .5 - CX); k = int((a + math.pi) / (math.pi / 9))
                joint = abs(((a + math.pi) / (math.pi / 9)) - round((a + math.pi) / (math.pi / 9))) < 0.06
            else:
                k = (y - YA) // 10 + (0 if x < CX else 5); joint = (y - YA) % 10 == 0
            v = bruit(x // 3, y // 3, 31 + k) * 0.5
            t = 0.55 + v * 0.25 - (x / W) * 0.2 - (0.1 if math.hypot(x + .5 - CX, y + .5 - YA) > R_EXT - 3 and y < YA else 0)
            T.p(x, y, CALCAIRE[1] if joint else nuance(CALCAIRE, t, x, y, True))
    # la clé de voûte, plus grande et plus claire
    for y in range(YA - R_EXT, YA - R_INT + 3):
        for x in range(CX - 5, CX + 5):
            if dans(x, y, R_EXT): T.p(x, y, nuance(CALCAIRE, 0.82 - (x - CX + 5) / 10 * 0.25, x, y, True))
    # les battants de chêne : planches verticales
    for y in range(H):
        for x in range(W):
            if not dans(x, y, R_INT): continue
            planche_i = (x - (CX - R_INT)) // 6
            t = 0.42 + (bruit(planche_i, y // 5, 41) - .5) * 0.18 + (bruit(x, y // 2, 42) - .5) * 0.06 - y / H * 0.08
            if (x - (CX - R_INT)) % 6 == 0: t = 0.12
            T.p(x, y, nuance(CHENE, t, x, y, True))
    # la fente entre les deux battants
    for y in range(YA - R_INT + 2, H):
        T.p(CX - 1, y, CHENE[0]); T.p(CX, y, CHENE[0])
    # les pentures de fer, avec leurs clous
    for yb in (60, 92, 118):
        for x in range(CX - R_INT + 2, CX + R_INT - 2):
            if not dans(x, yb, R_INT) or abs(x + .5 - CX) < 1.5: continue
            for d in range(4): T.p(x, yb + d, FER[[4, 3, 2, 1][d]])
        for x in list(range(CX - R_INT + 5, CX - 2, 7)) + list(range(CX + 4, CX + R_INT - 3, 7)):
            T.p(x, yb + 1, FER[5]); T.p(x, yb + 2, FER[0])
    # des clous sur les planches
    for y in range(70, 116, 8):
        for x in range(CX - R_INT + 6, CX + R_INT - 4, 12):
            if dans(x, y, R_INT - 2) and abs(x - CX) > 3: T.p(x, y, FER[5]); T.p(x + 1, y + 1, FER[1])
    # les anneaux de heurtoir
    for ax in (CX - 9, CX + 8):
        T.ellipse(ax + .5, 80, 4, 4, FER[4], plein=False)
        T.ellipse(ax + .5, 80, 3, 3, FER[1], plein=False)
        T.p(ax, 75, FER[5]); T.p(ax, 76, FER[3])
    # le cadran de laiton du tympan (au-dessus des battants), ses aiguilles et ses heures
    cy = YA - 12
    T.ellipse(CX, cy, 14, 14, LAITON[1])
    T.ellipse(CX, cy, 13, 13, LAITON[3])
    T.ellipse(CX - 1, cy - 1, 11, 11, LAITON[4])
    T.ellipse(CX, cy, 10, 10, hexa('#efe6cc'))
    for k in range(12):
        a = k * math.pi / 6
        x, y = CX - .5 + math.sin(a) * 8.5, cy - .5 - math.cos(a) * 8.5
        T.p(x, y, CHENE[1])
    T.ligne(CX - .5, cy - .5, CX - .5, cy - 7, CHENE[0])
    T.ligne(CX - .5, cy - .5, CX + 4, cy + 2, CHENE[0])
    T.p(CX - .5, cy - .5, LAITON[2])
    # l'ombre portée de l'arc sur les battants
    for y in range(YA - R_INT, YA + 6):
        for x in range(W):
            if dans(x, y, R_INT) and not dans(x, y - 4, R_INT) and not math.hypot(x + .5 - CX, y + .5 - cy) < 14:
                c = T.get(x, y).copy()
                if c[3]: c[:3] = (c[:3] * 0.7).astype('uint8'); T.p(x, y, c)
    T.contour(CALCAIRE[0])
    return T


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    images = {'marche_horloge': marche(), 'contremarche_horloge': contremarche(), 'balustre_horloge': balustre(), 'porte_horloge': porte()}
    for nom, T in images.items(): T.save(os.path.join(OUT, nom + '.png'))
    planche([T.image() for T in images.values()], echelle=4).save('/tmp/planche_horloge.png')
    print('écrit dans', OUT)
