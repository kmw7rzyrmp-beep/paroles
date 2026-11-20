# Recherche de chanson par paroles

Tape quelques paroles, le site affiche le titre, l'artiste et la pochette de la chanson (via Genius).

## Lancer le site

1. Installe Node.js 20.12 ou plus récent : https://nodejs.org
2. Dans ce dossier :
   ```
   npm start
   ```
3. Ouvre http://localhost:3000

Aucune installation npm n'est nécessaire (aucune dépendance), et aucune clé n'est obligatoire.

Pour voir l'interface avec des résultats fictifs : `npm run demo`.

## Jeton Genius (facultatif, recommandé)

La recherche par paroles utilise un point d'accès public de Genius, qui n'est pas documenté officiellement
et peut changer ou bloquer certains serveurs. Si cette recherche échoue, le site se rabat sur l'API
officielle, qui demande un jeton gratuit :

1. Crée un compte sur https://genius.com puis ouvre https://genius.com/api-clients
2. Crée un client API, puis clique sur « Generate Access Token ».
3. Copie `.env.example` en `.env` et colle le jeton dans `GENIUS_ACCESS_TOKEN`.

Attention : l'API officielle cherche surtout par titre et par artiste, donc le secours est moins efficace
pour retrouver une chanson à partir de paroles.

## Comment ça marche

- `public/index.html` : la page (barre de recherche + résultats).
- `server.js` : relaie la recherche vers Genius. Limite de 30 recherches par minute et par IP, cache de 10 minutes.

## Mise en ligne et droits

Prévu pour un projet personnel. Pour un site public à fort trafic ou commercial, l'accès non officiel
à Genius n'est pas une base solide : il faudrait une licence (par exemple Musixmatch) ou un accord avec Genius.
Le site n'affiche jamais les paroles, seulement le titre, l'artiste et la pochette.
