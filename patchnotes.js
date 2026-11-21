// Le patch note du site : visible par tout le monde (page « Patch note » du menu).
// La plus récente en premier. Pour ajouter une version : copier un bloc en haut de la liste.
// date + time : le jour et l'heure (heure de Paris) où la version est sortie
// tag : 'new' (nouveauté), 'better' (amélioration), 'fix' (correction), 'removed' (retiré)
export const PATCH_NOTES = [
  {
    version: '2.9', date: '2026-11-21', time: '21:20', title: '« Écouter le passage » plus précis',
    items: [
      ['better', '« Écouter le passage » vise le mot exact où commencent tes paroles (et plus seulement le début de la ligne).'],
      ['better', 'La vidéo choisie est celle qui a la même durée que le morceau : plus de décalage à cause d’une intro de clip.'],
    ],
  },
  {
    version: '2.8', date: '2026-11-21', time: '21:15', title: 'Lancement plus rapide et « prêt » à côté de la difficulté',
    items: [
      ['better', 'Le bouton « Prêt » est à côté de la difficulté. L’hôte n’a plus besoin d’être prêt (son bouton est grisé) : c’est lui qui lance.'],
      ['better', 'Les parties avec beaucoup de sons se lancent bien plus vite (le 1er son suffit pour démarrer, la suite se charge pendant le compte à rebours).'],
      ['fix', 'La pochette d’album de l’accueil passe maintenant par Deezer (et iTunes en secours), avec un nouvel essai si elle ne vient pas.'],
      ['better', 'La commande « aide » de la console admin est plus lisible.'],
    ],
  },
  {
    version: '2.7', date: '2026-11-21', time: '21:00', title: 'Années 80-90',
    items: [
      ['new', 'Nouvelle catégorie de blind test « Années 80-90 » : environ 130 tubes (Michael Jackson, Madonna, Queen, Nirvana, Goldman, Indochine, IAM, NTM…).'],
    ],
  },
  {
    version: '2.6', date: '2026-11-21', time: '20:55', title: 'Admin, prêt, battle royale et nouveau logo',
    items: [
      ['new', 'Nouveau logo Star Song (vinyle noir, étiquette orange, étoile).'],
      ['new', 'Le disque de l’accueil affiche la pochette d’un album de rap au hasard, nouvelle à chaque passage.'],
      ['new', 'Blind test : chaque joueur doit cliquer sur « Je suis prêt » pour que la partie puisse commencer.'],
      ['new', '« Terminer la partie » demande confirmation : en partant, tous tes points de la partie sont annulés.'],
      ['new', 'Bouton ❤️ pour mettre un son en favori pendant la partie (et dans la liste de fin).'],
      ['better', 'Battle royale : vies au choix (1 à 3), le temps pour répondre baisse à chaque son, « duel final », et un joueur absent 2 sons de suite est éliminé.'],
      ['fix', 'Battle royale : la partie ne tourne plus sans fin quand personne ne répond.'],
      ['new', 'Playlists d’artistes à côté des playlists de sons, avec tous les genres mélangés.'],
      ['new', 'Onglet Admin (réservé aux admins) : tous les pouvoirs, une console de commandes, notification à tout le monde, annonce, confettis, couronnes…'],
      ['new', 'Recherche : « Écouter le passage » démarre le son pile au moment des paroles tapées (et un bouton « Morceau entier »).'],
      ['new', 'Classement « Temps sur le site ».'],
      ['new', 'Sur téléphone : onglet « Plus » en bas (Classement, Patch note, Profil, Playlists, Admin).'],
      ['new', 'Affiche pour activer les notifications à chaque visite tant qu’elles sont coupées.'],
      ['new', 'Message de bienvenue au hasard quand tu te reconnectes (40 phrases).'],
      ['new', 'Confirmation avant de se déconnecter.'],
      ['new', 'Grand message « Tu dois te connecter » quand on ouvre Amis ou Messages sans compte.'],
      ['better', 'Messagerie refaite pour le téléphone (plein écran, grosses zones à toucher, le clavier ne cache plus la zone d’écriture).'],
      ['better', 'Messages vocaux bien plus nets (qualité doublée, réduction de bruit) et lecture plus fluide.'],
      ['better', 'Les favoris et recherches d’un ami sont dans « Afficher le profil » (le bouton « Voir » est retiré).'],
      ['better', 'Le patch note affiche l’heure de chaque version, et il est accessible sur téléphone.'],
      ['fix', 'Connecté mais « connecte-toi » demandé pour les amis ou les messages : corrigé.'],
      ['fix', 'La page Amis défile de nouveau sur téléphone.'],
    ],
  },
  {
    version: '2.5', date: '2026-11-21', time: '18:03', title: 'Corrections',
    items: [
      ['fix', 'Le classement s’affichait mal quand l’ancienne version du style était gardée en mémoire.'],
      ['better', 'Sur téléphone, le bouton « Retour » des grandes pages flotte en bas à gauche.'],
    ],
  },
  {
    version: '2.4', date: '2026-11-21', time: '17:19', title: 'Grandes pages, classement et chat en avant',
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
      ['new', 'Ce patch note, visible par tout le monde dans le menu.'],
    ],
  },
  {
    version: '2.3', date: '2026-11-21', time: '16:58', title: 'Favoris dans les playlists',
    items: [
      ['new', 'Onglet « Mes favoris » dans l’éditeur de playlist pour ajouter ses sons favoris en un clic.'],
    ],
  },
  {
    version: '2.2', date: '2026-11-21', time: '16:57', title: 'Nouvelle interface',
    items: [
      ['new', 'Tout le site refait façon lecteur de musique (menu à gauche, barre de lecture, onglets en bas sur téléphone).'],
      ['new', 'Couronne 👑 à côté de @kylrom.'],
      ['better', 'Notifications dans le menu principal, avec un guide pour les activer.'],
      ['better', 'Une notification sur le téléphone à chaque message reçu.'],
      ['new', 'Les admins peuvent envoyer une notification à la personne de leur choix.'],
    ],
  },
  {
    version: '2.1', date: '2026-11-21', time: '16:45', title: 'Playlists de blind test',
    items: [
      ['new', 'Chaque joueur crée ses propres playlists de blind test (recherche de sons, animations).'],
      ['new', 'Les amis peuvent jouer sur tes playlists.'],
      ['removed', 'Musique de fond retirée.'],
    ],
  },
  {
    version: '2.0', date: '2026-11-21', time: '16:30', title: 'Donner envie de revenir',
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
    version: '1.4', date: '2026-11-21', time: '13:39', title: 'Messagerie',
    items: [
      ['new', 'Messagerie entre amis (discussions, non lus, « Vu »).'],
      ['new', 'Messages vocaux.'],
      ['new', 'Jolagreen23 ajouté en Rap FR.'],
      ['new', 'Musique de fond (jazz, lo-fi, bossa nova, piano) avec choix et volume.'],
    ],
  },
  {
    version: '1.3', date: '2026-11-21', time: '13:28', title: 'Statistiques admin',
    items: [
      ['new', 'Fenêtre Stats réservée à l’admin : comptes, recherches, visites, blind test.'],
      ['fix', 'Traduction « En blind test », icônes de l’appli.'],
    ],
  },
  {
    version: '1.2', date: '2026-11-21', time: '12:49', title: 'Battle royale et amis',
    items: [
      ['new', 'Mode battle royale (2 joueurs minimum) : celui qui se trompe est éliminé et peut regarder la fin.'],
      ['new', 'On voit quand un ami est en train de faire un blind test.'],
      ['better', 'Nouveau sélecteur d’artistes, plus compact.'],
    ],
  },
  {
    version: '1.1', date: '2026-11-21', time: '11:08', title: 'Plus de sons',
    items: [
      ['new', 'Choix libre du nombre de manches, et mode infini tant que l’artiste a des sons.'],
      ['better', 'Au moins 60 sons par artiste quand c’est possible.'],
      ['new', 'Brent Faiyaz, toute la discographie de Drake.'],
      ['new', 'Bedry, 63KLUF, Inocasablanca, Faygee, DJUNO, Supremenova, Khali, Josman.'],
      ['fix', 'Le mode « auto » de SCH.'],
    ],
  },
  {
    version: '1.0', date: '2026-11-20', time: '21:55', title: 'Lancement de Star Song',
    items: [
      ['new', 'Recherche de chanson par les paroles.'],
      ['new', 'Comptes, amis et profils.'],
      ['new', 'Blind test multijoueur.'],
    ],
  },
];
