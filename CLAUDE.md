# I Lost My Job (Again) — consignes

Jeu Windows (Electron) : `index.html` (jeu three.js), `main.js` (process principal), `preload.js`, `ai.js` (serveur IA du jeu https://ai.drafthome.fr, GroqProxy, modèle imposé `openai/gpt-oss-120b`). Voir README.md.

## Synchronisation GitHub (demandé par le propriétaire)

Le dépôt est partagé (d'autres personnes y poussent).
- **Avant toute modification** : `git pull --rebase` pour récupérer les mises à jour éventuelles.
- **Après chaque modification** : commit, puis `git pull --rebase` à nouveau (vérifier qu'il n'y a rien eu entre-temps, résoudre les conflits), puis `git push` sur `main`.
- Nouvelle fonctionnalité → version x.Y.0, correction → x.y.Z dans `package.json`, puis `npm run dist` et `gh release create vX.Y.Z dist/ILostMyJobAgain-Setup.exe dist/ILostMyJobAgain-Setup.exe.blockmap dist/latest.yml dist/ILostMyJobAgain-Installeur.exe`, notes en français. Les noms de fichiers sont fixes (sans numéro de version) : l'installeur à envoyer télécharge `releases/latest/download/ILostMyJobAgain-Setup.exe`, et le jeu installé se met à jour grâce à `latest.yml` (electron-updater). Release publiée (pas brouillon/pré-release), sinon personne ne la reçoit.
- Le dépôt est **public** : rien de secret ne doit y entrer.

## Notes

- `index.html` doit continuer à fonctionner seul dans un navigateur (pas de `window.desktop` → mode hors-ligne).
- **Clé du serveur IA** : uniquement dans `secret/ai-key.txt` (ignoré par Git), chiffrée dans `secret.js` (ignoré aussi) par `npm run dist`. Ne jamais la committer, l'afficher ni la mettre dans un message de commit. Vérifier `git status` avant chaque commit.
- La page ne doit jamais recevoir la clé ; le protocole `app://` ne sert que `index.html` et `vendor/`.
- La version installée refuse les options de débogage et a des fuses Electron : pour vérifier un build, ne pas compter sur `--remote-debugging-port` (le jeu se ferme, c'est voulu).
- Pour tester l'IA sans le vrai serveur : `ILMJ_AI_URL` / `ILMJ_AI_KEY` (développement seulement) vers un faux serveur local.
- npm bloque les scripts d'installation : après `npm install`, lancer `node node_modules/electron/install.js` si `node_modules/electron/dist` manque.
