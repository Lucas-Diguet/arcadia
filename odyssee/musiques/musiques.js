// odyssee/musiques/musiques.js — les musiques en fichiers (MP3, OGG…), rangées dans ce dossier.
// Chaque entrée devient un thème comme les autres : on l'utilise par son nom partout où l'on choisit une musique
// (`music: 'nom'` d'une carte, d'une zone ou d'un combat ; `musique: 'nom'` d'un donjon ou d'une salle du labo).
//
//   nom: { fichier: 'nom.mp3' }                      joue en boucle, du début à la fin
//   nom: { fichier: 'nom.mp3', boucle: [12.4, 98] }  joue une fois l'intro, puis boucle entre 12,4 s et 98 s
//   nom: { fichier: 'nom.mp3', boucle: false }       joue une seule fois (un jingle)
//   nom: { fichier: 'nom.mp3', volume: 0.7 }         plus bas (1 = tel quel)
//
// Un nom déjà pris par une musique du jeu (cave, route, trainer…) la remplace. Le fichier n'est chargé que la première
// fois qu'il joue ; s'il manque, on entend la musique `secours` (par défaut, aucune).
export const MUSIQUES = {
};
