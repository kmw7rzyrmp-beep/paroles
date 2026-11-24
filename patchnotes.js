// Le patch note du site : visible par tout le monde (page « Patch note » du menu).
// RÈGLE : un seul patch note par jour, publié tout seul à 18:00 (heure de Paris). La version du jour est écrite ici à l'avance avec time: '18:00' : elle reste cachée jusqu'à l'heure. Pas de changement ce jour-là = pas de version. Les admins sont prévenus 10 minutes avant.
// La plus récente en premier. Pour ajouter une version : copier un bloc en haut de la liste.
// date + time : le jour et l'heure (heure de Paris) où la version est sortie
// tag : 'new' (nouveauté), 'better' (amélioration), 'fix' (correction), 'removed' (retiré)
export const PATCH_NOTES = [
  {
    version: '2.22', date: '2026-11-24', time: '18:00', title: 'Flamme grise',
    items: [
      ['new', 'Flamme grise : quand ta flamme du jour n\'est pas encore gagnée, elle devient grise (le nombre de jours reste affiché). Refais un blind test pour la rallumer.'],
    ],
  },
  {
    version: '2.21', date: '2026-11-23', time: '18:00', title: 'Sauvegardes, revanche, bonus ×2 et plus',
    items: [
      ['new', 'Guide de bienvenue animé en 7 slides (recherche, blind test, animé, amis, flamme…), montré une seule fois à la première connexion d\'un nouveau compte.'],
      ['new', 'Sauvegarde automatique des comptes : une copie par jour, gardée 7 jours.'],
      ['new', 'Revanche : à la fin d\'une partie, l\'hôte relance tout de suite une nouvelle manche avec les mêmes joueurs.'],
      ['new', 'Bonus du jour ×2 : chaque jour, un artiste, une catégorie ou les parties avec playlist rapportent le double de points au blind test.'],
      ['new', 'Commande admin « bonus » : voir, choisir ou tirer au hasard le bonus du jour.'],
      ['new', 'Quand tu cliques sur le drapeau algérien, il explose : flash, ondes de choc, gros BOUM, drapeau géant qui flotte puis éclate en morceaux, feux d\'artifice et pluie de confettis.'],
      ['new', 'Blind test animé : un tout nouveau mode avec son propre décor (néons, pétales de sakura, compte à rebours en kanji). Devine l\'anime à partir de son opening, et à la réponse le clip de l\'opening se lance en grand. 100 openings cultes (L\'Attaque des Titans, Demon Slayer, Naruto, One Piece, Jujutsu Kaisen…).'],
      ['new', 'Accueil : deux grandes entrées, « Blind test musique » et « Blind test animé ».'],
      ['new', 'Page Amis : nouvel onglet « Demande envoyée » avec toutes tes demandes d\'amis en attente (tu peux les annuler).'],
      ['fix', 'Blind test animé : sur les téléphones qui ne lisent pas la vidéo (iPhone surtout), le clip de l\'opening s\'affiche maintenant via YouTube.'],
      ['better', 'Blind test animé : le clip de l\'opening démarre vers le milieu (plus de générique du début) et le lecteur YouTube n\'affiche plus son interface.'],
      ['new', 'Pendant une partie, si tu cliques sur une autre page (Amis, Accueil…), un message te demande si tu es sûr de partir : tu perds tous tes points.'],
      ['better', 'Blind test animé : les playlists d\'artistes ne s\'affichent plus dans ce mode.'],
      ['better', 'Blind test animé : un compteur « Son 5 / 10 » s\'affiche en haut à gauche de l\'écran pour voir où on en est (∞ en mode infini).'],
      ['fix', 'Le blind test s\'arrête bien au nombre de sons choisi (5, 10, 15…).'],
      ['new', 'Mode infini : tu peux t\'arrêter quand tu veux en gardant tes points.'],
      ['new', 'Version DZ : le logo en haut à gauche est refait aux couleurs de l\'Algérie (vinyle cerclé d\'or, croissant et étoile).'],
      ['better', 'Le drapeau algérien clignote, brille et change de couleurs pour qu\'on ne rate pas la version DZ.'],
    ],
  },
  {
    version: '2.20', date: '2026-11-23', time: '00:46', title: 'Idées, Messages refaits et version DZ',
    items: [
      ['better', 'L\'onglet « Mon profil » disparaît du menu Social : clique sur ta photo pour ouvrir ton profil.'],
      ['new', 'Nouvel onglet « Idées » : propose tes idées pour améliorer Star Song et retrouve la réponse des admins (tu reçois une notification).'],
      ['new', 'Panel admin des idées : voir toutes les propositions, filtrer par statut, répondre, changer le statut ou supprimer.'],
      ['better', 'Le menu Messages est entièrement redessiné : plus beau, bulles dégradées, zone d\'écriture flottante, animations plus fluides.'],
      ['new', 'Quand tu gagnes ta flamme du jour, une pluie de flammes 🔥 vient te féliciter.'],
      ['new', 'Troisième drapeau 🇩🇿 : une version parodique « DZ » du site, pleine d\'humour algérien, avec les couleurs vert, blanc et rouge.'],
      ['new', 'Version DZ : une musique de fond orientale (avec un bouton pour la couper).'],
      ['new', 'Version DZ : les pochettes d\'albums de l\'accueil sont des albums algériens bien clichés.'],
      ['better', 'Faygee : un maximum de sons ajoutés au blind test.'],
      ['better', 'Chaque notification de patch note te mène directement au patch note.'],
    ],
  },
  {
    version: '2.19', date: '2026-11-23', time: '00:27', title: 'Un site plus fluide et plus beau',
    items: [
      ['better', 'Les cartes de l\'accueil apparaissent l\'une après l\'autre, en douceur.'],
      ['better', 'Les fenêtres s\'ouvrent avec un fond qui apparaît en fondu.'],
      ['better', 'Boutons, liens et champs de texte plus souples, avec une lueur quand on écrit et un contour visible au clavier.'],
      ['better', 'Défilement plus fluide, avec des barres de défilement fines et discrètes.'],
      ['better', 'Sur téléphone : le site est plus fluide (flou allégé) et répond tout de suite au toucher.'],
      ['new', 'Un message te prévient quand la connexion est perdue, puis quand elle revient.'],
    ],
  },
  {
    version: '2.18', date: '2026-11-23', time: '00:23', title: 'Notifications personnalisées',
    items: [
      ['better', 'Chaque notification affiche la pochette d\'un de tes sons favoris (ou d\'un album au hasard), avec une vibration et un bouton adaptés.'],
      ['better', 'Un clic sur la notification t\'amène directement à la bonne page (le patch note, le chat, le salon...).'],
      ['better', 'Les messages et les patch notes sont groupés : une seule notification avec le nombre.'],
      ['new', 'Le site se met à jour tout seul, sans fermer ni rouvrir l\'appli.'],
    ],
  },
  {
    version: '2.17', date: '2026-11-23', time: '00:18', title: 'Alerte patch note',
    items: [
      ['new', 'Une notification est envoyée à tout le monde dès qu\'un nouveau patch note sort.'],
    ],
  },
  {
    version: '2.16', date: '2026-11-22', time: '05:09', title: 'Esdeekid en Rap FR',
    items: [
      ['new', 'L\'artiste Esdeekid rejoint le Rap FR dans le blind test, avec 40 de ses sons.'],
    ],
  },
  {
    version: '2.15', date: '2026-11-21', time: '21:30', title: 'Temps en direct',
    items: [
      ['better', 'Le temps passé sur le site avance seconde par seconde sur ton profil, sur celui des personnes en ligne, et dans le classement.'],
    ],
  },
  {
    version: '2.14', date: '2026-11-21', time: '21:25', title: 'Blind test vraiment instantané',
    items: [
      ['better', 'Les extraits sont pré-chargés au démarrage du serveur : les parties se lancent sans attente, même avec beaucoup de sons.'],
      ['better', 'Chaque extrait est cherché sur iTunes et Deezer en même temps (deux fois plus rapide qu’avant).'],
    ],
  },
  {
    version: '2.13', date: '2026-11-21', time: '21:20', title: 'Bouton « Prêt » déplacé',
    items: [
      ['better', 'Le bouton « Prêt » de l’hôte est maintenant à côté de « Lancer la partie ».'],
    ],
  },
  {
    version: '2.12', date: '2026-11-21', time: '21:20', title: 'Lancement instantané',
    items: [
      ['better', 'La partie se lance tout de suite, même avec tous les artistes : le compte à rebours démarre aussitôt et les premiers sons se chargent pendant ces 4 secondes.'],
    ],
  },
  {
    version: '2.11', date: '2026-11-21', time: '21:15', title: 'Temps sur le site à la seconde',
    items: [
      ['better', 'Le temps passé sur le site est compté et affiché à la seconde près (heures, minutes, secondes).'],
      ['new', 'Le temps passé sur le site est visible sur chaque profil.'],
    ],
  },
  {
    version: '2.10', date: '2026-11-21', time: '21:10', title: 'Écouter la pochette, Admin réparé',
    items: [
      ['new', 'Accueil : un bouton sur la pochette pour écouter 30 s d’un son de l’album (sous la recherche sur téléphone).'],
      ['fix', 'La page Admin restait vide avec certains bloqueurs de pubs : c’est réglé.'],
    ],
  },
  {
    version: '2.9', date: '2026-11-21', time: '21:06', title: '« Écouter le passage » plus précis',
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
