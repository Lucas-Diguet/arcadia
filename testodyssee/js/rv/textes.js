// testodyssee/js/rv/textes.js — ce que disent les dresseurs des Routes Victoire (traduits des jeux d'origine).
// intro : avant le combat ; perd : quand il perd ; apres : quand on lui reparle.
export const TEXTES = {
  vf: {
    Rolando: { intro: 'Je vois que tu es doué. Voyons à quel point !', perd: 'J\'avais pourtant une chance...', apres: 'Tss ! Je l\'admets, tu es meilleur que moi !' },
    Naomi: { intro: 'Es-tu assez fort pour moi ? Je me le demande.', perd: 'J\'ai perdu...', apres: 'Je ne voulais perdre contre personne, et surtout pas contre plus jeune que moi...' },
    Dawson: { intro: 'Si tu passes par ici, tu pourras affronter le Conseil 4.', perd: 'Non ! C\'est pas possible !', apres: 'Sur les Pokémon, j\'en sais quand même plus que toi !' },
    Daisuke: { intro: 'Te voilà sur la Route Victoire. C\'est l\'ultime épreuve des Dresseurs !', perd: 'Aïe !', apres: 'Si tu es coincé, essaie de déplacer quelques rochers.' },
    Nelson: { intro: 'Ah, tu veux défier le Conseil 4 ?', perd: 'Tu m\'as eu !', apres: 'Ton rival est passé par ici, lui aussi.' },
    Vincent: { intro: 'Allez ! Je vais te mater !', perd: 'C\'est moi qui suis maté !', apres: 'Tu as mérité ta place sur la Route Victoire...' },
    Gregory: { intro: 'La Route Victoire est trop dure pour toi ?', perd: 'Bien joué !', apres: 'Beaucoup de Dresseurs abandonnent ici et rentrent chez eux.' },
    George: { intro: 'On m\'a parlé d\'un enfant prodige.', perd: 'Les rumeurs disaient vrai !', apres: 'Alors c\'est toi qui as battu Giovanni de la Team Rocket ?' },
    Alexa: { intro: 'Un Dresseur vit pour trouver plus fort que lui.', perd: 'Oh ! Quelle force !', apres: 'C\'est en livrant des combats difficiles qu\'on devient plus fort.' },
    Colby: { intro: 'Seuls les élus passent par ici !', perd: 'Je n\'y crois pas !', apres: ['Tous les Dresseurs d\'ici vont à la Ligue Pokémon.', 'Ne baisse pas ta garde.'] },
    Caroline: { intro: 'Je vais te montrer à quel point tu es doué. Ou pas !', perd: 'Je suis furieuse !', apres: 'C\'est toi qui m\'as montré à quel point j\'étais douée...' },
    Ray: { intro: 'Ray : À nous deux, la grandeur nous attend !', perd: 'Ray : Absurde ! C\'est impossible !', apres: 'Ray : Tu nous as battus. La grandeur nous échappe encore...' },
    Tyra: { intro: 'Tyra : Nous voulons devenir Maîtres ensemble.', perd: 'Tyra : Oh, mais...', apres: 'Tyra : Tu m\'as appris que la force peut prendre toutes les formes.' },
  },
  em: {
    Edgar: { intro: ['Je suis déjà arrivé jusqu\'ici plusieurs fois,', 'mais la dernière ligne droite est si longue...'], perd: 'Mon rêve s\'arrête encore ici...', apres: 'Tu es arrivé jusqu\'ici. Garde cet élan et deviens Maître ! Si quelqu\'un peut le faire, c\'est toi !' },
    Hope: { intro: 'Cette route rude et sans fin porte bien son nom de Victoire.', perd: 'Ton style de combat est fantastique...', apres: 'Tu as l\'étoffe d\'un Maître.' },
    Albert: { intro: 'Je ne suis pas venu jusqu\'ici pour perdre. C\'est hors de question !', perd: 'Impossible... J\'ai perdu ?', apres: ['J\'ai perdu ici...', 'C\'est que je n\'ai pas ce qu\'il faut pour devenir Maître...'] },
    Katelynn: { intro: 'Je n\'ai rien à dire à ceux qui arrivent jusqu\'ici. Allez, viens !', perd: 'Quelle honte...', apres: 'Hmpf, passe donc. Je m\'en moque.' },
    Quincy: { intro: 'Ce qu\'est la Route Victoire ? Je te le dirai si tu gagnes !', perd: 'D\'accord ! Bien joué !', apres: ['La traverser sans encombre, c\'est l\'ultime épreuve de tout Dresseur qui veut devenir Maître.', 'Voilà pourquoi on l\'appelle la Route Victoire.'] },
    Samuel: { intro: ['Dire que je me rapproche de la Ligue Pokémon...', 'J\'ai le trac...'], perd: 'Je n\'ai rien pu faire...', apres: 'La Ligue Pokémon s\'éloigne encore... Quelle déception...' },
    Shannon: { intro: 'Pour triompher à la Ligue Pokémon, il faut la confiance de ses Pokémon.', perd: 'Votre lien repose sur une vraie confiance.', apres: 'À force d\'être toujours ensemble, la confiance grandit entre les Pokémon et leur Dresseur.' },
    Michelle: { intro: 'Ce n\'est pas le but. C\'est seulement une étape sur la route de la Ligue Pokémon.', perd: 'C\'est comme ça qu\'on fait !', apres: 'Tu vas y arriver, c\'est sûr ! Tes Pokémon ont tous hâte d\'y aller !' },
    Mitchell: { intro: 'Mes Pokémon sont d\'une beauté cosmique !', perd: 'Je n\'ai jamais rencontré quelqu\'un comme toi.', apres: 'Même hors combat, je sens une force incroyable qui émane de toi et de tes Pokémon.' },
    Halle: { intro: 'Allons, pas la peine de te braquer ! Détends-toi, on y va tranquille !', perd: 'Ouah ! Magnifique !', apres: ['Bien sûr, c\'est la Route Victoire.', 'Mais elle ne diffère pas tant du chemin que tu as parcouru jusqu\'ici.', 'Profite du reste du voyage !'] },
    Vito: { intro: 'Je me suis entraîné avec toute ma famille, sans exception ! Je ne perdrai contre personne !', perd: 'Meilleur que ma famille ?! C\'est possible ?!', apres: ['J\'étais le meilleur de ma famille. Je n\'avais jamais perdu...', 'J\'ai perdu confiance... Je vais peut-être rentrer...'] },
    Owen: { intro: 'On m\'a parlé d\'un petit costaud dans le coin. C\'est de toi qu\'on parle ?', perd: 'Le petit est coriace !', apres: 'D\'après les rumeurs, ce petit costaud viendrait de Clémenti-Ville.' },
    Caroline: { intro: 'Tu dois commencer à fatiguer un peu.', perd: 'Pas la moindre trace de fatigue !', apres: 'La Route Victoire et la Ligue Pokémon sont des épreuves longues et éreintantes. Méfie-toi de la fatigue !' },
    Julie: { intro: ['Ne te repose pas sur tes lauriers parce que tu as beaucoup de Badges.', 'Il y aura toujours quelqu\'un de meilleur que toi !'], perd: 'Tu es meilleur que moi !', apres: 'Contemple tes Badges et souviens-toi des Dresseurs que tu as affrontés.' },
    Dianne: { intro: ['L\'élite de l\'élite se retrouve dans cette grotte.', 'Alors, qu\'est-ce que tu en penses ?'], perd: 'Pas troublé le moins du monde !', apres: 'Tu as du cran ! J\'aime ça ! Continue comme ça !' },
    Felix: { intro: 'Je suis arrivé jusqu\'ici, mais le trac me donne un mal de ventre terrible...', perd: 'Ooh... Ça fait mal...', apres: ['Je ne peux pas m\'empêcher d\'être tendu, si près de la Ligue Pokémon.', 'J\'arrive à peine à faire semblant d\'être calme.'] },
    Wally: { intro: ['Timmy : Salut ! Tu es surpris de me voir ici, hein ?', 'Je suis arrivé jusqu\'ici, et c\'est grâce à toi !', 'Perdre contre toi la dernière fois m\'a rendu plus fort !', 'Je ne perdrai plus !'], perd: 'Ouah ! Tu es vraiment fort, finalement !', apres: 'Timmy : Je n\'ai pas pu te battre aujourd\'hui, mais un de ces jours, je te rattraperai !' },
  },
};
// le maître des capacités du 2F de Vert Feuille
export const TUTEUR = {
  avant: ['Tu connais Damoclès ? C\'est une attaque puissante, mais elle blesse aussi celui qui la lance.', 'Je peux l\'apprendre à un de tes Pokémon. Une seule fois, alors choisis bien.'],
  apres: 'Damoclès frappe fort. Garde un œil sur les PV de ton Pokémon.',
};
