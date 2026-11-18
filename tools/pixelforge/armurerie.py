#!/usr/bin/env python3
# PixelForge — l'armurerie de la maison de la vieille dame (Bois des Contes) : armure sur pied, râtelier d'armes,
# enclume, à 16 px par case (comme les jouets des chambres), dans testodyssee/img/contes/.
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
    t = Toile(16, 28)
    t.rect(4, 25, 11, 26, BOIS[1]); t.hline(4, 11, 25, BOIS[2])                     # socle
    t.rect(6, 19, 7, 24, ACIER[1]); t.rect(9, 19, 10, 24, ACIER[1]); t.vline(6, 19, 24, ACIER[2]); t.vline(9, 19, 24, ACIER[2])  # jambières
    t.rect(5, 24, 7, 24, ACIER[0]); t.rect(9, 24, 11, 24, ACIER[0])
    t.rect(5, 17, 10, 18, ACIER[1])                                                  # tassette
    t.rect(5, 10, 10, 16, ACIER[2]); t.vline(5, 10, 16, ACIER[3]); t.vline(10, 10, 16, ACIER[1]); t.hline(6, 9, 13, ACIER[1])   # cuirasse
    t.rect(3, 10, 4, 15, ACIER[1]); t.rect(11, 10, 12, 15, ACIER[0])                  # bras
    t.rect(3, 9, 5, 10, ACIER[3]); t.rect(10, 9, 12, 10, ACIER[2])                    # épaulières
    t.rect(6, 4, 9, 8, ACIER[2]); t.vline(6, 4, 8, ACIER[3]); t.hline(6, 9, 6, C)      # heaume, fente
    t.p(7, 3, ROUGE); t.p(8, 2, ROUGE); t.p(9, 2, ROUGE2); t.p(8, 3, ROUGE)            # plumet
    t.vline(13, 4, 22, ACIER[2]); t.p(13, 3, ACIER[3]); t.hline(12, 14, 15, OR)        # épée tenue, garde dorée
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
    planche([t.image() for t in ims.values()], fond='#5a3a28', echelle=6).save('/tmp/arm/planche_armurerie.png')


if __name__ == '__main__':
    main()
