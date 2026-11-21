#!/usr/bin/env python3
# Odyssée — PixelForge / tourniquets : les tourniquets des salles de l'étage 1 de la Tour de l'Horloge (TestOdyssée), à la
# manière des portes tournantes de l'arène de Cimetronelle dans Pokémon Émeraude : une barrière de bois peint, posée sur
# le plancher, vue de trois quarts (dessus clair, face avant, ombre portée), et un gros poteau au pivot, coiffé de laiton.
# Dessinés à 16 px par case comme sur GBA, puis agrandis ×2 (32 px, densité du jeu), fond transparent : le jeu pose le
# plancher dessous. Lumière en haut à gauche.
#
#   python3 tools/pixelforge/tourniquets.py [dossier]      (par défaut testodyssee/img/horloge/)
#
# tq_h.png, tq_v.png              bras du milieu (un bras de deux cases, côté pivot), est-ouest et nord-sud
# tq_h_e.png, tq_h_o.png          bout d'un bras est-ouest, arrondi à l'est (le pivot est à l'ouest) ou à l'ouest
# tq_v_n.png, tq_v_s.png          bout d'un bras nord-sud, arrondi au nord ou au sud
# tq_pivot_<NESO>.png             le pivot, avec l'amorce des bras qui en partent (N, E, S, O présents ou '-')
# pilier.png                      un pilier de pierre, qui arrête les bras
# bloc_<n>.png                    un bloc de pierre des murs (n : voisins bloc en haut 1, bas 2, gauche 4, droite 8)
# apercu_tourniquets.png          planche d'aperçu, agrandie
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, rampe, hexa, planche
import numpy as np

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RACINE, 'testodyssee', 'img', 'horloge')

# bois peint crème, liseré sombre ; poteau de fonte, coiffe de laiton
BOIS = rampe('#3a2414', '#7a6a58', '#b8a68a', '#dccdb0', '#f2e8d2', '#fffaf0')
BLEU = rampe('#16263a', '#2a4a6e', '#3e6a96', '#5a8cbc')     # la bande peinte sur la face avant
FONTE = rampe('#1a1820', '#2e2c36', '#46444e', '#625f6a', '#837f8a')
LAITON = rampe('#3a2408', '#7a5418', '#b8862e', '#e8c060', '#fff0b0')
OMBRE = np.array([40, 16, 6, 110], np.uint8)
# les cloisons fixes (les murs des barrières) : du bois brun, plus sombre que les tourniquets, qui eux se voient
BRUN = rampe('#24140a', '#4a2c16', '#6e4424', '#8e5c32', '#a87444', '#c08c5a')
BRUN_BANDE = rampe('#1a0e06', '#3a2210', '#54341a', '#6a4424')
N = 16


def ombre(T, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if T.vide(x, y): T.p(x, y, OMBRE)


def bras_h(T, x0, x1, cap_g, cap_d, BOIS=BOIS, BLEU=BLEU):
    """une barrière est-ouest de x0 à x1 (inclus) : liseré, dessus clair, face avant à bande bleue, ombre dessous"""
    ombre(T, x0 + (1 if cap_g else 0), 12, x1 + (1 if cap_d else 0), 13)
    for x in range(x0, x1 + 1):
        T.p(x, 2, BOIS[0])
        T.p(x, 3, BOIS[5]); T.p(x, 4, BOIS[4]); T.p(x, 5, BOIS[4]); T.p(x, 6, BOIS[3])
        T.p(x, 7, BOIS[0])
        T.p(x, 8, BLEU[3]); T.p(x, 9, BLEU[2]); T.p(x, 10, BOIS[2])
        T.p(x, 11, BOIS[0])
        if x % 4 == 1: T.p(x, 9, BLEU[1]); T.p(x, 10, BOIS[1]); T.p(x, 4, BOIS[3])
    if cap_g:
        for y in range(3, 11): T.p(x0, y, BOIS[0])
        T.a[2, x0] = 0; T.a[11, x0] = 0
        T.p(x0 + 1, 3, BOIS[5]); T.p(x0 + 1, 8, BLEU[3])
    if cap_d:
        for y in range(3, 11): T.p(x1, y, BOIS[0])
        T.a[2, x1] = 0; T.a[11, x1] = 0
        for y in range(3, 7): T.p(x1 - 1, y, BOIS[2])
        T.p(x1 - 1, 8, BLEU[1]); T.p(x1 - 1, 9, BLEU[1]); T.p(x1 - 1, 10, BOIS[1])


def bras_v(T, y0, y1, cap_h, cap_b, BOIS=BOIS, BLEU=BLEU):
    """une barrière nord-sud de y0 à y1 : vue de dessus (dessus clair, flanc est plus sombre), face avant au bout sud"""
    bas = y1 - (4 if cap_b else 0)
    ombre(T, 12, y0 + (1 if cap_h else 0), 13, y1 + (1 if cap_b else 0))
    for y in range(y0, bas + 1):
        T.p(3, y, BOIS[0]); T.p(4, y, BOIS[5]); T.p(5, y, BOIS[4]); T.p(6, y, BOIS[4]); T.p(7, y, BOIS[4]); T.p(8, y, BOIS[3]); T.p(9, y, BLEU[3]); T.p(10, y, BLEU[2]); T.p(11, y, BOIS[0])
        if y % 4 == 2: T.p(5, y, BOIS[3]); T.p(6, y, BOIS[3]); T.p(7, y, BOIS[3]); T.p(10, y, BLEU[1])
    if cap_h:
        for x in range(4, 11): T.p(x, y0, BOIS[0])
        T.a[y0, 3] = 0; T.a[y0, 11] = 0
        for x in range(4, 9): T.p(x, y0 + 1, BOIS[5])
    if cap_b:
        # le bout sud : la face avant de la barrière, avec sa bande bleue
        for x in range(4, 11): T.p(x, bas + 1, BOIS[0])
        for x in range(4, 11): T.p(x, bas + 2, BLEU[3] if x < 9 else BLEU[2]); T.p(x, bas + 3, BLEU[2] if x < 9 else BLEU[1]); T.p(x, bas + 4, BOIS[2] if x < 9 else BOIS[1])
        for y in range(bas + 1, bas + 5): T.p(3, y, BOIS[0]); T.p(11, y, BOIS[0])
        for x in range(4, 11): T.p(x, bas + 5, BOIS[0])
        ombre(T, 4, bas + 6, 13, bas + 6)


def pivot(T, arms):
    """le poteau : platine sombre, fût de fonte, coiffe de laiton ; avec l'amorce des bras présents"""
    if 'N' in arms: bras_v(T, 0, 6, False, False)
    if 'S' in arms: bras_v(T, 9, 15, False, False)
    if 'O' in arms: bras_h(T, 0, 4, False, False)
    if 'E' in arms: bras_h(T, 11, 15, False, False)
    cx, cy = 7.5, 7.0
    # ombre du poteau
    for y in range(N):
        for x in range(N):
            if ((x - cx - 1.5) / 5.2) ** 2 + ((y - cy - 3.2) / 3.4) ** 2 <= 1 and T.vide(x, y): T.p(x, y, OMBRE)
    # le fût (cylindre vu de trois quarts) : de y 7 à 11
    for y in range(6, 12):
        for x in range(2, 14):
            d = (x - cx) / 5.4
            if abs(d) <= 1:
                t = 4 if d < -0.5 else 3 if d < 0 else 2 if d < 0.6 else 1
                T.p(x, y, FONTE[t])
    for x in range(2, 14):
        if abs((x - cx) / 5.4) <= 1: T.p(x, 12, FONTE[0])
    for y in range(6, 12): T.p(1, y, FONTE[0]); T.p(14, y, FONTE[0])
    # la coiffe : un disque de laiton, liseré sombre, reflet en haut à gauche
    for y in range(N):
        for x in range(N):
            r = ((x - cx) / 5.8) ** 2 + ((y - 5.0) / 4.0) ** 2
            if r <= 1:
                T.p(x, y, LAITON[0] if r > 0.78 else LAITON[2] if r > 0.35 else LAITON[3])
    T.p(5, 4, LAITON[4]); T.p(6, 4, LAITON[4]); T.p(5, 5, LAITON[3])
    T.p(7, 5, FONTE[1]); T.p(8, 5, FONTE[1]); T.p(7, 6, FONTE[2]); T.p(8, 6, FONTE[0])


PIERRE = rampe('#1e1a16', '#3e3830', '#5e564a', '#7a7060', '#958a76', '#b0a48c')


def pilier(T):
    """un pilier de pierre (il arrête les bras) : socle carré, fût rond, chapiteau cerclé de laiton, ombre portée"""
    cx = 7.5
    for y in range(N):
        for x in range(N):
            if ((x - cx - 1.5) / 6.0) ** 2 + ((y - 12.5) / 2.6) ** 2 <= 1 and T.vide(x, y): T.p(x, y, OMBRE)
    for y in range(10, 14):
        for x in range(2, 14): T.p(x, y, PIERRE[0] if y == 13 or x in (2, 13) else PIERRE[2] if y > 10 else PIERRE[3])
    for y in range(4, 11):
        for x in range(3, 13):
            d = (x - cx) / 4.8
            if abs(d) <= 1: T.p(x, y, PIERRE[0] if abs(d) > 0.86 else PIERRE[4] if d < -0.3 else PIERRE[3] if d < 0.3 else PIERRE[2])
    for x in range(3, 13): T.p(x, 7, LAITON[2] if x not in (3, 12) else LAITON[0])
    for y in range(N):
        for x in range(N):
            r = ((x - cx) / 5.6) ** 2 + ((y - 3.6) / 3.0) ** 2
            if r <= 1: T.p(x, y, PIERRE[0] if r > 0.75 else PIERRE[5] if (x < cx and y < 3.6) else PIERRE[4])


def bloc(T, haut, bas, gauche, droite):
    """un bloc de pierre taillée (mur des coupes) : dessus clair, joints ; face avant visible s'il n'y a pas de bloc en dessous"""
    for y in range(N):
        for x in range(N): T.p(x, y, PIERRE[3] if (x + y) % 7 else PIERRE[4])
    for x in range(N): T.p(x, 7, PIERRE[2])
    for y in range(0, 7): T.p(8, y, PIERRE[2])
    for y in range(8, N): T.p(3, y, PIERRE[2]); T.p(12, y, PIERRE[2])
    if not haut:
        for x in range(N): T.p(x, 0, PIERRE[0]); T.p(x, 1, PIERRE[5])
    if not gauche:
        for y in range(N): T.p(0, y, PIERRE[0])
    if not droite:
        for y in range(N): T.p(15, y, PIERRE[0])
    if not bas:
        for y in range(11, 15):
            for x in range(N): T.p(x, y, PIERRE[1] if y < 14 else PIERRE[0])
        for x in range(0, N, 4): T.p(x, 12, PIERRE[0])


def agrandir(T):
    a = np.repeat(np.repeat(T.a, 2, axis=0), 2, axis=1)
    U = Toile(N * 2, N * 2); U.a = a; return U


def main():
    os.makedirs(OUT, exist_ok=True)
    pieces = {}
    T = Toile(N, N); bras_h(T, 0, 15, False, False); pieces['tq_h'] = T
    T = Toile(N, N); bras_h(T, 0, 13, False, True); pieces['tq_h_e'] = T
    T = Toile(N, N); bras_h(T, 2, 15, True, False); pieces['tq_h_o'] = T
    T = Toile(N, N); bras_v(T, 0, 15, False, False); pieces['tq_v'] = T
    T = Toile(N, N); bras_v(T, 3, 15, True, False); pieces['tq_v_n'] = T
    T = Toile(N, N); bras_v(T, 0, 9, False, True); pieces['tq_v_s'] = T
    # les cloisons fixes : milieu, bouts, et une cloison seule (deux bouts)
    for o, f in (('h', bras_h), ('v', bras_v)):
        for suf, caps in (('', (False, False)), ('_e' if o == 'h' else '_s', (False, True)), ('_o' if o == 'h' else '_n', (True, False)), ('_x', (True, True))):
            T = Toile(N, N)
            a, b = (0, 15)
            if caps[0]: a = 2 if o == 'h' else 3
            if caps[1]: b = 13 if o == 'h' else (15 if o == 'v' else b)
            if o == 'v' and caps[1]: b = 9 if not caps[0] else 9
            f(T, a, b, caps[0], caps[1], BRUN, BRUN_BANDE)
            # un poteau au milieu de chaque case
            if o == 'h':
                for y in range(2, 12): T.p(7, y, BRUN[0] if y in (2, 11) else BRUN[1] if y > 6 else BRUN[2])
                T.p(8, 3, BRUN[5]); T.p(8, 4, BRUN[4])
            else:
                for x in range(3, 12): T.p(x, 7, BRUN[0])
            pieces['cl_' + o + suf] = T
    T = Toile(N, N); pilier(T); pieces['pilier'] = T
    for m in range(16):
        h, b_, g, d = [(m >> k) & 1 for k in range(4)]
        T = Toile(N, N); bloc(T, h, b_, g, d); pieces['bloc_%d' % m] = T
    import itertools
    for m in itertools.product([0, 1], repeat=4):
        arms = ''.join(c if b else '-' for c, b in zip('NESO', m))
        T = Toile(N, N); pivot(T, arms); pieces['tq_pivot_' + arms] = T
    for nom, T in pieces.items(): agrandir(T).save(os.path.join(OUT, nom + '.png'))
    # aperçu : un tourniquet à quatre bras de deux cases sur le plancher, et les pièces seules
    sel = ['tq_pivot_NESO', 'tq_pivot_-E-O', 'tq_h', 'tq_h_e', 'tq_h_o', 'tq_v', 'tq_v_n', 'tq_v_s']
    planche([agrandir(pieces[k]).image() for k in sel], fond='#a85a32', colonnes=8, echelle=4, titres=None).save(os.path.join(OUT, '..', '..', '..', 'tools', 'pixelforge', 'apercu_tourniquets.png')) if False else None
    sc = Toile(N * 5, N * 5); sc.a[:, :] = hexa('#a85a32')
    def poser(nom, i, j):
        P = pieces[nom].a; m = P[:, :, 3] > 0
        zone = sc.a[j * N:(j + 1) * N, i * N:(i + 1) * N]
        al = P[:, :, 3:4].astype(float) / 255
        zone[:] = (zone * (1 - al) + P * al).astype(np.uint8); zone[:, :, 3] = 255
    for (nom, i, j) in [('tq_v_n', 2, 0), ('tq_v', 2, 1), ('tq_pivot_NESO', 2, 2), ('tq_v', 2, 3), ('tq_v_s', 2, 4),
                        ('tq_h_o', 0, 2), ('tq_h', 1, 2), ('tq_h', 3, 2), ('tq_h_e', 4, 2)]: poser(nom, i, j)
    Image = __import__('PIL.Image', fromlist=['Image'])
    sc.image().resize((N * 5 * 6, N * 5 * 6), Image.NEAREST).save('/tmp/apercu_tourniquets.png')
    print(len(pieces), 'pièces dans', OUT)


main()
