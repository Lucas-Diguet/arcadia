#!/usr/bin/env python3
# tools/mont.py — dessine les dix grandes salles du Mont Givrécime (TestOdyssée, aventure solo) : une montagne enneigée
# qu'on gravit tantôt dedans (grottes), tantôt dehors (pentes, corniches). Chaque salle : des cavités ou des replats
# reliés par des galeries ou des sentiers qui tournent, des boucles, des culs-de-sac avec un objet au fond, plusieurs
# sorties vers d'autres salles (on peut monter par plusieurs chemins).
#   python3 tools/mont.py [graine]  → testodyssee/js/mont/plans.js
# Relancer l'outil écrase le fichier.
#
# Lettres :
#   # roche (falaise dehors)   . sol (neige dehors)   S arrivée au pied du mont
#   0-9 sorties (bord de la carte, échelle L dans une grotte, ou entrée de grotte G dans une falaise)
#   dehors : Y sapin, o rocher, " herbes enneigées (Pokémon sauvages), v rebord (on ne le passe qu'en descendant)
#   dedans : % rocher, & stalagmite, ~ eau (Surf), m rocher fissuré (Éclate-Roc), B rocher (Force)
#   t dresseur (regarde vers le bas), I J O P Q R U objets à ramasser
import random, sys, os, json
from collections import deque

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), 'testodyssee/js/mont/plans.js')
OBJETS = 'IJOPQRU'

# les dix salles : dehors (e) ou dedans (g), de bas en haut
SALLES = [
    ('e', 'Pied du Mont'), ('g', 'Grotte du Seuil'), ('e', 'Pentes Gelées'), ('g', 'Galerie des Stalactites'),
    ('g', 'Grotte du Vent'), ('e', 'Corniche du Blizzard'), ('g', 'Lac Gelé'), ('e', 'Arêtes Enneigées'),
    ('g', 'Cœur de Glace'), ('e', 'Sommet du Mont Givrécime'),
]
# liens : (salle basse, salle haute, sorte). bord : sentier au bord de la carte ; bouche : entrée de grotte dans
# une falaise (dehors) et sortie au bord de la grotte ; echelle : d'une grotte à l'autre
LIENS = [(0, 1, 'bouche'), (0, 2, 'bord'), (1, 2, 'bouche'), (1, 3, 'echelle'), (2, 4, 'bouche'), (3, 4, 'echelle'),
         (3, 5, 'bouche'), (4, 6, 'echelle'), (5, 6, 'bouche'), (5, 7, 'bord'), (6, 8, 'echelle'), (7, 8, 'bouche'),
         (8, 9, 'bouche'), (7, 9, 'bord')]

def voisins(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))

class Salle:
    def __init__(self, i, seed):
        self.i, (self.t, self.nom) = i, SALLES[i]
        self.dehors = self.t == 'e'
        self.W, self.H = (64, 48) if self.dehors else (58, 44)
        if i == 9: self.W, self.H = 52, 40
        self.r = random.Random(seed)
        self.g = [['#'] * self.W for _ in range(self.H)]
        self.fixe, self.importants, self.sorties = set(), [], {}
    def at(self, x, y): return self.g[y][x] if 0 <= x < self.W and 0 <= y < self.H else '#'
    def put(self, x, y, c):
        if 1 <= x < self.W - 1 and 1 <= y < self.H - 1: self.g[y][x] = c
    @property
    def murs(self): return set('#Yo%&tLGB')   # l'eau (Surf) et les rochers fissurés (Éclate-Roc) se passent

    def chambres(self):
        r, cs, W, H = self.r, [], self.W, self.H
        cols, rows = (4, 3) if self.i != 9 else (3, 3)
        for j in range(rows):
            for k in range(cols):
                if r.random() < 0.12 and len(cs) > 4: continue
                cx = int((k + 0.5) * W / cols + r.uniform(-3, 3)); cy = int((j + 0.5) * (H - 6) / rows + 3 + r.uniform(-2, 2))
                if self.dehors: rx, ry = r.randint(5, 7), r.randint(3, 5)
                else: rx, ry = r.randint(4, 6), r.randint(3, 4)
                cs.append([cx, cy, rx, ry])
        self.cs = cs
        for cx, cy, rx, ry in cs:
            for y in range(cy - ry - 1, cy + ry + 2):
                for x in range(cx - rx - 1, cx + rx + 2):
                    if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + r.uniform(-0.25, 0.15): self.put(x, y, '.')
        n = len(cs); d = lambda a, b: abs(cs[a][0] - cs[b][0]) + abs(cs[a][1] - cs[b][1])
        dedans, self.arbre = {0}, []
        while len(dedans) < n:
            a, b = min(((a, b) for a in dedans for b in range(n) if b not in dedans), key=lambda e: d(*e))
            self.arbre.append((a, b)); dedans.add(b)
        A = {q: set() for q in range(n)}
        for a, b in self.arbre: A[a].add(b); A[b].add(a)
        proches = sorted(((a, b) for a in A for b in A if a < b and b not in A[a]), key=lambda e: d(*e))
        self.boucles = [e for e in proches[:4] if r.random() < 0.7]
        self.A = A

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

    def dans_chambre(self, x, y):
        return any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.3 for cx, cy, rx, ry in self.cs)

    def bfs(self, depart):
        vus, f = {depart}, deque([depart])
        M = self.murs
        while f:
            x, y = f.popleft()
            for tx, ty in voisins(x, y):
                c = self.at(tx, ty)
                if c in M: continue
                if c == 'v':
                    if ty != y + 1: continue
                    ty += 1
                    if self.at(tx, ty) in M or self.at(tx, ty) == 'v': continue
                if (tx, ty) in vus: continue
                vus.add((tx, ty)); f.append((tx, ty))
        return vus

    def tout_atteint(self):
        """depuis chaque sortie, on atteint toutes les autres et tout ce qui compte (rebords pris en descendant)"""
        departs = [a for a, _ in self.sorties.values()]
        for dep in departs[:2]:
            v = self.bfs(dep)
            if not all(p in v for p in departs + self.importants): return False
        return True

    def essai(self, cases, c):
        avant = [(x, y, self.g[y][x]) for x, y in cases]
        for x, y in cases: self.g[y][x] = c
        if not self.tout_atteint():
            for x, y, v in avant: self.g[y][x] = v
            return False
        return True

    def construire(self):
        r = self.r
        self.chambres()
        large = (2, 3) if self.dehors else (1, 2)
        for a, b in self.arbre: self.galerie(a, b, r.choice(large))
        self.boucles_faites = []
        for a, b in self.boucles:
            self.boucles_faites.append((a, b, self.galerie(a, b, 1 if not self.dehors else 2)))

    # ---------- sorties ----------
    def chambre_vers(self, cote, exclure=()):
        cs = [q for q in range(len(self.cs)) if q not in exclure] or list(range(len(self.cs)))
        cle = {'haut': lambda q: self.cs[q][1], 'bas': lambda q: -self.cs[q][1], 'gauche': lambda q: self.cs[q][0], 'droite': lambda q: -self.cs[q][0]}[cote]
        return min(cs, key=lambda q: cle(q) + self.r.uniform(0, 4))

    def sortie_bord(self, chiffre, cote, utilisees):
        q = self.chambre_vers(cote, utilisees); utilisees.add(q)
        cx, cy = self.cs[q][:2]
        if cote in ('haut', 'bas'):
            x = cx + self.r.randint(-2, 2); y0, y1 = (0, cy) if cote == 'haut' else (cy, self.H - 1)
            for y in range(y0, y1 + 1): self.g[y][x] = '.' if 0 < y < self.H - 1 else self.g[y][x]
            y = 0 if cote == 'haut' else self.H - 1
            self.g[y][x] = chiffre; arr = (x, 1 if cote == 'haut' else self.H - 2)
            self.fixe |= {(x, yy) for yy in range(min(y0, y1), max(y0, y1) + 1)}
        else:
            y = cy + self.r.randint(-1, 1); x0, x1 = (0, cx) if cote == 'gauche' else (cx, self.W - 1)
            for x in range(x0, x1 + 1):
                if 0 < x < self.W - 1: self.g[y][x] = '.'
            x = 0 if cote == 'gauche' else self.W - 1
            self.g[y][x] = chiffre; arr = (1 if cote == 'gauche' else self.W - 2, y)
            self.fixe |= {(xx, y) for xx in range(min(x0, x1), max(x0, x1) + 1)}
        self.sorties[chiffre] = (arr, (x, y))

    def sortie_bouche(self, chiffre, cote, utilisees):
        """une entrée de grotte dans une falaise : la porte en bas d'un bloc de roche de 5 × 3, un replat devant"""
        essayees = set(utilisees)
        for _ in range(300):
            q = self.chambre_vers(cote, essayees)
            cx, cy, rx, ry = self.cs[q]
            x = cx + self.r.randint(-rx + 2, rx - 2)
            # on remonte jusqu'à la falaise au nord du replat
            y = cy
            while self.at(x, y - 1) == '.': y -= 1
            dy = y - 1
            bloc = [(x + i, dy - j) for i in range(-2, 3) for j in range(0, 3)]
            if all(self.at(a, b) == '#' and 1 <= a < self.W - 1 and 1 <= b for a, b in bloc) and \
               all(self.at(x + i, dy - 3) == '#' or dy - 3 < 1 for i in range(-2, 3)) and self.at(x, y) == '.' and self.at(x, y + 1) == '.':
                self.g[dy][x] = chiffre
                for a, b in bloc: self.fixe.add((a, b))
                self.fixe |= {(x, y), (x, y + 1), (x - 1, y), (x + 1, y)}
                self.sorties[chiffre] = ((x, y), (x, dy)); self.bouches = getattr(self, 'bouches', []) + [(x, dy)]
                utilisees.add(q)
                return True
            essayees.add(q)
            if len(essayees) >= len(self.cs): essayees = set()
        return False

    def sortie_echelle(self, chiffre, cote, utilisees):
        essayees = set(utilisees)
        for _ in range(200):
            q = self.chambre_vers(cote, essayees)
            cx, cy, rx, ry = self.cs[q]
            x, y = cx + self.r.randint(-rx + 1, rx - 1), cy + self.r.randint(-ry + 1, ry - 2)
            if all(self.at(a, b) == '.' for a, b in ((x, y), (x, y + 1), (x - 1, y), (x + 1, y))):
                self.g[y][x] = chiffre; self.fixe |= {(x, y), (x, y + 1)}
                self.sorties[chiffre] = ((x, y + 1), (x, y)); utilisees.add(q)
                return True
            essayees.add(q)
            if len(essayees) >= len(self.cs): essayees = set()
        return False

def alcove(s, mini=5):
    r = s.r
    bords = [(x, y) for y in range(3, s.H - 3) for x in range(3, s.W - 3) if s.g[y][x] == '.' and (x, y) not in s.fixe and any(s.at(a, b) == '#' for a, b in voisins(x, y))]
    for _ in range(80):
        x, y = r.choice(bords)
        dx, dy = r.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        if s.at(x + dx, y + dy) != '#': continue
        pts, cx, cy = [], x, y
        for _k in range(r.randint(mini, mini + 8)):
            if r.random() < 0.3: dx, dy = r.choice([(dy, dx), (-dy, -dx)])
            nx, ny = cx + dx, cy + dy
            if not (2 <= nx < s.W - 2 and 3 <= ny < s.H - 3): break
            if any(s.at(a, b) != '#' and (a, b) != (cx, cy) and (a, b) not in pts for a, b in voisins(nx, ny)): break
            if s.at(nx, ny) != '#' or (nx, ny) in s.fixe: break
            pts.append((nx, ny)); cx, cy = nx, ny
        if len(pts) >= mini:
            for a, b in pts: s.g[b][a] = '.'
            s.fixe |= set(pts)
            return pts[-1]
    return None

def generer(i, seed):
    t = SALLES[i][0]
    liens = [(k, l) for k, l in enumerate(LIENS) if i in l[:2]]
    for essai in range(400):
        s = Salle(i, seed * 1000 + essai)
        s.construire()
        ok, utilisees = True, set()
        # l'arrivée au pied du mont
        if i == 0:
            s.sortie_bord('S', 'bas', utilisees)
        for k, (a, b, sorte) in liens:
            chiffre = str(k % 10) if k < 10 else 'abcd'[k - 10]
            monte = i == a   # on part vers la salle du dessus
            if sorte == 'bord':
                cote = ('haut' if s.r.random() < 0.6 else s.r.choice(['gauche', 'droite'])) if monte else 'bas'
                s.sortie_bord(chiffre, cote, utilisees)
            elif sorte == 'echelle':
                ok = s.sortie_echelle(chiffre, 'haut' if monte else 'bas', utilisees)
            else:
                if s.dehors: ok = s.sortie_bouche(chiffre, 'haut' if monte else 'bas', utilisees)
                else: s.sortie_bord(chiffre, 'haut' if monte else 'bas', utilisees)
            if not ok: break
        if not ok: continue
        # un rebord par boucle dehors (raccourci vers le bas), un obstacle sur une boucle dedans (passage à ouvrir)
        for a, b, pts in s.boucles_faites:
            vert = [(x, y) for (x, y), (x2, y2) in zip(pts, pts[1:]) if x2 == x and y2 == y + 1 and not s.dans_chambre(x, y) and (x, y) not in s.fixe]
            if len(vert) < 3: continue
            x, y = vert[len(vert) // 2]
            if s.dehors:
                ligne = [(x + dx, y) for dx in range(-1, 3) if s.at(x + dx, y) == '.']
                if s.at(x, y - 1) == '.' and s.at(x, y + 1) == '.':
                    for p in ligne: s.g[p[1]][p[0]] = 'v'
                    s.fixe |= set(ligne) | {(x, y - 1), (x, y + 1)}
                    s.importants.append((x, y - 1))
            else:
                c = s.r.choice('mB~')
                if c == '~':
                    for yy in range(y - 1, y + 2):
                        for xx in range(x - 1, x + 3):
                            if s.at(xx, yy) == '.' and (xx, yy) not in s.fixe: s.g[yy][xx] = '~'
                else: s.g[y][x] = c
        if not s.tout_atteint(): continue
        # objets : culs-de-sac (cavités à une seule galerie), puis tunnels creusés dans la roche
        culs = [q for q in s.A if len(s.A[q]) == 1]
        lettres = list(s.r.sample(OBJETS, 5)); s.r.shuffle(lettres)
        for q in culs:
            x, y = s.cs[q][:2]
            if lettres and s.at(x, y) == '.' and (x, y) not in s.fixe: s.g[y][x] = lettres.pop(); s.fixe.add((x, y)); s.importants.append((x, y))
        for _ in range(20):
            if not lettres: break
            bout = alcove(s)
            if bout: x, y = bout; s.g[y][x] = lettres.pop(); s.importants.append(bout)
        if lettres or not s.tout_atteint(): continue
        # dresseurs : dans des cavités, pas sur un passage obligé
        nb, places = (2 if i == 9 else 3), []
        for q in s.r.sample(range(len(s.cs)), len(s.cs)):
            if len(places) >= nb: break
            cx, cy, rx, ry = s.cs[q]
            for _ in range(10):
                x, y = cx + s.r.randint(-rx + 1, rx - 1), cy + s.r.randint(-ry + 1, ry - 1)
                if s.at(x, y) == '.' and (x, y) not in s.fixe and s.at(x, y + 1) == '.' and s.essai([(x, y)], 't'):
                    s.fixe |= {(x, y), (x, y + 1)}; s.importants.append((x, y + 1)); places.append((x, y)); break
        if len(places) < nb: continue
        decorer(s)
        if not s.tout_atteint(): continue
        return s
    raise SystemExit(f'pas de salle {i}')

def decorer(s):
    r = s.r
    sols = lambda: [(x, y) for y in range(2, s.H - 2) for x in range(1, s.W - 1) if s.g[y][x] == '.' and (x, y) not in s.fixe]
    if s.dehors:
        # des sapins contre les falaises, des rochers, et de grandes plaques d'herbes enneigées
        for x, y in r.sample(sols(), min(110, len(sols()))):
            if sum(s.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: s.essai([(x, y)], 'Y' if r.random() < 0.7 else 'o')
        for cx, cy, rx, ry in s.cs:
            if r.random() < 0.75:
                px, py = cx + r.randint(-2, 2), cy + r.randint(-1, 1)
                for y in range(py - 2, py + 3):
                    for x in range(px - 3, px + 4):
                        if s.at(x, y) == '.' and (x, y) not in s.fixe and ((x - px) / 3.5) ** 2 + ((y - py) / 2.5) ** 2 <= 1: s.g[y][x] = '"'
            for _ in range(r.randint(1, 3)):
                x, y = cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1)
                if s.at(x, y) == '.' and (x, y) not in s.fixe: s.essai([(x, y)], r.choice('YYo'))
    else:
        # pas d'eau autour des sorties, des dresseurs et des objets : on y arrive à pied
        proches = {(x + dx, y + dy) for y in range(s.H) for x in range(s.W) if s.g[y][x] not in '.#' or (x, y) in s.fixe for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
        libre = lambda x, y: (x, y) not in proches
        for x, y in r.sample(sols(), min(70, len(sols()))):
            if sum(s.at(a, b) == '#' for a, b in voisins(x, y)) >= 1: s.essai([(x, y)], r.choice('%&&'))
        # des lacs dans quelques cavités (le Lac Gelé en est plein)
        for cx, cy, rx, ry in s.cs:
            if r.random() < (0.8 if s.i == 6 else 0.2):
                lac = [(x, y) for y in range(cy - ry, cy + ry + 1) for x in range(cx - rx, cx + rx + 1)
                       if ((x - cx) / max(1, rx - 1)) ** 2 + ((y - cy) / max(1, ry - 1)) ** 2 <= 1 and s.at(x, y) == '.' and libre(x, y)]
                s.essai(lac, '~')
            for _ in range(r.randint(0, 2)):
                x, y = cx + r.randint(-rx + 1, rx - 1), cy + r.randint(-ry + 1, ry - 1)
                if s.at(x, y) == '.' and (x, y) not in s.fixe: s.essai([(x, y)], '%')

def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    salles = []
    for i in range(len(SALLES)):
        s = generer(i, seed * 10 + i)
        txt = ''.join(''.join(r) for r in s.g)
        print(i, s.nom, f'{s.W}×{s.H}', 'sorties', ''.join(sorted(k for k in s.sorties if k != 'S')), 'objets', sum(txt.count(c) for c in OBJETS), 'dresseurs', txt.count('t'), 'rebords', txt.count('v'))
        salles.append({'nom': s.nom, 'dehors': s.dehors, 'plan': [''.join(r) for r in s.g]})
    liens = [[a, b, sorte, str(k) if k < 10 else 'abcd'[k - 10]] for k, (a, b, sorte) in enumerate(LIENS)]
    out = ['// Généré par tools/mont.py (graine %d) : les dix salles du Mont Givrécime. Relancer l\'outil écrase le fichier.' % seed,
           '// liens : [salle basse, salle haute, sorte, sortie] ; la sortie porte la même marque dans les deux salles.', '',
           'export const LIENS = ' + json.dumps(liens) + ';', '', 'export const SALLES = [']
    for s in salles:
        out.append('  { nom: %s, dehors: %s, plan: [' % (json.dumps(s['nom'], ensure_ascii=False), 'true' if s['dehors'] else 'false'))
        out += ['    ' + json.dumps(r) + ',' for r in s['plan']]
        out.append('  ] },')
    out.append('];')
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    open(SORTIE, 'w').write('\n'.join(out) + '\n')
    print('écrit', SORTIE)

main()
