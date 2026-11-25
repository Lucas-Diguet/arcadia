#!/usr/bin/env python3
# tools/barrage.py — dessine les salles du Barrage de Roche-Haute (TestOdyssée) et vérifie qu'on peut le finir.
#   python3 tools/barrage.py  → testodyssee/js/donjons/barrage-salles.js
# Relancer l'outil écrase le fichier. Les salles sont décrites à la main (zones, bassins, conduites, objets),
# l'outil creuse des bords irréguliers, calcule les murets des bassins, pose le décor, puis rejoue tout le donjon
# (niveau de l'eau haut ou bas, courant électrique, clés, leviers, rocher) : on finit, on ne reste jamais coincé,
# et chaque étape demande bien ce qu'elle doit demander.
#
# Lettres du plan :
#   # mur   . sol   S arrivée de la salle (on y revient après une défaite)   D sortie vers dehors (hall)
#   ~ fond de bassin (eau quand le niveau est haut, vase quand il est bas)
#   r muret du bassin (eau en haut, mur en bas)   e rampe (eau en haut, escalier en bas)
#   < > A V conduite (courant dans ce sens en haut, galerie sèche en bas)
#   ᐊ ᐅ ᐃ ᐁ conduite qui monte à pic (courant en haut, infranchissable en bas)
#   m rocher fissuré (Éclate-Roc)   B rocher (Force)   L rebord (on saute vers le bas)   P passage vers une autre salle
#   O objet qui bloque (levier, pupitre, grille, vanne...)   Ø objet sur lequel on marche (tuyau)   I objet à ramasser
#   X caisses   Y tonneau   M machine   Z cuve   W tuyaux au mur   T turbine   (décor)
#   lettres des dresseurs : voir DRESSEURS (une par dresseur)
import json, random, sys, os
from collections import deque

LIT = set('~')
EAU_HAUT = set('~re') | set('<>AV') | set('ᐊᐅᐃᐁ')
SOL_FIXE = set('.SDPLØ+,')
COURANT = {'<': (-1, 0), '>': (1, 0), 'A': (0, -1), 'V': (0, 1), 'ᐊ': (-1, 0), 'ᐅ': (1, 0), 'ᐃ': (0, -1), 'ᐁ': (0, 1)}
A_PIC = set('ᐊᐅᐃᐁ')
DECOR = set('XYMZWT')
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
LETTRES_DRESSEURS = 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ'
PNJ = {'ingenieure': 'Ⓘ', 'ouvrier1': 'Ⓞ', 'ouvrier2': 'Ⓤ', 'technicienne': 'Ⓣ', 'barragiste': 'Ⓑ'}


class Salle:
    def __init__(s, id, nom, W, H, seed):
        s.id, s.nom, s.W, s.H = id, nom, W, H
        s.g = [['#'] * W for _ in range(H)]
        s.r = random.Random(seed)
        s.objets = []          # dicts : x, y, t (type), ... (coordonnées du plan)
        s.arrivees = {}        # nom → (x, y, dir)
        s.passages = []        # (x, y, salle, arrivée)
        s.dresseurs = []       # (x, y, dir, n°)
        s.zones = {}           # repères nommés (pour les vérifications)
        s.rochers = []         # rochers à pousser (posés sur le plan au départ ; le plan garde la case dessous)

    def at(s, x, y):
        return s.g[y][x] if 0 <= x < s.W and 0 <= y < s.H else '#'

    def set(s, x, y, c):
        if 0 <= x < s.W and 0 <= y < s.H:
            s.g[y][x] = c

    def creuse(s, x, y, c):
        if 0 < x < s.W - 1 and 0 < y < s.H - 1:
            s.g[y][x] = c

    def creux(s, x, y, c='.'):
        if s.at(x, y) == '#':
            s.set(x, y, c)

    def blob(s, cx, cy, rx, ry, c='.', bruit=0.22, sur='#'):
        """une cavité aux bords irréguliers (ellipse bruitée)"""
        import math
        ph = [s.r.random() * 6.28 for _ in range(4)]
        for y in range(int(cy - ry - 2), int(cy + ry + 3)):
            for x in range(int(cx - rx - 2), int(cx + rx + 3)):
                a = math.atan2(y - cy, x - cx)
                n = 1 + bruit * (0.6 * math.sin(3 * a + ph[0]) + 0.4 * math.sin(5 * a + ph[1]) + 0.3 * math.sin(7 * a + ph[2]))
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= n * n and (sur is None or s.at(x, y) in sur):
                    s.creuse(x, y, c)

    def rect(s, x0, y0, x1, y1, c='.', sur=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if sur is None or s.at(x, y) in sur:
                    s.set(x, y, c)

    def couloir(s, pts, w=1, c='.', sur='#'):
        """galerie qui passe par les points (segments droits), largeur w"""
        pp = [pts[0]]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if x0 != x1 and y0 != y1:
                pp.append((x1, y0))
            pp.append((x1, y1))
        for (x0, y0), (x1, y1) in zip(pp, pp[1:]):
            dx = (x1 > x0) - (x1 < x0); dy = (y1 > y0) - (y1 < y0)
            x, y = x0, y0
            while True:
                for i in range(w):
                    for j in range(w):
                        if sur is None or s.at(x + i, y + j) in sur:
                            s.set(x + i, y + j, c)
                if (x, y) == (x1, y1):
                    break
                x += dx; y += dy

    def conduite(s, pts, pic=()):
        """une conduite d'une case de large : chaque case porte le sens du courant (vers le point suivant) ;
        pic : indices des segments qui montent à pic (infranchissables quand le niveau est bas)"""
        cases = []
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            assert x0 == x1 or y0 == y1, ('conduite en biais', pts)
        for k, ((x0, y0), (x1, y1)) in enumerate(zip(pts, pts[1:])):
            dx = (x1 > x0) - (x1 < x0); dy = (y1 > y0) - (y1 < y0)
            x, y = x0, y0
            while (x, y) != (x1, y1):
                cases.append((x, y, dx, dy, k in pic))
                x += dx; y += dy
        premiere = None
        for x, y, dx, dy, p in cases:
            if s.at(x, y) != '#':
                continue
            ch = {(-1, 0): '<', (1, 0): '>', (0, -1): 'A', (0, 1): 'V'}[(dx, dy)]
            if p:
                ch = {'<': 'ᐊ', '>': 'ᐅ', 'A': 'ᐃ', 'V': 'ᐁ'}[ch]
            s.set(x, y, ch)
            premiere = premiere or (x, y)
        return premiere

    def murets(s):
        """les cases du bassin qui touchent le sol des quais deviennent des murets (r)"""
        for y in range(s.H):
            for x in range(s.W):
                if s.g[y][x] == '~' and any(s.at(x + dx, y + dy) in SOL_FIXE or s.at(x + dx, y + dy) in 'OIX' for dx, dy in DIRS):
                    s.g[y][x] = 'r'

    def pres(s, x, y, ok, test=None):
        """la case la plus proche de (x, y) dont la lettre est dans ok (et qui passe le test)"""
        best = None
        for yy in range(s.H):
            for xx in range(s.W):
                if s.g[yy][xx] in ok and (test is None or test(xx, yy)):
                    d = abs(xx - x) + abs(yy - y)
                    if best is None or d < best[0]:
                        best = (d, xx, yy)
        assert best, (s.id, 'rien près de', x, y, ok)
        return best[1], best[2]

    def rampe(s, x, y):
        """la rampe la plus proche : un muret entre le sol d'un quai et le fond du bassin, en face l'un de l'autre"""
        def bon(a, b):
            return any(s.at(a + dx, b + dy) == '.' and s.at(a - dx, b - dy) == '~' for dx, dy in DIRS)
        a, b = s.pres(x, y, 'r', bon)
        s.set(a, b, 'e')
        return a, b

    def objet(s, x, y, t, sol=False, ou=None, **o):
        def libre(a, b):
            # pas à côté d'un autre objet, et pas au milieu d'une galerie (on bloquerait le passage)
            if any(s.at(a + dx, b + dy) in 'OIØP' for dx, dy in DIRS):
                return False
            n = sum(s.at(a + dx, b + dy) not in '#rXYMZWT' for dx, dy in DIRS)
            return n != 2
        if ou is not None and (s.at(x, y) not in ou or not libre(x, y)):
            x, y = s.pres(x, y, ou, libre)
        c = 'Ø' if sol else ('I' if t == 'objet' else 'O')
        sous = s.at(x, y)
        s.set(x, y, c)
        s.objets.append(dict(x=x, y=y, t=t, sous=sous, **o))

    def passage(s, x, y, salle, arrivee):
        s.set(x, y, 'P')
        s.passages.append((x, y, salle, arrivee))

    def arrivee(s, nom, x, y, dir='up'):
        assert s.at(x, y) in SOL_FIXE or s.at(x, y) == '.', (s.id, nom, s.at(x, y))
        s.arrivees[nom] = (x, y, dir)

    def dresseur(s, x, y, dir, n):
        mur = lambda q: s.at(*q) in '#rXYMZWTOIL' or s.at(*q) in LETTRES_DRESSEURS
        vx, vy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}[dir]

        def large(a, b):
            # ni le dresseur ni ce qu'il voit (4 cases devant lui) ne ferment un passage : on peut toujours le contourner
            bloque = {(a, b)}
            for i in range(1, 5):
                q = (a + vx * i, b + vy * i)
                if mur(q) or s.at(*q) in 'PS':
                    break
                bloque.add(q)
            v = {(c + dx, e + dy) for c, e in bloque for dx, dy in DIRS} - bloque
            v = [q for q in v if not mur(q)]
            if not v or any(s.at(*q) in 'PØ' for q in v) or any(s.at(*q) in 'PØ' for q in bloque):
                return False
            vu = {v[0]}; f = [v[0]]
            while f:
                x0, y0 = f.pop()
                for dx, dy in DIRS:
                    q = (x0 + dx, y0 + dy)
                    if q in vu or q in bloque or abs(q[0] - a) + abs(q[1] - b) > 30:
                        continue
                    if s.at(*q) in '#rXYMZWTOIL' or s.at(*q) in LETTRES_DRESSEURS:
                        continue
                    vu.add(q); f.append(q)
            return all(q in vu for q in v)
        x0, y0 = x, y
        if s.at(x, y) != '.' or not large(x, y):
            x, y = s.pres(x, y, '.', large)
        if abs(x - x0) + abs(y - y0) > 3:
            print(f'  dresseur {n} ({s.id}) déplacé de ({x0},{y0}) à ({x},{y})')
        s.set(x, y, LETTRES_DRESSEURS[n])
        s.dresseurs.append((x, y, dir, n))

    def lignes(s):
        return [''.join(r) for r in s.g]


# =====================================================================================================================
# Le décor : caisses, tonneaux, machines, cuves contre les murs ; flaques au sol
# =====================================================================================================================
PALETTES = {'vannes': 'XXYMZW', 'turbines': 'MMTZXY', 'conduites': 'YYZXW', 'decantation': 'ZZYXM', 'local': 'MZX'}


def decorer(S, densite=0.11, flaques=0.04):
    pal = PALETTES.get(S.id)
    if not pal:
        return
    BLOQUE = set('#rXYMZWTOIØPLe') | set(LETTRES_DRESSEURS) | set(PNJ.values()) | set(COURANT)

    def proche(x, y, quoi, d=1):
        return any(S.at(x + i, y + j) in quoi for i in range(-d, d + 1) for j in range(-d, d + 1))

    def coupe(a, b):
        v = [(a + dx, b + dy) for dx, dy in DIRS if S.at(a + dx, b + dy) not in BLOQUE]
        if not v:
            return True
        vu = {v[0]}; f = [v[0]]
        while f:
            x0, y0 = f.pop()
            for dx, dy in DIRS:
                q = (x0 + dx, y0 + dy)
                if q in vu or q == (a, b) or abs(q[0] - a) + abs(q[1] - b) > 30 or S.at(*q) in BLOQUE:
                    continue
                vu.add(q); f.append(q)
        return not all(q in vu for q in v)
    cases = [(x, y) for y in range(1, S.H - 1) for x in range(1, S.W - 1) if S.g[y][x] == '.']
    S.r.shuffle(cases)
    for x, y in cases:
        mur = sum(S.at(x + dx, y + dy) == '#' for dx, dy in DIRS)
        if mur == 0 or mur >= 3:
            continue
        if (S.at(x - 1, y) == '#' and S.at(x + 1, y) == '#') or (S.at(x, y - 1) == '#' and S.at(x, y + 1) == '#'):
            continue                                  # jamais dans un couloir d'une case
        if proche(x, y, 'OIØPSLe~r' + ''.join(COURANT) + ''.join(LETTRES_DRESSEURS) + ''.join(PNJ.values()), 1) or proche(x, y, 'XYMZWT', 1):
            continue
        if S.r.random() > densite or coupe(x, y):
            continue
        S.g[y][x] = S.r.choice(pal)
    for x, y in cases:
        if S.g[y][x] == '.' and S.r.random() < flaques and not proche(x, y, 'OIØP', 1):
            S.g[y][x] = ','


# =====================================================================================================================
# Les salles
# =====================================================================================================================
SALLES = {}
TUY_W, TUY_H, TUY_X0, TUY_Y0, TUY_IN, TUY_OUT = 7, 5, 12, 7, 1, 3


def salle(f):
    S = f()
    decorer(S)
    SALLES[S.id] = S
    return S


@salle
def hall():
    S = Salle('hall', 'Hall des Ingénieurs', 31, 17, 11)
    S.rect(1, 2, 29, 14)
    S.rect(13, 1, 17, 1)
    for x in range(1, 30):
        S.set(x, 2, '#')
    S.rect(12, 2, 18, 2)
    S.set(15, 15, 'S'); S.set(15, 16, 'D')
    S.passage(15, 1, 'vannes', 'hall')
    S.arrivee('vannes', 15, 2, 'down')
    # bureaux, plans, machines
    for x in (3, 4, 5, 25, 26, 27):
        S.set(x, 3, 'M' if x in (4, 26) else 'W')
    for x, y in ((2, 8), (2, 9), (28, 8), (28, 9), (8, 13), (22, 13), (3, 13), (27, 13)):
        S.set(x, y, 'X' if (x + y) % 2 else 'Y')
    S.rect(9, 6, 11, 6, 'Z'); S.rect(19, 6, 21, 6, 'Z')
    S.objet(15, 9, 'maquette')                      # la maquette du barrage, au centre
    S.objet(8, 4, 'panneauHall')
    S.zones['pnj'] = {'ingenieure': (18, 10, 'left'), 'ouvrier1': (6, 10, 'right'), 'ouvrier2': (24, 6, 'down'), 'technicienne': (11, 12, 'up')}
    for k, (x, y, _) in S.zones['pnj'].items():
        S.set(x, y, PNJ[k])
    return S


@salle
def vannes():
    """la Salle des Vannes : le grand réservoir au milieu, quatre quais autour, une porte par côté"""
    S = Salle('vannes', 'Salle des Vannes', 58, 44, 21)
    # quais
    S.blob(29, 38, 15, 3.4)           # quai sud (entrée)
    S.blob(6, 22, 4, 13)              # quai ouest
    S.blob(51, 22, 4.5, 13)           # quai est
    S.blob(29, 5, 16, 2.8)            # quai nord
    S.rect(26, 39, 32, 41)
    # réservoir
    S.blob(29, 21, 20, 13.5, '~', 0.12)
    # l'îlot du milieu (on y accoste en surfant)
    S.blob(29, 21, 5, 3, '.', 0.2, sur='~')
    # deux recoins au fond du réservoir (à sec seulement)
    S.blob(13, 31, 3, 2.2, '~', 0.2)
    S.blob(45, 12, 3, 2.2, '~', 0.2)
    # culs-de-sac des quais
    S.couloir([(16, 40), (10, 40), (10, 42)])
    S.blob(9, 41, 1.6, 1.2)
    S.couloir([(44, 5), (52, 5), (52, 2)])
    S.blob(52, 2, 1.8, 1.2)
    S.couloir([(4, 33), (2, 33), (2, 39), (5, 41)])
    S.blob(5, 41, 1.6, 1.2)
    # entrée, sorties
    S.set(29, 42, 'S')
    S.passage(29, 43, 'hall', 'vannes')
    S.arrivee('hall', 29, 42, 'up')
    S.couloir([(2, 22), (1, 22)])
    S.passage(1, 22, 'turbines', 'vannes')
    S.arrivee('turbines', 2, 22, 'right')
    S.couloir([(56, 24), (55, 24)])
    S.passage(56, 24, 'conduites', 'vannes')
    S.arrivee('conduites', 55, 24, 'left')
    S.couloir([(52, 10), (55, 10), (55, 8)])
    S.passage(55, 7, 'decantation', 'vannes')
    S.arrivee('decantation', 55, 8, 'down')
    S.murets()
    # rampes : on descend dans le réservoir vidé par le sud et l'ouest
    for x, y in ((29, 35), (10, 22), (47, 22)):
        S.rampe(x, y)
    # au nord, la grande porte de la Salle de Contrôle, et l'échelle de la trappe
    S.objet(29, 2, 'porteControle')
    S.set(28, 2, '#'); S.set(30, 2, '#')
    S.objet(38, 2, 'echelle')
    S.arrivee('controle', 29, 3, 'down')
    S.arrivee('couronnement', 38, 3, 'down')
    # le pupitre des vannes, près de l'entrée
    S.objet(34, 38, 'pupitre', ou='.', id='p1')
    # la grille devant la porte de l'ouest, et son levier au fond du réservoir
    S.objet(3, 22, 'grille', id='ouest')
    S.objet(13, 32, 'levier', ou='.~', id='ouest')
    # la grille électrique vers la décantation
    S.objet(55, 9, 'grilleE', id='decantation')
    # objets : au fond du réservoir (à sec), sur l'îlot (en surfant), au bout des culs-de-sac
    S.objet(45, 11, 'objet', ou='.~', objet='max-elixir')
    S.objet(29, 21, 'objet', ou='.~', objet='carnet-1')
    S.objet(9, 41, 'objet', ou='.~', objet='hyper-potion')
    S.objet(52, 2, 'objet', ou='.~', objet='rare-candy')
    S.objet(5, 41, 'objet', ou='.~', objet='max-revive')
    S.objet(31, 20, 'stele', ou='.', texte='ilot')
    # dresseurs
    S.dresseur(20, 38, 'up', 0)
    S.dresseur(6, 14, 'down', 1)
    S.dresseur(50, 31, 'left', 2)
    S.dresseur(20, 5, 'right', 3)
    # décor
    for x in range(17, 42, 4):
        S.set(x, 1, 'W') if S.at(x, 2) != '#' else None
    deco = [(16, 37, 'X'), (42, 37, 'Y'), (41, 39, 'X'), (3, 12, 'Y'), (3, 31, 'X'), (54, 15, 'M'), (54, 30, 'Z'), (17, 4, 'X'), (41, 5, 'Y'), (36, 38, 'M')]
    for x, y, c in deco:
        if S.at(x, y) == '.':
            S.set(x, y, c)
    S.zones.update(entree=(29, 42))
    return S


@salle
def turbines():
    """la Galerie des Turbines : deux fosses de part et d'autre d'une passerelle ; le local électrique tout à l'ouest"""
    S = Salle('turbines', 'Galerie des Turbines', 58, 42, 31)
    S.blob(51, 21, 4.2, 9)                      # quai d'arrivée (est)
    S.couloir([(55, 21), (56, 21)])
    S.passage(56, 21, 'vannes', 'turbines')
    S.set(55, 21, 'S')
    S.arrivee('vannes', 55, 21, 'left')
    # passerelle entre les deux fosses
    S.couloir([(47, 20), (21, 20)], 3)
    # fosse nord : une plateforme au milieu, qu'on n'atteint qu'en surfant
    S.blob(33, 13, 11, 6.6, '~', 0.1)
    S.blob(33, 12, 3.2, 1.8, '.', 0.2, sur='~')
    # fosse sud : le levier au fond
    S.blob(33, 29, 11, 6.6, '~', 0.1)
    # galerie du nord vers l'ouest (au-dessus de la fosse nord, sans la toucher)
    S.couloir([(48, 12), (48, 3), (16, 3), (16, 12)], 2)
    S.couloir([(16, 12), (11, 12), (11, 20)], 2)
    S.objet(24, 3, 'grille', id='turbines-nord')
    S.objet(24, 4, 'grille', id='turbines-nord')
    # quai ouest et local électrique
    S.blob(8, 26, 4.5, 8)
    S.objet(3, 26, 'porteLocal')
    S.passage(2, 26, 'local', 'turbines')
    S.arrivee('local', 4, 26, 'right')
    # recoins : rocher fissuré au bout d'une galerie, cul-de-sac au sud-est
    S.couloir([(8, 33), (8, 39), (14, 39)])
    S.set(8, 36, 'm')
    S.blob(15, 39, 1.8, 1.2)
    S.couloir([(49, 29), (49, 38), (52, 38)])
    S.blob(53, 38, 1.8, 1.4)
    # l'arrière-salle, derrière une grille électrique
    S.couloir([(6, 22), (6, 9), (7, 9)], 1)
    S.blob(9, 8, 2.6, 2)
    S.objet(6, 17, 'grilleE', id='turbines-arriere')
    S.murets()
    S.rampe(34, 23)          # on descend dans la fosse sud depuis la passerelle
    # objets
    S.objet(33, 12, 'objet', ou='.~', objet='carnet-2')
    S.objet(31, 13, 'objet', ou='.~', objet='pp-up')
    S.objet(15, 39, 'objet', ou='.~', objet='full-restore')
    S.objet(53, 38, 'objet', ou='.~', objet='max-potion')
    S.objet(40, 32, 'objet', ou='~', objet='ultra-ball', n=3)
    S.objet(29, 34, 'levier', ou='~', id='turbines-nord')
    S.objet(9, 7, 'objet', ou='.~', objet='pp-up')
    S.objet(10, 9, 'objet', ou='.~', objet='carnet-3')
    for x, y, c in ((49, 14, 'M'), (49, 28, 'Z'), (54, 17, 'X'), (6, 21, 'Y'), (11, 31, 'X'), (20, 2, 'W'), (36, 2, 'W'), (44, 2, 'W'), (53, 26, 'Y')):
        if S.at(x, y) in '.' or (S.at(x, y) == '#' and S.at(x, y + 1) == '.'):
            S.set(x, y, c)
    S.dresseur(50, 16, 'left', 4)
    S.dresseur(40, 21, 'left', 5)
    S.dresseur(32, 3, 'right', 6)
    S.dresseur(11, 17, 'down', 7)
    S.dresseur(8, 30, 'up', 8)
    return S


@salle
def local():
    """le Local des Pompes : le tuyautage à remettre en ordre (casse-tête, voir TUYAUX) et le disjoncteur"""
    S = Salle('local', 'Local des Pompes', 34, 38, 41)
    S.rect(2, 2, 31, 21)
    # la salle des machines du bas, par deux couloirs, et un réduit tout au fond
    S.rect(4, 26, 29, 33)
    S.couloir([(6, 21), (6, 26)]); S.couloir([(26, 21), (26, 23), (21, 23), (21, 26)])
    S.couloir([(29, 30), (31, 30), (31, 35), (24, 35)]); S.blob(23, 35, 1.6, 1.1)
    for x in range(8, 27, 3):
        S.set(x, 29, 'T' if x % 2 else 'M')
    for x in (5, 9, 13, 17):
        S.set(x, 33, 'Z')
    S.set(31, 12, 'S')
    S.passage(32, 12, 'turbines', 'local')
    S.arrivee('turbines', 31, 12, 'left')
    # le tuyautage : 7 × 5 pièces côte à côte, dans des trappes du sol (on marche dessus, on tourne celle d'en face)
    for j in range(TUY_H):
        for i in range(TUY_W):
            S.objet(TUY_X0 + i, TUY_Y0 + j, 'tuyau', sol=True, i=i, j=j)
    # arrivée d'eau (à gauche), turbine (à droite), deux fausses sorties bouchées
    S.objet(TUY_X0 - 1, TUY_Y0 + TUY_IN, 'arriveeEau')
    S.objet(TUY_X0 + TUY_W, TUY_Y0 + TUY_OUT, 'turbine')
    S.objet(TUY_X0 + 2, TUY_Y0 - 1, 'bouchon')
    S.objet(TUY_X0 + 4, TUY_Y0 + TUY_H, 'bouchon')
    S.objet(20, 4, 'plaque', texte='tuyaux')
    S.objet(28, 27, 'disjoncteur')
    S.objet(23, 35, 'objet', ou='.', objet='max-elixir')
    S.dresseur(16, 31, 'up', 24)
    for x, y, c in ((3, 3, 'M'), (4, 3, 'M'), (5, 3, 'M'), (29, 20, 'Z'), (28, 20, 'Z'), (3, 20, 'X'), (4, 20, 'Y'), (30, 3, 'W'), (16, 2, 'W'), (8, 2, 'W'), (24, 2, 'W'),
                    (25, 8, 'T'), (25, 12, 'T'), (3, 10, 'X'), (3, 14, 'Y'), (8, 18, 'M'), (20, 18, 'Z')):
        S.set(x, y, c)
    return S


@salle
def conduites():
    """les Conduites : quatre bassins reliés par des conduites ; la clé du local tout en haut, à droite"""
    S = Salle('conduites', 'Conduites', 58, 42, 51)
    S.blob(5, 24, 3.6, 8)                         # quai d'arrivée (ouest)
    S.couloir([(2, 24), (1, 24)])
    S.passage(1, 24, 'vannes', 'conduites')
    S.set(2, 24, 'S')
    S.arrivee('vannes', 2, 24, 'right')
    # bassins
    S.blob(15, 24, 5.5, 8, '~', 0.12)             # B1 contre le quai
    S.blob(31, 10, 6, 4.2, '~', 0.12)             # B2 au nord
    S.blob(31, 34, 6, 4.2, '~', 0.12)             # B3 au sud
    S.blob(50, 33, 4.5, 4, '~', 0.12)             # B4 : la chambre des vannes (sud-est)
    # galerie haute : la clé
    S.blob(48, 6, 6, 2.6)
    # conduites
    S.conduite([(14, 18), (14, 9), (27, 9)])                  # B1 → B2
    S.conduite([(31, 12), (31, 18), (17, 18)])                # B2 → B1
    S.conduite([(15, 30), (15, 35), (27, 35)])                # B1 → B3
    S.conduite([(35, 34), (47, 34)])                          # B3 → B4
    S.conduite([(50, 36), (50, 40), (13, 40), (13, 29)])      # B4 → B1, sous toute la salle
    # la conduite qui monte à pic de B2 vers la galerie haute, fermée par une vanne (levier dans la chambre B4)
    v = S.conduite([(35, 9), (41, 9), (41, 6), (44, 6)], pic=(1, 2))
    S.objet(v[0], v[1], 'vanneConduite', id='conduites')
    # de la galerie haute, un couloir tout en haut, puis un rebord qui redescend sur le quai d'arrivée (raccourci)
    S.couloir([(43, 4), (43, 2), (37, 2), (37, 4), (27, 4), (27, 2), (19, 2), (19, 4), (14, 4), (14, 2), (10, 2), (10, 11), (5, 11), (5, 15)])
    S.couloir([(31, 4), (31, 3)]); S.couloir([(23, 2), (23, 1)])
    S.set(5, 14, 'L')
    # galeries sèches (au bout des conduites, à sec seulement)
    S.couloir([(42, 33), (42, 28), (38, 28)])
    S.blob(37, 27, 1.8, 1.3)
    S.couloir([(30, 39), (30, 41)])
    S.couloir([(22, 39), (22, 37)])
    S.murets()
    S.rampe(9, 24)
    S.objet(52, 31, 'levier', ou='~', id='conduites')
    S.objet(53, 5, 'objet', ou='.', objet='cle-local')
    S.couloir([(10, 6), (13, 6)]); S.objet(13, 6, 'objet', ou='.', objet='carnet-4')
    S.objet(37, 27, 'objet', ou='.', objet='hyper-potion')
    S.objet(30, 41, 'objet', ou='.', objet='full-heal')
    S.objet(22, 37, 'objet', ou='.', objet='elixir')
    S.objet(29, 9, 'objet', ou='~', objet='max-repel')
    for x, y, c in ((4, 18, 'X'), (4, 30, 'Y'), (52, 4, 'M'), (54, 8, 'Z'), (7, 31, 'X')):
        if S.at(x, y) == '.':
            S.set(x, y, c)
    S.dresseur(6, 19, 'right', 9)
    S.dresseur(46, 6, 'left', 10)
    S.dresseur(4, 21, 'right', 11)        # sur le quai : son indice sert avant la conduite à pic
    S.dresseur(40, 28, 'down', 12)
    S.dresseur(7, 28, 'up', 13)
    return S


@salle
def decantation():
    """le Bassin de Décantation : un canal fait le tour du bassin ; un rocher poussé dans le canal à sec arrête le
    courant, quand l'eau revient, juste sous le quai suspendu, d'où l'on gagne le monte-charge"""
    S = Salle('decantation', 'Bassin de Décantation', 58, 42, 61)
    S.blob(9, 34, 6, 5)                           # quai d'arrivée (sud-ouest)
    S.couloir([(9, 39), (9, 41)])
    S.passage(9, 41, 'vannes', 'decantation')
    S.set(9, 40, 'S')
    S.arrivee('vannes', 9, 40, 'up')
    S.blob(31, 28, 12, 6.5, '~', 0.1)             # le bassin
    S.couloir([(14, 31), (19, 31)], 3)
    # le canal : il part du bassin, monte, longe le haut de la salle, redescend dans le bassin
    S.conduite([(22, 26), (17, 26), (17, 12), (46, 12), (46, 27), (42, 27)])
    S.rochers.append((20, 12))
    S.objet(34, 12, 'marque', sol=True)            # le rocher posé sur la croix arrête le courant juste sous le muret
    # le quai suspendu, au-dessus de la marque ; on n'y monte que depuis l'eau (le muret entre les deux)
    S.rect(30, 7, 36, 10)
    S.set(33, 11, 'r')
    # la galerie du monte-charge
    S.couloir([(36, 8), (51, 8), (51, 4)], 2)
    S.blob(52, 4, 3.4, 2.2)
    S.objet(55, 4, 'monteCharge')
    S.arrivee('couronnement', 54, 5, 'left')
    # le retour : un rebord qui redescend vers le quai d'arrivée
    S.couloir([(54, 6), (54, 13), (50, 13), (50, 20), (54, 20), (54, 28), (50, 28), (50, 34), (54, 34), (54, 38), (46, 38), (46, 40), (30, 40), (30, 38), (12, 38)])
    S.set(54, 10, 'L')
    S.couloir([(50, 24), (48, 24)]); S.blob(48, 24, 1.4, 1.2)
    # recoins
    S.couloir([(26, 13), (26, 15)])
    S.couloir([(40, 39), (40, 36), (44, 36)])
    S.blob(45, 36, 1.6, 1.2)
    S.couloir([(7, 33), (3, 33), (3, 24), (8, 24)])
    S.blob(9, 23, 1.8, 1.3)
    S.murets()
    S.rampe(20, 31)
    S.objet(12, 31, 'pupitre', ou='.', id='p2')
    S.objet(26, 15, 'objet', ou='.', objet='carnet-5')
    S.objet(45, 36, 'objet', ou='.', objet='leftovers')
    S.objet(31, 30, 'objet', ou='~', objet='max-potion')
    S.objet(35, 8, 'objet', ou='.', objet='full-restore')
    S.objet(9, 23, 'objet', ou='.', objet='rare-candy')
    S.objet(48, 24, 'objet', ou='.', objet='ether')
    for x, y, c in ((4, 35, 'X'), (15, 37, 'Y'), (49, 3, 'M'), (30, 7, 'Z'), (36, 7, 'Z')):
        if S.at(x, y) == '.':
            S.set(x, y, c)
    S.dresseur(13, 36, 'left', 14)
    S.dresseur(3, 27, 'down', 15)
    S.dresseur(12, 33, 'right', 16)       # sur le quai d'arrivée : son indice sert avant le canal
    S.dresseur(52, 6, 'left', 17)
    S.set(53, 30, '.'); S.dresseur(53, 30, 'right', 18)
    return S


@salle
def couronnement():
    """le Couronnement : la crête du barrage, dehors ; le lac au nord, la vallée au sud ; les trois vannes de crue
    sur un ponton à l'ouest, au-dessus du déversoir"""
    S = Salle('couronnement', 'Couronnement du barrage', 62, 22, 71)
    S.rect(1, 1, 60, 8, 'w')                      # le lac de retenue
    S.rect(2, 10, 59, 13)                         # la route de crête
    S.rect(2, 9, 59, 9, 'f'); S.rect(2, 14, 59, 14, 'f')   # parapets
    for x in (8, 20, 33, 46):                     # belvédères au-dessus de la vallée
        S.rect(x, 14, x + 4, 17)
        S.rect(x - 1, 18, x + 5, 18, 'f'); S.rect(x - 1, 14, x - 1, 17, 'f'); S.rect(x + 5, 14, x + 5, 17, 'f')
    # le ponton des vannes (ouest) et la tour du monte-charge (est)
    S.rect(2, 3, 9, 9)
    S.rect(52, 4, 59, 9)
    S.set(56, 6, 'S')
    S.arrivee('decantation', 56, 7, 'down')
    S.objet(58, 5, 'monteCharge', vers='decantation')
    S.objet(3, 3, 'vanneCrue', couleur='rouge')
    S.objet(5, 3, 'vanneCrue', couleur='jaune')
    S.objet(7, 3, 'vanneCrue', couleur='bleue')
    S.objet(9, 5, 'stele', texte='vannes')
    S.objet(3, 12, 'trappe')
    S.arrivee('trappe', 4, 12, 'right')
    for x, y, c in ((53, 5, 'M'), (59, 8, 'Z'), (2, 8, 'Y')):
        S.set(x, y, c)
    S.objet(22, 17, 'objet', ou='.', objet='carnet-6')
    S.objet(48, 16, 'objet', ou='.', objet='pp-up')
    S.objet(10, 16, 'objet', ou='.', objet='max-revive')
    S.dresseur(48, 11, 'left', 19)
    S.dresseur(39, 12, 'left', 20)
    S.dresseur(30, 11, 'left', 21)
    S.dresseur(21, 12, 'left', 22)
    S.dresseur(13, 11, 'left', 23)
    return S


@salle
def controle():
    S = Salle('controle', 'Salle de Contrôle', 31, 19, 81)
    S.rect(2, 3, 28, 16)
    S.set(15, 17, 'S')
    S.passage(15, 18, 'vannes', 'controle')
    S.arrivee('vannes', 15, 17, 'up')
    for x in range(4, 27, 2):
        S.set(x, 3, 'M' if x % 4 else 'W')
    S.objet(15, 4, 'pupitreMaitre')
    S.zones['pnj'] = {'barragiste': (15, 7, 'down')}
    S.set(15, 7, PNJ['barragiste'])
    for x, y, c in ((3, 10, 'Z'), (27, 10, 'Z'), (3, 15, 'X'), (27, 15, 'Y')):
        S.set(x, y, c)
    for x in (5, 6, 7, 23, 24, 25):                 # deux rangées de pupitres
        S.set(x, 9, 'M'); S.set(x, 12, 'M')
    for y in range(5, 15, 3):                       # câbles au sol le long des murs
        S.set(2, y, 'W'); S.set(28, y, 'W')
    S.rect(10, 13, 11, 14, 'X')                     # le coin d'Anselme : caisses, tonneaux
    S.set(19, 13, 'Y'); S.set(20, 13, 'Y')
    S.objet(15, 11, 'stele', ou='.', texte='controle')
    return S


# =====================================================================================================================
# Le tuyautage du Local des Pompes
# =====================================================================================================================
# pièces : d droite (2 sens), c coude (4), t té (4), x croix ; ouvertures par sens de rotation (N E S O)
OUV = {
    'd': [(1, 0, 1, 0), (0, 1, 0, 1)],
    'c': [(1, 1, 0, 0), (0, 1, 1, 0), (0, 0, 1, 1), (1, 0, 0, 1)],
    't': [(1, 1, 1, 0), (0, 1, 1, 1), (1, 0, 1, 1), (1, 1, 0, 1)],
    'x': [(1, 1, 1, 1)],
}
VEC = [(0, -1), (1, 0), (0, 1), (-1, 0)]


def tuyautage(seed):
    """tire un chemin de l'arrivée à la turbine, pose les pièces qui le font et du remplissage, puis mélange les
    rotations ; garde le tirage où un seul trajet relie l'arrivée à la turbine, assez long"""
    r = random.Random(seed)
    for essai in range(4000):
        # un chemin qui serpente (marche aléatoire sans recroisement)
        chemin = [(0, TUY_IN)]
        ok = False
        for _ in range(200):
            x, y = chemin[-1]
            if (x, y) == (TUY_W - 1, TUY_OUT) and len(chemin) >= 13:
                ok = True; break
            v = [(x + dx, y + dy) for dx, dy in VEC if 0 <= x + dx < TUY_W and 0 <= y + dy < TUY_H and (x + dx, y + dy) not in chemin]
            if not v:
                break
            chemin.append(r.choice(v))
        if not ok:
            continue
        pieces = {}
        for k, (x, y) in enumerate(chemin):
            a = (x - 1, y) if k == 0 else chemin[k - 1]
            b = (x + 1, y) if k == len(chemin) - 1 else chemin[k + 1]
            da = VEC.index((a[0] - x, a[1] - y)); db = VEC.index((b[0] - x, b[1] - y))
            pieces[(x, y)] = 'd' if (da + 2) % 4 == db else 'c'
        for y in range(TUY_H):
            for x in range(TUY_W):
                if (x, y) not in pieces:
                    pieces[(x, y)] = r.choice('ddcctx')
        n = trajets(pieces, limite=3)
        if n != 1:
            continue
        rot = {k: r.randrange(len(OUV[p])) for k, p in pieces.items()}
        # pas déjà résolu au départ
        if relie(pieces, rot):
            continue
        sol = {k: None for k in pieces}
        return pieces, rot, chemin, essai
    raise SystemExit('tuyautage introuvable')


def trajets(pieces, limite=3):
    """nombre de trajets simples de l'arrivée à la turbine que les pièces permettent (quelle que soit leur rotation)"""
    n = 0

    def peut(p, de, vers):
        if p == 'x':
            return (de + 2) % 4 == vers
        if p == 'd':
            return (de + 2) % 4 == vers
        if p == 'c':
            return (de + 2) % 4 != vers and de != vers
        return de != vers          # té : deux de ses trois ouvertures, quelles qu'elles soient
    pile = [((0, TUY_IN), 3, frozenset([(0, TUY_IN)]))]
    while pile:
        (x, y), de, vu = pile.pop()
        p = pieces[(x, y)]
        for vers in range(4):
            if not peut(p, de, vers):
                continue
            dx, dy = VEC[vers]; nx, ny = x + dx, y + dy
            if (x, y) == (TUY_W - 1, TUY_OUT) and vers == 1:
                n += 1
                if n >= limite:
                    return n
                continue
            if 0 <= nx < TUY_W and 0 <= ny < TUY_H and (nx, ny) not in vu:
                pile.append(((nx, ny), (vers + 2) % 4, vu | {(nx, ny)}))
    return n


def relie(pieces, rot):
    """l'eau va-t-elle de l'arrivée à la turbine avec ces rotations ?"""
    vu = set(); f = [(0, TUY_IN, 3)]
    while f:
        x, y, de = f.pop()
        if not (0 <= x < TUY_W and 0 <= y < TUY_H) or (x, y, de) in vu:
            continue
        o = OUV[pieces[(x, y)]][rot[(x, y)]]
        if not o[de]:
            continue
        vu.add((x, y, de))
        for v in range(4):
            if o[v] and v != de:
                if (x, y) == (TUY_W - 1, TUY_OUT) and v == 1:
                    return True
                dx, dy = VEC[v]
                f.append((x + dx, y + dy, (v + 2) % 4))
    return False


# =====================================================================================================================
# Vérification : on rejoue tout le donjon
# =====================================================================================================================
ORDRE_VANNES = ['jaune', 'bleue', 'rouge']


def terrain(S, x, y, niveau, drapeaux, rochers):
    """ce qu'est la case : 'sol', 'eau', 'mur' ; avec le sens du courant s'il y en a un"""
    c = S.at(x, y)
    if (x, y) in rochers:
        return 'mur', None
    o = OBJ.get((S.id, x, y))
    if o:
        t = o['t']
        if t == 'grille':
            return ('sol' if ('levier:' + o['id']) in drapeaux else 'mur'), None
        if t == 'grilleE':
            return ('sol' if 'courant' in drapeaux else 'mur'), None
        if t == 'vanneConduite':
            if ('levier:' + o['id']) in drapeaux and niveau == 'H':
                return 'eau', (1, 0)
            return 'mur', None
        if t == 'porteLocal':
            return ('sol' if 'porte-local' in drapeaux else 'mur'), None
        if t in ('tuyau', 'marque'):
            c = o['sous'] if o['sous'] != '#' else '.'
            if t == 'tuyau':
                return 'sol', None
        else:
            # objet qui bloque ; au fond d'un bassin, il est sous l'eau quand le niveau est haut
            if o['sous'] in '~' and niveau == 'H':
                return 'eau', None
            return 'mur', None
    if c in '#wf' or c in DECOR or c in LETTRES_DRESSEURS or c in PNJ.values():
        return 'mur', None
    if c == 'm':
        return 'sol', None
    if c == 'B':
        return 'sol', None
    if c in '.SDPL+,':
        return 'sol', None
    if c == '~':
        return ('eau' if niveau == 'H' else 'sol'), None
    if c == 'r':
        return ('eau' if niveau == 'H' else 'mur'), None
    if c == 'e':
        return ('eau' if niveau == 'H' else 'sol'), None
    if c in COURANT:
        if niveau == 'H':
            return 'eau', COURANT[c]
        return ('mur' if c in A_PIC else 'sol'), None
    raise ValueError((S.id, x, y, c))


OBJ = {}


def voisins_etat(etat, drapeaux):
    """(salle, x, y, niveau, rocher) → états voisins (marcher, surfer, glisser, pousser, passer une porte)"""
    sid, x, y, niveau, roc = etat
    S = SALLES[sid]
    rochers = {roc} if roc else set()
    if roc is None and sid in ROCHER_INIT:
        pass
    out = []
    t0, c0 = terrain(S, x, y, niveau, drapeaux, rochers)
    # plaqué par le courant contre le rocher : on regagne le quai d'arrivée (le rocher reprend sa place)
    if c0 and (x + c0[0], y + c0[1]) in rochers:
        ax, ay, _ = S.arrivees[[k for k in S.arrivees if k == 'vannes'][0]]
        out.append((sid, ax, ay, niveau, ROCHER_INIT.get(sid)))
    for dx, dy in DIRS:
        nx, ny = x + dx, y + dy
        c = S.at(nx, ny)
        # rebord : on saute vers le bas seulement
        if c == 'L':
            if (dx, dy) == (0, 1) and terrain(S, nx, ny + 1, niveau, drapeaux, rochers)[0] == 'sol':
                out.append((sid, nx, ny + 1, niveau, roc))
            continue
        # rocher : on le pousse (à pied)
        if (nx, ny) in rochers:
            if t0 == 'sol' and niveau == 'B' or t0 == 'sol' and terrain(S, nx + dx, ny + dy, niveau, drapeaux, set())[0] == 'sol':
                bx, by = nx + dx, ny + dy
                if terrain(S, bx, by, niveau, drapeaux, set())[0] == 'sol' and S.at(bx, by) not in 'PL' and t0 == 'sol':
                    out.append((sid, nx, ny, niveau, (bx, by)))
            continue
        t, cour = terrain(S, nx, ny, niveau, drapeaux, rochers)
        if t == 'mur':
            continue
        if c == 'P':
            for (px, py, vers, arr) in S.passages:
                if (px, py) == (nx, ny):
                    ax, ay, _ = SALLES[vers].arrivees[arr]
                    out.append((vers, ax, ay, niveau, ROCHER_INIT.get(vers)))
            continue
        if t == 'eau' and cour:
            # le courant emporte jusqu'au bout de la conduite
            cx, cy = nx, ny
            for _ in range(400):
                tt, cc = terrain(S, cx, cy, niveau, drapeaux, rochers)
                if not cc:
                    break
                ax, ay = cx + cc[0], cy + cc[1]
                if terrain(S, ax, ay, niveau, drapeaux, rochers)[0] != 'eau':
                    break
                cx, cy = ax, ay
            out.append((sid, cx, cy, niveau, roc))
            continue
        out.append((sid, nx, ny, niveau, roc))
    return out


ROCHER_INIT = {}


def actions(etat, drapeaux):
    """ce qu'on peut faire sur place : objets à côté (leviers, pupitres, objets, portes...)"""
    sid, x, y, niveau, roc = etat
    S = SALLES[sid]
    t0, _ = terrain(S, x, y, niveau, drapeaux, {roc} if roc else set())
    res = []          # (drapeau gagné, nouvel état ou None)
    for dx, dy in DIRS:
        o = OBJ.get((sid, x + dx, y + dy))
        if not o:
            continue
        t = o['t']
        sous_eau = o['sous'] == '~' and niveau == 'H'
        if sous_eau:
            continue
        if t == 'levier':
            res.append(('levier:' + o['id'], None))
        elif t == 'objet':
            res.append(('objet:%s:%d,%d' % (sid, o['x'], o['y']), None))
            if o['objet'] == 'cle-local':
                res.append(('cle-local', None))
        elif t == 'pupitre' and t0 == 'sol':
            res.append((None, (sid, x, y, 'B' if niveau == 'H' else 'H', roc)))
        elif t == 'porteLocal' and 'cle-local' in drapeaux:
            res.append(('porte-local', None))
        elif t == 'turbine' and niveau == 'H':
            res.append(('courant', None))       # le tuyautage se résout (vérifié à part)
        elif t == 'monteCharge' and 'courant' in drapeaux:
            vers = o.get('vers', 'couronnement')
            ax, ay, _ = SALLES[vers].arrivees['decantation' if vers == 'couronnement' else 'couronnement']
            res.append((None, (vers, ax, ay, niveau, ROCHER_INIT.get(vers))))
        elif t == 'vanneCrue':
            res.append(('vannes', None))
        elif t == 'trappe' and 'vannes' in drapeaux:
            ax, ay, _ = SALLES['vannes'].arrivees['couronnement']
            res.append(('trappe', ('vannes', ax, ay, niveau, None)))
        elif t == 'echelle' and 'trappe' in drapeaux:
            ax, ay, _ = SALLES['couronnement'].arrivees['trappe']
            res.append((None, ('couronnement', ax, ay, niveau, None)))
        elif t == 'porteControle' and 'trappe' in drapeaux:
            ax, ay, _ = SALLES['controle'].arrivees['vannes']
            res.append(('fin', ('controle', ax, ay, niveau, None)))
    return res


INTERDIT = set()
SANS_PUPITRE = [False]


def explorer(drapeaux, depart):
    vus = {depart}; f = deque([depart]); gagnes = set(); aretes = {}
    while f:
        e = f.popleft()
        suiv = voisins_etat(e, drapeaux)
        for d, ne in actions(e, drapeaux):
            if d in INTERDIT or (SANS_PUPITRE[0] and ne and d is None and ne[0] == e[0] and ne[1:3] == e[1:3]):
                continue
            if d and d not in drapeaux:
                gagnes.add(d)
            if ne:
                suiv.append(ne)
        aretes[e] = suiv
        for n in suiv:
            if n not in vus:
                vus.add(n); f.append(n)
    return vus, gagnes, aretes


def verifier():
    for S in SALLES.values():
        for o in S.objets:
            OBJ[(S.id, o['x'], o['y'])] = o
        if S.rochers:
            ROCHER_INIT[S.id] = S.rochers[0]
    ax, ay, _ = SALLES['hall'].arrivees['vannes']
    depart = ('hall', 15, 15, 'H', None)
    drapeaux = set(); etapes = []
    while True:
        vus, gagnes, aretes = explorer(drapeaux, depart)
        # jamais coincé : de partout, on revient à l'entrée du hall
        inv = {}
        for a, l in aretes.items():
            for b in l:
                inv.setdefault(b, []).append(a)
        retour = {depart}; f = deque([depart])
        while f:
            e = f.popleft()
            for a in inv.get(e, []):
                if a not in retour:
                    retour.add(a); f.append(a)
        coinces = [e for e in vus if e not in retour]
        if coinces:
            print('COINCÉ', sorted(coinces)[:8], 'drapeaux', sorted(drapeaux))
            sys.exit(1)
        nouveaux = gagnes - drapeaux
        if not nouveaux:
            break
        etapes.append(sorted(nouveaux))
        drapeaux |= nouveaux
    return drapeaux, etapes


# =====================================================================================================================
# Sortie
# =====================================================================================================================
def montrer(ids):
    for i in ids:
        S = SALLES[i]
        print('==', i, S.W, 'x', S.H)
        for l in S.lignes():
            print(l)


def necessaire():
    """chaque obstacle demande bien sa solution : sans elle, ce qu'il garde reste hors d'atteinte"""
    depart = ('hall', 15, 15, 'H', None)

    def atteint(sans=(), pupitres=True, rocher=True):
        INTERDIT.clear(); INTERDIT.update(sans); SANS_PUPITRE[0] = not pupitres
        sauve = dict(ROCHER_INIT)
        if not rocher:
            ROCHER_INIT.clear()
        F = set()
        while True:
            vus, g, _ = explorer(F, depart)
            n = g - F
            if not n:
                break
            F |= n
        INTERDIT.clear(); SANS_PUPITRE[0] = False; ROCHER_INIT.update(sauve)
        return {e[0] for e in vus}, F
    cas = [
        ('levier:ouest', 'la grille de la Salle des Vannes garde la Galerie des Turbines', dict(sans=['levier:ouest']), lambda S, F: 'turbines' not in S),
        ('levier:conduites', 'la vanne des Conduites garde la clé du local', dict(sans=['levier:conduites']), lambda S, F: 'cle-local' not in F),
        ('levier:turbines-nord', 'la grille de la galerie nord garde le local', dict(sans=['levier:turbines-nord']), lambda S, F: 'porte-local' not in F),
        ('courant', 'le courant garde la décantation', dict(sans=['courant']), lambda S, F: 'decantation' not in S),
        ('rocher', 'le rocher dans le canal garde le monte-charge', dict(rocher=False), lambda S, F: 'couronnement' not in S),
        ('pupitres', 'sans changer le niveau, on reste bloqué tôt', dict(pupitres=False), lambda S, F: 'turbines' not in S and 'cle-local' not in F),
        ('vannes', 'les vannes de crue gardent la trappe', dict(sans=['vannes']), lambda S, F: 'controle' not in S),
    ]
    ok = True
    for nom, txt, kw, test in cas:
        S, F = atteint(**kw)
        bon = test(S, F)
        ok &= bon
        print(('  ok   ' if bon else '  RATÉ ') + txt)
    if not ok:
        sys.exit(1)


def mesures():
    """taille, chemin le plus court de l'arrivée à la sortie principale (niveau le plus favorable), culs-de-sac, boucles"""
    for sid, (a, b) in {'vannes': ('hall', None), 'turbines': ('vannes', 'local'), 'conduites': ('vannes', 'cle'), 'decantation': ('vannes', 'monte')}.items():
        S = SALLES[sid]
        sol = {(x, y) for y in range(S.H) for x in range(S.W) if S.g[y][x] not in '#' and S.g[y][x] not in DECOR}
        bouts = sum(1 for (x, y) in sol if sum((x + dx, y + dy) in sol for dx, dy in DIRS) == 1)
        aretes = sum(1 for (x, y) in sol for dx, dy in ((1, 0), (0, 1)) if (x + dx, y + dy) in sol)
        boucles = aretes - len(sol) + 1
        print(f'  {S.nom:24} {S.W} × {S.H}, {len(sol)} cases ouvertes, {bouts} bouts de galerie, {max(0, boucles)} boucles (cycles)')


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'voir':
        montrer(sys.argv[2:] or list(SALLES)); return
    pieces, rot, chemin, essai = tuyautage(int(sys.argv[1]) if len(sys.argv) > 1 else 7)
    drapeaux, etapes = verifier()
    for k, e in enumerate(etapes):
        print('étape', k + 1, ':', ', '.join(x for x in e if not x.startswith('objet:')) or '(objets)')
    necessaire()
    mesures()
    manque = {'courant', 'cle-local', 'porte-local', 'vannes', 'trappe', 'fin'} - drapeaux
    tous = {'objet:%s:%d,%d' % (S.id, o['x'], o['y']) for S in SALLES.values() for o in S.objets if o['t'] == 'objet'}
    if tous - drapeaux:
        print('OBJETS JAMAIS ATTEINTS', sorted(tous - drapeaux)); sys.exit(1)
    if manque:
        print('INACHEVABLE, il manque', manque)
        sys.exit(1)
    out = ['// testodyssee/js/donjons/barrage-salles.js — écrit par tools/barrage.py (ne pas modifier à la main).', '']
    data = {}
    for S in SALLES.values():
        data[S.id] = dict(nom=S.nom, plan=S.lignes(), objets=S.objets, arrivees={k: list(v) for k, v in S.arrivees.items()},
                          passages=[list(p) for p in S.passages], rochers=[list(r) for r in S.rochers], dresseurs=[list(d) for d in S.dresseurs], pnj=S.zones.get('pnj', {}))
    out.append('export const SALLES_BARRAGE = ' + json.dumps(data, ensure_ascii=False) + ';')
    out.append('export const TUYAUX = ' + json.dumps(dict(w=TUY_W, h=TUY_H, x0=TUY_X0, y0=TUY_Y0, entree=TUY_IN, sortie=TUY_OUT,
               pieces={f'{x},{y}': p for (x, y), p in pieces.items()}, rotations={f'{x},{y}': v for (x, y), v in rot.items()},
               chemin=chemin), ensure_ascii=False) + ';')
    out.append('export const ORDRE_VANNES = ' + json.dumps(ORDRE_VANNES) + ';')
    out.append('export const ETAPES_BARRAGE = ' + json.dumps(etapes, ensure_ascii=False) + ';')
    p = os.path.join(os.path.dirname(__file__), '..', 'testodyssee', 'js', 'donjons', 'barrage-salles.js')
    open(p, 'w').write('\n'.join(out) + '\n')
    print('écrit', p, '· tuyautage tiré en', essai + 1, 'essais, chemin de', len(chemin), 'pièces')


if __name__ == '__main__':
    main()
