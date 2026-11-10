#!/usr/bin/env bash
# Assemble le site léger du labo (le Hub, Odyssée et TestOdyssée, sans les autres jeux) dans un dossier,
# pour la mise en ligne du fork (.github/workflows/site-labo.yml). Essai en local :
#   bash tools/site-labo.sh /tmp/site && cd /tmp/site && python3 -m http.server 8000
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"
rm -rf "$OUT"; mkdir -p "$OUT"

# ce que le Hub, Odyssée et le labo chargent dans le navigateur
for p in \
  index.html apropos.html manifest.webmanifest hubimg.png d12.png CHANGELOG.md \
  hub shared odyssee testodyssee \
  assets/sfx assets/brand \
  pokemon/assets/trainers \
  david/view/music.js david/view/util.js \
  tools/salon-test.html
do
  [ -e "$p" ] && cp -r --parents "$p" "$OUT/"
done
# les affiches des jeux, pour que l'accueil du Hub garde ses vignettes
for f in */img/affiche.jpg; do cp --parents "$f" "$OUT/"; done
touch "$OUT/.nojekyll"
du -sh "$OUT"
