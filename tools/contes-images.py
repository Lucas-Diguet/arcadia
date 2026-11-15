#!/usr/bin/env python3
"""Décors de la maison de la vieille dame (Bois des Contes) : puits, tas de bois, chaudron, soufflet, légumes du potager, jouets.
python3 tools/contes-images.py  →  testodyssee/img/contes/"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'testodyssee' / 'img' / 'contes'
NOIR = (30, 24, 28, 255)


def toile(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def puits():
    im, d = toile(16, 24)
    d.rectangle([2, 4, 3, 16], fill=(96, 64, 40, 255), outline=NOIR)
    d.rectangle([12, 4, 13, 16], fill=(96, 64, 40, 255), outline=NOIR)
    d.polygon([(0, 5), (8, 0), (15, 5)], fill=(150, 60, 50, 255), outline=NOIR)
    d.line([(4, 7), (11, 7)], fill=(120, 84, 52, 255))
    d.line([(8, 7), (8, 12)], fill=(210, 200, 170, 255))
    d.rectangle([1, 14, 14, 22], fill=(130, 130, 138, 255), outline=NOIR)
    d.rectangle([3, 14, 12, 16], fill=(40, 60, 90, 255))
    for x, y in [(3, 18), (8, 19), (12, 18), (5, 21), (10, 21)]:
        d.point((x, y), fill=(90, 90, 100, 255))
    d.line([(1, 17), (14, 17)], fill=(160, 160, 168, 255))
    return im


def buches():
    im, d = toile(16, 16)
    for i, (x, y) in enumerate([(1, 10), (6, 10), (11, 10), (3, 5), (9, 5), (6, 0)]):
        d.ellipse([x, y, x + 4, y + 4], fill=(150, 104, 62, 255), outline=NOIR)
        d.point((x + 2, y + 2), fill=(214, 178, 120, 255))
        d.point((x + 1, y + 2), fill=(190, 150, 96, 255))
    return im


def chaudron():
    im, d = toile(16, 16)
    d.ellipse([1, 3, 14, 15], fill=(52, 52, 60, 255), outline=NOIR)
    d.ellipse([2, 2, 13, 6], fill=(80, 80, 92, 255), outline=NOIR)
    d.ellipse([4, 3, 11, 5], fill=(24, 24, 30, 255))
    d.line([(3, 9), (4, 12)], fill=(110, 110, 124, 255))
    d.rectangle([2, 14, 3, 15], fill=NOIR)
    d.rectangle([12, 14, 13, 15], fill=NOIR)
    return im


def soufflet():
    im, d = toile(16, 16)
    d.polygon([(2, 4), (10, 2), (12, 8), (10, 14), (2, 12)], fill=(150, 90, 50, 255), outline=NOIR)
    for y in (5, 8, 11):
        d.line([(3, y), (9, y)], fill=(110, 62, 34, 255))
    d.rectangle([12, 7, 15, 9], fill=(170, 170, 180, 255), outline=NOIR)
    d.rectangle([0, 6, 2, 7], fill=(96, 64, 40, 255))
    d.rectangle([0, 9, 2, 10], fill=(96, 64, 40, 255))
    return im


def carotte():
    im, d = toile(16, 16)
    for x, h in [(4, 5), (6, 3), (8, 2), (10, 4), (12, 6)]:
        d.line([(8, 11), (x, h)], fill=(64, 150, 60, 255))
        d.point((x, h), fill=(110, 196, 90, 255))
    d.polygon([(6, 10), (10, 10), (8, 15)], fill=(236, 130, 40, 255), outline=NOIR)
    return im


def citrouille():
    im, d = toile(16, 16)
    d.ellipse([1, 5, 14, 15], fill=(232, 124, 36, 255), outline=NOIR)
    d.arc([4, 5, 11, 15], 90, 270, fill=(180, 84, 24, 255))
    d.arc([4, 5, 11, 15], 270, 90, fill=(180, 84, 24, 255))
    d.rectangle([7, 2, 8, 5], fill=(70, 120, 50, 255), outline=NOIR)
    d.point((4, 8), fill=(250, 180, 90, 255))
    return im


def patate():
    im, d = toile(16, 16)
    for x, y in [(3, 6), (8, 3), (12, 6), (5, 10), (10, 10)]:
        d.ellipse([x - 3, y - 2, x + 3, y + 3], fill=(58, 128, 62, 255), outline=(30, 70, 40, 255))
    for x, y in [(8, 4), (4, 7), (11, 8)]:
        d.point((x, y), fill=(240, 240, 200, 255))
    d.ellipse([6, 12, 10, 15], fill=(196, 160, 104, 255), outline=NOIR)
    return im


def oignon():
    im, d = toile(16, 16)
    for x in (6, 8, 10):
        d.line([(8, 10), (x, 1)], fill=(96, 170, 84, 255))
    d.ellipse([4, 8, 12, 15], fill=(214, 170, 196, 255), outline=NOIR)
    d.line([(8, 9), (8, 14)], fill=(170, 120, 150, 255))
    d.point((6, 10), fill=(244, 220, 236, 255))
    return im


def cheval():
    im, d = toile(16, 16)
    d.arc([0, 8, 15, 18], 20, 160, fill=(120, 76, 44, 255), width=2)
    d.rectangle([4, 6, 11, 10], fill=(190, 140, 90, 255), outline=NOIR)
    d.rectangle([10, 2, 13, 7], fill=(190, 140, 90, 255), outline=NOIR)
    d.point((12, 4), fill=NOIR)
    d.line([(5, 10), (4, 13)], fill=NOIR); d.line([(10, 10), (11, 13)], fill=NOIR)
    d.line([(3, 6), (2, 9)], fill=(90, 56, 34, 255))
    d.rectangle([6, 5, 9, 6], fill=(190, 50, 50, 255))
    return im


def cubes():
    im, d = toile(16, 16)
    for x, y, c in [(1, 9, (210, 70, 70, 255)), (8, 9, (70, 120, 210, 255)), (4, 3, (240, 200, 70, 255))]:
        d.rectangle([x, y, x + 6, y + 6], fill=c, outline=NOIR)
        d.line([(x + 1, y + 1), (x + 5, y + 1)], fill=(255, 255, 255, 120))
    return im


def peluche():
    im, d = toile(16, 16)
    brun = (170, 116, 70, 255)
    d.ellipse([2, 1, 5, 4], fill=brun, outline=NOIR); d.ellipse([10, 1, 13, 4], fill=brun, outline=NOIR)
    d.ellipse([3, 2, 12, 9], fill=brun, outline=NOIR)
    d.ellipse([3, 8, 12, 15], fill=brun, outline=NOIR)
    d.ellipse([6, 5, 9, 8], fill=(226, 196, 150, 255))
    d.point((6, 4), fill=NOIR); d.point((9, 4), fill=NOIR); d.point((7, 6), fill=NOIR)
    d.ellipse([6, 10, 9, 13], fill=(226, 196, 150, 255))
    return im


def poupee():
    im, d = toile(16, 16)
    d.ellipse([5, 0, 10, 5], fill=(250, 220, 190, 255), outline=NOIR)
    d.rectangle([4, 0, 11, 2], fill=(236, 200, 80, 255))
    d.point((6, 3), fill=NOIR); d.point((9, 3), fill=NOIR)
    d.polygon([(7, 6), (8, 6), (13, 15), (2, 15)], fill=(214, 110, 150, 255), outline=NOIR)
    d.line([(4, 9), (2, 11)], fill=(250, 220, 190, 255)); d.line([(11, 9), (13, 11)], fill=(250, 220, 190, 255))
    return im


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for nom, f in [('puits', puits), ('buches', buches), ('chaudron', chaudron), ('soufflet', soufflet), ('carotte', carotte), ('citrouille', citrouille),
                   ('patate', patate), ('oignon', oignon), ('cheval', cheval), ('cubes', cubes), ('peluche', peluche), ('poupee', poupee)]:
        f().save(OUT / f'{nom}.png')
        print('écrit', nom)
