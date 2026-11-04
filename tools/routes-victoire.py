#!/usr/bin/env python3
# tools/routes-victoire.py — recopie les Routes Victoire de Vert Feuille et d'Émeraude case par case, à partir des
# décompilations pret (pokefirered, pokeemerald), dans testodyssee/js/rv/donnees.js.
#   python3 tools/routes-victoire.py chemin/pokefirered chemin/pokeemerald
# On garde le plan d'origine : murs, sol, hauteurs (plateaux et ponts), rebords, eau, cascades, échelles,
# dresseurs (équipes, attaques, objets), objets au sol et cachés, rochers, rochers fissurés, boutons et barrières,
# trous, rencontres sauvages, maître des capacités. Les textes des dresseurs sont traduits à la main dans rv/textes.js.
import json, re, struct, sys, os

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
SORTIE = os.path.join(RACINE, 'testodyssee/js/rv/donnees.js')

# --- données d'Odyssée : numéros des espèces et des attaques ---
def lire_odyssee():
    sp = {}
    for m in re.finditer(r'"(\d+)":\{"n":"[^"]*","k":"([^"]+)"', open(os.path.join(RACINE, 'odyssee/js/data/species.js')).read()):
        sp.setdefault(m.group(2), int(m.group(1)))
    mv = set(m.group(1) for m in re.finditer(r'"key":"([^"]+)"', open(os.path.join(RACINE, 'odyssee/js/data/moves.js')).read()))
    mv |= set(m.group(1) for m in re.finditer(r"\d+: \{ id: \d+, key: '([^']+)'", open(os.path.join(RACINE, 'testodyssee/js/contenu.js')).read()))   # attaques du labo
    return sp, mv
ESPECES, ATTAQUES = lire_odyssee()

NOMS_ESPECES = {'NIDORAN_F': 'nidoran-f', 'NIDORAN_M': 'nidoran-m', 'MR_MIME': 'mr-mime', 'FARFETCHD': 'farfetchd', 'HO_OH': 'ho-oh'}
NOMS_ATTAQUES = {
    'FAINT_ATTACK': 'feint-attack', 'HI_JUMP_KICK': 'high-jump-kick', 'SMELLING_SALT': 'smelling-salts', 'SELFDESTRUCT': 'self-destruct',
    'SOFTBOILED': 'soft-boiled', 'THUNDERPUNCH': 'thunder-punch', 'DOUBLESLAP': 'double-slap', 'SONICBOOM': 'sonic-boom',
    'POISONPOWDER': 'poison-powder', 'SOLARBEAM': 'solar-beam', 'DRAGONBREATH': 'dragon-breath', 'EXTREMESPEED': 'extreme-speed',
    'ANCIENTPOWER': 'ancient-power', 'DYNAMICPUNCH': 'dynamic-punch', 'VICE_GRIP': 'vise-grip', 'THUNDERSHOCK': 'thunder-shock',
    'SAND_ATTACK': 'sand-attack', 'CONVERSION_2': 'conversion-2', 'PSYCHO_BOOST': 'psycho-boost', 'BUBBLEBEAM': 'bubble-beam',
}
def espece(nom):
    k = NOMS_ESPECES.get(nom, nom.lower().replace('_', '-'))
    if k not in ESPECES: raise SystemExit(f'espèce inconnue : {nom}')
    return ESPECES[k]
def attaque(nom):
    k = NOMS_ATTAQUES.get(nom, nom.lower().replace('_', '-'))
    if k not in ATTAQUES: ABSENTES.add(k); return None   # pas dans Odyssée (null) : remplacée en jeu par une attaque apprise au niveau
    return k
ABSENTES = set()

# objets du jeu d'origine → objets d'Odyssée ou du labo (rv : ajoutés par le labo)
CT = {'TM02': 'dragon-claw', 'TM07': 'hail', 'TM37': 'sandstorm', 'TM50': 'overheat', 'TM_PSYCHIC': 'psychic'}
NUM_CT = {'TM02': 2, 'TM07': 7, 'TM37': 37, 'TM50': 50, 'TM_PSYCHIC': 29}
def objet(nom):
    nom = nom.replace('ITEM_', '')
    if nom in CT: return f'ct{NUM_CT[nom]:02d}-rv'
    return nom.lower().replace('_', '-')

# --- lecture d'une carte de génération 3 ---
def comportements(h):
    noms, i = {}, 0
    txt = open(h).read()
    for m in re.finditer(r'#define (MB_\w+)\s+(0x[0-9A-Fa-f]+|\d+)', txt): noms[int(m.group(2), 0)] = m.group(1)
    if not noms:
        for m in re.finditer(r'\b(MB_\w+)\s*(?:=\s*(0x[0-9A-Fa-f]+|\d+))?\s*,', txt):
            if m.group(2): i = int(m.group(2), 0)
            noms[i] = m.group(1); i += 1
    return noms

def carte(R, fr, nom):
    L = next(l for l in json.load(open(R + '/data/layouts/layouts.json'))['layouts'] if l.get('name') == nom + '_Layout')
    w, h = L['width'], L['height']
    data = open(R + '/' + L['blockdata_filepath'], 'rb').read()
    gen = open(R + '/data/tilesets/primary/general/metatile_attributes.bin', 'rb').read()
    cav = open(R + '/data/tilesets/secondary/cave/metatile_attributes.bin', 'rb').read()
    taille, prim = (4, 640) if fr else (2, 512)
    noms = comportements(R + '/include/constants/metatile_behaviors.h')
    def comp(mt):
        b, off = (gen, mt) if mt < prim else (cav, mt - prim)
        if (off + 1) * taille > len(b): return '?'
        v = struct.unpack_from('<I' if fr else '<H', b, off * taille)[0]
        return noms.get(v & (0x1FF if fr else 0xFF), '?')
    g = [[None] * w for _ in range(h)]
    for i in range(w * h):
        v = struct.unpack_from('<H', data, 2 * i)[0]
        g[i // w][i % w] = (v >> 10 & 3, v >> 12, comp(v & 0x3FF))
    return w, h, g, json.load(open(R + f'/data/maps/{nom}/map.json'))

# --- scripts ---
def blocs(*fichiers):
    out, cur = {}, None
    for f in fichiers:
        if not os.path.exists(f): continue
        for l in open(f, encoding='utf-8'):
            m = re.match(r'^(\w+)::?\s*$', l)
            if m: cur = m.group(1); out[cur] = []; continue
            if cur: out[cur].append(l.strip())
    return out
def texte(B, label):
    s = ''.join(re.findall(r'\.string "(.*)"', '\n'.join(B.get(label, []))))
    return s.replace('\\n', ' ').replace('\\l', ' ').replace('\\p', ' / ').replace('$', '').replace('{PLAYER}', 'TOI')

def struct_c(txt, nom):
    m = re.search(r'\[' + nom + r'\]\s*=\s*\{(.*?)\n\s*\},', txt, re.S)
    return m.group(1) if m else None

def equipe(parties, label):
    m = re.search(r'\b' + label + r'\[\]\s*=\s*\{(.*?)\n\};', parties, re.S)
    out = []
    for b in re.findall(r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', m.group(1)):
        lvl = int(re.search(r'\.lvl\s*=\s*(\d+)', b).group(1)); sp = re.search(r'\.species\s*=\s*SPECIES_(\w+)', b).group(1)
        iv = int(re.search(r'\.iv\s*=\s*(\d+)', b).group(1))
        mv = re.search(r'\.moves\s*=\s*\{([^}]*)\}', b)
        it = re.search(r'\.heldItem\s*=\s*ITEM_(\w+)', b)
        e = [espece(sp), lvl, [attaque(x.strip()[5:]) for x in mv.group(1).split(',') if x.strip() and x.strip() != 'MOVE_NONE'] if mv else None,
             objet(it.group(1)) if it and it.group(1) != 'NONE' else None, round(iv * 31 / 255)]
        while e and e[-1] is None: e.pop()
        out.append(e)
    return out

CLASSES = {
    'COOLTRAINER': ('Topdresseur', 'Topdresseuse'), 'POKEMANIAC': ('Pokémaniac',), 'BLACK_BELT': ('Karatéka',), 'JUGGLER': ('Jongleur',),
    'TAMER': ('Dompteur',), 'COOL_COUPLE': ('Duo Topdresseurs',), 'RIVAL': ('Dresseur',), 'PKMN_TRAINER_3': ('Dresseur',),
}
DEGUISEMENTS = {
    'COOLTRAINER_M': 'topdresseur', 'COOLTRAINER_F': 'topdresseuse', 'MAN_3': 'topdresseur', 'WOMAN_5': 'topdresseuse', 'POKE_MANIAC': 'scientifique',
    'BLACK_BELT': 'karateka', 'ROCKER': 'habitant', 'MAN': 'montagnard', 'WALLY': 'gamin',
}
NOMS = {'WALLY': 'Timmy'}
def dresseur(trainers, parties, cst):
    t = struct_c(trainers, cst)
    cls = re.search(r'TRAINER_CLASS_(\w+)', t).group(1); fem = 'FEMALE' in t
    c = CLASSES.get(cls, (cls.title(),)); c = c[1] if fem and len(c) > 1 else c[0]
    nom = re.search(r'trainerName\s*=\s*_\("([^"]*)"\)', t).group(1)
    nom = NOMS.get(nom, ' & '.join(p.capitalize() for p in nom.split(' & ')))
    items = {}
    for i in re.findall(r'ITEM_(\w+)', re.search(r'\.items\s*=\s*\{([^}]*)\}', t).group(1) if re.search(r'\.items\s*=\s*\{', t) else ''):
        if i != 'NONE': items[objet(i)] = items.get(objet(i), 0) + 1
    party = re.search(r'\.party\s*=\s*\w+\((\w+)\)', t).group(1)
    return {'id': cst[8:].lower(), 'cls': c, 'nom': nom, 'items': items, 'equipe': equipe(parties, party), 'duo': 'doubleBattle = TRUE' in t}

DIRS = {'DOWN': 'down', 'UP': 'up', 'LEFT': 'left', 'RIGHT': 'right'}
def direction(mt):
    m = re.search(r'FACE_(DOWN|UP|LEFT|RIGHT)', mt)
    return DIRS[m.group(1)] if m else 'down'

def convertir(R, fr, jeu, noms, etiquettes, extra):
    B = blocs(*[R + f'/data/maps/{n}/scripts.inc' for n in noms], *[R + f'/data/maps/{n}/text.inc' for n in noms], R + '/data/scripts/item_ball_scripts.inc')
    trainers = open(R + '/src/data/trainers.h').read(); parties = open(R + '/src/data/trainer_parties.h').read()
    sauv = {e['base_label']: e for g in json.load(open(R + '/src/data/wild_encounters.json'))['wild_encounter_groups'] for e in g['encounters'] if 'base_label' in e}
    cartes = {n: carte(R, fr, n) for n in noms}
    textes = {}
    etages = []
    for n in noms:
        w, h, g, ev = cartes[n]
        sol, haut, rangs = [], [], []
        for y in range(h):
            s, e = '', ''
            for x in range(w):
                col, el, b = g[y][x]
                c = '#' if col else '.'
                if b == 'MB_JUMP_SOUTH': c = 'v'
                elif b in ('MB_JUMP_WEST', 'MB_JUMP_SOUTHWEST'): c = '<'
                elif b in ('MB_JUMP_EAST', 'MB_JUMP_SOUTHEAST'): c = '>'
                elif b == 'MB_WATERFALL': c = '|'
                elif 'WATER' in b: c = '~'
                elif not col and b.startswith('MB_IMPASSABLE_NORTH'): c = 'n'
                elif not col and el == 15: c = '='
                s += c; e += '0123456789abcdef'[el]
            sol.append(s); haut.append(e)
        # on retire les colonnes et les lignes de murs en trop à droite et en bas (les coordonnées ne changent pas)
        utiles = [(x, y) for y in range(h) for x in range(w) if sol[y][x] != '#']
        w2, h2 = min(w, max(x for x, _ in utiles) + 3), min(h, max(y for _, y in utiles) + 3)
        sol = [r[:w2] for r in sol[:h2]]; haut = [r[:w2] for r in haut[:h2]]
        E = {'id': n, 'w': w2, 'h': h2, 'sol': sol, 'haut': haut, 'dresseurs': [], 'objets': [], 'caches': [], 'rochers': [], 'roches': [],
             'boutons': [], 'trous': [], 'liens': [], 'sorties': [], 'pnj': []}
        # liens entre étages (échelles, trous, sorties)
        for o in ev['warp_events']:
            col, el, b = g[o['y']][o['x']]
            d = o['dest_map']
            cible = next((k for k in noms if 'MAP_' + re.sub(r'([a-z])([A-Z0-9])', r'\1_\2', k).upper() == d), None)
            if cible:
                to = cartes[cible][3]['warp_events'][int(o['dest_warp_id'])]
                lien = {'x': o['x'], 'y': o['y'], 'vers': cible, 'vx': to['x'], 'vy': to['y'], 'z': to['elevation']}
                (E['trous'] if b == 'MB_FALL_WARP' else E['liens']).append(lien)
            else:
                E['sorties'].append({'x': o['x'], 'y': o['y'], 'z': o['elevation'], 'vers': d})
        for o in ev['object_events']:
            gid, x, y, sc = o['graphics_id'][14:], o['x'], o['y'], o['script']
            if gid == 'PUSHABLE_BOULDER':
                r = [x, y]
                if o.get('flag', '').endswith('2F_BOULDER'): r.append('cache')   # tombe de l'étage du dessus
                E['rochers'].append(r)
            elif gid == 'BREAKABLE_ROCK': E['roches'].append([x, y])
            elif gid == 'ITEM_BALL':
                it = next(re.search(r'ITEM_(\w+)', l).group(0) for l in B[sc] if 'finditem' in l)
                E['objets'].append([x, y, objet(it)])
            elif sc.endswith('Tutor'):
                E['pnj'].append({'x': x, 'y': y, 'dir': direction(o['movement_type']), 'ow': DEGUISEMENTS.get(gid, 'habitant'), 'tuteur': 'double-edge', 'id': sc.split('EventScript_')[-1]})
            elif 'TRAINER_TYPE_NORMAL' in o.get('trainer_type', ''):
                l = next(l for l in B[sc] if l.startswith('trainerbattle'))
                a = [p.strip() for p in l.split(None, 1)[1].split(',')]
                T = dresseur(trainers, parties, a[0])
                T.update({'x': x, 'y': y, 'dir': direction(o['movement_type']), 'vue': int(o['trainer_sight_or_berry_tree_id']), 'ow': DEGUISEMENTS.get(gid, 'topdresseur')})
                post = next((re.search(r'msgbox (\w+)', q).group(1) for q in B[sc] if q.startswith('msgbox')), None)
                cle = sc.split('EventScript_')[-1]
                T['texte'] = cle
                textes[cle] = {'intro': texte(B, a[1]), 'perd': texte(B, a[2]), 'apres': texte(B, post) if post else ''}
                E['dresseurs'].append(T)
        for o in ev.get('bg_events', []):
            if o['type'] == 'hidden_item': E['caches'].append([o['x'], o['y'], objet(o['item'])])
        # boutons : le script de la case pose le sol à la place de la barrière
        for o in ev.get('coord_events', []):
            sc = o['script']
            if 'FloorSwitch' in sc:
                cases = [[int(a), int(b)] for a, b in (re.match(r'setmetatile (\d+), (\d+)', l).groups() for l in B[sc] if l.startswith('setmetatile'))]
                E['boutons'].append({'x': o['x'], 'y': o['y'], 'ouvre': cases})
        E.update(extra.get(n, {}))
        # rencontres : les taux fixes de la génération 3
        S = sauv.get(etiquettes[n], {})
        if 'land_mons' in S: E['sauvages'] = [[espece(m['species'][8:]), m['min_level'], m['max_level'], p] for m, p in zip(S['land_mons']['mons'], [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1])]
        if 'water_mons' in S: E['surf'] = [[espece(m['species'][8:]), m['min_level'], m['max_level'], p] for m, p in zip(S['water_mons']['mons'], [60, 30, 5, 4, 1])]
        etages.append(E)
    return etages, textes

def main():
    frlg, em = sys.argv[1], sys.argv[2]
    # Émeraude : Timmy attend à l'entrée du 1F (deux cases de déclenchement)
    def wally():
        trainers = open(em + '/src/data/trainers.h').read(); parties = open(em + '/src/data/trainer_parties.h').read()
        T = dresseur(trainers, parties, 'TRAINER_WALLY_VR_1'); T.update({'ow': 'gamin', 'texte': 'Wally'})
        return T
    vf, tvf = convertir(frlg, True, 'vf', ['VictoryRoad_1F', 'VictoryRoad_2F', 'VictoryRoad_3F'],
                        {'VictoryRoad_1F': 'sVictoryRoad1F_LeafGreen', 'VictoryRoad_2F': 'sVictoryRoad2F_LeafGreen', 'VictoryRoad_3F': 'sVictoryRoad3F_LeafGreen'}, {})
    emd, tem = convertir(em, False, 'em', ['VictoryRoad_1F', 'VictoryRoad_B1F', 'VictoryRoad_B2F'],
                         {'VictoryRoad_1F': 'gVictoryRoad_1F', 'VictoryRoad_B1F': 'gVictoryRoad_B1F', 'VictoryRoad_B2F': 'gVictoryRoad_B2F'},
                         {'VictoryRoad_1F': {'declencheurs': [{'cases': [[2, 23], [3, 23]], 'depart': [[12, 24], [12, 24]], 'arrivee': [[2, 24], [3, 24]], 'dresseur': wally()}]}})
    out = {'vf': {'nom': 'Vert Feuille', 'etages': vf}, 'em': {'nom': 'Émeraude', 'etages': emd}}
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, 'w') as f:
        f.write('// Généré par tools/routes-victoire.py à partir des décompilations pret (pokefirered, pokeemerald) — ne pas modifier à la main.\n')
        f.write('// sol : # mur, . sol, n sol fermé au nord, = pont, ~ eau, | cascade, v < > rebords ; haut : hauteur de chaque case (génération 3).\n')
        f.write('export const RV = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')).replace('"etages":[', '"etages":[\n').replace('},{"id"', '},\n{"id"') + ';\n')
    json.dump({'vf': tvf, 'em': tem}, open('/tmp/rv-textes.json', 'w'), ensure_ascii=False, indent=1)
    print('attaques absentes d\'Odyssée :', ', '.join(sorted(ABSENTES)))
    print('écrit', SORTIE, os.path.getsize(SORTIE), 'octets ; textes anglais dans /tmp/rv-textes.json')

main()
