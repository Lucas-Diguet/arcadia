#!/usr/bin/env python3
"""Décors de la maison de la sorcière (Bois des Contes) : puits, tas de bois, chaudron, soufflet.
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


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for nom, f in [('puits', puits), ('buches', buches), ('chaudron', chaudron), ('soufflet', soufflet)]:
        f().save(OUT / f'{nom}.png')
        print('écrit', nom)
