#!/usr/bin/env python3
# Odyssée — PixelForge / barrage : les objets du Barrage de Roche-Haute (TestOdyssée), à la manière de Pokémon Émeraude
# (usine, centrale) : acier peint, béton, peinture jaune de chantier. Dessinés à 16 px par case comme sur GBA, puis
# agrandis ×2 (32 px, densité du jeu), fond transparent ; lumière en haut à gauche.
#
#   python3 tools/pixelforge/barrage.py [dossier]      (par défaut testodyssee/img/barrage/)
#
# pupitre, pupitre_bas         pupitre des vannes (voyant bleu : niveau haut ; voyant orange : niveau bas)
# levier, levier_on            levier de vanne (rouge, baissé quand il est tiré)
# grille, grille_e             grille de fer (fermée) ; grille électrique (fermée, sous tension)
# vanne_conduite, vanne_conduite_o   volant de vanne sur une conduite (fermée, ouverte)
# turbine, tuyaux_mur, cuve, machine   décor
# tuyau_<d|c|t|x><rot>[_eau]   pièces du tuyautage, sèches ou pleines d'eau (rot : quarts de tour)
# arrivee_eau, turbine_pompe, turbine_pompe_on, bouchon      bouts du tuyautage
# disjoncteur, disjoncteur_on  le disjoncteur du local
# vanne_rouge, vanne_jaune, vanne_bleue (+ _o)                les vannes de crue du couronnement
# monte_charge, echelle, trappe, trappe_o, marque, porte_local, porte_local_o, porte_controle, porte_controle_o
# maquette, plaque             la maquette du barrage (hall), une plaque gravée
# objet_carnet, objet_cle      icônes du Sac (32 px)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Toile, rampe, planche
import numpy as np
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RACINE, 'testodyssee', 'img', 'barrage')
N = 16

ACIER = rampe('#1c2028', '#38404c', '#56606e', '#7a8694', '#a4aeb8', '#d0d8de')
BETON = rampe('#2a2a2c', '#4a4a4c', '#6e6c68', '#908c84', '#b0aca2', '#cfcac0')
ROUGE = rampe('#3a0e0e', '#7a1c1a', '#b8302a', '#e05040', '#f8907a')
JAUNE = rampe('#3a2c06', '#7a5c10', '#c09020', '#f0c840', '#fff0a0')
BLEU = rampe('#0a1a36', '#14366a', '#2860a8', '#4a90d8', '#90d0ff', '#e0f6ff')
VERT = rampe('#0e2a12', '#1e5a26', '#3a9a44', '#78d070')
ORANGE = rampe('#3a1a04', '#8a4208', '#d87818', '#ffb050')
BOIS = rampe('#2a1a0c', '#5a3818', '#8a5a2c', '#b8844a', '#d8aa70')
OMBRE = np.array([20, 20, 30, 100], np.uint8)


def ombre(T, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if T.vide(x, y): T.p(x, y, OMBRE)


def boite(T, x0, y0, x1, y1, R, face=4):
    """un bloc vu de trois quarts : dessus clair, face avant plus sombre, liseré"""
    ombre(T, x0 + 1, y1 + 1, x1 + 1, y1 + 1)
    T.rect(x0, y0, x1, y1, R[0])
    T.rect(x0 + 1, y0 + 1, x1 - 1, y0 + face - 1, R[4])
    T.rect(x0 + 1, y0 + face, x1 - 1, y1 - 1, R[2])
    T.hline(x0 + 1, x1 - 1, y0 + 1, R[5] if len(R) > 5 else R[4])


def pupitre(T, bas=False):
    boite(T, 2, 5, 13, 14, ACIER, 4)
    T.rect(3, 6, 12, 8, ACIER[3])
    # le grand volant
    T.ellipse(8, 11, 3, 2, ROUGE[1], plein=False); T.p(8, 11, ROUGE[3]); T.hline(5, 11, 11, ROUGE[2]); T.vline(8, 9, 13, ROUGE[2])
    # écran et voyants
    T.rect(4, 6, 8, 7, BLEU[1]); T.hline(4, 7, 6, BLEU[3] if not bas else BLEU[1])
    T.p(10, 6, (ORANGE if bas else BLEU)[3]); T.p(11, 6, (ORANGE if bas else BLEU)[3]); T.p(10, 7, (ORANGE if bas else BLEU)[2])
    T.hline(3, 12, 4, ACIER[0]); T.hline(4, 11, 3, JAUNE[3]); T.p(3, 3, JAUNE[0]); T.p(12, 3, JAUNE[0])


def levier(T, on=False):
    boite(T, 4, 9, 11, 14, ACIER, 2)
    if on:
        T.ligne(7, 10, 12, 12, ACIER[0]); T.ligne(7, 9, 12, 11, ACIER[3]); T.ellipse(12, 11, 1, 1, ROUGE[3])
    else:
        T.ligne(7, 10, 10, 3, ACIER[0]); T.ligne(8, 10, 11, 3, ACIER[3]); T.ellipse(11, 3, 1, 1, ROUGE[3]); T.p(10, 2, ROUGE[4])


def grille(T, elec=False):
    R = BLEU if elec else ACIER
    ombre(T, 1, 14, 15, 14)
    for x in range(1, 15, 3):
        T.rect(x, 1, x + 1, 13, R[0]); T.vline(x, 2, 12, R[3]); T.vline(x + 1, 2, 12, R[2])
    T.rect(0, 2, 15, 3, R[0]); T.hline(1, 14, 2, R[4]); T.rect(0, 10, 15, 11, R[0]); T.hline(1, 14, 10, R[4])
    if elec:
        for (x, y) in ((3, 5), (6, 7), (10, 4), (12, 8), (8, 12)):
            T.p(x, y, BLEU[5]); T.p(x + 1, y + 1, BLEU[4])


def vanne_conduite(T, ouverte=False):
    T.rect(0, 6, 15, 12, ACIER[0]); T.rect(0, 7, 15, 11, ACIER[2]); T.hline(0, 15, 7, ACIER[4])
    T.rect(5, 4, 10, 13, ACIER[0]); T.rect(6, 5, 9, 12, ACIER[3])
    c = VERT if ouverte else ROUGE
    T.ellipse(8, 4, 4, 2, c[0], plein=False); T.hline(5, 11, 4, c[2]); T.vline(8, 2, 6, c[2]); T.p(8, 4, c[3])
    if ouverte:
        for x in (1, 13):
            T.p(x, 9, BLEU[4]); T.p(x + 1, 10, BLEU[3])


def turbine(T):
    T.ellipse(8, 8, 7, 7, ACIER[0]); T.ellipse(8, 8, 6, 6, ACIER[2]); T.ellipse(8, 7, 5, 5, ACIER[3])
    for (a, b) in ((8, 3), (12, 7), (8, 12), (4, 8), (11, 4), (11, 11), (5, 11), (5, 4)):
        T.ligne(8, 8, a, b, ACIER[1])
    T.ellipse(8, 8, 2, 2, JAUNE[2]); T.p(8, 8, JAUNE[4]); T.p(7, 7, JAUNE[3])


def tuyaux_mur(T):
    T.rect(0, 0, 15, 15, BETON[2]); T.rect(0, 13, 15, 15, BETON[1])
    for x in (2, 7, 12):
        T.rect(x, 0, x + 2, 15, ACIER[0]); T.vline(x + 1, 0, 15, ACIER[3]); T.vline(x + 2, 0, 15, ACIER[2])
    T.rect(1, 6, 14, 8, ACIER[0]); T.hline(1, 14, 7, ROUGE[2]); T.ellipse(8, 7, 2, 2, ROUGE[1]); T.p(8, 7, ROUGE[3])


def cuve(T):
    T.ellipse(8, 4, 6, 2, ACIER[4]); T.rect(2, 4, 14, 13, ACIER[2]); T.ellipse(8, 13, 6, 2, ACIER[1])
    T.vline(2, 4, 13, ACIER[0]); T.vline(14, 4, 13, ACIER[0]); T.vline(4, 5, 12, ACIER[3])
    T.rect(2, 8, 14, 9, JAUNE[2]); T.hline(2, 14, 8, JAUNE[3])
    for x in range(3, 14, 3): T.p(x, 9, JAUNE[0])


def machine(T):
    boite(T, 1, 3, 14, 14, BETON, 3)
    T.rect(3, 7, 7, 12, ACIER[0]); T.rect(4, 8, 6, 11, VERT[1]); T.hline(4, 6, 9, VERT[3])
    T.rect(9, 7, 12, 9, ACIER[1]); T.p(10, 8, ROUGE[3]); T.p(11, 8, JAUNE[3])
    T.ellipse(11, 11, 1, 1, ACIER[4])


def tuyau(T, forme, rot, eau):
    """une pièce du tuyautage, posée dans une trappe du sol : rot quarts de tour (sens horaire)"""
    T.rect(0, 0, 15, 15, BETON[1]); T.rect(1, 1, 14, 14, BETON[2])
    for k in range(0, 16, 4): T.p(k, 0, BETON[0]); T.p(0, k, BETON[0])
    ouv = {'d': (1, 0, 1, 0), 'c': (1, 1, 0, 0), 't': (1, 1, 1, 0), 'x': (1, 1, 1, 1)}[forme]
    ouv = tuple(ouv[(i - rot) % 4] for i in range(4))
    paroi, coeur = ACIER, (BLEU[3] if eau else ACIER[1])
    bras = {0: (5, 0, 10, 8), 1: (7, 5, 15, 10), 2: (5, 7, 10, 15), 3: (0, 5, 8, 10)}
    for i, o in enumerate(ouv):
        if o:
            x0, y0, x1, y1 = bras[i]; T.rect(x0, y0, x1, y1, paroi[0])
    for i, o in enumerate(ouv):
        if o:
            x0, y0, x1, y1 = bras[i]
            T.rect(x0 + 1 if i in (0, 2) else x0, y0 + 1 if i in (1, 3) else y0, x1 - 1 if i in (0, 2) else x1, y1 - 1 if i in (1, 3) else y1, paroi[3])
    for i, o in enumerate(ouv):
        if o:
            x0, y0, x1, y1 = bras[i]
            T.rect(x0 + 2 if i in (0, 2) else x0, y0 + 2 if i in (1, 3) else y0, x1 - 2 if i in (0, 2) else x1, y1 - 2 if i in (1, 3) else y1, coeur)
    T.rect(5, 5, 10, 10, paroi[0]); T.rect(6, 6, 9, 9, paroi[3]); T.rect(7, 7, 8, 8, coeur)
    if eau: T.p(7, 7, BLEU[5]); T.p(4, 7, BLEU[5]) if ouv[3] else None


def bout(T, genre, on=False):
    T.rect(0, 0, 15, 15, BETON[1]); T.rect(1, 1, 14, 14, BETON[2])
    if genre == 'arrivee':
        T.rect(0, 5, 9, 10, ACIER[0]); T.rect(0, 6, 9, 9, BLEU[3]); T.rect(9, 3, 13, 12, ACIER[0]); T.rect(10, 4, 12, 11, ACIER[3])
        T.ellipse(11, 7, 1, 2, BLEU[4])
    elif genre == 'turbine':
        T.rect(0, 6, 5, 9, ACIER[0]); T.rect(0, 7, 5, 8, BLEU[3] if on else ACIER[1])
        T.ellipse(10, 8, 5, 5, ACIER[0]); T.ellipse(10, 8, 4, 4, ACIER[3])
        for (a, b) in ((10, 4), (14, 8), (10, 12), (6, 8)): T.ligne(10, 8, a, b, ACIER[1])
        T.ellipse(10, 8, 1, 1, (JAUNE if on else ACIER)[3])
    else:
        T.rect(5, 0, 10, 6, ACIER[0]); T.rect(6, 0, 9, 6, ACIER[2]); T.rect(4, 6, 11, 8, ROUGE[1]); T.hline(5, 10, 6, ROUGE[3])


def disjoncteur(T, on=False):
    boite(T, 2, 1, 13, 14, ACIER, 2)
    T.rect(4, 4, 11, 12, ACIER[1]); T.rect(5, 5, 10, 11, ACIER[0])
    T.rect(6, 6 if on else 8, 9, 7 if on else 10, (VERT if on else ROUGE)[3])
    T.hline(3, 12, 13, JAUNE[3]);
    for x in range(3, 13, 2): T.p(x, 13, JAUNE[0])
    T.p(12, 3, (VERT if on else ROUGE)[3])


def vanne_crue(T, R, ouverte=False):
    T.rect(6, 8, 9, 15, ACIER[0]); T.vline(7, 9, 15, ACIER[3])
    T.ellipse(8, 6, 6, 5, R[0]); T.ellipse(8, 6, 5, 4, R[2]); T.ellipse(8, 6, 3, 2, R[0] if not ouverte else R[1])
    for (a, b) in ((8, 1), (13, 6), (8, 11), (3, 6)): T.ligne(8, 6, a, b, R[3])
    T.ellipse(8, 6, 1, 1, R[-1]); T.p(5, 3, R[-1])
    if ouverte:
        for (x, y) in ((1, 13), (14, 13), (2, 15), (13, 15)): T.p(x, y, BLEU[4])


def monte_charge(T):
    T.rect(1, 0, 14, 15, ACIER[0]); T.rect(2, 1, 13, 14, ACIER[1])
    for x in range(3, 13, 3): T.vline(x, 1, 14, ACIER[3])
    T.rect(2, 13, 13, 15, JAUNE[2]); [T.p(x, 14, JAUNE[0]) for x in range(2, 14, 2)]
    T.rect(11, 5, 13, 8, ACIER[0]); T.p(12, 6, VERT[3]); T.p(12, 7, ROUGE[3])


def echelle(T):
    T.rect(3, 0, 12, 15, BETON[1])
    T.vline(4, 0, 15, ACIER[0]); T.vline(5, 0, 15, ACIER[3]); T.vline(10, 0, 15, ACIER[0]); T.vline(11, 0, 15, ACIER[3])
    for y in range(1, 16, 3): T.hline(5, 10, y, ACIER[4]); T.hline(5, 10, y + 1, ACIER[1])


def trappe(T, ouverte=False):
    T.rect(1, 2, 14, 14, ACIER[0])
    if ouverte:
        T.rect(2, 3, 13, 13, (8, 8, 12, 255)); T.rect(4, 3, 11, 13, ACIER[1]); [T.hline(5, 10, y, ACIER[3]) for y in range(4, 13, 3)]
    else:
        T.rect(2, 3, 13, 13, ACIER[2]); T.hline(2, 13, 3, ACIER[4]); [T.ligne(2, y, 13, y + 4, ACIER[1]) for y in (4, 8)]
        T.rect(7, 7, 8, 9, JAUNE[3])


def marque(T):
    for i in range(3, 13):
        T.p(i, i, JAUNE[3]); T.p(15 - i, i, JAUNE[3]); T.p(i + 1, i, JAUNE[2]); T.p(14 - i, i, JAUNE[2])


def porte_local(T, ouverte=False):
    T.rect(0, 0, 15, 15, BETON[1]); T.rect(2, 1, 13, 15, ACIER[0])
    if ouverte:
        T.rect(3, 2, 12, 15, (10, 10, 14, 255))
    else:
        T.rect(3, 2, 12, 15, ACIER[2]); T.hline(3, 12, 2, ACIER[4]); T.rect(4, 5, 11, 7, JAUNE[3]); T.hline(4, 11, 6, JAUNE[0])
        T.p(5, 6, (0, 0, 0, 255)); T.p(11, 10, ACIER[5]); T.rect(10, 9, 11, 11, ACIER[0])


def porte_controle(T, ouverte=False):
    T.rect(0, 0, 15, 15, BETON[1]); T.rect(1, 1, 14, 15, ACIER[0])
    if ouverte:
        T.rect(2, 2, 13, 15, (10, 10, 14, 255))
    else:
        T.rect(2, 2, 7, 15, ACIER[3]); T.rect(8, 2, 13, 15, ACIER[2]); T.vline(7, 2, 15, ACIER[0])
        T.rect(3, 4, 12, 5, ROUGE[2]); T.rect(5, 9, 10, 11, ACIER[0]); T.rect(6, 10, 9, 10, JAUNE[3])


def maquette(T):
    boite(T, 1, 6, 14, 14, BOIS, 3)
    T.rect(2, 3, 13, 8, BLEU[2]); T.hline(2, 13, 3, BLEU[4])
    T.rect(2, 8, 13, 9, BETON[4]); T.hline(2, 13, 8, BETON[5])
    for x in (4, 8, 12): T.p(x, 9, ACIER[1])


def plaque(T):
    T.rect(3, 2, 12, 12, ACIER[0]); T.rect(4, 3, 11, 11, ACIER[3]); T.hline(4, 11, 3, ACIER[5])
    for y in (5, 7, 9): T.hline(5, 10, y, ACIER[1])
    T.rect(7, 12, 8, 15, ACIER[1])


def objet_carnet(T):
    T.rect(3, 2, 12, 14, BOIS[0]); T.rect(4, 2, 12, 13, (220, 210, 180, 255)); T.rect(3, 2, 5, 14, BLEU[2])
    for y in (5, 7, 9, 11): T.hline(7, 11, y, BOIS[1])


def objet_cle(T):
    T.ellipse(5, 5, 3, 3, JAUNE[1]); T.ellipse(5, 5, 2, 2, JAUNE[3]); T.ellipse(5, 5, 1, 1, (0, 0, 0, 0))
    T.ligne(7, 7, 13, 13, JAUNE[1]); T.ligne(7, 6, 13, 12, JAUNE[3]); T.p(11, 13, JAUNE[2]); T.p(12, 14, JAUNE[2]); T.p(13, 11, JAUNE[2])


def objet_sol(T):
    """une Poké Ball posée au sol"""
    ombre(T, 4, 12, 12, 13)
    T.ellipse(8, 8, 4, 4, (20, 20, 24, 255)); T.ellipse(8, 8, 3, 3, (240, 240, 240, 255))
    for y in range(4, 8):
        for x in range(4, 13):
            if not T.vide(x, y) and (x - 8) ** 2 + (y - 8) ** 2 <= 9: T.p(x, y, ROUGE[2])
    T.hline(5, 11, 8, (20, 20, 24, 255)); T.ellipse(8, 8, 1, 1, (20, 20, 24, 255)); T.p(8, 8, (250, 250, 250, 255)); T.p(6, 6, ROUGE[4])


def agrandir(T):
    U = Toile(N * 2, N * 2); U.a = np.repeat(np.repeat(T.a, 2, axis=0), 2, axis=1); return U


def main():
    os.makedirs(OUT, exist_ok=True)
    P = {}

    def f(nom, fn, *a):
        T = Toile(N, N); fn(T, *a); P[nom] = T
    f('pupitre', pupitre); f('pupitre_bas', pupitre, True)
    f('levier', levier); f('levier_on', levier, True)
    f('grille', grille); f('grille_e', grille, True)
    f('vanne_conduite', vanne_conduite); f('vanne_conduite_o', vanne_conduite, True)
    f('turbine', turbine); f('tuyaux_mur', tuyaux_mur); f('cuve', cuve); f('machine', machine)
    for forme, n in (('d', 2), ('c', 4), ('t', 4), ('x', 1)):
        for r in range(n):
            f(f'tuyau_{forme}{r}', tuyau, forme, r, False); f(f'tuyau_{forme}{r}_eau', tuyau, forme, r, True)
    f('arrivee_eau', bout, 'arrivee'); f('turbine_pompe', bout, 'turbine'); f('turbine_pompe_on', bout, 'turbine', True); f('bouchon', bout, 'bouchon')
    f('disjoncteur', disjoncteur); f('disjoncteur_on', disjoncteur, True)
    for nom, R in (('rouge', ROUGE), ('jaune', JAUNE), ('bleue', BLEU)):
        f('vanne_' + nom, vanne_crue, R); f('vanne_' + nom + '_o', vanne_crue, R, True)
    f('monte_charge', monte_charge); f('echelle', echelle); f('trappe', trappe); f('trappe_o', trappe, True); f('marque', marque)
    f('porte_local', porte_local); f('porte_local_o', porte_local, True); f('porte_controle', porte_controle); f('porte_controle_o', porte_controle, True)
    f('maquette', maquette); f('plaque', plaque); f('objet_carnet', objet_carnet); f('objet_sol', objet_sol); f('objet_cle', objet_cle)
    for nom, T in P.items():
        agrandir(T).save(os.path.join(OUT, nom + '.png'))
    img = planche([agrandir(T).image() for T in P.values()], fond='#8a8c90', colonnes=10, echelle=2)
    img.save('/tmp/apercu_barrage.png')
    print(len(P), 'images dans', OUT)


if __name__ == '__main__':
    main()
