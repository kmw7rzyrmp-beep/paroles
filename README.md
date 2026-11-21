# Star Song : recherche de chanson par paroles

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

## Comptes (inscription / connexion)

Les visiteurs créent un compte avec un identifiant (obligatoire), une adresse e-mail (facultative) et un mot de passe
(8 caractères minimum ; les comptes créés avant cette règle peuvent toujours se connecter). Ils se connectent ensuite avec l'identifiant ou l'e-mail, comme ils préfèrent.
Un compte créé sans identifiant (avant qu'il soit obligatoire) se voit proposer d'en choisir un à la connexion ; il ne peut
ensuite plus être changé.

- `auth.js` : inscription, connexion, déconnexion. Mots de passe hachés avec scrypt (jamais stockés en clair),
  session dans un cookie `HttpOnly` de 30 jours, limitation des tentatives par IP et par e-mail.
- Les comptes sont gardés dans Supabase si `SUPABASE_URL` et `SUPABASE_KEY` sont définis (voir plus bas), sinon dans `data/db.json` (créé automatiquement, ignoré par git). **Sauvegarde ce fichier**
  et ne le publie jamais. Le dossier peut être changé avec `DATA_DIR` dans `.env`.
- Derrière un hébergeur ou un proxy qui ajoute `X-Forwarded-For`, mets `TRUST_PROXY=1` dans `.env`,
  sinon tous les visiteurs partagent la même limite de tentatives et de recherches. Utilise HTTPS en ligne.
- Quand on est connecté, les favoris, l'historique, le compteur de recherches et les calages des paroles sont
  enregistrés dans le compte et retrouvés sur tous les appareils (`GET/PUT /api/data`). À la connexion, ce qui a été
  fait avant dans le navigateur est ajouté au compte. À la déconnexion, ces données sont effacées de l'appareil.
- **Amis** : onglet « Amis » (visible une fois connecté avec un identifiant). On invite quelqu'un avec son identifiant ;
  la demande doit être acceptée. Une fois amis, chacun peut voir l'historique des recherches et les favoris de l'autre
  (`/api/friends/...`). Retirer un ami coupe l'accès dans les deux sens.
- Limites actuelles : l'adresse e-mail n'est pas vérifiée et il n'y a pas encore de « mot de passe oublié »
  (cela demande un service d'envoi d'e-mails).

## Garder les comptes pour toujours (Render)

Sur Render (offre gratuite), le disque est effacé à chaque redémarrage ou mise à jour : `data/db.json` disparaît,
et avec lui tous les comptes. Pour l'éviter, le site peut garder les comptes dans une base Supabase gratuite.

1. Crée un compte sur https://supabase.com puis un nouveau projet.
2. Dans le projet, ouvre **SQL Editor**, colle ceci puis clique sur **Run** :
   ```sql
   create table app_state (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz default now()
   );
   alter table app_state enable row level security;
   grant select, insert, update on table public.app_state to service_role;
   ```
   (La sécurité au niveau des lignes est activée sans règle : seule la clé secrète du serveur peut lire la table.)
3. Dans **Project Settings → API Keys**, copie la **clé secrète** (`sb_secret_...`, ou l'ancienne clé `service_role`).
   Dans **Project Settings → Data API**, copie l'**URL du projet** (`https://xxxx.supabase.co`).
4. Sur Render, dans ton service → **Environment**, ajoute :
   - `SUPABASE_URL` = l'URL du projet
   - `SUPABASE_KEY` = la clé secrète
   - `TRUST_PROXY` = `1`
5. Enregistre : Render redémarre le site. Dans les **Logs**, tu dois voir « Comptes : … chargé(s) depuis Supabase ».

### Fenêtre « Stats » (réservée à l'admin)

Sur Render → **Environment**, ajoute `ADMIN_USERNAME` = ton identifiant sur le site (plusieurs : séparés par des virgules).
Une fois connecté avec ce compte, un bouton **Stats** apparaît en haut de la page d'accueil : comptes, recherches,
visites, blind test, etc. Personne d'autre ne voit ce bouton, et le serveur refuse les stats à tout autre compte.

La clé secrète donne un accès complet à la base : ne la mets jamais dans `index.html` ni sur GitHub.
Si Supabase ne répond pas au démarrage, le serveur s'arrête (Render le relance) au lieu de démarrer sans comptes.
Un projet Supabase gratuit est mis en pause après 7 jours sans aucune visite : il suffit alors de le relancer
depuis le tableau de bord, les données sont conservées.

## Comment ça marche

- `public/index.html` : la page (barre de recherche + résultats).
- `server.js` : relaie la recherche vers Genius, cherche un extrait audio (iTunes, puis Deezer) et les paroles (LRCLIB),
  et branche `auth.js` pour les comptes. Limite de 30 recherches par minute et par IP, cache de 10 minutes.

## Mise en ligne et droits

Prévu pour un projet personnel. Pour un site public à fort trafic ou commercial, l'accès non officiel
à Genius n'est pas une base solide : il faudrait une licence (par exemple Musixmatch) ou un accord avec Genius.
Le site affiche les paroles récupérées sur LRCLIB (base gratuite et collaborative). Les paroles sont protégées par le droit
d'auteur : pour un site public, il faudrait une licence (par exemple Musixmatch, LyricFind) ou se limiter au titre,
à l'artiste, à la pochette et à un lien vers Genius.
