#!/usr/bin/env python3
# PixelForge — l'armurerie de la maison de la vieille dame (Bois des Contes) : armure sur pied (32 px par case, densité 2),
# râtelier d'armes et enclume (16 px par case, comme les jouets des chambres), dans testodyssee/img/contes/.
# python3 tools/pixelforge/armurerie.py
import os
from pixel import Toile, hexa, planche

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, '..', '..', 'testodyssee', 'img', 'contes')
C = hexa('#17141f')
ACIER = [hexa(c) for c in ('#4a5064', '#7a8298', '#aab2c4', '#dfe4ee')]
BOIS = [hexa(c) for c in ('#3a2414', '#5a3a22', '#7a5230')]
OR = hexa('#d8b048'); ROUGE = hexa('#9a1c24'); ROUGE2 = hexa('#6a1018')


def armure():
    """armure sur pied, à 32 px par case (densité 2) : heaume à visière et plumet, cotte de mailles, cuirasse, tabard rouge
    à la croix d'or, gantelets sur la garde d'une épée plantée devant, socle de bois ; lumière en haut à gauche"""
    W, H = 32, 60
    t = Toile(W, H)
    A = [hexa(c) for c in ('#3a3f52', '#5c647c', '#8a93ab', '#b8c0d2', '#e8ecf4')]
    M = [hexa(c) for c in ('#4a4e5c', '#6a7080')]
    TAB = [hexa(c) for c in ('#5a0c14', '#8a1820', '#b02830')]
    cx = 16
    def ombre(x0, y0, x1, y1, R, gauche=1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                f = (x - x0) / max(1, x1 - x0)
                t.p(x, y, R[3] if f < 0.2 * gauche else R[2] if f < 0.6 else R[1])
    # socle
    t.rect(7, 55, 24, 58, BOIS[1]); t.hline(7, 24, 55, BOIS[2]); t.hline(7, 24, 58, BOIS[0])
    # jambes : grèves, genouillères, solerets
    for x0 in (10, 17):
        ombre(x0, 42, x0 + 4, 53, A)
        t.rect(x0, 45, x0 + 4, 46, A[3]); t.p(x0 + 2, 45, A[4])
        t.rect(x0 - 1, 53, x0 + 5, 54, A[1]); t.hline(x0 - 1, x0 + 5, 53, A[2])
    # tabard rouge sur les cuisses
    t.rect(11, 34, 20, 44, TAB[1]); t.vline(11, 34, 44, TAB[2]); t.vline(20, 34, 44, TAB[0])
    for x in range(11, 21, 2): t.p(x, 44, TAB[0])
    t.rect(15, 36, 16, 42, OR); t.rect(13, 38, 18, 39, OR)
    # ceinture
    t.rect(10, 32, 21, 33, BOIS[0]); t.rect(15, 32, 16, 33, OR)
    # cuirasse
    ombre(10, 20, 21, 31, A)
    t.vline(cx, 21, 30, A[1]); t.hline(11, 20, 26, A[1])
    for x in range(11, 21, 3): t.p(x, 31, M[1])
    # épaulières
    for x0, g in ((5, 1), (21, 0)):
        ombre(x0, 18, x0 + 5, 22, A, g); t.hline(x0, x0 + 5, 18, A[4] if g else A[3]); t.hline(x0, x0 + 5, 21, A[1])
    # bras et gantelets, mains jointes sur la garde
    ombre(6, 23, 9, 32, A); ombre(22, 23, 25, 32, A, 0)
    t.rect(8, 33, 11, 35, A[2]); t.rect(20, 33, 23, 35, A[1])
    # épée plantée devant, entre les pieds
    t.rect(13, 34, 18, 35, OR); t.hline(13, 18, 34, hexa('#f0d070'))
    t.rect(15, 30, 16, 33, BOIS[1]); t.rect(15, 29, 16, 29, OR)
    for y in range(36, 55): t.p(15, y, A[4]); t.p(16, y, A[2])
    # gorgerin et heaume
    t.rect(12, 17, 19, 19, M[1]); t.hline(12, 19, 17, A[2])
    ombre(11, 5, 20, 16, A)
    t.rect(11, 5, 20, 6, A[3]); t.hline(12, 19, 4, A[3])
    t.rect(12, 10, 19, 11, hexa('#16141e'))                      # fente de la visière
    for x in range(13, 19, 2): t.p(x, 13, hexa('#16141e'))      # trous d'aération
    t.vline(cx, 5, 16, A[4])                                    # arête
    # plumet
    for i, (x, y) in enumerate([(16, 3), (17, 2), (18, 1), (19, 1), (20, 2), (21, 3), (22, 5), (22, 7)]):
        t.p(x, y, TAB[2] if i < 3 else TAB[1]); t.p(x, y + 1, TAB[0])
    t.contour(C)
    return t


def ratelier():
    t = Toile(16, 24)
    t.rect(1, 21, 14, 22, BOIS[1]); t.hline(1, 14, 21, BOIS[2])                     # pied
    t.vline(1, 6, 21, BOIS[1]); t.vline(14, 6, 21, BOIS[0])                          # montants
    t.hline(1, 14, 8, BOIS[2]); t.hline(1, 14, 15, BOIS[1])                          # traverses
    t.vline(4, 1, 20, BOIS[2]); t.ligne(3, 2, 4, 0, ACIER[3]); t.ligne(5, 2, 4, 0, ACIER[2])   # lance
    t.vline(7, 3, 20, ACIER[2]); t.vline(8, 3, 20, ACIER[1]); t.hline(6, 9, 16, OR); t.rect(7, 17, 8, 19, BOIS[0])  # épée
    t.vline(11, 4, 20, BOIS[2]); t.rect(10, 3, 12, 6, ACIER[2]); t.p(12, 3, ACIER[3])  # hache
    t.contour(C)
    return t


def enclume():
    t = Toile(16, 12)
    t.rect(5, 8, 10, 11, BOIS[1]); t.hline(5, 10, 8, BOIS[2])                         # billot
    t.rect(3, 3, 13, 5, ACIER[1]); t.hline(3, 13, 3, ACIER[3]); t.rect(0, 3, 2, 4, ACIER[1]); t.p(0, 4, ACIER[0])   # table et bigorne
    t.rect(6, 6, 9, 7, ACIER[0])
    t.rect(11, 1, 14, 2, BOIS[2]); t.rect(13, 0, 14, 1, ACIER[2])                     # marteau posé
    t.contour(C)
    return t


def main():
    ims = {'armure': armure(), 'ratelier': ratelier(), 'enclume': enclume()}
    for k, t in ims.items(): t.save(os.path.join(SORTIE, k + '.png'))
    planche([t.image() for t in ims.values()], fond='#5a3a28', echelle=5).save('/tmp/arm/planche_armurerie.png')


if __name__ == '__main__':
    main()
