# I Lost My Job (Again)

Jeu d'entretien d'embauche comique : un recruteur 3D (three.js) juge tes réponses, note l'impression, et tu finis toujours par perdre le job.

## Jouer (Windows)

Télécharge la dernière version dans les [Releases](https://github.com/schl-dev/i-lost-my-job-again/releases) :

- `ILostMyJobAgain-Setup-X.Y.Z.exe` : installateur (raccourcis Bureau + menu Démarrer) ;
- `ILostMyJobAgain-Portable-X.Y.Z.exe` : version portable, sans installation.

Le jeu n'est pas signé : au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur » → *Informations complémentaires* → *Exécuter quand même*.

## Recruteur IA (Groq)

Le recruteur est joué par un modèle de l'[API Groq](https://console.groq.com/keys). Dans le jeu : **⚙ Paramètres** → colle une ou plusieurs clés API (`gsk_…`, une par ligne) → **Tester les clés**.

- Tu peux ajouter autant de clés que tu veux : le jeu les utilise à tour de rôle.
- Quand une clé atteint sa limite (erreur 429), elle est mise en pause jusqu'à la fin de la limite et le jeu passe à la suivante. Une clé refusée (401) est marquée « refusée » et ignorée.
- Si toutes les clés sont limitées sur le modèle choisi, le jeu essaie un autre modèle (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `openai/gpt-oss-20b`, `llama-3.1-8b-instant`).
- ⚠️ Chez Groq, les limites sont comptées **par organisation (compte) et par modèle** : plusieurs clés d'un même compte partagent la même limite.
- Les clés sont chiffrées avec Windows (DPAPI) dans `%APPDATA%\I Lost My Job (Again)\settings.json` et ne quittent pas le PC (sauf vers l'API Groq).
- Sans clé (ou sans connexion), le jeu passe en mode hors-ligne avec des réponses toutes faites.

Les variables d'environnement `GROQ_API_KEYS` (liste séparée par des virgules) ou `GROQ_API_KEY` sont aussi prises en compte.

## Développement

```bash
npm install
npm start          # lance le jeu
npm run dev        # avec les DevTools
npm run dist       # construit dist/ILostMyJobAgain-Setup-X.Y.Z.exe et la version portable
npm run vendor     # recopie three.js r128 et la police Baloo 2 dans vendor/
npm run icon       # régénère build/icon.png
```

Structure :

- `index.html` : tout le jeu (scène 3D, interface, logique). S'ouvre aussi directement dans un navigateur (mode hors-ligne).
- `main.js` : process principal Electron (fenêtre, réglages, protocole `app://`, IPC).
- `preload.js` : pont sécurisé `window.desktop` entre la page et le process principal.
- `groq.js` : appels à l'API Groq avec rotation des clés et modèles de secours.
- `vendor/` : three.js et la police, embarqués pour jouer sans Internet.

Raccourcis : **F11** plein écran.
