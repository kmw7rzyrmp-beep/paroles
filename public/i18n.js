// Traduction du site : français (langue d'origine) ou anglais, au choix avec les petits drapeaux.
// Le site est écrit en français ; ce script remplace chaque texte affiché par sa traduction anglaise,
// y compris ce qui apparaît après coup (résultats, messages du serveur, notifications…).
// Pour ajouter une traduction : ajoute une ligne 'Texte français': 'English text' dans DICT.
(() => {
  // --- Textes exacts ---
  const DICT = {
    // en-tête, accueil, recherche
    'Tape quelques mots que l’artiste chante, même approximatifs, et on te donne le titre.': 'Type a few words the artist sings, even roughly, and we’ll give you the title.',
    'Écris ce que t’as retenu du son': 'Write what you remember from the track',
    'Ex : Finis les': 'E.g. Finis les',
    'Trouver': 'Find',
    'Tu peux trouver tout ce que tu désires grâce à Kyky': 'You can find anything you want thanks to Kyky',
    'Blind test': 'Blind test',
    'Résultats': 'Results',
    '★ Favoris': '★ Favorites',
    'Favoris': 'Favorites',
    'Affichage': 'View',
    'Recherche en cours…': 'Searching…',
    '1 chanson trouvée': '1 song found',
    'Aucune chanson trouvée. Essaie avec d’autres mots de la phrase.': 'No song found. Try other words from the line.',
    '(La recherche dans les paroles est indisponible pour le moment : seuls les sons confirmés par leurs paroles sont affichés.)': '(Lyrics search is unavailable right now: only tracks confirmed by their lyrics are shown.)',
    'Tape au moins 3 caractères.': 'Type at least 3 characters.',
    'Mode démo : ces résultats sont fictifs. Lance le site avec « npm start » pour obtenir de vraies chansons.': 'Demo mode: these results are fake. Start the site with “npm start” to get real songs.',
    'Tu as recherché :': 'You searched:',
    '1 son': '1 track',
    '1 son en favori': '1 favorite track',
    'Aucun favori pour l’instant. Clique sur l’étoile ☆ à côté d’un son pour l’ajouter.': 'No favorites yet. Click the star ☆ next to a track to add it.',
    'Écouter un extrait': 'Play a preview',
    'Pause': 'Pause',
    'Paroles': 'Lyrics',
    'Morceau entier': 'Full track',
    'Morceau entier introuvable.': 'Full track not found.',
    'Recherche du morceau…': 'Looking for the track…',
    'Fermer le lecteur': 'Close the player',
    'Impossible de charger le morceau entier. Réessaie plus tard.': 'Couldn’t load the full track. Try again later.',
    'Cette vidéo ne peut pas être lue ici.': 'This video can’t be played here.',
    'Voir sur Genius': 'View on Genius',
    'Chargement des paroles…': 'Loading lyrics…',
    'Impossible de charger les paroles. Réessaie dans un instant.': 'Couldn’t load the lyrics. Try again in a moment.',
    'Paroles introuvables pour ce morceau.': 'No lyrics found for this track.',
    'Les paroles sont synchronisées : clique sur la ligne que tu entends pour les caler sur l’extrait.': 'The lyrics are synced: click the line you hear to line them up with the preview.',
    'Clique sur la ligne que tu entends pour caler les paroles sur l’extrait.': 'Click the line you hear to line up the lyrics with the preview.',
    'Paroles décalées ? Clique sur la ligne que tu entends pour les recaler.': 'Lyrics out of sync? Click the line you hear to fix them.',
    'Ajouter aux favoris': 'Add to favorites',
    'Retirer des favoris': 'Remove from favorites',
    'Historique des recherches': 'Search history',
    '↺ Historique': '↺ History',
    'Tes dernières recherches': 'Your recent searches',
    'Effacer': 'Clear',
    '📲 Installer l’appli': '📲 Install the app',
    'Installer Star Song': 'Install Star Song',
    'Sur iPhone : touche le bouton': 'On iPhone: tap the',
    'Partager': 'Share',
    '(le carré avec une flèche vers le haut) en bas de Safari, puis': 'button (the square with an arrow pointing up) at the bottom of Safari, then',
    '« Sur l’écran d’accueil »': '“Add to Home Screen”',
    'OK': 'OK',
    'Données indisponibles': 'Data unavailable',
    'Erreur': 'Error',
    'Erreur inconnue': 'Unknown error',
    'Une erreur est survenue.': 'Something went wrong.',
    'Une erreur est survenue. Réessaie.': 'Something went wrong. Try again.',
    'Erreur réseau, réessaie.': 'Network error, try again.',
    'Erreur, réessaie.': 'Error, try again.',
    'tes dernières modifications n’ont pas pu être enregistrées, réessaie.': 'your latest changes couldn’t be saved, try again.',

    // comptes
    'Se connecter': 'Log in',
    'Se déconnecter': 'Log out',
    'Créer un compte': 'Sign up',
    'Créer mon compte': 'Create my account',
    'Identifiant': 'Username',
    'Adresse e-mail': 'Email address',
    '(facultative)': '(optional)',
    'Mot de passe': 'Password',
    '8 caractères minimum': '8 characters minimum',
    'Identifiant ou adresse e-mail': 'Username or email address',
    'Annuler': 'Cancel',
    'J’ai déjà un compte': 'I already have an account',
    'Pas encore de compte ? En créer un': 'No account yet? Create one',
    'Choisis ton identifiant': 'Choose your username',
    'Choisir un identifiant': 'Choose a username',
    'Enregistrer': 'Save',
    'Ton identifiant sert à te connecter et à être retrouvé par tes amis. L’e-mail est facultatif : tu pourras te connecter avec l’un ou l’autre.': 'Your username is used to log in and lets your friends find you. Email is optional: you can log in with either one.',
    'Ton identifiant permet à tes amis de te retrouver. Une fois choisi, il ne peut plus être changé.': 'Your username lets your friends find you. Once chosen, it can’t be changed.',
    'Ta session a expiré : reconnecte-toi pour retrouver tes données.': 'Your session expired: log in again to get your data back.',
    'Connecté, mais tes données n’ont pas pu être chargées. Recharge la page.': 'Logged in, but your data couldn’t be loaded. Reload the page.',
    'Connexion impossible. Réessaie dans un instant.': 'Couldn’t connect. Try again in a moment.',
    'Connexion impossible. Vérifie ta connexion et réessaie.': 'Couldn’t connect. Check your connection and try again.',
    'Session expirée.': 'Session expired.',

    // bienvenue
    'Bienvenue sur Star Song': 'Welcome to Star Song',
    'Retrouve un son à partir de ses paroles, et affronte tes potes au blind test.': 'Find a track from its lyrics, and take on your friends in the blind test.',
    'Tes favoris gardés sur tous tes appareils': 'Your favorites saved on all your devices',
    'Tes amis, et qui est en ligne': 'Your friends, and who’s online',
    'Ta place au classement mondial du blind test': 'Your spot on the blind test world leaderboard',
    'Continuer en tant qu’invité': 'Continue as a guest',

    // amis
    'Amis': 'Friends',
    'Ouvrir mes amis': 'Open my friends',
    'Fermer mes amis': 'Close my friends',
    'Mes potes': 'My crew',
    'Retour': 'Back',
    'Ajouter un ami avec son identifiant': 'Add a friend with their username',
    'Identifiant de ton ami': 'Your friend’s username',
    'Inviter': 'Invite',
    'Invité': 'Invited',
    'Vos favoris et vos historiques de recherche sont visibles entre amis, une fois la demande acceptée.': 'Your favorites and search history are visible to each other once the request is accepted.',
    'Mes amis': 'My friends',
    'Demandes reçues': 'Requests received',
    'Demandes envoyées': 'Requests sent',
    'Accepter': 'Accept',
    'Refuser': 'Decline',
    'Voir': 'View',
    'Fermer': 'Close',
    'Retirer': 'Remove',
    'En ligne': 'Online',
    'Hors ligne': 'Offline',
    'Vu hier': 'Seen yesterday',
    'Aucun ami pour l’instant. Invite quelqu’un avec son identifiant.': 'No friends yet. Invite someone with their username.',
    'Dernières recherches': 'Recent searches',
    'Aucune recherche pour l’instant.': 'No searches yet.',
    'Vous êtes maintenant amis !': 'You’re now friends!',
    'Notifications': 'Notifications',
    'Quand un ami se connecte': 'When a friend comes online',
    'Demandes d’amis': 'Friend requests',
    'Invitations au blind test': 'Blind test invites',

    // notifications
    't’invite à un blind test': 'is inviting you to a blind test',
    'veut t’ajouter en ami': 'wants to add you as a friend',
    'vient de se connecter': 'just came online',
    'Ton ami est en ligne': 'Your friend is online',
    'Demande d’ami': 'Friend request',
    'Demande refusée.': 'Request declined.',
    'Rejoindre': 'Join',
    'Non merci': 'No thanks',
    'Plus tard': 'Later',
    'Lancer un blind test': 'Start a blind test',

    // blind test : accueil
    'Retour à la recherche': 'Back to search',
    'Blind test entre potes': 'Blind test with friends',
    'Un extrait se lance, quatre propositions s’affichent. Bonne réponse : 500 points, plus un bonus si t’es rapide.': 'A preview plays and four answers appear. Right answer: 500 points, plus a bonus if you’re quick.',
    'Ton pseudo': 'Your nickname',
    'Ex : Kyky': 'E.g. Kyky',
    'Rejoindre une partie': 'Join a game',
    'Code de la partie': 'Game code',
    'ou': 'or',
    'Créer une partie': 'Create a game',
    'Catégorie': 'Category',
    'Nombre de sons': 'Number of tracks',
    '∞ Infini': '∞ Endless',
    'Mode de jeu': 'Game mode',
    'En blind test': 'In a blind test',
    'Messages': 'Messages',
    'Mes messages': 'My messages',
    'Enregistrer un message vocal': 'Record a voice message',
    'Message vocal': 'Voice message',
    'Annuler l’enregistrement': 'Cancel recording',
    'Écouter le message vocal': 'Play voice message',
    'Enregistrement… appuie sur la flèche pour envoyer.': 'Recording… tap the arrow to send.',
    'Autorise le micro dans ton navigateur pour envoyer des messages vocaux.': 'Allow the microphone in your browser to send voice messages.',
    'Impossible d’utiliser le micro sur cet appareil.': 'Can’t use the microphone on this device.',
    'Message vocal trop court : garde le micro au moins 1 seconde.': 'Voice message too short: record at least 1 second.',
    'Impossible de lire ce message vocal.': 'Can’t play this voice message.',
    'Jazz coupé': 'Jazz off',
    'Couper la musique de fond': 'Turn off background music',
    'Mettre la musique de fond': 'Turn on background music',
    'Mettre du jazz en fond': 'Play some background jazz',
    'Message': 'Message',
    'Envoyer un message': 'Send a message',
    'Nouveaux messages': 'New messages',
    'Écris un message…': 'Write a message…',
    'Ton message': 'Your message',
    'Envoyer': 'Send',
    'Retour aux messages': 'Back to messages',
    'Fermer': 'Close',
    'Écrire à un ami': 'Write to a friend',
    'Choisis un ami pour lui écrire': 'Pick a friend to write to',
    'Ajoute des amis pour pouvoir leur écrire. Tu les trouves dans la fenêtre Amis.': 'Add friends to write to them. You’ll find them in the Friends window.',
    'Aujourd’hui': 'Today',
    'Hier': 'Yesterday',
    'Hors ligne': 'Offline',
    'Envoi…': 'Sending…',
    't’a envoyé un message': 'sent you a message',
    'Répondre': 'Reply',
    'Plus tard': 'Later',
    'Tu ne peux écrire qu’à tes amis.': 'You can only write to your friends.',
    'Vous n’êtes plus amis : tu peux relire la discussion, mais plus écrire.': 'You’re no longer friends: you can read the chat, but not write.',
    'Connecte-toi pour envoyer des messages à tes amis.': 'Log in to send messages to your friends.',
    'Battle royale': 'Battle royale',
    'Une erreur et tu es éliminé. Le dernier encore en vie gagne. Il faut être au moins 2.': 'One mistake and you’re out. Last one standing wins. You need at least 2 players.',
    'Tu es éliminé. Tu peux regarder les autres finir la partie.': 'You’re out. You can watch the others finish the game.',
    'Tu regardes la partie.': 'You’re watching the game.',
    'Tout le monde s’est trompé : personne n’est éliminé, on continue !': 'Everyone got it wrong: nobody is out, keep going!',
    'Dernier survivant': 'Last one standing',
    'En attente d’un 2e joueur': 'Waiting for a 2nd player',
    'Il faut être au moins 2 pour jouer en battle royale. Invite un pote !': 'You need at least 2 players for battle royale. Invite a friend!',
    'Tu es éliminé : regarde les autres finir la partie.': 'You’re out: watch the others finish the game.',
    'Autre': 'Other',
    'Continue tant qu’il reste des sons': 'Keeps going while there are tracks left',
    'Terminer la partie': 'End the game',
    'Sûr ? Clique encore pour terminer': 'Sure? Click again to end',
    'Seul l’hôte peut arrêter la partie.': 'Only the host can stop the game.',
    'Aucune partie en cours.': 'No game in progress.',
    'Difficulté': 'Difficulty',
    'Créer la partie': 'Create the game',
    'Artistes': 'Artists',
    'Artistes à entendre': 'Artists to hear',
    'Modifier': 'Edit',
    'Masquer': 'Hide',
    'Tout cocher': 'Select all',
    'Tout décocher': 'Unselect all',
    'Chercher un artiste': 'Search for an artist',
    '(aucun : coche ceux que tu veux entendre)': '(none: pick the ones you want to hear)',
    'Coche au moins un artiste.': 'Pick at least one artist.',
    'Choisis d’abord un pseudo.': 'Choose a nickname first.',
    'Le code fait 4 caractères.': 'The code is 4 characters long.',
    // catégories et niveaux
    'Rap FR': 'French Rap',
    'Rap US': 'US Rap',
    'Pop': 'Pop',
    'R&B': 'R&B',
    'Rock': 'Rock',
    'Années 2000': '2000s',
    'Classique': 'Classical',
    'Tout mélangé': 'Everything mixed',
    'Facile': 'Easy',
    'Intermédiaire': 'Medium',
    'HARRR MODE': 'HARRR MODE',

    // blind test : salon
    'Inviter mes potes': 'Invite my friends',
    'Lien copié, colle-le à tes potes.': 'Link copied, paste it to your friends.',
    'Joueurs': 'Players',
    'Inviter mes amis du site': 'Invite my Star Song friends',
    'Lancer la partie': 'Start the game',
    'Chargement…': 'Loading…',
    'Chargement des extraits…': 'Loading previews…',
    'Tous tes amis sont déjà dans la partie !': 'All your friends are already in the game!',
    'Tu n’as pas encore d’amis sur le site. Ajoute-les depuis la bulle « Amis » de l’accueil.': 'You don’t have any friends on the site yet. Add them from the “Friends” bubble on the home page.',
    'Connecte-toi sur Star Song': 'Log in to Star Song',
    'pour inviter tes amis directement. Sinon, partage le code.': 'to invite your friends directly. Otherwise, share the code.',

    // blind test : partie
    'Prépare-toi…': 'Get ready…',
    'C’est quel son ?': 'Which track is it?',
    'Bien joué !': 'Nice one!',
    'Raté !': 'Missed!',
    'Pas de réponse cette fois.': 'No answer this time.',
    'raté': 'missed',
    'Touche pour le son': 'Tap for sound',
    'Activer le son': 'Turn sound on',
    'Couper le son': 'Mute',
    'Remettre le son': 'Unmute',

    // blind test : fin et classement
    'Vainqueur': 'Winner',
    'Les sons de la partie': 'Tracks in this game',
    'Rejouer': 'Play again',
    'Changer de catégorie': 'Change category',
    'Quitter la partie': 'Leave the game',
    'L’hôte peut relancer une partie.': 'The host can start another game.',
    'Classement mondial': 'World leaderboard',
    'points': 'points',
    'Personne n’a encore joué. Lance une partie et prends la première place !': 'Nobody has played yet. Start a game and grab first place!',
    'pour apparaître dans le classement.': 'to show up on the leaderboard.',
    'Joue une partie pour entrer dans le classement.': 'Play a game to get on the leaderboard.',
    'T’es numéro 1 mondial. Garde ta place.': 'You’re world number 1. Hold on to it.',
    'Classement indisponible pour le moment.': 'Leaderboard unavailable right now.',

    // profil
    'Profil': 'Profile',
    'Fermer le profil': 'Close the profile',
    'Afficher le profil': 'View profile',
    'Modifier le profil': 'Edit profile',
    'Inviter au blind test': 'Invite to a blind test',
    'Vous êtes amis': 'You’re friends',
    'Accepter sa demande d’ami': 'Accept their friend request',
    'Demande d’ami envoyée': 'Friend request sent',
    'Ajouter en ami': 'Add as a friend',
    'Ta bio est vide. Clique sur « Modifier le profil » pour te présenter.': 'Your bio is empty. Click “Edit profile” to introduce yourself.',
    'Points': 'Points',
    'Victoires': 'Wins',
    'Victoire': 'Win',
    'Record': 'Best score',
    'Sons préférés': 'Favorite tracks',
    'Choisis jusqu’à 6 sons parmi tes favoris en modifiant ton profil.': 'Pick up to 6 tracks from your favorites by editing your profile.',
    'Pas encore de sons préférés.': 'No favorite tracks yet.',
    'Changer la photo': 'Change photo',
    'Retirer la photo': 'Remove photo',
    'Bannière': 'Banner',
    'Importer une image': 'Upload an image',
    'Bio': 'Bio',
    'Présente-toi : tes artistes, ta ville, ton son du moment…': 'Introduce yourself: your artists, your city, your track of the moment…',
    'Choisis jusqu’à 6 sons parmi tes favoris (★).': 'Pick up to 6 tracks from your favorites (★).',
    'Tu n’as pas encore de favori. Ajoute des sons avec l’étoile ☆ sur la page de recherche.': 'You don’t have any favorites yet. Add tracks with the star ☆ on the search page.',
    'Maximum 6 sons préférés.': '6 favorite tracks max.',
    'Profil enregistré.': 'Profile saved.',
    'Envoi de l’image…': 'Uploading image…',
    'Image enregistrée.': 'Image saved.',
    'Image illisible. Essaie une autre photo.': 'Unreadable image. Try another photo.',
    'Image invalide : utilise une photo JPEG, PNG ou WebP.': 'Invalid image: use a JPEG, PNG or WebP photo.',
    'Image trop lourde.': 'Image too large.',
    'Ce profil n’existe pas.': 'This profile doesn’t exist.',
    'Connecte-toi pour modifier ton profil.': 'Log in to edit your profile.',
    'Choisis d’abord un identifiant.': 'Choose a username first.',
    // messages du serveur
    'Action impossible pour le moment.': 'Can’t do that right now.',
    'Adresse e-mail invalide.': 'Invalid email address.',
    'Aucun utilisateur avec cet identifiant.': 'No user with this username.',
    'Aucune demande de cette personne.': 'No request from this person.',
    'Cet identifiant est déjà pris.': 'This username is already taken.',
    'Cette partie n’existe pas (ou plus). Vérifie le code.': 'This game doesn’t exist (anymore). Check the code.',
    'Choisis d’abord un identifiant pour utiliser les amis.': 'Choose a username first to use friends.',
    'Choisis un identifiant.': 'Choose a username.',
    'Choisis un mot de passe.': 'Choose a password.',
    'Choisis un pseudo.': 'Choose a nickname.',
    'Connecte-toi d’abord.': 'Log in first.',
    'Connecte-toi pour retrouver tes données.': 'Log in to get your data back.',
    'Connecte-toi pour utiliser les amis.': 'Log in to use friends.',
    'Connecte-toi sur Star Song pour inviter tes amis.': 'Log in to Star Song to invite your friends.',
    'Demande déjà envoyée.': 'Request already sent.',
    'Doucement ! Réessaie dans une minute.': 'Easy! Try again in a minute.',
    'Erreur du serveur.': 'Server error.',
    'Identifiant ou mot de passe incorrect.': 'Wrong username or password.',
    'Impossible de charger assez d’extraits avec ces artistes. Ajoute des artistes ou réessaie dans un instant.': 'Couldn’t load enough previews for these artists. Add artists or try again in a moment.',
    'Impossible de créer le compte pour le moment.': 'Can’t create the account right now.',
    'Impossible d’enregistrer l’identifiant pour le moment.': 'Can’t save the username right now.',
    'Introuvable.': 'Not found.',
    'La partie a déjà commencé.': 'The game has already started.',
    'La partie a déjà commencé. Attends la prochaine !': 'The game has already started. Wait for the next one!',
    'La partie est déjà lancée.': 'The game is already running.',
    'La partie est en cours.': 'The game is in progress.',
    'Le mot de passe doit faire au moins 8 caractères.': 'The password must be at least 8 characters.',
    'Le mot de passe est trop long (128 caractères maximum).': 'The password is too long (128 characters max).',
    'Le service de paroles ne répond pas.': 'The lyrics service isn’t responding.',
    'Le service de paroles ne répond pas. Réessaie dans un instant.': 'The lyrics service isn’t responding. Try again in a moment.',
    'Méthode non autorisée.': 'Method not allowed.',
    'Pas assez de sons avec ces artistes : coche-en quelques-uns de plus.': 'Not enough tracks with these artists: pick a few more.',
    'Renseigne ton identifiant (ou e-mail) et ton mot de passe.': 'Enter your username (or email) and your password.',
    'Requête invalide.': 'Invalid request.',
    'Requête trop volumineuse.': 'Request too large.',
    'Réponse invalide.': 'Invalid answer.',
    'Sauvegarde impossible pour le moment.': 'Can’t save right now.',
    'Seul l’hôte peut changer les réglages.': 'Only the host can change the settings.',
    'Seul l’hôte peut lancer la partie.': 'Only the host can start the game.',
    'Titre manquant.': 'Missing title.',
    'Trop de parties créées, attends une minute.': 'Too many games created, wait a minute.',
    'Trop de parties en cours, réessaie plus tard.': 'Too many games running, try again later.',
    'Trop de recherches, réessaie dans une minute.': 'Too many searches, try again in a minute.',
    'Trop de sauvegardes, réessaie dans une minute.': 'Too many saves, try again in a minute.',
    'Trop de tentatives, réessaie dans quelques minutes.': 'Too many attempts, try again in a few minutes.',
    'Trop d’actions, réessaie dans une minute.': 'Too many actions, try again in a minute.',
    'Trop d’invitations, attends une minute.': 'Too many invites, wait a minute.',
    'Trop tard pour cette manche !': 'Too late for this round!',
    'Tu as déjà répondu.': 'You already answered.',
    'Tu as déjà un identifiant.': 'You already have a username.',
    'Tu ne fais pas partie de cette partie. Rejoins-la avec le code.': 'You’re not in this game. Join it with the code.',
    'Tu ne peux inviter que tes amis.': 'You can only invite your friends.',
    'Tu ne peux pas t’ajouter toi-même.': 'You can’t add yourself.',
    'Tu ne peux voir que les données de tes amis.': 'You can only see your friends’ data.',
    'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.': 'An account already exists with this email. Log in instead.',
    'Vous êtes déjà amis.': 'You’re already friends.',
    'Impossible de lancer la partie pour le moment.': 'Can’t start the game right now.',

    // titres d'accroche (ils changent à chaque visite)
    'Le flow, tu l’as. Le titre, c’est une autre histoire.': 'You’ve got the flow. The title is another story.',
    'Tu connais le refrain par cœur mais pas le nom du morceau ?': 'You know the hook by heart but not the track’s name?',
    'Un banger dans la tête et zéro titre en mémoire.': 'A banger in your head and zero title in memory.',
    'L’instru tourne et le titre a disparu ?': 'The beat’s on loop and the title is gone?',
    'Tu as la punchline, il te manque la pochette.': 'You’ve got the punchline, you’re missing the cover.',
    'Seize mesures retenues, zéro titre retenu. Bilan correct.': 'Sixteen bars remembered, zero titles. Not bad.',
    'Pas de panique, même les meilleurs oublient un couplet.': 'Don’t panic, even the best forget a verse.',
    'Le sample te hante, le nom du morceau te fuit.': 'The sample haunts you, the track name escapes you.',
    'Donne-nous les mots, on fait le featuring avec ta mémoire.': 'Give us the words, we’ll feature on your memory.',
    'Ton cerveau a le refrain en boucle, nous on a le titre.': 'Your brain has the hook on loop, we’ve got the title.',
    'Un son qui tourne depuis ce matin ? On le retrouve.': 'A track stuck in your head since this morning? We’ll find it.',
    'Tu fredonnes la mélodie, on s’occupe du reste.': 'You hum the melody, we handle the rest.',
    'Mixtape perdue, titre introuvable ? On enquête.': 'Lost mixtape, title nowhere to be found? We’re on it.',
    'Ton oreille est bonne, ta mémoire un peu moins.': 'Your ear is good, your memory a bit less.',
    'Sans le titre, ton flow reste impeccable.': 'Even without the title, your flow is spotless.',
    'Le refrain colle, le nom glisse. Classique.': 'The hook sticks, the name slips. Classic.',
    'Studio ouvert : tape les paroles, on trouve le titre.': 'Studio’s open: type the lyrics, we find the title.',
    'Quelques mots suffisent, même approximatifs.': 'A few words are enough, even rough ones.',
    'Ce son te trotte dans la tête depuis la dernière soirée ?': 'That track stuck in your head since the last party?',
    'Pas de gloire sans titre. On retrouve le tien.': 'No glory without a title. We’ll find yours.',
    'Tu rappes sous la douche mais tu ne sais pas quoi ?': 'You rap in the shower but don’t know what?',
    'Tu freestyles sur un titre inconnu depuis longtemps ?': 'Been freestyling over an unknown track for ages?',
    'Même un beatmaker aurait oublié celui-là.': 'Even a beatmaker would have forgotten that one.',
    'Un couplet en tête, un trou de mémoire en face.': 'A verse in your head, a memory blank in front of you.',
    'Sors le micro, mais d’abord, tape les paroles.': 'Grab the mic, but first, type the lyrics.',
    'Tu peux le chanter, mais pas le nommer. Voilà le souci.': 'You can sing it, but not name it. That’s the problem.',
    'Tu connais le pont, le refrain, pas le titre. Étrange.': 'You know the bridge, the hook, not the title. Weird.',
    'Le DJ passe le morceau, toi tu cherches encore le nom.': 'The DJ plays the track, you’re still looking for the name.',
    'Un hit sans titre, c’est un artiste sans blaze.': 'A hit without a title is an artist without a name.',
    'Playlist presque parfaite, il ne manque qu’un titre.': 'Almost perfect playlist, just one title missing.',
    'Un refrain en tête et le titre qui a disparu ? On le retrouve.': 'A hook in your head and the title is gone? We’ll find it.',
    'Tu as entendu ce son au supermarché, avoue.': 'You heard this track at the supermarket, admit it.',
    'Cette instru te dit quelque chose ? On cherche avec toi.': 'That beat rings a bell? We’ll search with you.',
    'Même Shazam a besoin d’aide parfois. Nous aussi.': 'Even Shazam needs help sometimes. So do we.',
    'Un son de cinq minutes, une mémoire de cinq secondes.': 'A five-minute track, a five-second memory.',
    'Le refrain, c’est facile. Le titre, c’est le boss final.': 'The hook is easy. The title is the final boss.',
    'Premier couplet oublié ? Pas grave, le deuxième suffira.': 'Forgot the first verse? No worries, the second will do.',
    'Quelques rimes en tête ? Tu as déjà fait la moitié du travail.': 'A few rhymes in your head? You’ve already done half the work.',
    'Pour un expert du refrain, tu t’en sors plutôt bien.': 'For a hook expert, you’re doing pretty well.',
    'Le son parfait pour ce soir existe. Il lui manque juste un nom.': 'The perfect track for tonight exists. It just needs a name.',
    'Ton morceau préféré a un titre. On va le retrouver.': 'Your favorite track has a title. We’ll find it.',
    'Ça rime, ça groove, ça a un titre. Cherche-le ici.': 'It rhymes, it grooves, it has a title. Look for it here.',
    'La rime est là, le titre arrive.': 'The rhyme is here, the title is coming.',
    'Quand les mots sont là mais pas le nom du morceau, tape ici.': 'When you’ve got the words but not the track’s name, type here.',
    'Tu as la rime, il te manque le titre. Sinon, c’est parfait.': 'You’ve got the rhyme, you’re missing the title. Otherwise, perfect.',
    'Pas besoin de rapper, juste d’écrire.': 'No need to rap, just type.',
    'Un couplet, un refrain, un titre qui se cache.': 'A verse, a hook, a title in hiding.',
    'Les paroles, c’est ton rayon. Les titres, le nôtre.': 'Lyrics are your thing. Titles are ours.',
    'Tu as écouté ça en boucle sans regarder le titre ?': 'You played it on repeat without checking the title?',
    'Ça arrive aux meilleurs : on retient le flow, jamais le nom.': 'It happens to the best: you remember the flow, never the name.',
    'Ton cerveau est un bon DJ, mais un mauvais libraire.': 'Your brain is a good DJ, but a bad librarian.',
    'La mémoire fait un sample, le titre disparaît du mix.': 'Your memory samples it, the title drops out of the mix.',
    'Ce refrain mérite un nom. Retrouvons-le.': 'This hook deserves a name. Let’s find it.',
    'Toi, moi, un refrain, et un titre à retrouver.': 'You, me, a hook, and a title to find.',
    'Le feat a changé le titre ? Ça n’aide pas, on sait.': 'The feature changed the title? Doesn’t help, we know.',
    'Un son en tête depuis des jours, ça mérite une enquête.': 'A track stuck in your head for days deserves an investigation.',
    'Tu rappes dans ta tête, on lit dans tes pensées.': 'You rap in your head, we read your mind.',
    'L’instru est mythique, le titre est un mystère.': 'The beat is legendary, the title is a mystery.',
    'Le refrain tourne, mais le titre a pris la fuite.': 'The hook keeps spinning, but the title ran away.',
    'Pas de pochette, pas de titre, juste un refrain.': 'No cover, no title, just a hook.',
    'Cette punchline, tu l’as retenue. Le titre, un peu moins.': 'You remembered that punchline. The title, not so much.',
    'L’oreille absolue, la mémoire relative.': 'Perfect pitch, imperfect memory.',
    'Tu as la voix, tu as les paroles, il te manque le titre.': 'You’ve got the voice, you’ve got the lyrics, you’re missing the title.',
    'Un petit coup de pouce pour ta mémoire ? C’est ici.': 'Need a little boost for your memory? Right here.',
    'Ce son a une histoire. Il a aussi un titre.': 'This track has a story. It also has a title.',
    'Nouveau record : refrain mémorisé en une écoute, titre en zéro.': 'New record: hook memorized in one listen, title in zero.',
    'Comme au studio : balance les paroles, on prend le titre.': 'Just like in the studio: drop the lyrics, we’ll get the title.',
    'Ce son est dans ton crâne, le titre est dans notre base.': 'The track is in your head, the title is in our database.',
    'Même les rappeurs relisent leurs textes parfois.': 'Even rappers reread their lyrics sometimes.',
    'Le refrain est à toi, le titre est à nous.': 'The hook is yours, the title is ours.',
    'Tu peux fredonner, mais on préfère que tu tapes.': 'You can hum, but we’d rather you type.',
    'Un couplet entier te manque ? Un seul mot suffit.': 'Missing a whole verse? One word is enough.',
    'Un mot, deux mots, trois mots : on trouve le morceau.': 'One word, two words, three words: we find the track.',
    'Pas de beat sans titre. Retrouvons-le ensemble.': 'No beat without a title. Let’s find it together.',
    'Un son oublié, un son retrouvé. C’est ici que ça se passe.': 'A track forgotten, a track found. This is where it happens.',
    'Ton ancien son préféré revient d’entre les morts.': 'Your old favorite track is back from the dead.',
    'Ça sent le classique oublié. On le sort du tiroir.': 'Smells like a forgotten classic. Let’s dig it out.',
    'Un titre, un artiste, une pochette : tout ce qu’il te manque.': 'A title, an artist, a cover: everything you’re missing.',
    'Un hit ne s’oublie jamais, il se cherche.': 'A hit is never forgotten, just misplaced.',
    'Il y a toujours un titre derrière un refrain.': 'There’s always a title behind a hook.',
    'Le refrain est célèbre, le titre est timide.': 'The hook is famous, the title is shy.',
    'Tu as la rime mais pas la raison. Enfin, pas le titre.': 'You’ve got the rhyme but not the reason. Well, not the title.',
    'Ça fait un moment que tu cherches ? Les paroles nous suffisent.': 'Been searching for a while? The lyrics are all we need.',
    'Retrouve ce morceau avant que le DJ change de disque.': 'Find this track before the DJ switches records.',
    'Le mic est à toi : écris ce que tu te rappelles.': 'The mic is yours: write what you remember.',
    'Pas de feat avec ta mémoire cette fois : on gère.': 'No feature with your memory this time: we’ve got it.',
    'Le micro est ouvert. Dis-nous ce refrain.': 'The mic is open. Tell us that hook.',
    'Un dernier effort, et le titre est à toi.': 'One last push, and the title is yours.',
    'Un son, des paroles, un peu de patience.': 'A track, some lyrics, a little patience.',
    'Cette ligne de basse, tu la connais. Ce titre, on va le retrouver.': 'You know that bassline. We’ll find that title.',
    'Pas de pression, juste des paroles.': 'No pressure, just lyrics.',
    'Un bon morceau mérite d’être retrouvé.': 'A good track deserves to be found.',
    'On tape, on trouve, on écoute. Simple.': 'Type, find, listen. Simple.',
    'Aucune honte à oublier un titre, tout le monde l’a fait.': 'No shame in forgetting a title, everyone has.',
    'Ça commence par un mot. Le reste suivra.': 'It starts with one word. The rest will follow.',
    'Une phrase, même floue, et c’est parti.': 'One line, even a fuzzy one, and off we go.',
    'Un son, un souvenir, un titre à retrouver.': 'A track, a memory, a title to find.',
    'Le mix est lancé, il manque juste ton refrain.': 'The mix is on, it just needs your hook.',
    'L’oubli fait partie du jeu. Retrouver, c’est notre métier.': 'Forgetting is part of the game. Finding is our job.',
    'Qui a dit qu’il fallait retenir tous les titres ? Pas nous.': 'Who said you have to remember every title? Not us.',
    'On a tous un son qu’on cherche. Voici le tien.': 'We all have a track we’re looking for. Here’s yours.',
  };

  // --- Phrases avec une partie qui change (nombre, pseudo…) ---
  const t = (s) => tr(s) ?? s;
  const plural = (n, one, many) => (Number(n) === 1 ? one : many);
  const list = (s) => s.split(', ').map(t).join(', ');
  const RULES = [
    [/^(\d+) chansons trouvées$/, (m) => `${m[1]} songs found`],
    [/^(\d+) sons? en favoris?$/, (m) => `${m[1]} favorite ${plural(m[1], 'track', 'tracks')}`],
    [/^(\d+) sons?$/, (m) => `${m[1]} ${plural(m[1], 'track', 'tracks')}`],
    [/^Son (\d+) \/ (\d+|∞)$/, (m) => `Track ${m[1]} / ${m[2]}`],
    [/^Impossible de lire l’extrait de « (.+) »\.$/, (m) => `Couldn’t play the preview of “${m[1]}”.`],
    [/^Déconnexion impossible : (.+)$/, (m) => `Couldn’t log out: ${t(m[1])}`],
    [/^Ajouter aux favoris : (.+)$/, (m) => `Add to favorites: ${m[1]}`],
    [/^Retirer des favoris : (.+)$/, (m) => `Remove from favorites: ${m[1]}`],
    [/^Demande envoyée à (.+)\.$/, (m) => `Request sent to ${m[1]}.`],
    [/^(.+) est maintenant ton ami\.$/, (m) => `${m[1]} is now your friend.`],
    [/^(.+) a reçu ton invitation\.( Il la verra en ouvrant le site\.)?$/, (m) => `${m[1]} got your invite.` + (m[2] ? ' They’ll see it when they open the site.' : '')],
    [/^Chez (.+)$/, (m) => `${m[1]}’s corner`],
    [/^En attente : (.+)$/, (m) => `Pending: ${m[1]}`],
    [/^Membre depuis (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (\d{4})$/, (m) => `Member since ${['January','February','March','April','May','June','July','August','September','October','November','December'][['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'].indexOf(m[1])]} ${m[2]}`],
    [/^Bannière (\w+)$/, (m) => `Banner ${m[1]}`],
    [/^Un favori de (.+)\.$/, (m) => `One of ${m[1]}’s favorites.`],
    [/^(.+) n’a pas encore de favori\.$/, (m) => `${m[1]} has no favorites yet.`],
    [/^Retirer (.+) de tes amis \?$/, (m) => `Remove ${m[1]} from your friends?`],
    [/^Vu il y a (\d+) min$/, (m) => `Seen ${m[1]} min ago`],
    [/^Vu il y a (\d+) h$/, (m) => `Seen ${m[1]} h ago`],
    [/^Vu il y a (\d+) jours$/, (m) => `Seen ${m[1]} days ago`],
    [/^Ouvrir mes amis(?: \((\d+) en ligne\))?(?:, (\d+) demandes?)?$/, (m) => 'Open my friends' + (m[1] ? ` (${m[1]} online)` : '') + (m[2] ? `, ${m[2]} ${plural(m[2], 'request', 'requests')}` : '')],
    [/^T’es (\d+)e\. Encore un effort\.$/, (m) => `You’re #${m[1]}. Keep pushing.`],
    [/^(\d+) joueurs?$/, (m) => `${m[1]} ${plural(m[1], 'player', 'players')}`],
    [/^(\d+) parties?, (\d+) victoires?, record (.+)$/, (m) => `${m[1]} ${plural(m[1], 'game', 'games')}, ${m[2]} ${plural(m[2], 'win', 'wins')}, best ${m[3]}`],
    [/^\(tous, (\d+) sons\)$/, (m) => `(all, ${m[1]} tracks)`],
    [/^\((\d+) sur (\d+), (\d+) sons\)$/, (m) => `(${m[1]} of ${m[2]}, ${m[3]} tracks)`],
    [/^Réponse envoyée\. (\d+)\/(\d+) ont répondu\.$/, (m) => `Answer sent. ${m[1]}/${m[2]} have answered.`],
    [/^Son (\d+) · (\d+) en vie$/, (m) => `Track ${m[1]} · ${m[2]} left`],
    [/^Éliminés? : (.+)$/, (m) => `Out: ${m[1]}`],
    [/^Battle royale, (.+)$/, (m) => `Battle royale, ${t(m[1])}`],
    [/^Dis bonjour à (.+) !$/, (m) => `Say hi to ${m[1]}!`],
    [/^(\d{2}:\d{2}) · Vu$/, (m) => `${m[1]} · Seen`],
    [/^(\d+) caractères? restants?$/, (m) => `${m[1]} characters left`],
    [/^Autre nombre de sons \(1 à (\d+)\)$/, (m) => `Other number of tracks (1 to ${m[1]})`],
    [/^Égalité : (.+)$/, (m) => `Tie: ${m[1].replace(/ et /g, ' and ')}`],
    [/^En attente que l’hôte lance la partie \((.+?), (Facile|Intermédiaire|HARRR MODE), (\d+ sons?|mode infini|battle royale)(?:, artistes : (.+?)(?: et (\d+) autres)?)?\)\.$/,
      (m) => `Waiting for the host to start the game (${t(m[1])}, ${t(m[2])}, ${m[3] === 'battle royale' ? 'battle royale' : m[3] === 'mode infini' ? 'endless mode' : m[3].replace(/sons?/, (x) => (x === 'son' ? 'track' : 'tracks'))}` + (m[4] ? `, artists: ${m[4]}${m[5] ? ` and ${m[5]} more` : ''}` : '') + ').'],
    [/^(.+), partie ([A-Z0-9]{4})$/, (m) => `${list(m[1])}, game ${m[2]}`],
    [/^(Rap FR|Rap US|Pop|R&B|Rock|Années 2000|Classique|Tout mélangé), (Facile|Intermédiaire|HARRR MODE)$/, (m) => `${t(m[1])}, ${t(m[2])}`],
    [/^La partie est pleine \((\d+) joueurs maximum\)\.$/, (m) => `The game is full (${m[1]} players max).`],
    [/^(.+) a (\d+) sons? en favoris?\.$/, (m) => `${m[1]} has ${m[2]} favorite ${plural(m[2], 'track', 'tracks')}.`],
  ];

  // --- Ce qu'il ne faut jamais traduire : titres de sons, artistes, paroles, pseudos ---
  const SKIP = 'script,style,textarea,[data-notranslate],.title,.meta,.options .t,.options .a,#revealTitle,#revealArtist,.tracklist,.artist-chip span,.hist-title,.hist-meta,.lyr-text,.fav-item,.board-row .name,.code,.who > :not(.st)';
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const norm = (s) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
  function tr(s) {
    const k = norm(s);
    if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(DICT, k)) return DICT[k];
    for (const [re, fn] of RULES) { const m = k.match(re); if (m) return fn(m); }
    return null;
  }

  // langue choisie avant, sinon celle du navigateur (français si le navigateur est en français, anglais sinon)
  let lang = null;
  try { lang = localStorage.getItem('lang'); } catch {}
  if (lang !== 'fr' && lang !== 'en') lang = (navigator.language || 'fr').slice(0, 2) === 'fr' ? 'fr' : 'en';

  // texte d'origine (français) et dernière version écrite, pour pouvoir revenir en arrière
  const origText = new WeakMap(), lastText = new WeakMap();
  const origAttr = new WeakMap(), lastAttr = new WeakMap();

  function doText(node) {
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    if (!origText.has(node) || node.data !== lastText.get(node)) origText.set(node, node.data); // le site a changé le texte
    const o = origText.get(node);
    let out = o;
    if (lang === 'en') {
      const en = p.dataset.en && p.childNodes.length === 1 ? p.dataset.en : tr(o);
      if (en != null) out = o.match(/^\s*/)[0] + en + o.match(/\s*$/)[0];
    }
    lastText.set(node, out);
    if (node.data !== out) node.data = out;
  }
  function doAttr(el, name) {
    if (!el.hasAttribute(name) || el.closest('[data-notranslate]')) return;
    const cur = el.getAttribute(name);
    const o0 = origAttr.get(el) || {}, l0 = lastAttr.get(el) || {};
    if (!(name in o0) || cur !== l0[name]) o0[name] = cur;
    const o = o0[name];
    const out = lang === 'en' ? (tr(o) ?? o) : o;
    l0[name] = out;
    origAttr.set(el, o0); lastAttr.set(el, l0);
    if (cur !== out) el.setAttribute(name, out);
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    for (const a of ATTRS) doAttr(root, a);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) doText(n);
      else for (const a of ATTRS) if (n.hasAttribute(a)) doAttr(n, a);
    }
  }

  let docTitle = null;
  function applyAll() {
    document.documentElement.lang = lang;
    if (docTitle === null) docTitle = document.title;
    document.title = lang === 'en' ? (tr(docTitle) ?? docTitle) : docTitle;
    walk(document.documentElement);
  }

  // tout ce qui s'affiche ensuite est traduit au fur et à mesure
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach(walk);
      else if (r.type === 'characterData') { if (r.target.data !== lastText.get(r.target)) doText(r.target); }
      else if (r.type === 'attributes') { const l = (lastAttr.get(r.target) || {})[r.attributeName]; if (r.target.getAttribute(r.attributeName) !== l) doAttr(r.target, r.attributeName); }
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  // fenêtres de confirmation du navigateur
  const nativeConfirm = window.confirm.bind(window), nativeAlert = window.alert.bind(window);
  window.confirm = (m) => nativeConfirm(lang === 'en' ? (tr(String(m)) ?? m) : m);
  window.alert = (m) => nativeAlert(lang === 'en' ? (tr(String(m)) ?? m) : m);
  window.siteLang = () => lang;

  // --- Les petits drapeaux ---
  const FLAGS = {
    fr: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="10" height="20" fill="#0055A4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#EF4135"/></svg>',
    en: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="7"/></svg>',
  };
  function mountSwitch() {
    const bar = document.querySelector('.topbar');
    if (!bar || bar.querySelector('.lang-switch')) return;
    const box = document.createElement('div');
    box.className = 'lang-switch';
    box.setAttribute('role', 'group');
    box.setAttribute('data-notranslate', '');
    box.setAttribute('aria-label', 'Langue / Language');
    box.dataset.lang = lang;
    box.innerHTML = '<span class="lang-thumb" aria-hidden="true"></span>'
      + `<button type="button" data-l="fr" aria-label="Français" title="Français">${FLAGS.fr}</button>`
      + `<button type="button" data-l="en" aria-label="English" title="English">${FLAGS.en}</button>`;
    // la pastille glisse tout de suite vers le drapeau choisi (le texte change juste après)
    const sync = (l = lang) => { box.dataset.lang = l; box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l))); };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.dataset.l === box.dataset.lang) return;
      sync(b.dataset.l);
      setLang(b.dataset.l);
    });
    sync();
    bar.append(box);
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setLang(next) {
    try { localStorage.setItem('lang', next); } catch {}
    if (reduce) { lang = next; applyAll(); return; }
    // petite transition : le texte s'estompe, change de langue, puis revient
    document.body.classList.add('lang-out');
    setTimeout(() => {
      lang = next;
      applyAll();
      document.body.classList.remove('lang-out');
      document.body.classList.add('lang-in');
      setTimeout(() => document.body.classList.remove('lang-in'), 380);
    }, 170);
  }

  // style du sélecteur et de la transition
  const css = document.createElement('style');
  css.textContent = `
    .lang-switch { position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 3px; border-radius: 999px; background: rgba(0,0,0,.45); box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
    .lang-switch button { position: relative; z-index: 1; display: grid; place-items: center; width: 2.4rem; height: 1.9rem; min-height: 0; padding: 0; margin: 0; border: 0; border-radius: 999px; background: transparent; box-shadow: none; cursor: pointer; opacity: .55; filter: saturate(.4); transition: opacity .25s, filter .25s, transform .2s; }
    .lang-switch button:hover { opacity: .9; filter: none; transform: none; background: transparent; }
    .lang-switch button:active { transform: scale(.9); background: transparent; border: 0; box-shadow: none; }
    .lang-switch button[aria-pressed="true"] { opacity: 1; filter: none; }
    .lang-switch svg { width: 1.45rem; height: auto; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,.4); }
    .lang-switch button[aria-pressed="true"] svg { animation: flagPop .45s cubic-bezier(.2, .9, .3, 1.5); }
    .lang-thumb { position: absolute; top: 3px; left: 3px; width: calc(50% - 3px); height: calc(100% - 6px); border-radius: 999px; background: rgba(255,255,255,.16); box-shadow: 0 0 0 1px rgba(242, 140, 28, .7); transition: transform .35s cubic-bezier(.3, .9, .3, 1.2); }
    .lang-switch[data-lang="en"] .lang-thumb { transform: translateX(100%); }
    @keyframes flagPop { 0% { transform: scale(.6) rotate(-12deg); } 60% { transform: scale(1.15) rotate(4deg); } 100% { transform: none; } }
    body.lang-out main, body.lang-out dialog[open] { opacity: 0; filter: blur(3px); transform: translateY(4px); transition: opacity .17s ease, filter .17s ease, transform .17s ease; }
    body.lang-in main, body.lang-in dialog[open] { animation: langIn .38s ease; }
    @keyframes langIn { from { opacity: 0; filter: blur(3px); transform: translateY(-4px); } to { opacity: 1; filter: none; transform: none; } }
    html[lang="en"] .players li.host::after { content: " (host)"; }
    @media (prefers-reduced-motion: reduce) { .lang-thumb, .lang-switch button { transition: none; } .lang-switch svg { animation: none !important; } }
  `;
  document.head.append(css);

  applyAll();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountSwitch(); applyAll(); });
  else mountSwitch();
})();
