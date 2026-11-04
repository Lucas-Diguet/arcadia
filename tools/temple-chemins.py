#!/usr/bin/env python3
# tools/temple-chemins.py — dessine les grandes salles des chemins du Temple des Éléments (à trois) :
# trois salles par élément, en grottes qui ne vont pas droit (salles reliées par des galeries qui bifurquent,
# boucles, culs-de-sac avec des objets), et des passages fermés qui demandent un casse-tête.
#   python3 tools/temple-chemins.py [graine]  → testodyssee/js/donjons/temple-chemins.js
# Le plan obtenu est du texte ordinaire : on peut le retoucher à la main ensuite (relancer l'outil l'écrase).
#
# Lettres (celles du Temple, testodyssee/js/donjons/temple.js) :
#   # roche   . sol   S arrivée   N sortie   K clé
#   Feu   : L lave, = pont sur la lave, m rocher fissuré (Éclate-Roc), B rocher (Force), * et ^ boutons, + et - leurs barrières
#   Eau   : ~ eau, | cascade (Cascade, pour monter à l'étage), B, * ^, + -
#   (un rocher posé sur * ouvre les barrières +, sur ^ les barrières -)
#   Plante: Y arbre, u broussaille, C petit arbre (Coupe), " herbe haute, h herbe sombre, f fleurs, w liane
#   I J O P V : objets à ramasser (culs-de-sac)
import random, sys, os, heapq
from collections import deque

W, H = 60, 44
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), 'testodyssee/js/donjons/temple-chemins.js')
OBJETS = 'IJOPV'
MURS = set('#LYu%&')

def voisins(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))

class Salle:
    def __init__(self, el, n, seed):
        self.el, self.n, self.r = el, n, random.Random(seed)
        self.g = [['#'] * W for _ in range(H)]
        self.fixe = set()        # cases à ne pas recouvrir de décor (casse-têtes, chemins forcés)
    def at(self, x, y): return self.g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    def set(self, x, y, c):
        if 1 <= x < W - 1 and 1 <= y < H - 1: self.g[y][x] = c

    # ---------- cavités et galeries ----------
    def chambres(self):
        r, cs = self.r, []
        cols, rows = 4, 3
        for j in range(rows):
            for i in range(cols):
                if r.random() < 0.12 and len(cs) > 3: continue
                cx = int((i + 0.5) * W / cols + r.uniform(-3, 3)); cy = int((j + 0.5) * (H - 6) / rows + 3 + r.uniform(-2, 2))
                rx, ry = r.randint(4, 6), r.randint(3, 5)
                cs.append([cx, cy, rx, ry])
        self.cs = cs
        for cx, cy, rx, ry in cs:
            for y in range(cy - ry - 1, cy + ry + 2):
                for x in range(cx - rx - 1, cx + rx + 2):
                    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                    if d <= 1 + r.uniform(-0.25, 0.15): self.set(x, y, '.')
    def graphe(self):
        n = len(self.cs); d = lambda a, b: abs(self.cs[a][0] - self.cs[b][0]) + abs(self.cs[a][1] - self.cs[b][1])
        # arbre couvrant (Prim), puis quelques boucles entre voisines proches
        dedans, aretes = {0}, []
        while len(dedans) < n:
            a, b = min(((a, b) for a in dedans for b in range(n) if b not in dedans), key=lambda e: d(*e))
            aretes.append((a, b)); dedans.add(b)
        self.arbre = list(aretes)
        self.aretes = aretes
    def galerie(self, a, b, large=2):
        (x0, y0), (x1, y1) = self.cs[a][:2], self.cs[b][:2]
        r, pts = self.r, []
        # deux coudes au hasard : la galerie serpente
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

    # ---------- chemins entre l'arrivée et la sortie ----------
    def adj(self):
        A = {i: set() for i in range(len(self.cs))}
        for a, b in self.aretes: A[a].add(b); A[b].add(a)
        return A
    def chemin(self, a, b, A):
        prev, f = {a: None}, deque([a])
        while f:
            u = f.popleft()
            for v in A[u]:
                if v not in prev: prev[v] = u; f.append(v)
        p, u = [], b
        while u is not None: p.append(u); u = prev[u]
        return p[::-1]

    def bfs(self, depart, bloque=frozenset()):
        vus, f = {depart}, deque([depart])
        while f:
            x, y = f.popleft()
            for tx, ty in voisins(x, y):
                c = self.at(tx, ty)
                if (tx, ty) in vus or c in MURS or (tx, ty) in bloque: continue
                if (c == '|' or self.at(x, y) == '|') and tx != x: continue
                vus.add((tx, ty)); f.append((tx, ty))
        return vus

    def construire(self):
        r = self.r
        self.chambres(); self.graphe()
        A = self.adj()
        # arrivée : la cavité la plus basse ; sortie : la plus lointaine (de préférence en haut)
        self.dep = max(range(len(self.cs)), key=lambda i: self.cs[i][1])
        dist = {i: len(self.chemin(self.dep, i, A)) for i in A}
        self.fin = max((i for i in A if i != self.dep), key=lambda i: dist[i] * 3 - self.cs[i][1])
        self.principal = self.chemin(self.dep, self.fin, A)
        # portes du chemin principal (arêtes de l'arbre : on ne peut pas les contourner)
        bords = list(zip(self.principal, self.principal[1:]))
        k = min(3, len(bords) - 1)
        self.portes = r.sample(bords[1:], k) if k > 0 else []
        # boucles seulement d'un même côté des portes
        comp = self.composantes(A)
        proches = sorted(((a, b) for a in A for b in A if a < b and b not in A[a] and comp[a] == comp[b]),
                         key=lambda e: abs(self.cs[e[0]][0] - self.cs[e[1]][0]) + abs(self.cs[e[0]][1] - self.cs[e[1]][1]))
        for e in proches[:2]:
            if r.random() < 0.8: self.aretes.append(e)
        for a, b in self.aretes:
            if (a, b) in self.portes or (b, a) in self.portes: continue
            self.galerie(a, b, 2 if r.random() < 0.7 else 1)
        # entrée en bas, sortie en haut
        cx, cy = self.cs[self.dep][:2]
        for y in range(cy, H - 1): self.set(cx, y, '.'); self.set(cx + 1, y, '.')
        self.S = (cx, H - 1); self.g[H - 1][cx] = 'S'; self.fixe |= {(cx, H - 2), (cx, H - 3), (cx + 1, H - 2)}
        fx, fy = self.cs[self.fin][:2]
        for y in range(1, fy + 1): self.set(fx, y, '.')
        self.N = (fx, 1); self.g[1][fx] = 'N'; self.fixe |= {(fx, 2), (fx, 3)}
        return A

    def composantes(self, A):
        comp, c = {}, 0
        for s in A:
            if s in comp: continue
            f = [s]; comp[s] = c
            while f:
                u = f.pop()
                for v in A[u]:
                    if v not in comp and (u, v) not in self.portes and (v, u) not in self.portes: comp[v] = c; f.append(v)
            c += 1
        return comp

    # ---------- les portes : une galerie étroite et son obstacle ----------
    def poser_portes(self, types):
        self.gardes = []
        for (a, b), t in zip(self.portes, types):
            if t == 'cascade':
                self.cascade(a, b); continue
            pts = self.galerie(a, b, 1)
            # l'obstacle au milieu de la galerie, sur une case qui n'est pas dans une cavité
            milieu = [p for p in pts if not self.dans_chambre(*p)] or pts
            x, y = milieu[len(milieu) // 2]
            if t == 'bouton':
                k = sum(1 for q in self.gardes if q[0] == 'bouton')
                self.g[y][x] = '+-'[k]; self.gardes.append(('bouton', (x, y), a))
            else: self.g[y][x] = {'roc': 'm', 'coupe': 'C'}[t]; self.gardes.append((t, (x, y), a))
            self.fixe.add((x, y))
    def dans_chambre(self, x, y):
        return any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.2 for cx, cy, rx, ry in self.cs)
    def cascade(self, a, b):
        # la cavité du haut est « à l'étage » : on y monte par une cascade dans une galerie verticale
        if self.cs[a][1] < self.cs[b][1]: a, b = b, a
        (x0, y0), (x1, y1) = self.cs[a][:2], self.cs[b][:2]
        x = (x0 + x1) // 2
        for xx in range(min(x0, x), max(x0, x) + 1): self.set(xx, y0, '~'); self.set(xx, y0 + 1, '~')
        for xx in range(min(x1, x), max(x1, x) + 1): self.set(xx, y1, '~'); self.set(xx, y1 + 1, '~')
        for y in range(y1, y0 + 1): self.set(x, y, '~'); self.set(x + 1, y, '~')
        m = (y0 + y1) // 2
        for y in range(m - 1, m + 2):
            self.set(x, y, '|'); self.set(x + 1, y, '|'); self.fixe |= {(x, y), (x + 1, y)}
            self.set(x - 1, y, '#'); self.set(x + 2, y, '#')
        self.gardes.append(('cascade', (x, m), a))

    def bouton(self, cote, interdit, lettre='*'):
        """un rocher et son bouton dans une cavité du côté donné (accessible sans franchir la porte) : en ligne droite,
        trois cases d'écart, la case derrière le rocher libre pour pousser"""
        r = self.r
        for _ in range(400):
            i = r.choice(cote); cx, cy, rx, ry = self.cs[i]
            dx, dy = r.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
            bx, by = cx + r.randint(-1, 1) - dx, cy + r.randint(-1, 1) - dy
            cases = [(bx - dx, by - dy), (bx, by)] + [(bx + dx * k, by + dy * k) for k in range(1, 4)]
            if all(self.at(x, y) == '.' and (x, y) not in self.fixe and (x, y) not in interdit for x, y in cases) and \
               all(self.at(x + ox, y + oy) not in MURS for x, y in cases[1:4] for ox, oy in ((dy, dx), (-dy, -dx))):
                self.g[by][bx] = 'B'; ex, ey = cases[-1]; self.g[ey][ex] = lettre
                self.fixe |= set(cases)
                for x, y in cases[1:4]:
                    for ox, oy in ((dy, dx), (-dy, -dx)): self.fixe.add((x + ox, y + oy))
                return True
        return False

    # ---------- décor ----------
    def essai(self, cases, c, test):
        avant = [(x, y, self.g[y][x]) for x, y in cases]
        for x, y in cases: self.g[y][x] = c
        if not test():
            for x, y, v in avant: self.g[y][x] = v
            return False
        return True
    def blob(self, cx, cy, rx, ry):
        return [(x, y) for y in range(cy - ry, cy + ry + 1) for x in range(cx - rx, cx + rx + 1)
                if ((x - cx) / max(rx, 1)) ** 2 + ((y - cy) / max(ry, 1)) ** 2 <= 1 + self.r.uniform(-0.3, 0.1)
                and self.at(x, y) == '.' and (x, y) not in self.fixe]

    def garder(self):
        """tout reste atteignable (obstacles franchis) depuis l'arrivée : sortie, objets, boutons"""
        v = self.bfs(self.S)
        return self.N in v and all(p in v for p in self.importants)

def taille_ok(s):
    return all(len(r) == W for r in s.g)

def generer(el, n, seed):
    for essai in range(200):
        s = Salle(el, n, seed * 1000 + essai)
        A = s.construire()
        types = {'f': ['bouton', 'roc', 'bouton'], 'e': ['cascade', 'bouton', 'cascade'], 'p': ['coupe', 'coupe', 'coupe']}[el][:len(s.portes)]
        if el == 'e' and not any(abs(s.cs[a][1] - s.cs[b][1]) >= 6 for a, b in s.portes): continue
        if el == 'e':
            # une cascade ne se pose que sur une porte qui monte vraiment
            types = ['cascade' if abs(s.cs[a][1] - s.cs[b][1]) >= 6 else 'bouton' for a, b in s.portes]
        s.poser_portes(types)
        comp = s.composantes(A)
        # boutons : chacun dans une cavité déjà accessible avant sa barrière
        ok, k = True, 0
        for t, p, a in s.gardes:
            if t != 'bouton': continue
            cote = [i for i in A if comp[i] == comp[a]]
            if not s.bouton(cote, frozenset(), '*^'[k]): ok = False
            k += 1
        if not ok: continue
        # casse-tête vérifié : obstacles fermés, la sortie n'est pas atteignable
        fermes = {p for _, p, _ in s.gardes}
        bloque = set()
        for t, (x, y), _ in s.gardes:
            bloque.add((x, y))
            if t == 'cascade': bloque |= {(x, y - 1), (x + 1, y - 1), (x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)}
        if s.N in s.bfs(s.S, bloque): continue
        # objets dans les culs-de-sac (cavités à une seule galerie, hors arrivée et sortie)
        A2 = {i: set() for i in A}
        for a, b in s.aretes + s.portes: A2[a].add(b); A2[b].add(a)
        culs = [i for i in A2 if len(A2[i]) == 1 and i not in (s.dep, s.fin)]
        s.r.shuffle(culs)
        s.importants = [p for t, p, _ in s.gardes if t != 'cascade'] + [(x, y) for y in range(H) for x in range(W) if s.g[y][x] in '*^B']
        lettres = list(OBJETS); s.r.shuffle(lettres)
        cle = None
        for i, c in enumerate(culs[:5]):
            x, y = s.cs[c][:2]
            if s.at(x, y) != '.': continue
            if n == 3 and cle is None: s.g[y][x] = 'K'; cle = (x, y)
            else: s.g[y][x] = lettres.pop()
            s.fixe.add((x, y)); s.importants.append((x, y))
        for _ in range(12):
            if not lettres or len([1 for r_ in s.g for c_ in r_ if c_ in OBJETS]) >= 5: break
            bout = alcove(s)
            if bout: x, y = bout; s.g[y][x] = lettres.pop(); s.fixe.add(bout); s.importants.append(bout)
        if n == 3 and cle is None:
            bout = alcove(s, 10)
            if bout: x, y = bout; s.g[y][x] = 'K'; cle = bout; s.fixe.add(bout); s.importants.append(bout)
        if n == 3 and cle is None:
            x, y = s.cs[s.fin][:2]; x += 2
            if s.at(x, y) != '.': continue
            s.g[y][x] = 'K'; s.fixe.add((x, y)); s.importants.append((x, y))
        if not s.garder(): continue
        decorer(s)
        if not s.garder() or not taille_ok(s): continue
        return s
    raise SystemExit(f'pas de salle pour {el}{n}')

def alcove(s, mini=5):
    """un cul-de-sac creusé dans la roche depuis une cavité : un tunnel qui tourne, et rien d'autre au bout"""
    r = s.r
    bords = [(x, y) for y in range(3, H - 3) for x in range(3, W - 3) if s.g[y][x] == '.' and (x, y) not in s.fixe and any(s.at(a, b) == '#' for a, b in voisins(x, y))]
    for _ in range(60):
        x, y = r.choice(bords)
        dx, dy = r.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        if s.at(x + dx, y + dy) != '#': continue
        pts, cx, cy = [], x, y
        for k in range(r.randint(mini, mini + 8)):
            if r.random() < 0.3: dx, dy = r.choice([(dy, dx), (-dy, -dx)])
            nx, ny = cx + dx, cy + dy
            # on ne creuse que de la roche pleine, sans toucher une autre galerie
            if not (2 <= nx < W - 2 and 3 <= ny < H - 3): break
            if any(s.at(a, b) != '#' and (a, b) != (cx, cy) and (a, b) not in pts for a, b in voisins(nx, ny)): break
            if s.at(nx, ny) != '#': break
            pts.append((nx, ny)); cx, cy = nx, ny
        if len(pts) >= mini:
            for a, b in pts: s.g[b][a] = '.'
            s.fixe |= set(pts)
            return pts[-1]
    return None

def decorer(s):
    r, el = s.r, s.el
    sols = lambda: [(x, y) for y in range(2, H - 2) for x in range(1, W - 1) if s.g[y][x] == '.' and (x, y) not in s.fixe]
    if el == 'f':
        # des lacs de lave qui remplissent des cavités, traversés par un pont de bois
        for cx, cy, rx, ry in r.sample(s.cs, min(4, len(s.cs))):
            if (cx, cy) in (s.cs[s.dep][:2], s.cs[s.fin][:2]) or rx < 4: continue
            lac = s.blob(cx, cy, rx - 1, ry - 1)
            horiz = r.random() < 0.5
            pont = [(x, y) for x, y in lac if (y in (cy, cy + 1) if horiz else x in (cx, cx + 1))]
            avant = {p: s.g[p[1]][p[0]] for p in lac}
            for x, y in lac: s.g[y][x] = 'L'
            for x, y in pont: s.g[y][x] = '='
            if not s.garder():
                for p_, v in avant.items(): s.g[p_[1]][p_[0]] = v
        # mares de lave dans les cavités
        for cx, cy, rx, ry in s.cs:
            for _ in range(r.randint(1, 3)):
                s.essai(s.blob(cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1), r.randint(1, 3), r.randint(1, 2)), 'L', s.garder)
        for _ in range(6):
            x = r.randint(4, W - 5)
            col = [(x, y) for y in range(2, H - 2) if s.g[y][x] == '.' and (x, y) not in s.fixe]
            if len(col) < 6: continue
            y0 = r.choice(col)[1]
            coulee = [(x + dx, y) for y in range(y0, min(H - 3, y0 + r.randint(5, 9))) for dx in (0, 1) if s.at(x + dx, y) == '.' and (x + dx, y) not in s.fixe]
            avant = {p: s.g[p[1]][p[0]] for p in coulee}
            for p in coulee: s.g[p[1]][p[0]] = 'L'
            # un pont là où la coulée coupe une galerie horizontale
            for (px, py) in coulee:
                if s.at(px - 1, py) not in MURS and s.at(px + 1, py) not in MURS and s.at(px - 1, py) != 'L' and s.at(px + 1, py) != 'L': s.g[py][px] = '='
            for (px, py) in coulee:
                if s.g[py][px] == 'L' and (s.at(px - 1, py) == '=' or s.at(px + 1, py) == '='): s.g[py][px] = '='
            if not s.garder():
                for p, v in avant.items(): s.g[p[1]][p[0]] = v
        for x, y in r.sample(sols(), 30):
            if sum(s.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: s.essai([(x, y)], r.choice('%&m'), s.garder)
    elif el == 'e':
        # des lacs dans les cavités (on garde un bord de terre par endroits), l'eau dans les galeries basses
        for cx, cy, rx, ry in s.cs:
            if (cx, cy) == s.cs[s.dep][:2]: continue
            s.essai(s.blob(cx, cy, max(1, rx - r.randint(0, 2)), max(1, ry - r.randint(0, 1))), '~', s.garder)
        for x, y in r.sample(sols(), 40):
            if sum(s.at(a, b) == '~' for a, b in voisins(x, y)) >= 2: s.essai([(x, y)], '~', s.garder)
        for x, y in r.sample(sols(), 20):
            if sum(s.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: s.essai([(x, y)], r.choice('%&'), s.garder)
    else:
        # la jungle : des arbres partout, des broussailles, puis les herbes et les fleurs sur ce qui reste
        cases = sols(); r.shuffle(cases)
        for x, y in cases[:int(len(cases) * 0.45)]:
            s.essai([(x, y)], 'Y' if r.random() < 0.75 else 'u', s.garder)
        for x, y in sols():
            q = r.random()
            if q < 0.45: s.g[y][x] = '"'
            elif q < 0.75: s.g[y][x] = 'h'
            elif q < 0.8: s.g[y][x] = 'f'
        # des petits arbres à couper qui ferment des raccourcis, et des lianes qui pendent sous les arbres
        for x, y in r.sample(sols() or [(0, 0)], min(12, len(sols()))):
            s.essai([(x, y)], 'C', s.garder)
        for y in range(2, H - 1):
            for x in range(1, W - 1):
                if s.g[y][x] in '."h' and s.at(x, y - 1) in 'Y#' and r.random() < 0.18 and (x, y) not in s.fixe: s.g[y][x] = 'w'

def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    out = ['// Généré par tools/temple-chemins.py (graine %d) : les grandes salles des chemins du Temple, à trois.' % seed,
           '// Un plan par salle (60 × 44 cases) ; on peut le retoucher à la main (relancer l\'outil l\'écrase).', '']
    noms = {}
    for el in 'fep':
        for n in (1, 2, 3):
            s = generer(el, n, seed * 10 + 'fep'.index(el) * 3 + n)
            k = f'{el.upper()}{n}'
            out.append(f'export const {k} = [')
            out += ["  '" + ''.join(r).replace("'", "\\'") + "'," for r in s.g]
            out.append('];')
            print(k, 'portes', [t for t, _, _ in s.gardes], 'objets', sum(''.join(r).count(c) for r in s.g for c in OBJETS + 'K'))
    open(SORTIE, 'w').write('\n'.join(out) + '\n')
    print('écrit', SORTIE)

main()
