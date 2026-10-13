# I Lost My Job (Again) — consignes

Jeu Windows (Electron) : `index.html` (jeu three.js), `main.js` (process principal), `preload.js`, `groq.js` (API Groq + rotation de clés). Voir README.md.

## Synchronisation GitHub (demandé par le propriétaire)

Le dépôt est partagé (d'autres personnes y poussent).
- **Avant toute modification** : `git pull --rebase` pour récupérer les mises à jour éventuelles.
- **Après chaque modification** : commit, puis `git pull --rebase` à nouveau (vérifier qu'il n'y a rien eu entre-temps, résoudre les conflits), puis `git push` sur `main`.
- Nouvelle fonctionnalité → version x.Y.0, correction → x.y.Z dans `package.json`, puis `npm run dist` et `gh release create vX.Y.Z` avec `dist/ILostMyJobAgain-Setup-X.Y.Z.exe` et `dist/ILostMyJobAgain-Portable-X.Y.Z.exe`, notes en français.

## Notes

- `index.html` doit continuer à fonctionner seul dans un navigateur (pas de `window.desktop` → mode hors-ligne).
- Ne jamais écrire de vraie clé API dans le dépôt. Pour tester l'IA sans clé : `GROQ_BASE_URL` pointe vers un faux serveur local.
- npm bloque les scripts d'installation : après `npm install`, lancer `node node_modules/electron/install.js` si `node_modules/electron/dist` manque.
