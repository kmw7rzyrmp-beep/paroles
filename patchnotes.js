// Le patch note du site : visible seulement par les admins (page « Patch note » du menu).
// La plus récente en premier. Pour ajouter une version : copier un bloc en haut de la liste.
// tag : 'new' (nouveauté), 'better' (amélioration), 'fix' (correction), 'removed' (retiré)
export const PATCH_NOTES = [
  {
    version: '2.4', date: '2026-11-21', title: 'Grandes pages, classement et chat en avant',
    items: [
      ['new', 'Amis s’ouvre maintenant en grande page (plus de petite fenêtre).'],
      ['new', 'Page Notifications : tout l’historique, groupé par jour, avec filtres et « Tout marquer lu ».'],
      ['new', 'La cloche sonne et affiche un compteur quand une nouvelle notification arrive.'],
      ['new', 'Page Classement dédiée : podium animé, 5 classements (points, victoires, flammes, record, badges), Monde ou Mes amis, recherche de joueur, ta place et ce qu’il te manque pour monter.'],
      ['removed', 'Le classement n’est plus sur l’accueil.'],
      ['better', 'Chat du blind test bien plus visible : ouvert à droite sur grand écran, bulles colorées, bouton orange qui bouge quand il y a du nouveau.'],
      ['new', 'Chaque message du chat s’affiche en grand par-dessus le jeu, pour tous les joueurs, avec une animation.'],
      ['new', 'Indicateur « … écrit » dans le chat du salon.'],
      ['new', 'Pseudos uniques, tous en minuscules, affichés avec un @ devant.'],
      ['new', 'Playlists d’artistes : on enregistre une sélection d’artistes et un clic les met tous dans le blind test.'],
      ['new', 'Ce patch note, visible seulement par les admins.'],
    ],
  },
  {
    version: '2.3', date: '2026-11-21', title: 'Favoris dans les playlists',
    items: [
      ['new', 'Onglet « Mes favoris » dans l’éditeur de playlist pour ajouter ses sons favoris en un clic.'],
    ],
  },
  {
    version: '2.2', date: '2026-11-21', title: 'Nouvelle interface',
    items: [
      ['new', 'Tout le site refait façon lecteur de musique (menu à gauche, barre de lecture, onglets en bas sur téléphone).'],
      ['new', 'Couronne 👑 à côté de @kylrom.'],
      ['better', 'Notifications dans le menu principal, avec un guide pour les activer.'],
      ['better', 'Une notification sur le téléphone à chaque message reçu.'],
      ['new', 'Les admins peuvent envoyer une notification à la personne de leur choix.'],
    ],
  },
  {
    version: '2.1', date: '2026-11-21', title: 'Playlists de blind test',
    items: [
      ['new', 'Chaque joueur crée ses propres playlists de blind test (recherche de sons, animations).'],
      ['new', 'Les amis peuvent jouer sur tes playlists.'],
      ['removed', 'Musique de fond retirée.'],
    ],
  },
  {
    version: '2.0', date: '2026-11-21', title: 'Donner envie de revenir',
    items: [
      ['new', 'Flammes 🔥 : une série de jours d’affilée.'],
      ['new', 'Badges par artiste : plus tu l’écoutes, plus le badge monte.'],
      ['new', 'Notifications sur téléphone (série en danger, messages, invitations).'],
      ['new', 'Une flamme offerte à tous les comptes existants.'],
      ['new', 'Chat et réactions emoji animées pendant les blind tests.'],
      ['better', 'Les parties avec plusieurs artistes démarrent bien plus vite.'],
      ['new', 'Classement mondial sur l’accueil.'],
    ],
  },
  {
    version: '1.4', date: '2026-11-21', title: 'Messagerie',
    items: [
      ['new', 'Messagerie entre amis (discussions, non lus, « Vu »).'],
      ['new', 'Messages vocaux.'],
      ['new', 'Jolagreen23 ajouté en Rap FR.'],
      ['new', 'Musique de fond (jazz, lo-fi, bossa nova, piano) avec choix et volume.'],
    ],
  },
  {
    version: '1.3', date: '2026-11-21', title: 'Statistiques admin',
    items: [
      ['new', 'Fenêtre Stats réservée à l’admin : comptes, recherches, visites, blind test.'],
      ['fix', 'Traduction « En blind test », icônes de l’appli.'],
    ],
  },
  {
    version: '1.2', date: '2026-11-21', title: 'Battle royale et amis',
    items: [
      ['new', 'Mode battle royale (2 joueurs minimum) : celui qui se trompe est éliminé et peut regarder la fin.'],
      ['new', 'On voit quand un ami est en train de faire un blind test.'],
      ['better', 'Nouveau sélecteur d’artistes, plus compact.'],
    ],
  },
  {
    version: '1.1', date: '2026-11-21', title: 'Plus de sons',
    items: [
      ['new', 'Choix libre du nombre de manches, et mode infini tant que l’artiste a des sons.'],
      ['better', 'Au moins 60 sons par artiste quand c’est possible.'],
      ['new', 'Brent Faiyaz, toute la discographie de Drake.'],
      ['new', 'Bedry, 63KLUF, Inocasablanca, Faygee, DJUNO, Supremenova, Khali, Josman.'],
      ['fix', 'Le mode « auto » de SCH.'],
    ],
  },
  {
    version: '1.0', date: '2026-11-21', title: 'Lancement de Star Song',
    items: [
      ['new', 'Recherche de chanson par les paroles.'],
      ['new', 'Comptes, amis et profils.'],
      ['new', 'Blind test multijoueur.'],
    ],
  },
];
