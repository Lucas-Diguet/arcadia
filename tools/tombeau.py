#!/usr/bin/env python3
# tools/tombeau.py — dessine les profondeurs du Tombeau du Roi Sans Nom (TestOdyssée), du -4 au -9 :
# de longues salles, des cavités reliées par des galeries qui tournent, des boucles, des culs-de-sac avec un objet
# au fond. Du -4 au -7, les pilleurs de Sable-Noir ; au -6 et au -7, leur lutte contre les morts-vivants ; au -8 et au
# -9, l'hécatombe (morts-vivants, corps, mourants). (L'outil sait encore creuser des gouffres à chemin invisible.)
#   python3 tools/tombeau.py [graine]  → testodyssee/js/donjons/tombeau-salles.js
# Relancer l'outil écrase le fichier.
#
# Lettres (celles du tombeau, testodyssee/js/donjons/tombeau.js) :
#   # roche   . sol   S arrivée   D retour à la salle d'avant (sous S)   N passage vers la salle suivante
#   _ gouffre (on y tombe)   : chemin invisible au-dessus du gouffre
#   x piège à pointes (visible)   ? piège caché (visible avec les lunettes)
#   % gravats   | colonne   l stèle   b brasero
#   t pilleur (les directions sont données à part, dans l'ordre de lecture du plan)   f pilleurs qui s'enfuient
#   L les Lunettes de Vérité (sur leur socle)   h r u e m z : objets à ramasser
#   q mort-vivant   j pilleur qui se bat contre le mort-vivant o (à sa droite)   g corps   a mourant   ¤ grille fermée à clé
import random, sys, os, json, heapq
from collections import deque

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), 'testodyssee/js/donjons/tombeau-salles.js')
OBJETS = 'hruemz'
MURS = set('#%|lbtLqjoga')

B = dict(abimes=0, visibles=0, caches=0, pilleurs=0, rangs=4, cols=5)
SALLES = {
    'p4': dict(B, W=72, H=52, pilleurs=5),
    'p5': dict(B, W=74, H=54, pilleurs=6, visibles=10),
    'p6': dict(B, W=72, H=52, pilleurs=5, luttes=3, morts=2, corps=4, mourants=2),
    'p7': dict(B, W=72, H=54, pilleurs=4, luttes=3, morts=2, corps=4, mourants=2, verrou=True),
    'm8': dict(B, W=72, H=52, morts=7, corps=12, mourants=4),
    'm9': dict(B, W=74, H=54, morts=8, corps=14, mourants=4),
}

def voisins(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))

class Salle:
    def __init__(self, nom, seed):
        self.nom, self.c = nom, SALLES[nom]
        self.W, self.H = self.c['W'], self.c['H']
        self.r = random.Random(seed)
        self.g = [['#'] * self.W for _ in range(self.H)]
        self.fixe, self.importants = set(), []
    def at(self, x, y): return self.g[y][x] if 0 <= x < self.W and 0 <= y < self.H else '#'
    def put(self, x, y, c):
        if 1 <= x < self.W - 1 and 1 <= y < self.H - 2: self.g[y][x] = c

    def chambres(self):
        r, cs, W, H = self.r, [], self.W, self.H
        nr, nc = self.c.get('rangs', 3), self.c.get('cols', 4)
        for j in range(nr):
            for k in range(nc):
                if r.random() < 0.1 and len(cs) > 5: continue
                cx = int((k + 0.5) * W / nc + r.uniform(-2, 2)); cy = int((j + 0.5) * (H - 8) / nr + 3 + r.uniform(-2, 2))
                cs.append([cx, cy, r.randint(4, 5), r.randint(3, 4)])
        self.cs = cs
        n = len(cs); d = lambda a, b: abs(cs[a][0] - cs[b][0]) + abs(cs[a][1] - cs[b][1])
        dedans, self.arbre = {0}, []
        while len(dedans) < n:
            a, b = min(((a, b) for a in dedans for b in range(n) if b not in dedans), key=lambda e: d(*e))
            self.arbre.append((a, b)); dedans.add(b)
        A = {q: set() for q in range(n)}
        for a, b in self.arbre: A[a].add(b); A[b].add(a)
        self.A = A
        proches = sorted(((a, b) for a in A for b in A if a < b and b not in A[a]), key=lambda e: d(*e))
        self.boucles = [e for e in proches[:4] if r.random() < 0.7]

    def ellipse(self, q, marge=0):
        cx, cy, rx, ry = self.cs[q]
        return {(x, y) for y in range(cy - ry - 1, cy + ry + 2) for x in range(cx - rx - 1, cx + rx + 2)
                if ((x - cx) / (rx + marge)) ** 2 + ((y - cy) / (ry + marge)) ** 2 <= 1 and 1 <= x < self.W - 1 and 2 <= y < self.H - 3}

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
                for dy in range(large): self.put(x + dx, y + dy, '.')
        return pts

    def chemin(self, a, b):
        prev, f = {a: None}, deque([a])
        while f:
            u = f.popleft()
            for v in self.A[u]:
                if v not in prev: prev[v] = u; f.append(v)
        p, u = [], b
        while u is not None: p.append(u); u = prev[u]
        return p[::-1]

    def bfs(self, depart, sans_chemin=False):
        """cases atteignables à pied ; on ne marche pas dans le gouffre (sans_chemin : pas non plus sur le chemin invisible)"""
        bloque = MURS | {'_'} | ({':'} if sans_chemin else set())
        vus, f = {depart}, deque([depart])
        while f:
            x, y = f.popleft()
            for p in voisins(x, y):
                if p in vus or self.at(*p) in bloque: continue
                vus.add(p); f.append(p)
        return vus

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

    def sentier(self, a, b, permis):
        """chemin qui serpente de a à b dans les cases permises (coûts tirés au hasard : il ne va pas droit)"""
        cout = {p: self.r.randint(1, 9) for p in permis}
        dist, prev, f = {a: 0}, {a: None}, [(0, a)]
        while f:
            d, u = heapq.heappop(f)
            if u == b: break
            if d > dist[u]: continue
            for v in voisins(*u):
                if v not in permis: continue
                nd = d + cout[v]
                if nd < dist.get(v, 1e9): dist[v] = nd; prev[v] = u; heapq.heappush(f, (nd, v))
        if b not in prev: return None
        p, u = [], b
        while u is not None: p.append(u); u = prev[u]
        return p[::-1]

    def gouffre(self, q):
        """la cavité devient un gouffre ; un chemin invisible relie ses entrées en passant par deux détours"""
        dedans = self.ellipse(q, 2)
        # les entrées : cases du bord touchées par une galerie
        bords = [p for p in dedans if self.at(*p) == '.' and any(v not in dedans and self.at(*v) == '.' for v in voisins(*p))]
        if len(bords) < 2: return False
        grappes, vus = [], set()
        for p in bords:
            if p in vus: continue
            g, f = [], [p]; vus.add(p)
            while f:
                u = f.pop(); g.append(u)
                for v in voisins(*u):
                    if v in bords and v not in vus: vus.add(v); f.append(v)
            grappes.append(g)
        if len(grappes) < 2: return False
        for p in dedans:
            if self.at(*p) != '#': self.g[p[1]][p[0]] = '_'
            elif self.r.random() < 0.9: self.g[p[1]][p[0]] = '_'
        entrees = [self.r.choice(g) for g in grappes]
        for x, y in entrees: self.g[y][x] = '.'; self.fixe.add((x, y))
        permis = {p for p in dedans if p not in entrees}
        interieur = [p for p in permis if all(v in dedans for v in voisins(*p))]
        for b in entrees[1:]:
            pts = [entrees[0]] + self.r.sample(interieur, 2) + [b]
            for u, v in zip(pts, pts[1:]):
                s = self.sentier(u, v, permis | {u, v})
                if not s: return False
                for x, y in s:
                    if self.g[y][x] == '_': self.g[y][x] = ':'
        # une plateforme visible, isolée, et parfois un objet au bout d'une branche du chemin
        libres = [p for p in interieur if self.g[p[1]][p[0]] == '_' and all(self.at(*v) == '_' for v in voisins(*p))]
        if libres:
            ix, iy = self.r.choice(libres)
            ile = [(ix, iy), (ix + 1, iy), (ix, iy + 1), (ix + 1, iy + 1)]
            if all(self.at(*p) == '_' for p in ile):
                for x, y in ile: self.g[y][x] = '.'
                self.iles = getattr(self, 'iles', []) + [(ix, iy)]
                if self.r.random() < 0.7:
                    depart = self.r.choice([p for p in dedans if self.g[p[1]][p[0]] == ':'] or [entrees[0]])
                    s = self.sentier(depart, (ix, iy), permis | {(ix, iy)})
                    if s:
                        for x, y in s:
                            if self.g[y][x] == '_': self.g[y][x] = ':'
                        self.ile_objet = getattr(self, 'ile_objet', []) + [(ix, iy)]
        self.fixe |= dedans
        return True

    def construire(self):
        r = self.r
        self.chambres()
        for a, b in self.arbre: self.galerie(a, b, r.choice((1, 2, 2)))
        for a, b in self.boucles: self.galerie(a, b, 1)
        for cx, cy, rx, ry in self.cs:
            for x, y in self.ellipse(self.cs.index([cx, cy, rx, ry])):
                if r.random() < 0.93: self.put(x, y, '.')
        self.dep = max(range(len(self.cs)), key=lambda i: self.cs[i][1])
        dist = {i: len(self.chemin(self.dep, i)) for i in self.A}
        self.fin = max((i for i in self.A if i != self.dep), key=lambda i: dist[i] * 3 - self.cs[i][1])
        self.principal = self.chemin(self.dep, self.fin)
        cx, cy = self.cs[self.dep][:2]
        for y in range(cy, self.H - 2): self.g[y][cx] = '.'; self.g[y][cx + 1] = '.'
        self.S = (cx, self.H - 2); self.g[self.H - 2][cx] = 'S'; self.g[self.H - 1][cx] = 'D'
        self.fixe |= {(cx, self.H - 3), (cx, self.H - 4), (cx + 1, self.H - 3)}
        fx, fy = self.cs[self.fin][:2]
        for y in range(1, fy + 1): self.g[y][fx] = '.'
        self.N = (fx, 1); self.g[1][fx] = 'N'; self.fixe |= {(fx, 2), (fx, 3)}

def alcove(s, mini=5):
    r = s.r
    bords = [(x, y) for y in range(3, s.H - 4) for x in range(3, s.W - 3) if s.g[y][x] == '.' and (x, y) not in s.fixe and any(s.at(a, b) == '#' for a, b in voisins(x, y))]
    for _ in range(80):
        x, y = r.choice(bords)
        dx, dy = r.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        if s.at(x + dx, y + dy) != '#': continue
        pts, cx, cy = [], x, y
        for _k in range(r.randint(mini, mini + 8)):
            if r.random() < 0.3: dx, dy = r.choice([(dy, dx), (-dy, -dx)])
            nx, ny = cx + dx, cy + dy
            if not (2 <= nx < s.W - 2 and 3 <= ny < s.H - 4): break
            if any(s.at(a, b) != '#' and (a, b) != (cx, cy) and (a, b) not in pts for a, b in voisins(nx, ny)): break
            if s.at(nx, ny) != '#' or (nx, ny) in s.fixe: break
            pts.append((nx, ny)); cx, cy = nx, ny
        if len(pts) >= mini:
            for a, b in pts: s.g[b][a] = '.'
            s.fixe |= set(pts)
            return pts[-1]
    return None

def generer(nom, seed):
    C = SALLES[nom]
    for essai in range(600):
        s = Salle(nom, seed * 1000 + essai)
        s.construire()
        # les gouffres : sur le chemin principal, ni à l'arrivée ni à la sortie, sans cavité voisine déjà en gouffre
        candidats = [q for q in s.principal[1:-1]]
        s.r.shuffle(candidats)
        faits, ok = [], True
        for q in candidats:
            if len(faits) >= C['abimes']: break
            if any(q in s.A[f] for f in faits): continue
            if s.gouffre(q): faits.append(q)
        if len(faits) < C['abimes']: continue
        # casse-tête vérifié : sans le chemin invisible, on n'atteint pas la sortie
        if C['abimes'] and s.N in s.bfs(s.S, sans_chemin=True): continue
        if not s.tout_atteint(): continue
        avant_gouffre = s.bfs(s.S, sans_chemin=True)
        # les lunettes : au fond d'un cul-de-sac atteignable avant le premier gouffre
        if C.get('lunettes'):
            culs = [q for q in s.A if len(s.A[q]) == 1 and q not in faits and q != s.dep and tuple(s.cs[q][:2]) in avant_gouffre]
            if not culs: continue
            x, y = s.cs[s.r.choice(culs)][:2]
            if s.at(x, y) != '.': continue
            s.g[y][x] = 'L'; s.fixe |= {(x, y), (x, y + 1)}; s.importants.append((x, y + 1))
        # objets : îles du gouffre reliées au chemin, culs-de-sac, tunnels
        lettres = list(OBJETS); s.r.shuffle(lettres)
        for x, y in getattr(s, 'ile_objet', []):
            if lettres: s.g[y][x] = lettres.pop()
        culs = [q for q in s.A if len(s.A[q]) == 1 and q not in faits and q not in (s.dep, s.fin)]
        for q in culs:
            x, y = s.cs[q][:2]
            if lettres and s.at(x, y) == '.' and (x, y) not in s.fixe: s.g[y][x] = lettres.pop(); s.fixe.add((x, y)); s.importants.append((x, y))
        for _ in range(20):
            if len(lettres) <= 1: break
            bout = alcove(s)
            if bout: x, y = bout; s.g[y][x] = lettres.pop(); s.importants.append(bout)
        if not s.tout_atteint(): continue
        # pilleurs : dans des cavités hors gouffre, chacun regarde vers une galerie
        dirs, places = [], []
        for q in s.r.sample(range(len(s.cs)), len(s.cs)):
            if len(places) >= C['pilleurs']: break
            if q in faits or q == s.dep: continue
            cx, cy, rx, ry = s.cs[q]
            for _ in range(12):
                x, y = cx + s.r.randint(-rx + 1, rx - 1), cy + s.r.randint(-ry + 1, ry - 1)
                if s.at(x, y) != '.' or (x, y) in s.fixe: continue
                vue = [(d, n) for d, (dx, dy) in (('down', (0, 1)), ('up', (0, -1)), ('left', (-1, 0)), ('right', (1, 0)))
                       for n in [sum(1 for k in range(1, 6) if all(s.at(x + dx * j, y + dy * j) == '.' for j in range(1, k + 1)))]]
                d, n = max(vue, key=lambda v: v[1])
                if n < 3: continue
                if s.essai([(x, y)], 't'):
                    places.append((x, y)); s.fixe.add((x, y))
                    dx, dy = {'down': (0, 1), 'up': (0, -1), 'left': (-1, 0), 'right': (1, 0)}[d]
                    s.importants.append((x + dx, y + dy)); dirs.append(((y, x), d)); break
        if len(places) < C['pilleurs']: continue
        # les morts-vivants, les luttes, les corps et les mourants
        if not peupler(s, C): continue
        # la grille fermée à clé, sous la sortie
        if C.get('verrou'):
            fx = s.N[0]
            if s.at(fx, 2) != '.': continue
            s.g[2][fx] = '¤'
        # pilleurs qui s'enfuient : devant la sortie
        if C.get('fuyards'):
            fx, fy = s.N[0], 3
            while s.at(fx, fy + 1) == '.' and fy < 6: fy += 1
            if s.at(fx, fy) != '.': continue
            s.g[fy][fx] = 'f'; s.fixe.add((fx, fy))
            if not s.tout_atteint(): s.g[fy][fx] = '.'
        # pièges : les visibles dans les galeries (on les enjambe mal), les cachés partout
        sols = lambda: [(x, y) for y in range(3, s.H - 4) for x in range(1, s.W - 1) if s.g[y][x] == '.' and (x, y) not in s.fixe]
        couloirs = [p for p in sols() if sum(s.at(*v) in '.x?' for v in voisins(*p)) == 2]
        for x, y in s.r.sample(couloirs, min(C['visibles'], len(couloirs))): s.g[y][x] = 'x'
        for x, y in s.r.sample(sols(), min(C['caches'], len(sols()))): s.g[y][x] = '?'
        decorer(s)
        if not s.tout_atteint(): continue
        s.dirs = [d for _, d in sorted(dirs)]
        return s
    raise SystemExit(f'pas de salle {nom}')

def cases_libres(s):
    return [(x, y) for y in range(4, s.H - 5) for x in range(2, s.W - 2) if s.g[y][x] == '.' and (x, y) not in s.fixe]

def peupler(s, C):
    r = s.r
    # luttes : un pilleur et un mort-vivant face à face, dans une cavité
    for _ in range(C.get('luttes', 0)):
        for _k in range(60):
            q = r.randrange(len(s.cs))
            if q == s.dep: continue
            cx, cy, rx, ry = s.cs[q]
            x, y = cx + r.randint(-rx + 2, rx - 3), cy + r.randint(-ry + 1, ry - 1)
            if s.at(x, y) != '.' or s.at(x + 1, y) != '.' or (x, y) in s.fixe or (x + 1, y) in s.fixe: continue
            if s.essai([(x, y), (x + 1, y)], 'j'):
                s.g[y][x + 1] = 'o'; s.fixe |= {(x, y), (x + 1, y)}; s.importants += [(x - 1, y), (x + 2, y)]
                if not s.tout_atteint(): s.g[y][x] = s.g[y][x + 1] = '.'; continue
                break
        else: return False
    # morts-vivants : dans les cavités, loin de l'arrivée
    for _ in range(C.get('morts', 0)):
        for _k in range(60):
            q = r.randrange(len(s.cs))
            if q == s.dep: continue
            cx, cy, rx, ry = s.cs[q]
            x, y = cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1)
            if s.at(x, y) != '.' or (x, y) in s.fixe: continue
            if s.essai([(x, y)], 'q'): s.fixe.add((x, y)); break
        else: return False
    # corps et mourants : un peu partout, souvent près des galeries
    for lettre, n in (('a', C.get('mourants', 0)), ('g', C.get('corps', 0))):
        for _ in range(n):
            for _k in range(80):
                x, y = r.choice(cases_libres(s))
                if s.essai([(x, y)], lettre):
                    s.fixe.add((x, y))
                    if lettre == 'a': s.importants.append(next((v for v in voisins(x, y) if s.at(*v) == '.'), (x, y)))
                    break
            else: return False
    return s.tout_atteint()

def decorer(s):
    r = s.r
    sols = lambda: [(x, y) for y in range(3, s.H - 4) for x in range(1, s.W - 1) if s.g[y][x] == '.' and (x, y) not in s.fixe]
    for x, y in r.sample(sols(), min(70, len(sols()))):
        if sum(s.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: s.essai([(x, y)], r.choice('%%l'))
    # des colonnes par paires et des braseros dans les grandes cavités
    for q, (cx, cy, rx, ry) in enumerate(s.cs):
        if rx < 5 or s.at(cx, cy) == '_': continue
        for dx in (-rx + 2, rx - 2):
            for dy in (-ry + 2, ry - 2):
                if s.at(cx + dx, cy + dy) == '.' and (cx + dx, cy + dy) not in s.fixe: s.essai([(cx + dx, cy + dy)], '|')
        if s.at(cx, cy - ry + 1) == '.' and (cx, cy - ry + 1) not in s.fixe: s.essai([(cx, cy - ry + 1)], 'b')

def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 11
    out = ['// Généré par tools/tombeau.py (graine %d) : les grandes salles du Tombeau du Roi Sans Nom.' % seed,
           '// t : pilleurs (dirs : leur regard, dans l\'ordre de lecture du plan). Relancer l\'outil écrase le fichier.', '',
           'export const SALLES_TOMBEAU = {']
    for k, nom in enumerate(SALLES):
        s = generer(nom, seed * 10 + k)
        txt = ''.join(''.join(r) for r in s.g)
        print(nom, f'{s.W}×{s.H}', 'gouffres', txt.count(':') and SALLES[nom]['abimes'], 'chemin', txt.count(':'), 'objets', sum(txt.count(c) for c in OBJETS),
              'pilleurs', txt.count('t'), 'pièges', txt.count('x'), '+', txt.count('?'), 'morts', txt.count('q'), 'luttes', txt.count('j'), 'corps', txt.count('g'), 'mourants', txt.count('a'))
        out.append(f'  {nom}: {{ dirs: {json.dumps(s.dirs)}, plan: [')
        out += ['    ' + json.dumps(''.join(r)) + ',' for r in s.g]
        out.append('  ] },')
    out.append('};')
    open(SORTIE, 'w').write('\n'.join(out) + '\n')
    print('écrit', SORTIE)

main()
