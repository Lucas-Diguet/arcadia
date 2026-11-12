#!/usr/bin/env python3
# tools/temple-chemins.py — dessine les grandes salles des chemins du Temple des Éléments : trois salles par élément,
# chacune avec sa mécanique (les mêmes plans servent au temple à trois et au temple en solo).
#   python3 tools/temple-chemins.py [graine]  → testodyssee/js/donjons/temple-chemins.js
# Le plan obtenu est du texte ordinaire : on peut le retoucher à la main ensuite (relancer l'outil l'écrase).
#
# Feu    : une grotte de lave (60 × 44). Des barrières (+ et -) coupent le chemin ; on les voit avant leur interrupteur
#          (* et ^), posé tout près. Le rocher (B) qui va dessus est loin : il faut le pousser avec Force sur un long
#          trajet, avec des virages (trajet trouvé par recherche, au moins 12 poussées). m : rocher fissuré (Éclate-Roc).
#          Dans la 3e salle, la clé est au bout d'un tunnel loin de la sortie, derrière une troisième barrière (s) et
#          son interrupteur (i).
# Eau    : un labyrinthe de vingt bassins (80 × 60). Des rivières (< > ( ) : courant vers la gauche, la droite, le haut,
#          le bas) emportent le surfeur d'un bassin à l'autre, dans un seul sens ; beaucoup ramènent en arrière. Aucun
#          bassin n'est un piège : de partout, on peut encore atteindre la sortie. Pas de clé : elle est dans la 4e salle.
# Fondmer: la 4e salle de l'Eau (50 × 40). Une mer d'eaux tumultueuses (E, infranchissables), de petites anses
#          d'eau calme et des courants d'une case de large qui tournent et emportent loin. Il faut prendre les bons,
#          dans le bon ordre, pour atteindre l'îlot du centre (la clé), puis la sortie. De partout, on peut encore
#          rejoindre l'îlot et la sortie.
# Plante : un labyrinthe de haies (60 × 44). Des ronces (t d g) ferment des passages ; chacune vient d'un arbuste
#          (r y q) de la même couleur, qu'on voit tout près derrière la haie mais qu'on n'atteint que par un détour.
#          Couper l'arbuste fait tomber ses ronces. De petits arbres (C) à couper barrent aussi des passages. Dans la
#          3e salle, la clé est dans un cul-de-sac loin de la sortie, derrière des ronces bleues (n) et leur arbuste (v).
# Partout : # roche, . sol, S arrivée, N sortie, K clé (3e salle), I J O P V objets, x et z deux recoins (x dans la
#          première zone de la salle, z dans la dernière) : rien à trois, des passages et des objets en solo.
import random, sys, os
from collections import deque

W, H = 60, 44
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), 'testodyssee/js/donjons/temple-chemins.js')
OBJETS = 'IJOPV'
D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

def voisins(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))

class Echec(Exception):
    pass

# =====================================================================================================================
# Feu
# =====================================================================================================================
MURS_FEU = set('#L%&')
SOL_JOUEUR = set('.=*^ixzSN')      # où le joueur marche (rochers fissurés, objets et barrières : non)
SOL_ROCHER = set('.=*^i')          # où un rocher peut être poussé

class Feu:
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
                cs.append([cx, cy, r.randint(4, 6), r.randint(3, 5)])
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
        self.aretes = aretes
    def galerie(self, a, b, large=2):
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
        """cases atteintes à pied, obstacles franchis (rochers, barrières ouvertes)"""
        vus, f = {depart}, deque([depart])
        while f:
            x, y = f.popleft()
            for t in voisins(x, y):
                if t in vus or self.at(*t) in MURS_FEU or t in bloque: continue
                vus.add(t); f.append(t)
        return vus
    def dans_chambre(self, x, y):
        return any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.2 for cx, cy, rx, ry in self.cs)

    def construire(self):
        r = self.r
        self.chambres(); self.graphe()
        A = self.adj()
        self.dep = max(range(len(self.cs)), key=lambda i: self.cs[i][1])
        dist = {i: len(self.chemin(self.dep, i, A)) for i in A}
        self.fin = max((i for i in A if i != self.dep), key=lambda i: dist[i] * 3 - self.cs[i][1])
        self.principal = self.chemin(self.dep, self.fin, A)
        bords = list(zip(self.principal, self.principal[1:]))
        if len(bords) < 4: raise Echec('chemin trop court')
        self.portes = sorted(r.sample(range(1, len(bords)), 3))
        self.portes = [bords[k] for k in self.portes]
        comp = self.composantes(A)
        proches = sorted(((a, b) for a in A for b in A if a < b and b not in A[a] and comp[a] == comp[b]),
                         key=lambda e: abs(self.cs[e[0]][0] - self.cs[e[1]][0]) + abs(self.cs[e[0]][1] - self.cs[e[1]][1]))
        for e in proches[:2]:
            if r.random() < 0.8: self.aretes.append(e)
        for a, b in self.aretes:
            if (a, b) in self.portes or (b, a) in self.portes: continue
            self.galerie(a, b, 2)
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

    def poser_portes(self, types):
        self.gardes = []
        for (a, b), t in zip(self.portes, types):
            pts = self.galerie(a, b, 1)
            milieu = [p for p in pts if not self.dans_chambre(*p)]
            if len(milieu) < 3: raise Echec('galerie trop courte')
            x, y = milieu[len(milieu) // 2]
            if t == 'bouton':
                k = sum(1 for q in self.gardes if q[0] == 'bouton')
                self.g[y][x] = '+-'[k]
            else: self.g[y][x] = 'm'
            self.gardes.append((t, (x, y), a)); self.fixe.add((x, y))

    # ---------- le casse-tête du rocher : recherche à rebours depuis l'interrupteur ----------
    def marche(self, depart, mur):
        """cases où le joueur va à pied (barrières fermées, rochers en place), `mur` : cases en plus qui bloquent"""
        if self.at(*depart) not in SOL_JOUEUR or depart in mur: return set()
        vus, f = {depart}, deque([depart])
        while f:
            c = f.popleft()
            for t in voisins(*c):
                if t in vus or t in mur or self.at(*t) not in SOL_JOUEUR: continue
                vus.add(t); f.append(t)
        return vus
    def rebours(self, but):
        """toutes les positions d'où un rocher peut être amené sur `but` : { (rocher, côté du joueur): (poussées, parent) }"""
        etats, f = {}, deque()
        def visiter(b, d, cout, parent, devant):
            if (b, d) in etats and etats[(b, d)][0] <= cout: return
            etats[(b, d)] = (cout, parent)
            (f.appendleft if devant else f.append)((b, d))
        for d in D4:
            if self.at(but[0] + d[0], but[1] + d[1]) in SOL_JOUEUR: visiter(but, d, 0, None, True)
        faits = set()
        while f:
            b, d = f.popleft()
            if (b, d) in faits: continue
            faits.add((b, d))
            cout = etats[(b, d)][0]
            j = (b[0] + d[0], b[1] + d[1])
            # le joueur fait le tour du rocher sans le bouger
            zone = self.marche(j, {b})
            for d2 in D4:
                if d2 != d and (b[0] + d2[0], b[1] + d2[1]) in zone: visiter(b, d2, cout, (b, d), True)
            # il tire le rocher vers lui (à l'endroit : il le pousse depuis l'autre côté)
            j2 = (j[0] + d[0], j[1] + d[1])
            if self.at(*j) in SOL_ROCHER and self.at(*j2) in SOL_JOUEUR: visiter(j, d, cout + 1, (b, d), False)
        return etats
    def casse_tete(self, garde, lettre):
        """l'interrupteur près de sa barrière, le rocher loin : au moins 12 poussées"""
        _, (gx, gy), a = garde
        r = self.r
        # la zone d'avant la barrière (toutes barrières fermées)
        zone, entree = self.zone_de((gx, gy))
        if not zone: raise Echec('zone vide')
        # interrupteurs possibles : à 3 à 9 pas de la barrière, pas dans une galerie d'une case
        dist, f = {}, deque()
        for t in voisins(gx, gy):
            if t in zone: dist[t] = 1; f.append(t)
        while f:
            c = f.popleft()
            for t in voisins(*c):
                if t in zone and t not in dist: dist[t] = dist[c] + 1; f.append(t)
        cands = [c for c, k in dist.items() if 3 <= k <= 9 and self.at(*c) == '.' and c not in self.fixe
                 and sum(self.at(*t) in SOL_JOUEUR for t in voisins(*c)) >= 3]
        r.shuffle(cands); cands.sort(key=lambda c: abs(dist[c] - 5))
        for but in cands[:8]:
            etats = self.rebours(but)
            meilleurs = {}
            for (b, d), (cout, _) in etats.items():
                if b == but or b in self.fixe or self.at(*b) != '.' or not (12 <= cout <= 26): continue
                if sum(self.at(*t) in SOL_JOUEUR for t in voisins(*b)) < 3: continue
                if b not in meilleurs or cout < meilleurs[b][0]: meilleurs[b] = (cout, d)
            # le vrai nombre de poussées d'un départ : le plus petit de ses états que le joueur peut rejoindre
            choix = []
            for b, _ in meilleurs.items():
                acces = self.marche(entree, {b})
                couts = [etats[(b, d)][0] for d in D4 if (b, d) in etats and (b[0] + d[0], b[1] + d[1]) in acces]
                if couts and min(couts) >= 12: choix.append((min(couts), b))
            if not choix: continue
            r.shuffle(choix); choix.sort(key=lambda q: -min(q[0], 18))
            cout, b = choix[0]
            # le trajet : cases du rocher et du joueur, à garder libres
            d = min((d for d in D4 if (b, d) in etats), key=lambda d: etats[(b, d)][0])
            e, cases = (b, d), set()
            while e:
                (bx, by), (dx, dy) = e
                for ox in (-1, 0, 1):
                    for oy in (-1, 0, 1): cases.add((bx + ox, by + oy))
                cases.add((bx + 2 * dx, by + 2 * dy))
                e = etats[e][1]
            self.g[b[1]][b[0]] = 'B'; self.g[but[1]][but[0]] = lettre
            self.fixe |= cases
            self.puzzles.append((b, but, cout))
            return cout
        raise Echec('pas de trajet de rocher')
    def zone_de(self, barriere):
        """la zone d'où l'on arrive à cette barrière : celle de ses deux côtés qui est la plus proche de l'arrivée"""
        d, f = {self.S: 0}, deque([self.S])
        ouvertes = {p for t, p, _ in self.gardes if p != barriere}
        while f:
            c = f.popleft()
            for t in voisins(*c):
                if t in d or t == barriere: continue
                if self.at(*t) in SOL_JOUEUR or t in ouvertes: d[t] = d[c] + 1; f.append(t)
        cotes = [t for t in voisins(*barriere) if t in d]
        if not cotes: return set(), None
        zone = self.marche(min(cotes, key=lambda t: d[t]), set())
        return zone, min((c for c in zone if c in d), key=lambda c: d[c])
    def verifier_puzzles(self):
        for b, but, cout in self.puzzles:
            if self.at(*b) != 'B': return False
            self.g[b[1]][b[0]] = '.'
            etats = self.rebours(but)
            zone, entree = self.zone_de(self.barriere_de(but))
            acces = self.marche(entree, {b}) if zone else set()
            ok = any((b, d) in etats and (b[0] + d[0], b[1] + d[1]) in acces for d in D4)
            self.g[b[1]][b[0]] = 'B'
            if not ok: return False
        return True
    def barriere_de(self, but):
        lettre = {'*': '+', '^': '-', 'i': 's'}[self.at(*but)]
        return next((x, y) for y in range(H) for x in range(W) if self.g[y][x] == lettre)

    def alcove(self, zone, mini=5):
        r = self.r
        bords = [(x, y) for (x, y) in zone if 3 <= x < W - 3 and 3 <= y < H - 3 and self.g[y][x] == '.' and (x, y) not in self.fixe
                 and any(self.at(a, b) == '#' for a, b in voisins(x, y))]
        if not bords: return None
        for _ in range(80):
            x, y = r.choice(bords)
            dx, dy = r.choice(D4)
            if self.at(x + dx, y + dy) != '#': continue
            pts, cx, cy = [], x, y
            for k in range(r.randint(mini, mini + 6)):
                if r.random() < 0.3: dx, dy = r.choice([(dy, dx), (-dy, -dx)])
                nx, ny = cx + dx, cy + dy
                if not (2 <= nx < W - 2 and 3 <= ny < H - 3): break
                if any(self.at(a, b) != '#' and (a, b) != (cx, cy) and (a, b) not in pts for a, b in voisins(nx, ny)): break
                pts.append((nx, ny)); cx, cy = nx, ny
            if len(pts) >= mini:
                for a, b in pts: self.g[b][a] = '.'
                self.fixe |= set(pts) | {(x, y)}
                return pts[-1]
        return None
    def cle_gardee(self):
        """la clé : au bout d'un tunnel creusé depuis la partie de la salle la plus loin de la sortie, derrière une
        troisième barrière dont l'interrupteur est tout près et le rocher loin"""
        partout = self.bfs(self.S)
        d, f = {self.N: 0}, deque([self.N])
        while f:
            c = f.popleft()
            for t in voisins(*c):
                if t in partout and t not in d: d[t] = d[c] + 1; f.append(t)
        # loin de la sortie à vol d'oiseau, et loin aussi à pied
        loin = sorted((c for c in d if self.g[c[1]][c[0]] == '.' and c not in self.fixe), key=lambda c: -(abs(c[0] - self.N[0]) + abs(c[1] - self.N[1]) + d[c] * 0.3))
        loin = loin[:max(30, len(loin) // 6)]
        for _ in range(60):
            bout = self.alcove(set(self.r.sample(loin, min(len(loin), 12))), 8)
            if not bout: continue
            # le tunnel, de la salle à son bout : la barrière à sa deuxième case, la clé au bout
            tunnel, c = [bout], bout
            while True:
                n = [t for t in voisins(*c) if t not in tunnel and self.at(*t) == '.' and t in self.fixe and t not in partout]
                if not n: break
                c = n[0]; tunnel.append(c)
            tunnel.reverse()
            if len(tunnel) < 6: continue
            bx, by = tunnel[1]
            self.g[by][bx] = 's'; self.g[bout[1]][bout[0]] = 'K'
            self.importants += [bout, (bx, by)]
            garde = ('bouton', (bx, by), None)
            self.gardes.append(garde)
            try:
                self.casse_tete(garde, 'i')
            except Echec:
                for x, y in tunnel: self.g[y][x] = '#'
                self.gardes.remove(garde); self.importants = self.importants[:-2]
                continue
            self.importants += [p for p in ((x, y) for y in range(H) for x in range(W) if self.g[y][x] in 'iB') if p not in self.importants]
            return
        raise Echec('pas de clé gardée')
    def garder(self):
        v = self.bfs(self.S)
        return self.N in v and all(p in v for p in self.importants)
    def essai(self, cases, c):
        avant = [(x, y, self.g[y][x]) for x, y in cases]
        for x, y in cases: self.g[y][x] = c
        if not self.garder():
            for x, y, v in avant: self.g[y][x] = v
            return False
        return True
    def blob(self, cx, cy, rx, ry):
        return [(x, y) for y in range(cy - ry, cy + ry + 1) for x in range(cx - rx, cx + rx + 1)
                if ((x - cx) / max(rx, 1)) ** 2 + ((y - cy) / max(ry, 1)) ** 2 <= 1 + self.r.uniform(-0.3, 0.1)
                and self.at(x, y) == '.' and (x, y) not in self.fixe]

    def faire(self):
        r = self.r
        self.construire()
        self.poser_portes(['bouton', 'roc', 'bouton'])
        self.puzzles = []
        k = 0
        for garde in self.gardes:
            if garde[0] != 'bouton': continue
            self.casse_tete(garde, '*^'[k]); k += 1
        fermes = {p for _, p, _ in self.gardes}
        if self.N in self.bfs(self.S, fermes): raise Echec('contournable')
        # recoins : x dans la première zone, z dans la dernière ; objets et clé au bout de tunnels
        debut = self.marche(self.S, set())
        fin = self.marche((self.N[0], self.N[1] + 1), set())
        self.importants = [p for _, p, _ in self.gardes] + [(x, y) for y in range(H) for x in range(W) if self.g[y][x] in '*^B']
        for lettre, zone in (('x', debut), ('z', fin)):
            bout = self.alcove(zone)
            if not bout: raise Echec('pas de recoin')
            self.g[bout[1]][bout[0]] = lettre; self.importants.append(bout)
        partout = self.bfs(self.S)
        lettres = list(OBJETS); r.shuffle(lettres)
        if self.n == 3: self.cle_gardee()
        for _ in range(30):
            if len(lettres) <= 0: break
            bout = self.alcove(partout)
            if bout: self.g[bout[1]][bout[0]] = lettres.pop(); self.importants.append(bout)
        if len(lettres) > 1: raise Echec('pas assez d\'objets')
        if not self.garder(): raise Echec('décousu')
        self.decorer()
        if not self.garder() or not self.verifier_puzzles(): raise Echec('décor gênant')
        return self
    def decorer(self):
        r = self.r
        sols = lambda: [(x, y) for y in range(2, H - 2) for x in range(1, W - 1) if self.g[y][x] == '.' and (x, y) not in self.fixe]
        for cx, cy, rx, ry in r.sample(self.cs, min(4, len(self.cs))):
            if (cx, cy) in (tuple(self.cs[self.dep][:2]), tuple(self.cs[self.fin][:2])) or rx < 4: continue
            lac = self.blob(cx, cy, rx - 1, ry - 1)
            horiz = r.random() < 0.5
            pont = [(x, y) for x, y in lac if (y in (cy, cy + 1) if horiz else x in (cx, cx + 1))]
            avant = {p: self.g[p[1]][p[0]] for p in lac}
            for x, y in lac: self.g[y][x] = 'L'
            for x, y in pont: self.g[y][x] = '='
            if not self.garder() or not self.verifier_puzzles():
                for p_, v in avant.items(): self.g[p_[1]][p_[0]] = v
        for cx, cy, rx, ry in self.cs:
            for _ in range(r.randint(1, 3)):
                self.essai(self.blob(cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1), r.randint(1, 3), r.randint(1, 2)), 'L')
        for x, y in r.sample(sols(), min(30, len(sols()))):
            if sum(self.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: self.essai([(x, y)], r.choice('%&m'))

# =====================================================================================================================
# Eau
# =====================================================================================================================
FLECHE = {(-1, 0): '<', (1, 0): '>', (0, -1): '(', (0, 1): ')'}
DIR = {v: k for k, v in FLECHE.items()}
EAU = set('~<>()')
TERRE = set('.SNKxz')

class Eau:
    TAILLE = (80, 60)
    def __init__(self, n, seed):
        self.n, self.r = n, random.Random(seed)
        self.g = [['#'] * W for _ in range(H)]
    def at(self, x, y): return self.g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    def set(self, x, y, c):
        if 1 <= x < W - 1 and 2 <= y < H - 2: self.g[y][x] = c

    def faire(self):
        r = self.r
        # vingt bassins sur une grille de 5 × 4
        NC, NR = 5, 4; NB = NC * NR
        self.cs, self.bassin = [], []
        for j in range(NR):
            for i in range(NC):
                cx = int((i + 0.5) * W / NC + r.uniform(-2, 2)); cy = int((j + 0.5) * (H - 8) / NR + 4 + r.uniform(-1.5, 1.5))
                rx, ry = r.randint(4, 5), r.randint(3, 4)
                self.cs.append((cx, cy, rx, ry))
                self.bassin.append({(x, y) for y in range(cy - ry, cy + ry + 1) for x in range(cx - rx, cx + rx + 1)
                                    if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + r.uniform(-0.2, 0.12) and 2 <= x < W - 2 and 3 <= y < H - 3})
        aretes = [(j * NC + i, j * NC + i + 1) for j in range(NR) for i in range(NC - 1)] + [(j * NC + i, (j + 1) * NC + i) for j in range(NR - 1) for i in range(NC)]
        self.dep = (NR - 1) * NC + r.randrange(NC)
        self.fin = r.choice([i for i in range(NC) if abs(i - (self.dep - (NR - 1) * NC)) >= 2])
        # le sens des rivières : cherché au hasard, on garde le labyrinthe le plus long sans piège
        meilleur = None
        for _ in range(6000):
            types = [r.choices((0, 1, 2, 3), (0.12, 0.08, 0.4, 0.4))[0] for _ in aretes]
            A = {i: set() for i in range(NB)}
            for (a, b), t in zip(aretes, types):
                if t in (1, 2): A[a].add(b)
                if t in (1, 3): A[b].add(a)
            d = self.dist(A, self.dep)
            if self.fin not in d or len(d) < NB - 3: continue
            R = {i: set() for i in range(NB)}
            for a in A:
                for b in A[a]: R[b].add(a)
            vers = self.dist(R, self.fin)
            if any(i not in vers for i in d): continue
            # pas de raccourci : la rive de départ ne donne que sur des rivières
            retours = sum(1 for (a, b), t in zip(aretes, types) if t >= 2 and a in d and b in d)
            score = d[self.fin] * 3 + len(d) + retours * 0.3 + r.random()
            if not meilleur or score > meilleur[0]: meilleur = (score, types, d)
        if not meilleur or meilleur[2][self.fin] < 10: raise Echec('labyrinthe trop court')
        _, types, self.d = meilleur
        self.aretes = [(a, b, t) for (a, b), t in zip(aretes, types) if t]
        for cells in self.bassin:
            for x, y in cells: self.set(x, y, '~')
        # les canaux : larges de deux cases, en L
        self.canaux = []
        for a, b, t in self.aretes:
            (x0, y0), (x1, y1) = self.cs[a][:2], self.cs[b][:2]
            cells = set()
            if abs(a - b) == 1:
                for x in range(min(x0, x1), max(x0, x1) + 1): cells |= {(x, y0), (x, y0 + 1)}
                for y in range(min(y0, y1), max(y0, y1) + 2): cells |= {(x1, y), (x1 + 1, y)}
            else:
                for y in range(min(y0, y1), max(y0, y1) + 1): cells |= {(x0, y), (x0 + 1, y)}
                for x in range(min(x0, x1), max(x0, x1) + 2): cells |= {(x, y1), (x, y1 + 1)}
            for x, y in cells: self.set(x, y, '~')
            self.canaux.append((a, b, t, cells))
        tous = set().union(*self.bassin)
        self.reserve = set()
        for a, b, t, cells in self.canaux:
            riv = {c for c in cells if c not in tous and self.at(*c) == '~'}
            self.reserve |= cells
            if t == 1: continue
            if len(riv) < 6: raise Echec('rivière trop courte')
            aval = self.bassin[b] if t == 2 else self.bassin[a]
            # chaque case coule vers la case voisine la plus proche du bassin d'arrivée
            dist, f = {}, deque()
            for c in riv:
                if any(v in aval for v in voisins(*c)): dist[c] = 1; f.append(c)
            while f:
                c = f.popleft()
                for v in voisins(*c):
                    if v in riv and v not in dist: dist[v] = dist[c] + 1; f.append(v)
            if len(dist) != len(riv): raise Echec('rivière coupée')
            for c in riv:
                if dist[c] == 1: v = next(v for v in voisins(*c) if v in aval)
                else: v = min((v for v in voisins(*c) if v in riv), key=lambda v: dist[v])
                self.g[c[1]][c[0]] = FLECHE[(v[0] - c[0], v[1] - c[1])]
        # les rives : le bas du bassin de départ, le haut du bassin d'arrivée
        cx, cy = self.cs[self.dep][:2]
        for x, y in self.bassin[self.dep]:
            if y >= cy + 2 and self.at(x, y) == '~' and (x, y) not in self.reserve: self.g[y][x] = '.'
        for y in range(cy + 2, H - 1): self.g[y][cx] = '.'; self.g[y][cx + 1] = '.'
        self.S = (cx, H - 1); self.g[H - 1][cx] = 'S'
        fx, fy = self.cs[self.fin][:2]
        for x, y in self.bassin[self.fin]:
            if y <= fy - 2 and self.at(x, y) == '~' and (x, y) not in self.reserve: self.g[y][x] = '.'
        for y in range(2, fy - 1): self.g[y][fx] = '.'
        self.N = (fx, 1); self.g[1][fx] = 'N'
        self.importants = []
        # recoins sur les rives
        for lettre, i, col in (('x', self.dep, cx), ('z', self.fin, fx)):
            cands = [(x, y) for x, y in self.bassin[i] if self.at(x, y) == '.' and abs(x - col) >= 2
                     and sum(self.at(*v) == '.' for v in voisins(x, y)) >= 3]
            if not cands: raise Echec('pas de rive pour le recoin')
            x, y = r.choice(cands); self.g[y][x] = lettre; self.importants.append((x, y))
        # îlots : objets, clé
        libres = [i for i in self.d if i not in (self.dep, self.fin)]
        libres.sort(key=lambda i: -self.d[i])
        lettres = list(OBJETS); r.shuffle(lettres)
        poses = lettres
        for i in libres:
            if not poses: break
            if self.ilot(i, poses[0]): poses.pop(0)
        if len(poses) > 1: raise Echec('pas assez d\'îlots')
        # piliers de roche dans les bassins
        for i in range(NB):
            for _ in range(r.randint(2, 5)):
                c = r.choice(sorted(self.bassin[i]))
                if self.at(*c) != '~' or c in self.reserve: continue
                if any(self.at(*v) != '~' for v in voisins(*c)): continue
                self.g[c[1]][c[0]] = '#'
        self.verifier()
        return self
    def dist(self, A, s):
        d, f = {s: 0}, deque([s])
        while f:
            u = f.popleft()
            for v in A[u]:
                if v not in d: d[v] = d[u] + 1; f.append(v)
        return d
    def ilot(self, i, lettre):
        r = self.r
        cx, cy, rx, ry = self.cs[i]
        for _ in range(40):
            x, y = cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1)
            croix = [(x, y)] + list(voisins(x, y))
            autour = {(x + ox, y + oy) for ox in (-2, -1, 0, 1, 2) for oy in (-2, -1, 0, 1, 2)}
            pres = {(x + ox, y + oy) for ox in (-1, 0, 1) for oy in (-1, 0, 1)}
            if any(c in self.reserve or self.at(*c) != '~' for c in pres): continue
            for c in croix: self.g[c[1]][c[0]] = '.'
            self.g[y][x] = lettre; self.importants.append((x, y))
            self.reserve |= autour
            return True
        return False
    # ---------- le surfeur : à pied sur la terre, emporté par le courant sur l'eau ----------
    def pas(self, c):
        out = []
        for dx, dy in D4:
            n = (c[0] + dx, c[1] + dy); ch = self.at(*n)
            if ch in TERRE: out.append(n); continue
            if ch not in EAU: continue
            for _ in range(400):
                ch = self.at(*n)
                if ch not in DIR: break
                d = DIR[ch]; m = (n[0] + d[0], n[1] + d[1])
                if self.at(*m) not in EAU: break
                n = m
            out.append(n)
        return out
    def verifier(self):
        vus, f, arcs = {self.S}, deque([self.S]), {}
        while f:
            c = f.popleft()
            arcs[c] = self.pas(c)
            for n in arcs[c]:
                if n not in vus: vus.add(n); f.append(n)
        if self.N not in vus: raise Echec('sortie hors d\'atteinte')
        for x, y in self.importants:
            if not any(v in vus for v in voisins(x, y)) and (x, y) not in vus: raise Echec('objet hors d\'atteinte')
        inv = {}
        for a, l in arcs.items():
            for b in l: inv.setdefault(b, []).append(a)
        ok, f = {self.N}, deque([self.N])
        while f:
            c = f.popleft()
            for a in inv.get(c, ()):
                if a not in ok: ok.add(a); f.append(a)
        if any(c not in ok for c in vus): raise Echec('piège')
        # sans les rivières, pas de sortie : il faut se laisser porter
        vus2, f = {self.S}, deque([self.S])
        while f:
            c = f.popleft()
            for v in voisins(*c):
                if v not in vus2 and (self.at(*v) in TERRE or self.at(*v) == '~'): vus2.add(v); f.append(v)
        if self.N in vus2: raise Echec('sortie sans rivière')
        # nombre de rivières sur le plus court chemin
        cout, f = {self.S: 0}, deque([self.S])
        while f:
            c = f.popleft()
            for n in arcs.get(c, ()):
                w = 1 if abs(n[0] - c[0]) + abs(n[1] - c[1]) > 1 else 0
                if n not in cout or cout[n] > cout[c] + w:
                    cout[n] = cout[c] + w; (f.append if w else f.appendleft)(n)
        self.rivieres = cout[self.N]
        if self.rivieres < 8: raise Echec('trop direct')

# =====================================================================================================================
# Fondmer : la 4e salle de l'Eau
# =====================================================================================================================
class Fondmer:
    TAILLE = (56, 46)
    def __init__(self, n, seed):
        self.n, self.r = n, random.Random(seed)
        self.g = [['#'] * W for _ in range(H)]
        for y in range(1, H - 1):
            for x in range(1, W - 1): self.g[y][x] = 'E'
    def at(self, x, y): return self.g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.g[y][x] = c
        return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
    def faire(self):
        r = self.r
        # la terre : l'entrée en bas, la sortie en haut d'un côté, l'îlot au centre ; une anse d'eau calme devant chacune
        cx = W // 2 + r.randint(-6, 6)
        terre = self.rect(cx - 3, H - 4, cx + 3, H - 2, '.')
        self.S = (cx, H - 1); self.g[H - 1][cx] = 'S'
        anses = {'E': self.rect(cx - 4, H - 6, cx + 4, H - 5, '~')}
        fx = r.choice([r.randint(5, 12), r.randint(W - 13, W - 6)])
        terre |= self.rect(fx - 3, 2, fx + 3, 3, '.')
        self.N = (fx, 1); self.g[1][fx] = 'N'
        anses['X'] = self.rect(fx - 4, 4, fx + 4, 5, '~')
        ix, iy = W // 2 + r.randint(-3, 3), H // 2 + r.randint(-2, 2)
        anses['I'] = self.rect(ix - 2, iy - 2, ix + 2, iy + 2, '~')
        terre |= self.rect(ix - 1, iy - 1, ix + 1, iy + 1, '.')
        anses['I'] -= terre
        self.g[iy][ix] = 'K'; self.cle = (ix, iy)
        # le graphe des courants : le bon chemin (4 courants jusqu'à l'îlot, 3 jusqu'à la sortie) et des leurres
        noms = ['p1', 'p2', 'p3', 'q1', 'q2', 'd1', 'd2', 'd3', 'd4', 'd5']
        # depuis l'anse de la sortie, un courant ramène au départ : qui y arrive sans la clé peut recommencer
        bons = [('E', 'p1'), ('p1', 'p2'), ('p2', 'p3'), ('p3', 'I'), ('I', 'q1'), ('q1', 'q2'), ('q2', 'X'), ('X', 'E')]
        retours = r.sample(['E', 'E', 'p1', 'p2'], 4)
        leurres = [('E', 'd1'), ('d1', retours[0]), ('p1', 'd2'), ('d2', retours[1]), ('p2', 'd3'), ('d3', retours[2]),
                   ('p3', 'd4'), ('d4', retours[3]), ('q1', 'd5'), ('d5', 'I'), ('q2', r.choice(['d5', 'I'])), ('I', r.choice(['d4', 'd3']))]
        # les petites anses, bien écartées
        pris = set()
        for c in [q for a in anses.values() for q in a] + list(terre):
            pris |= {(c[0] + dx, c[1] + dy) for dx in range(-5, 6) for dy in range(-5, 6)}
        # le bon chemin fait un zigzag qui monte (p1 loin de la sortie, p2 près, p3 loin, l'îlot, q1 loin, q2 près) ; le
        # couloir le long du mur côté sortie reste libre pour le courant qui ramène au départ
        gauche = fx < W // 2
        U = lambda u0, u1: (u0, u1) if gauche else (W - 1 - u1, W - 1 - u0)
        boites = {'p1': (U(W - 15, W - 7), (H - 15, H - 11)), 'p2': (U(12, 20), (H // 2 + 3, H - 15)),
                  'p3': (U(W - 15, W - 7), (H // 2 - 1, H // 2 + 3)), 'q1': (U(W - 15, W - 7), (8, H // 2 - 8)),
                  'q2': (U(12, 20), (7, 12))}
        for nom in noms:
            for _ in range(300):
                w, h = r.choice([(3, 2), (2, 3), (3, 3)])
                if nom in boites:
                    (x0, x1), (y0, y1) = boites[nom]
                    x, y = r.randint(x0, max(x0, x1 - w + 1)), r.randint(y0, max(y0, y1 - h + 1))
                else:
                    (x0, x1) = U(11, W - 4 - w)
                    x, y = r.randint(max(3, x0), min(W - 4 - w, x1)), r.randint(7, H - 9 - h)
                cases = {(x + a, y + b) for a in range(w) for b in range(h)}
                if cases & pris: continue
                anses[nom] = self.rect(x, y, x + w - 1, y + h - 1, '~')
                pris |= {(c[0] + dx, c[1] + dy) for c in cases for dx in range(-4, 5) for dy in range(-4, 5)}
                break
            else: raise Echec('pas de place pour les anses')
        self.anses = anses
        eau = set().union(*anses.values())
        self.libre = lambda c: self.at(*c) == 'E'
        bord = lambda c: any(t in eau or self.at(*t) in '.SNK' for t in voisins(*c))
        self.eau = eau
        bord = lambda c: any(t in self.eau or self.at(*t) in '.SNK' for t in voisins(*c))
        self.courants = []
        self.occupe = set()
        def poser(a, b):
            chemin = self.tracer(anses[a], anses[b], self.eau, self.occupe, bord)
            if not chemin: return False
            self.courants.append((a, b, chemin))
            self.occupe |= set(chemin) | {t for c in chemin for t in voisins(*c)}
            dest = next(t for t in voisins(*chemin[-1]) if t in anses[b])
            for k, c in enumerate(chemin):
                n = chemin[k + 1] if k + 1 < len(chemin) else dest
                self.g[c[1]][c[0]] = FLECHE[(n[0] - c[0], n[1] - c[1])]
            return True
        # le bon chemin (obligatoire) et des leurres (une anse et ses deux courants, ou rien), dans un ordre tiré au
        # hasard : on garde le premier essai où tout le bon chemin passe avec au moins trois leurres
        paires = [(leurres[k], leurres[k + 1]) for k in range(0, 10, 2)]
        depart = ([row[:] for row in self.g], dict(anses))
        meilleur = None
        for essai in range(24):
            self.g, anses = [row[:] for row in depart[0]], dict(depart[1]); self.anses = anses
            self.eau = set().union(*anses.values()); self.occupe = set(); self.courants = []
            # le retour par le couloir d'abord, puis le bon chemin, puis les leurres dans un ordre tiré au hasard
            items = [('bon', bons[-1])] + [('bon', e) for e in bons[:-1]] + r.sample([('leurre', p) for p in paires], len(paires))
            poses, rate = 0, False
            for genre, e in items:
                if genre == 'bon':
                    if not poser(*e): rate = True; break
                    continue
                e1, e2 = e
                sauve = ([row[:] for row in self.g], set(self.occupe), list(self.courants))
                if poser(*e1) and any(poser(e2[0], b) for b in [e2[1]] + [q for q in ('E', 'p1', 'p2') if q != e2[1]]): poses += 1; continue
                self.g, self.occupe, self.courants = sauve
                for x, y in anses[e1[1]]: self.g[y][x] = 'E'
                del anses[e1[1]]; self.eau = set().union(*anses.values())
            if rate: continue
            for e in leurres[10:]:
                if e[0] in anses and e[1] in anses:
                    sauve = ([row[:] for row in self.g], set(self.occupe), list(self.courants))
                    if not poser(*e): self.g, self.occupe, self.courants = sauve
            if poses >= 2: break
        else: raise Echec('pas assez de leurres')
        self.poses = poses
        self.verifier()
        return self
    def dist_anses(self, e):
        a, b = (sorted(self.anses[k])[len(self.anses[k]) // 2] for k in e)
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    def tracer(self, A, B, eau, occupe, bord):
        """un courant d'une case de large, qui part d'une case au bord de A et finit au bord de B, en passant par un ou
        deux points tirés au hasard (pour qu'il tourne et emporte loin)"""
        r = self.r
        def ok(c, fin=False):
            return self.libre(c) and c not in occupe and 2 <= c[0] < W - 2 and 2 <= c[1] < H - 2
        def touche(c, Z): return any(t in Z for t in voisins(*c))
        departs = [c for c in {t for q in A for t in voisins(*q)} if ok(c) and touche(c, A) and not touche(c, eau - A) and not any(self.at(*t) in '.SNK' for t in voisins(*c))]
        arrivees = {c for c in {t for q in B for t in voisins(*q)} if ok(c) and touche(c, B) and not touche(c, eau - B) and not any(self.at(*t) in '.SNK' for t in voisins(*c))}
        if not departs or not arrivees:
            self.raisons = getattr(self, 'raisons', []) + ['vide %d %d' % (len(departs), len(arrivees))]
            return None
        import heapq
        # les courants passent au large des autres anses, pour ne pas les enfermer
        autres = eau - A - B
        pres = {(x + dx, y + dy) for x, y in autres for dx in range(-3, 4) for dy in range(-3, 4)}
        for _ in range(12):
            # un coût par bloc de 4 × 4 cases, tiré au hasard : le courant suit les blocs bon marché et tourne à leurs bords
            poids = {}
            P = lambda c: poids.setdefault((c[0] // 4, c[1] // 4), r.choice((1, 1, 1, 2, 3)))
            d0 = r.choice(departs)
            dist, prev, tas = {d0: 0}, {d0: None}, [(0, d0)]
            fin = None
            while tas:
                k, c = heapq.heappop(tas)
                if k > dist[c]: continue
                if c in arrivees: fin = c; break
                for t in voisins(*c):
                    if not ok(t) or (t not in arrivees and bord(t)): continue
                    # pas collé à soi-même : t ne touche aucune case du chemin, sauf c
                    q, colle = c, False
                    q = prev[c]
                    while q is not None:
                        if t == q or t in voisins(*q): colle = True; break
                        q = prev[q]
                    if colle: continue
                    nk = k + P(t) + (6 if t in pres else 0) + (2 if prev[c] and (t[0] - c[0], t[1] - c[1]) != (c[0] - prev[c][0], c[1] - prev[c][1]) else 0)
                    if nk < dist.get(t, 1e9): dist[t] = nk; prev[t] = c; heapq.heappush(tas, (nk, t))
            if not fin: self.raisons = getattr(self, 'raisons', []) + ['bloqué']; continue
            chemin, c = [], fin
            while c is not None: chemin.append(c); c = prev[c]
            chemin.reverse()
            if len(chemin) < 10: continue
            return chemin
        return None
    def pas(self, c):
        out = []
        for dx, dy in D4:
            n = (c[0] + dx, c[1] + dy); ch = self.at(*n)
            if ch in TERRE: out.append(n); continue
            if ch not in EAU: continue
            for _ in range(400):
                ch = self.at(*n)
                if ch not in DIR: break
                d = DIR[ch]; m = (n[0] + d[0], n[1] + d[1])
                if self.at(*m) not in EAU: break
                n = m
            out.append(n)
        return out
    def verifier(self):
        arcs, vus, f = {}, {self.S}, deque([self.S])
        while f:
            c = f.popleft(); arcs[c] = self.pas(c)
            for n in arcs[c]:
                if n not in vus: vus.add(n); f.append(n)
        cle = self.cle
        if cle not in vus or self.N not in vus: raise Echec('îlot ou sortie hors d\'atteinte')
        inv = {}
        for a, l in arcs.items():
            for b in l: inv.setdefault(b, []).append(a)
        def vers(but):
            ok, f = {but}, deque([but])
            while f:
                c = f.popleft()
                for a in inv.get(c, ()):
                    if a not in ok: ok.add(a); f.append(a)
            return ok
        vc, vn = vers(cle), vers(self.N)
        if any(c not in vc or c not in vn for c in vus): raise Echec('piège')
        def courants(a, b):
            cout, f = {a: 0}, deque([a])
            while f:
                c = f.popleft()
                for n in arcs.get(c, ()):
                    w = 1 if abs(n[0] - c[0]) + abs(n[1] - c[1]) > 1 else 0
                    if n not in cout or cout[n] > cout[c] + w: cout[n] = cout[c] + w; (f.append if w else f.appendleft)(n)
            return cout.get(b, 99)
        self.vers_ile, self.vers_sortie = courants(self.S, cle), courants(cle, self.N)
        if self.vers_ile < 4 or self.vers_sortie < 3: raise Echec('trop direct')

# =====================================================================================================================
# Plante
# =====================================================================================================================
PW, PH, X0, Y0, COLS, ROWS = 7, 6, 2, 3, 8, 6
ARBUSTES, RONCES = 'ryqv', 'tdgn'
MURS_PLANTE = set('#Yu')

class Plante:
    def __init__(self, n, seed):
        self.n, self.r = n, random.Random(seed)
        self.g = [['#'] * W for _ in range(H)]
        for y in range(1, H - 1):
            for x in range(1, W - 1): self.g[y][x] = 'Y'
        self.fixe = set()
    def at(self, x, y): return self.g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    def dedans(self, i, j):
        return [(X0 + i * PW + a, Y0 + j * PH + b) for b in range(4) for a in range(5)]
    def porte(self, c1, c2):
        """les quatre cases du passage entre deux cellules voisines"""
        (i, j), (i2, j2) = sorted([c1, c2])
        if j == j2:
            a = self.r.randint(0, 2); x = X0 + i * PW + 5; y = Y0 + j * PH + a
            return [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)]
        a = self.r.randint(0, 3); x = X0 + i * PW + a; y = Y0 + j * PH + 4
        return [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)]
    def faire(self):
        r = self.r
        cells = [(i, j) for j in range(ROWS) for i in range(COLS)]
        for c in cells:
            for x, y in self.dedans(*c): self.g[y][x] = '.'
        # labyrinthe : un arbre couvrant tiré au hasard (parcours en profondeur)
        dep = (r.randrange(COLS), ROWS - 1)
        A = {c: set() for c in cells}
        vus, pile = {dep}, [dep]
        while pile:
            c = pile[-1]
            vs = [(c[0] + dx, c[1] + dy) for dx, dy in D4 if (c[0] + dx, c[1] + dy) in A and (c[0] + dx, c[1] + dy) not in vus]
            if not vs: pile.pop(); continue
            v = r.choice(vs); A[c].add(v); A[v].add(c); vus.add(v); pile.append(v)
        def dist(s, coupe=frozenset()):
            d, f = {s: 0}, deque([s])
            while f:
                u = f.popleft()
                for v in A[u]:
                    if v not in d and frozenset((u, v)) not in coupe: d[v] = d[u] + 1; f.append(v)
            return d
        d0 = dist(dep)
        fin = max(((i, 0) for i in range(COLS)), key=lambda c: d0[c])
        chemin, c = [fin], fin
        while c != dep:
            c = next(v for v in A[c] if d0[v] == d0[c] - 1); chemin.append(c)
        chemin.reverse()
        if len(chemin) < 12: raise Echec('labyrinthe trop court')
        self.portes = {}
        for c in cells:
            for v in A[c]:
                if c < v: self.portes[frozenset((c, v))] = self.porte(c, v)
        # trois passages du chemin fermés par des ronces ; l'arbuste de chacune : dans une cellule voisine, de l'autre
        # côté de la haie, qu'on n'atteint que par un détour
        def arbuste(gate):
            a, b = sorted(gate, key=lambda c: d0[c])
            cote = dist(dep, {gate})     # ce qu'on atteint avant d'ouvrir ce passage
            da = dist(a, {gate})
            cases = self.portes[gate]
            px = sum(x for x, _ in cases) / 4; py = sum(y for _, y in cases) / 4
            cands = []
            for base in (a, b):
                for dx, dy in D4:
                    c = (base[0] + dx, base[1] + dy)
                    if c not in cote or c in (a, b, dep) or c in A[base] or da.get(c, 0) < 5: continue
                    pos = min(self.dedans(*c), key=lambda p: abs(p[0] - px) + abs(p[1] - py))
                    if abs(pos[0] - px) > 6 or abs(pos[1] - py) > 4: continue
                    cands.append((min(da[c], 14) + r.random(), c, pos, da[c]))
            return max(cands) if cands else None
        possibles = [(k, arbuste(frozenset((chemin[k], chemin[k + 1])))) for k in range(1, len(chemin) - 1)]
        possibles = [(k, q) for k, q in possibles if q]
        # trois passages bien espacés le long du chemin, chacun avec son arbuste dans une cellule à lui
        choix = None
        for _ in range(200):
            if len(possibles) < 3: break
            t = sorted(r.sample(possibles, 3))
            if t[1][0] - t[0][0] < 2 or t[2][0] - t[1][0] < 2 or len({q[1] for _, q in t}) < 3: continue
            choix = t; break
        if not choix: raise Echec('pas d\'arbuste pour ces ronces')
        gates = [frozenset((chemin[k], chemin[k + 1])) for k, _ in choix]
        self.gates, pris = [], set()
        for k, (gate, (_, (_, c, pos, detour))) in enumerate(zip(gates, choix)):
            cases = self.portes[gate]
            pris.add(c)
            self.g[pos[1]][pos[0]] = ARBUSTES[k]
            for x, y in cases: self.g[y][x] = RONCES[k]
            self.fixe |= {pos} | set(voisins(*pos)) | set(cases)
            self.gates.append((gate, pos, cases, c, detour))
        for gate, cases in self.portes.items():
            if gate in gates: continue
            for x, y in cases: self.g[y][x] = '.'
            self.fixe |= set(cases)
        # zones : 0 avant les premières ronces, 3 après les dernières
        coupe = set(gates)
        zone = {}
        for k in range(4):
            s = dep if k == 0 else max(gates[k - 1], key=lambda c: d0[c])
            for c in dist(s, coupe): zone[c] = k
        # deux boucles, dans une même zone
        boucles = 0
        paires = [(c, (c[0] + dx, c[1] + dy)) for c in cells for dx, dy in ((1, 0), (0, 1)) if (c[0] + dx, c[1] + dy) in A]
        r.shuffle(paires)
        for c, v in paires:
            if boucles >= 3: break
            if v in A[c] or zone[c] != zone[v] or c in pris or v in pris: continue
            cases = self.porte(c, v)
            if any(p in self.fixe for p in cases): continue
            for x, y in cases: self.g[y][x] = '.'
            self.fixe |= set(cases); boucles += 1
        # entrée et sortie
        sx = X0 + dep[0] * PW + 2
        for y in range(Y0 + (ROWS - 1) * PH + 4, H - 1): self.g[y][sx] = '.'; self.g[y][sx + 1] = '.'; self.fixe |= {(sx, y), (sx + 1, y)}
        self.S = (sx, H - 1); self.g[H - 1][sx] = 'S'; self.g[H - 2][sx + 1] = 'Y'
        fx = X0 + fin[0] * PW + 2
        for y in range(2, Y0): self.g[y][fx] = '.'; self.fixe.add((fx, y))
        self.N = (fx, 1); self.g[1][fx] = 'N'
        self.fixe |= {(sx, Y0 + (ROWS - 1) * PH + 3), (fx, Y0)}
        # culs-de-sac : recoins, clé, objets
        culs = [c for c in cells if len(A[c]) == 1 and c not in (dep, fin) and c not in pris]
        r.shuffle(culs)
        self.importants = []
        def poser(lettre, filtre):
            for c in culs:
                if filtre(c):
                    culs.remove(c)
                    x, y = X0 + c[0] * PW + 2, Y0 + c[1] * PH + 1 + r.randint(0, 1)
                    self.g[y][x] = lettre; self.importants.append((x, y)); self.fixe |= {(x, y)} | set(voisins(x, y))
                    return True
            return False
        if not poser('x', lambda c: zone[c] == 0): raise Echec('pas de recoin au début')
        if not poser('z', lambda c: zone[c] == 3): raise Echec('pas de recoin à la fin')
        if self.n == 3: self.cle_gardee(A, dist, dep, fin, pris, chemin, culs, zone)
        lettres = list(OBJETS); r.shuffle(lettres)
        while lettres and poser(lettres[-1], lambda c: True): lettres.pop()
        if len(lettres) > 1: raise Echec('pas assez de culs-de-sac')
        self.petits_arbres()
        self.decorer()
        self.verifier()
        return self
    def cle_gardee(self, A, dist, dep, fin, pris, chemin, culs, zone):
        """la clé : dans le cul-de-sac le plus loin de la sortie, derrière des ronces bleues dont l'arbuste demande
        un grand détour"""
        r = self.r
        df = dist(fin)
        # loin de la sortie à vol d'oiseau, et loin aussi dans le labyrinthe
        for c in sorted((c for c in culs if c != dep), key=lambda c: -(abs(c[0] - fin[0]) * 6 + abs(c[1] - fin[1]) * 12 + df[c]))[:4]:
            v = next(iter(A[c]))
            gate = frozenset((c, v))
            cases = self.portes[gate]
            if any(self.at(*p) != '.' for p in cases): continue
            px = sum(x for x, _ in cases) / 4; py = sum(y for _, y in cases) / 4
            cote = dist(dep, {gate} | {g[0] for g in self.gates})
            cote_tout = dist(dep, {gate})
            dv = dist(v, {gate})
            cands = []
            for dx, dy in D4:
                for base in (c, v):
                    w = (base[0] + dx, base[1] + dy)
                    if w in (c, v, dep) or w in A[base] or w in pris or w not in cote_tout or dv.get(w, 0) < 6: continue
                    pos = min(self.dedans(*w), key=lambda p: abs(p[0] - px) + abs(p[1] - py))
                    if abs(pos[0] - px) > 6 or abs(pos[1] - py) > 4 or self.at(*pos) != '.': continue
                    cands.append((dv[w] + r.random(), w, pos))
            if not cands: continue
            _, w, pos = max(cands)
            culs.remove(c); pris.add(w)
            x, y = X0 + c[0] * PW + 2, Y0 + c[1] * PH + 1 + r.randint(0, 1)
            self.g[y][x] = 'K'; self.importants.append((x, y)); self.fixe |= {(x, y)} | set(voisins(x, y))
            self.g[pos[1]][pos[0]] = 'v'
            for p in cases: self.g[p[1]][p[0]] = 'n'
            self.fixe |= {pos} | set(voisins(*pos)) | set(cases)
            self.gates.append((gate, pos, cases, w, dv[w]))
            return
        raise Echec('pas de clé gardée')
    def petits_arbres(self):
        """de 5 à 10 petits arbres à couper (C), chacun ferme à lui seul un passage entre deux cellules"""
        r = self.r
        libres = [(g, cases) for g, cases in self.portes.items() if all(self.at(*p) == '.' for p in cases)]
        r.shuffle(libres)
        n = 0
        but = r.randint(5, 10)
        for g, cases in libres:
            if n >= but: break
            # les quatre cases : deux colonnes et deux lignes ; on ferme une travée par un arbre et une haie
            xs = sorted({p[0] for p in cases}); ys = sorted({p[1] for p in cases})
            if len(xs) == 2 and len(ys) == 2:
                (i, j), (i2, j2) = sorted(g)
                horiz = j == j2   # porte entre deux cellules côte à côte : on avance en x
                if horiz: arbre, haie = (xs[0], ys[0]), (xs[0], ys[1])
                else: arbre, haie = (xs[0], ys[0]), (xs[1], ys[0])
                if r.random() < 0.5: arbre, haie = haie, arbre
                self.g[arbre[1]][arbre[0]] = 'C'; self.g[haie[1]][haie[0]] = 'Y'
                n += 1
        if n < 5: raise Echec('pas assez de petits arbres')
    def marche(self, ouverts=''):
        vus, f = {self.S}, deque([self.S])
        while f:
            c = f.popleft()
            for v in voisins(*c):
                ch = self.at(*v)
                if v in vus or ch in MURS_PLANTE or ch in OBJETS or (ch in ARBUSTES + RONCES and ch not in ouverts): continue
                vus.add(v); f.append(v)
        return vus
    def ordre_ok(self):
        """les ronces s'ouvrent dans l'ordre : avant de couper la k-ième, on atteint ses ronces et son arbuste"""
        ouverts = ''
        for k, gate in enumerate(self.gates):
            v = self.marche(ouverts)
            if not any(t in v for t in voisins(*gate[1])): return False
            if not any(t in v for p in gate[2] for t in voisins(*p)): return False
            ouverts += ARBUSTES[k] + RONCES[k]
        return True
    def tout_atteint(self):
        v = self.marche(ARBUSTES + RONCES)
        return self.N in v and all(any(t in v for t in voisins(*p)) or p in v for p in self.importants) and all(p in v for p in self.fixe if self.at(*p) not in MURS_PLANTE and self.at(*p) not in OBJETS)
    def decorer(self):
        r = self.r
        sols = [(x, y) for y in range(2, H - 2) for x in range(1, W - 1) if self.g[y][x] == '.' and (x, y) not in self.fixe]
        r.shuffle(sols)
        for x, y in sols[:int(len(sols) * 0.2)]:
            self.g[y][x] = 'Y' if r.random() < 0.6 else 'u'
            if not self.tout_atteint() or not self.ordre_ok(): self.g[y][x] = '.'
        for y in range(2, H - 2):
            for x in range(1, W - 1):
                c = self.g[y][x]
                if c == 'Y' and r.random() < 0.12: self.g[y][x] = 'u'
                if c != '.' or (x, y) in self.importants: continue
                q = r.random()
                if (x, y) in self.fixe: self.g[y][x] = 'f' if q < 0.08 else '.'
                elif q < 0.4: self.g[y][x] = '"'
                elif q < 0.65: self.g[y][x] = 'h'
                elif q < 0.72: self.g[y][x] = 'f'
                elif q < 0.8 and self.at(x, y - 1) in 'Yu': self.g[y][x] = 'w'
    def verifier(self):
        """les ronces s'ouvrent dans l'ordre, et pas de sortie tant qu'il en reste"""
        ouverts = ''
        for k in range(3):
            v = self.marche(ouverts)
            if self.N in v: raise Echec('sortie sans couper')
            pos = self.gates[k][1]
            if not any(t in v for t in voisins(*pos)): raise Echec('arbuste hors d\'atteinte')
            ouverts += ARBUSTES[k] + RONCES[k]
        if self.n == 3:
            v = self.marche(ouverts); k = next((x, y) for y in range(H) for x in range(W) if self.g[y][x] == 'K')
            if any(t in v for t in voisins(*k)): raise Echec('clé sans couper')
            if not any(t in v for t in voisins(*self.gates[3][1])): raise Echec('arbuste bleu hors d\'atteinte')
            ouverts += 'vn'
        if self.N not in self.marche(ouverts) or not self.tout_atteint() or not self.ordre_ok(): raise Echec('décousu')

# =====================================================================================================================
def generer(cls, n, seed):
    global W, H
    W, H = getattr(cls, 'TAILLE', (60, 44))
    for essai in range(400):
        try:
            return cls(n, seed * 1000 + essai).faire()
        except Echec:
            continue
    raise SystemExit(f'pas de salle pour {cls.__name__}{n}')

def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    out = ['// Généré par tools/temple-chemins.py (graine %d) : les grandes salles des chemins du Temple des Éléments.' % seed,
           '// Un plan par salle (Feu et Plante : 60 × 44 ; Eau : 80 × 60, et 50 × 40 pour la 4e) ; on peut le retoucher à la main (relancer l\'outil l\'écrase).', '']
    for el, cls, nums in (('F', Feu, (1, 2, 3)), ('E', Eau, (1, 2, 3)), ('E', Fondmer, (4,)), ('P', Plante, (1, 2, 3))):
        for n in nums:
            s = generer(cls, n, seed * 10 + 'FEP'.index(el) * 3 + n)
            assert all(len(r) == W for r in s.g) and len(s.g) == H
            out.append(f'export const {el}{n} = [')
            out += ["  '" + ''.join(r).replace('\\', '\\\\').replace("'", "\\'") + "'," for r in s.g]
            out.append('];')
            info = {'F': lambda: 'poussées %s' % [c for _, _, c in s.puzzles], 'E': lambda: ('courants vers l\'îlot %d, vers la sortie %d' % (s.vers_ile, s.vers_sortie)) if n == 4 else 'rivières à prendre %d, bassins %d' % (s.rivieres, len(s.d)),
                    'P': lambda: 'détours %s, petits arbres %d' % ([g[4] for g in s.gates], sum(r.count('C') for r in s.g))}[el]()
            print(f'{el}{n}', info)
    open(SORTIE, 'w').write('\n'.join(out) + '\n')
    print('écrit', SORTIE)

main()
