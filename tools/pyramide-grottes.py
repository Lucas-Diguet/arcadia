#!/usr/bin/env python3
# tools/pyramide-grottes.py — dessine les trois grandes grottes de la Pyramide de l'Ascension (salles 5 à 7, une par
# joueur) : des cavités reliées par des galeries qui tournent, des boucles, des culs-de-sac avec des objets au fond,
# des rebords qu'on ne descend que dans un sens (des raccourcis pour revenir en bas), deux dresseurs.
#   python3 tools/pyramide-grottes.py [graine]  → testodyssee/js/donjons/pyramide-grottes.js
# Relancer l'outil écrase le fichier.
#
# Lettres (celles de la Pyramide, testodyssee/js/donjons/pyramide.js) :
#   # roche   . sol   S arrivée   N sortie   1 2 les deux dresseurs   v rebord (on ne le passe qu'en descendant)
#   % rocher   & stalagmite   | colonne   l stèle
#   h r f u e m : objets à ramasser (Hyper Potion, Rappel, Total Soin, Super Potions, Huile, Potion Max)
import random, sys, os
from collections import deque

W, H = 56, 40
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), 'testodyssee/js/donjons/pyramide-grottes.js')
OBJETS = 'hrfuem'
MURS = set('#%&|l12')

def voisins(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))

class Grotte:
    def __init__(self, n, seed):
        self.n, self.r = n, random.Random(seed)
        self.g = [['#'] * W for _ in range(H)]
        self.fixe = set()
    def at(self, x, y): return self.g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    def set(self, x, y, c):
        if 1 <= x < W - 1 and 1 <= y < H - 1: self.g[y][x] = c

    def chambres(self):
        r, cs = self.r, []
        for j in range(3):
            for i in range(4):
                if r.random() < 0.12 and len(cs) > 3: continue
                cx = int((i + 0.5) * W / 4 + r.uniform(-3, 3)); cy = int((j + 0.5) * (H - 6) / 3 + 3 + r.uniform(-2, 2))
                cs.append([cx, cy, r.randint(3, 5), r.randint(3, 4)])
        self.cs = cs
        for cx, cy, rx, ry in cs:
            for y in range(cy - ry - 1, cy + ry + 2):
                for x in range(cx - rx - 1, cx + rx + 2):
                    if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + r.uniform(-0.25, 0.15): self.set(x, y, '.')

    def graphe(self):
        n = len(self.cs); d = lambda a, b: abs(self.cs[a][0] - self.cs[b][0]) + abs(self.cs[a][1] - self.cs[b][1])
        dedans, aretes = {0}, []
        while len(dedans) < n:
            a, b = min(((a, b) for a in dedans for b in range(n) if b not in dedans), key=lambda e: d(*e))
            aretes.append((a, b)); dedans.add(b)
        self.arbre = list(aretes)
        A = {i: set() for i in range(n)}
        for a, b in aretes: A[a].add(b); A[b].add(a)
        # des boucles entre cavités proches qui ne sont pas encore reliées
        proches = sorted(((a, b) for a in A for b in A if a < b and b not in A[a]), key=lambda e: d(*e))
        self.boucles = [e for e in proches[:4] if self.r.random() < 0.75]
        return A

    def galerie(self, a, b, large):
        (x0, y0), (x1, y1) = self.cs[a][:2], self.cs[b][:2]
        r, pts = self.r, []
        mx, my = (x0 + x1) // 2 + r.randint(-4, 4), (y0 + y1) // 2 + r.randint(-3, 3)
        for (ax, ay), (bx, by) in (((x0, y0), (mx, my)), ((mx, my), (x1, y1))):
            horiz = r.random() < 0.5
            x, y = ax, ay
            while (x, y) != (bx, by):
                if horiz and x != bx or y == by: x += 1 if bx > x else -1
                else: y += 1 if by > y else -1
                pts.append((x, y))
        for x, y in pts:
            for dx in range(large):
                for dy in range(large): self.set(x + dx, y + dy, '.')
        return pts

    def chemin(self, a, b, A):
        prev, f = {a: None}, deque([a])
        while f:
            u = f.popleft()
            for v in A[u]:
                if v not in prev: prev[v] = u; f.append(v)
        p, u = [], b
        while u is not None: p.append(u); u = prev[u]
        return p[::-1]

    def bfs(self, depart):
        """cases atteignables ; un rebord v ne se passe qu'en descendant, et on atterrit sur la case d'après"""
        vus, f = {depart}, deque([depart])
        while f:
            x, y = f.popleft()
            for tx, ty in voisins(x, y):
                c = self.at(tx, ty)
                if c in MURS: continue
                if c == 'v':
                    if ty != y + 1: continue
                    ty += 1
                    if self.at(tx, ty) in MURS or self.at(tx, ty) == 'v': continue
                if (tx, ty) in vus: continue
                vus.add((tx, ty)); f.append((tx, ty))
        return vus

    def rebord(self, a, b):
        """sur une boucle : une rangée de rebords en travers de la galerie, qu'on saute vers le bas"""
        haut, bas = (a, b) if self.cs[a][1] < self.cs[b][1] else (b, a)
        pts = self.galerie(haut, bas, 1)
        vert = [(x, y) for (x, y), (x2, y2) in zip(pts, pts[1:]) if x2 == x and y2 == y + 1 and not self.dans_chambre(x, y)]
        if len(vert) < 3: return
        x, y = vert[len(vert) // 2]
        if self.at(x - 1, y) == '#' and self.at(x + 1, y) == '#' and self.at(x, y - 1) == '.' and self.at(x, y + 1) == '.':
            # toute la galerie reste libre : le raccourci doit vraiment relier les deux cavités
            self.g[y][x] = 'v'; self.fixe |= set(pts) | {(px + 1, py) for px, py in pts}; self.rebords.append((x, y))

    def dans_chambre(self, x, y):
        return any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.3 for cx, cy, rx, ry in self.cs)

    def construire(self):
        r = self.r
        self.rebords = []
        self.chambres(); A = self.graphe()
        self.dep = max(range(len(self.cs)), key=lambda i: self.cs[i][1])
        dist = {i: len(self.chemin(self.dep, i, A)) for i in A}
        self.fin = max((i for i in A if i != self.dep), key=lambda i: dist[i] * 3 - self.cs[i][1])
        self.principal = self.chemin(self.dep, self.fin, A)
        for a, b in self.arbre: self.galerie(a, b, 2 if r.random() < 0.6 else 1)
        for a, b in self.boucles:
            if r.random() < 0.6: self.rebord(a, b)
            else: self.galerie(a, b, 1)
        cx, cy = self.cs[self.dep][:2]
        for y in range(cy, H - 1): self.set(cx, y, '.'); self.set(cx + 1, y, '.')
        self.S = (cx, H - 1); self.g[H - 1][cx] = 'S'; self.fixe |= {(cx, H - 2), (cx, H - 3), (cx + 1, H - 2)}
        fx, fy = self.cs[self.fin][:2]
        for y in range(1, fy + 1): self.set(fx, y, '.')
        self.N = (fx, 1); self.g[1][fx] = 'N'; self.fixe |= {(fx, 2), (fx, 3)}
        self.A = A

    def tout_atteint(self):
        v = self.bfs(self.S)
        return self.N in v and all(p in v for p in self.importants)

    def essai(self, cases, c):
        avant = [(x, y, self.g[y][x]) for x, y in cases]
        for x, y in cases: self.g[y][x] = c
        if not self.tout_atteint():
            for x, y, v in avant: self.g[y][x] = v
            return False
        return True

def alcove(s, mini=5):
    """un cul-de-sac creusé dans la roche depuis une cavité : un tunnel qui tourne, rien d'autre au bout"""
    r = s.r
    bords = [(x, y) for y in range(3, H - 3) for x in range(3, W - 3) if s.g[y][x] == '.' and (x, y) not in s.fixe and any(s.at(a, b) == '#' for a, b in voisins(x, y))]
    for _ in range(80):
        x, y = r.choice(bords)
        dx, dy = r.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        if s.at(x + dx, y + dy) != '#': continue
        pts, cx, cy = [], x, y
        for _k in range(r.randint(mini, mini + 8)):
            if r.random() < 0.3: dx, dy = r.choice([(dy, dx), (-dy, -dx)])
            nx, ny = cx + dx, cy + dy
            if not (2 <= nx < W - 2 and 3 <= ny < H - 3): break
            if any(s.at(a, b) != '#' and (a, b) != (cx, cy) and (a, b) not in pts for a, b in voisins(nx, ny)): break
            if s.at(nx, ny) != '#': break
            pts.append((nx, ny)); cx, cy = nx, ny
        if len(pts) >= mini:
            for a, b in pts: s.g[b][a] = '.'
            s.fixe |= set(pts)
            return pts[-1]
    return None

def generer(n, seed):
    for essai in range(300):
        s = Grotte(n, seed * 1000 + essai)
        s.construire()
        # un cul-de-sac = une cavité à une seule galerie (hors arrivée et sortie)
        A2 = {i: set() for i in s.A}
        for a, b in s.arbre: A2[a].add(b); A2[b].add(a)
        culs = [i for i in A2 if len(A2[i]) == 1 and i not in (s.dep, s.fin)]
        if len(culs) < 2: continue
        # le haut d'un rebord s'atteint depuis l'arrivée (sinon le raccourci ne sert à rien)
        s.importants = [(x, y - 1) for x, y in s.rebords]
        # les dresseurs : l'un au milieu du chemin principal, l'autre dans la dernière cavité, à côté du passage
        milieu = s.principal[len(s.principal) // 2] if len(s.principal) > 2 else None
        ok = True
        for lettre, c in (('1', milieu), ('2', s.fin)):
            if c is None or c == s.dep: ok = False; break
            cx, cy, rx, ry = s.cs[c]
            places = [(cx + dx, cy + dy) for dx in range(-rx + 1, rx) for dy in range(-ry + 1, ry) if s.at(cx + dx, cy + dy) == '.' and (cx + dx, cy + dy) not in s.fixe]
            s.r.shuffle(places)
            for x, y in places:
                if s.essai([(x, y)], lettre): s.fixe |= {(x, y), (x, y + 1)}; break
            else: ok = False
        if not ok: continue
        # objets : au fond des culs-de-sac, puis dans des tunnels creusés dans la roche
        lettres = list(OBJETS) + list(s.r.sample(OBJETS, 2)); s.r.shuffle(lettres)
        for c in culs:
            x, y = s.cs[c][:2]
            if lettres and s.at(x, y) == '.': s.g[y][x] = lettres.pop(); s.fixe.add((x, y)); s.importants.append((x, y))
        for _ in range(20):
            if not lettres: break
            bout = alcove(s)
            if bout: x, y = bout; s.g[y][x] = lettres.pop(); s.importants.append(bout)
        if lettres or not s.tout_atteint(): continue
        decorer(s)
        if not s.tout_atteint(): continue
        return s
    raise SystemExit(f'pas de grotte {n}')

def decorer(s):
    r, n = s.r, s.n
    sols = lambda: [(x, y) for y in range(2, H - 2) for x in range(1, W - 1) if s.g[y][x] == '.' and (x, y) not in s.fixe]
    # contre les parois : rochers et stalagmites ; dans les grandes cavités : des amas
    for x, y in r.sample(sols(), min(70, len(sols()))):
        if sum(s.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: s.essai([(x, y)], r.choice('%&&' if n == 1 else '%%&'))
    for cx, cy, rx, ry in s.cs:
        for _ in range(r.randint(1, 2)):
            x, y = cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1)
            s.essai([(a, b) for a, b in ((x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)) if s.at(a, b) == '.' and (a, b) not in s.fixe], '%')
    # les tombeaux : des colonnes par paires et des stèles au milieu des cavités
    if n == 2:
        for cx, cy, rx, ry in s.cs:
            if rx < 4: continue
            for dx in (-rx + 1, rx - 1):
                for dy in (-1, 1):
                    if s.at(cx + dx, cy + dy) == '.' and (cx + dx, cy + dy) not in s.fixe: s.essai([(cx + dx, cy + dy)], '|')
            if s.at(cx, cy) == '.' and (cx, cy) not in s.fixe: s.essai([(cx, cy)], 'l')

def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    out = ['// Généré par tools/pyramide-grottes.py (graine %d) : les trois grottes de la Pyramide (salles 5 à 7).' % seed,
           '// 1 et 2 : les deux dresseurs de la grotte (remplacés par les lettres de chaque chemin). Relancer l\'outil écrase le fichier.', '',
           'export const GROTTES = [']
    for n in range(3):
        s = generer(n, seed * 10 + n)
        out.append('  [')
        out += ["    '" + ''.join(r) + "'," for r in s.g]
        out.append('  ],')
        txt = ''.join(''.join(r) for r in s.g)
        print('grotte', n, 'objets', sum(txt.count(c) for c in OBJETS), 'rebords', txt.count('v'))
    out.append('];')
    open(SORTIE, 'w').write('\n'.join(out) + '\n')
    print('écrit', SORTIE)

main()
