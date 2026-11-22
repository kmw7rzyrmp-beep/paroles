# Règle des patch notes

**Un seul patch note par jour, publié automatiquement à 18 h (heure de Paris).**

- La version du jour est écrite à l'avance dans `patchnotes.js` avec `time: '18:00'`. Elle reste cachée jusqu'à 18 h.
- Chaque modification visible faite dans la journée s'ajoute à cette version (une ligne dans `items`).
- À 18 h, le serveur la publie tout seul et envoie la notification à tout le monde (une seule fois).
- 10 minutes avant, les admins reçoivent un message pour les prévenir.
- S'il n'y a eu aucune modification ce jour-là, il n'y a pas de version du jour : aucun patch note n'est envoyé.
- Le lendemain, on crée une nouvelle version (numéro suivant, date du jour, `time: '18:00'`).
