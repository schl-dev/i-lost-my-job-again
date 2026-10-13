# I Lost My Job (Again)

Jeu narratif d'entretien d'embauche : tu viens (encore) de perdre ton travail, et tu dois reconstruire une carrière entretien après entretien. Cinq entreprises, cinq recruteurs joués par une IA qui écoute vraiment ce que tu dis, un carnet pour préparer tes réponses, un CV qui progresse… et un job que tu finis toujours par perdre.

Le document de conception complet est dans [`docs/game-design.md`](docs/game-design.md).

## Jouer (Windows)

Pour installer le jeu (ou le faire tester), un seul fichier suffit : **[ILostMyJobAgain-Installeur.exe](https://github.com/schl-dev/i-lost-my-job-again/releases/latest/download/ILostMyJobAgain-Installeur.exe)** (≈ 75 Ko). Il télécharge la **dernière version** publiée sur GitHub, l'installe (raccourcis Bureau et menu Démarrer) et lance le jeu. Inutile de le renvoyer quand le jeu évolue.

**Mises à jour automatiques** : à chaque lancement, le jeu regarde s'il y a une nouvelle version sur GitHub. Si oui, il propose « Mettre à jour » ou « Plus tard » ; la mise à jour se télécharge, s'installe et le jeu se relance tout seul.

L'installation complète est aussi disponible directement : [ILostMyJobAgain-Setup.exe](https://github.com/schl-dev/i-lost-my-job-again/releases/latest/download/ILostMyJobAgain-Setup.exe) (≈ 110 Mo).

Le jeu n'est pas signé : au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur » → *Informations complémentaires* → *Exécuter quand même*.

## Boucle de jeu

1. **Offres d'emploi** : cinq entreprises, de la plus facile à la plus exigeante. Les offres verrouillées s'ouvrent avec l'expérience, les compétences écrites sur ton CV et ta réputation.
2. **Salle d'attente** : tu observes l'environnement (trois indices sur ce que l'entreprise attend), tu relis ton CV et tu écris tes notes dans ton **carnet**.
3. **Entretien libre** avec le recruteur IA : 5 questions, tu réponds comme tu veux (sérieux, humour, négociation, mensonge…). Il reste dans son rôle, te recadre si tu t'égares, et peut mettre fin à l'entretien si tu es vraiment déplacé.
4. **Résultat** : embauché, refusé, ou **second entretien** (3 questions de plus, le recruteur se souvient du premier).
5. **Progression** : si tu es embauché, tu tiens quelques jours (l'IA raconte comment tu as perdu le job), tu gagnes de l'argent au prorata, ton CV et ta réputation progressent, de nouvelles offres s'ouvrent. Jobs perdus +1.

| Entreprise | Poste | Difficulté | Teste | Prérequis |
|---|---|---|---|---|
| Burger Flash | Équipier polyvalent | Facile | motivation, sérieux, relation client | aucun |
| RapidColis | Préparateur de commande | Moyenne-facile | organisation, fiabilité, rythme | première expérience recommandée |
| Marché Plus | Employé polyvalent | Moyenne | communication, gestion des conflits | expérience client |
| NexaTech | Assistant informatique junior | Élevée | logique, adaptation, apprentissage | 2 emplois réussis, ou compétences techniques sur le CV |
| Apex Corporation | Assistant administratif | Très élevée | confiance, présentation, cohérence du parcours | bonne réputation et 3 emplois réussis |

### Les 4 critères cachés

À chaque réponse, le recruteur note quatre critères (sur 100) : **compétence** (réponses adaptées au poste, expériences réelles), **honnêteté** (mentir peut marcher… mais le recruteur connaît ton vrai CV et tes réponses précédentes, et un mensonge découvert coûte cher), **confiance** (réponses assurées = bonus, contradictions = malus) et **professionnalisme** (politesse, respect, attitude). La jauge « Impression » en est la moyenne, pondérée par ce que l'entreprise teste. Les quatre notes ne sont révélées qu'à la fin de l'entretien, et chaque entreprise a son seuil d'embauche.

### Le carnet

Dans la salle d'attente, tu écris librement dans ton carnet. Pendant l'entretien, la touche **E** (ou le bouton 📓) le sort : trois fois sans conséquence, puis le recruteur fait une remarque à la 4ᵉ et à la 5ᵉ utilisation (« Vous avez besoin de vérifier vos notes ? », « J'aimerais que vous répondiez plus naturellement. »). Au-delà, chaque utilisation réduit discrètement ton professionnalisme.

### Le CV

Il liste tes expériences et l'historique de tes entretiens (embauché, refusé, écourté), ton argent gagné, ta réputation et tes jobs perdus. La partie **Compétences** est écrite par toi : elle sert à débloquer NexaTech… et le recruteur la reçoit, il peut donc te tester dessus.

## Recruteur IA

Chaque entreprise a son recruteur : Nadia (Burger Flash), Gérard (RapidColis), Josiane (Marché Plus), Clémence (NexaTech) et Dr. Paulo (Apex Corporation). Le recruteur reçoit l'entreprise, le poste, ton vrai CV, tout l'historique de l'entretien et le nombre de fois où tu as sorti ton carnet. Il est guidé pour parler comme un humain à l'oral et réagir précisément à ce que tu viens de dire (il reprend un élément concret de ta réponse, en tire une conséquence, et sa question suivante découle de la conversation), plutôt que de partir dans l'absurde.

Le recruteur a un **visage expressif qui suit la situation** : il réfléchit (regard en l'air, main au menton) pendant que l'IA prépare sa réponse, t'écoute quand c'est ton tour (souriant si l'entretien se passe bien, bras croisés et moue si ça tourne mal), s'ennuie et bâille si tu mets plus de 20 s à répondre, sursaute quand ta note bondit ou s'effondre, et finit ravi, moqueur ou furieux. Le rendu est lisse et doux (ombrage continu, grands yeux brillants, grosse tête ronde, ombres douces), et le bureau change de couleurs selon l'entreprise : tons chauds pour le fast-food et le supermarché, froids pour la start-up et la grande corporation.

**Clins d'œil** : les deux créateurs du jeu sont fans d'animés, alors le jeu cache des références à leurs genres préférés (ninjas, mondes virtuels à étages, chasseurs et leur aura) : objets dans le bureau, rang de chômeur, effets spéciaux déclenchés par certains mots, et **trois recruteurs secrets** qui remplacent parfois le recruteur habituel (environ un entretien sur dix, ou un code à trouver sur l'écran titre). Ce sont uniquement des allusions : aucun nom, personnage, design, logo, musique ou réplique d'une œuvre existante n'est repris.

Le recruteur est joué par le **serveur IA du jeu** (`https://ai.drafthome.fr`, un [GroqProxy](https://github.com/draft-yt-gaming/GroqProxy)), avec le modèle **`openai/gpt-oss-120b`**, imposé. Les joueurs n'ont aucune clé à fournir et ne peuvent pas changer de modèle. Sans connexion (ou si le serveur est saturé), le jeu passe en mode hors-ligne avec des réponses toutes faites (la progression fonctionne quand même).

### Protection de la clé du serveur

Une clé intégrée dans un jeu distribué ne peut jamais être cachée à 100 %. La protection se fait donc en deux couches :

1. **Dans le jeu** (rend l'extraction difficile) :
   - la clé n'est jamais dans le dépôt GitHub : elle est lue dans `secret/ai-key.txt` (ignoré par Git) et chiffrée dans `secret.js` au moment du build ;
   - elle reste dans le process principal : la page du jeu ne la voit jamais et ne peut lire que `index.html` et `vendor/` ;
   - les « fuses » Electron interdisent de lancer le jeu comme Node, avec `--inspect` ou `NODE_OPTIONS`, et vérifient l'intégrité des fichiers ; la version installée refuse `--remote-debugging-port`.
2. **Sur le serveur** (rend la clé inutile hors du jeu) : la clé de sortie du jeu dans GroqProxy (≥ 1.2.0) doit avoir :
   - **Modèles autorisés** : `openai/gpt-oss-120b` (ajoute `whisper-large-v3` seulement si tu veux le micro) ;
   - **Verrou d'usage** : le prompt de [`serveur-ia/prompt-impose.txt`](serveur-ia/prompt-impose.txt), **Forcer le JSON** coché, **Réponses max** 400 tokens. Le format JSON a changé en 2.0 (quatre critères au lieu d'un `delta`) : remets à jour le prompt du verrou sur le serveur.

   Avec ce verrou, une clé volée ne donne qu'un recruteur de jeu qui répond en JSON : traduction, code ou questions générales sont refusés (testé), les autres routes de l'API sont bloquées.

## Répondre au micro

Clique sur 🎤 dans la barre de réponse et parle : l'enregistrement s'arrête tout seul après 2,5 s de silence (ou clique sur ■), ta voix est transcrite par **Whisper** (`whisper-large-v3`) via le serveur IA du jeu et la réponse est envoyée automatiquement. Tu peux désactiver l'envoi automatique dans ⚙ Paramètres pour relire avant d'envoyer. Si `whisper-large-v3` n'est pas autorisé sur la clé du serveur, le bouton 🎤 disparaît.

- **Choix du micro** : dans ⚙ Paramètres, la liste « Micro utilisé » propose les micros du PC (clique sur *Détecter* pour voir leurs noms, Windows demande l'autorisation une fois). Si le micro choisi est débranché, le jeu revient au micro par défaut.
- Ce que tu as dit s'affiche dans la bulle (« Toi : … ») au-dessus de la réaction du recruteur.
- La musique se coupe pendant que tu parles ; le son du micro est envoyé brut (sans suppression de bruit) pour une meilleure transcription.
- Réponses jusqu'à 500 caractères (au clavier comme au micro).
- Les 30 dernières dictées (ce que Whisper a entendu / ce qui a été envoyé) sont notées dans `%APPDATA%\I Lost My Job (Again)\dictees.log`, sur ton PC uniquement.
- Si rien n'est entendu (8 s), rien n'est envoyé ; les phrases que Whisper invente parfois sur du silence (« Sous-titres réalisés par… ») sont filtrées.
- Si Windows bloque le micro : Paramètres Windows › Confidentialité et sécurité › Microphone › autoriser les applications de bureau.
- Groq facture au minimum 10 s d'audio par transcription.

## Musique et sons

La musique de fond (bossa « musique d'ascenseur ») est générée en direct par le jeu (Web Audio), sans fichier audio : elle marche hors-ligne et réagit à la partie.

- tic-tac d'horloge pendant que le recruteur réfléchit ;
- son plus sourd quand l'impression descend sous 45 puis 30 ;
- fanfare si tu es embauché (ou rappelé pour un second entretien), trombone triste « wah wah wah » si tu es refusé ou mis dehors.

Quand le recruteur écrit, on entend sa « voix » : de petits bips façon Animal Crossing, différents pour chaque recruteur, plus aigus quand il est furieux, plus graves quand il est agacé.

Bouton 🔊 Son (en haut à droite ou dans les menus) ou touche **M** pour couper/remettre tout le son ; volumes de la musique et de la voix dans ⚙ Paramètres.

## Développement

Avant de construire : mets la clé de sortie du jeu dans `secret/ai-key.txt` (ce dossier n'est jamais envoyé sur GitHub).

```bash
npm install
npm start          # lance le jeu
npm run dev        # avec les DevTools
npm run dist       # construit dist/ILostMyJobAgain-Setup.exe, latest.yml, le .blockmap et l'installeur (exige secret/ai-key.txt)
npm run installeur # recompile seulement dist/ILostMyJobAgain-Installeur.exe (installeur/Installeur.cs, csc de .NET Framework 4)
npm run vendor     # recopie three.js r128 et la police Baloo 2 dans vendor/
npm run icon       # régénère build/icon.png
```

Structure :

- `index.html` : tout le jeu (scène 3D, interface, entreprises, critères, carnet, CV, logique). S'ouvre aussi directement dans un navigateur (mode hors-ligne).
- `docs/game-design.md` : le document de conception (concept, boucle, critères, carnet, entreprises, direction artistique).
- `main.js` : process principal Electron (fenêtre, réglages, protocole `app://`, IPC).
- `preload.js` : pont sécurisé `window.desktop` entre la page et le process principal.
- `ai.js` : appels au serveur IA du jeu (recruteur et transcription), modèle imposé.
- `scripts/embed-secret.js` : chiffre la clé dans `secret.js` avant chaque build.
- `serveur-ia/prompt-impose.txt` : prompt à mettre dans le verrou d'usage de la clé du jeu sur GroqProxy.
- `installeur/` : le petit installeur à envoyer (télécharge `releases/latest/download/ILostMyJobAgain-Setup.exe`).
- `vendor/` : three.js et la police, embarqués pour jouer sans Internet.

Le profil du joueur (argent, réputation, emplois, compétences, carnet) est dans le `localStorage` de la page, clé `ilmj-profil`.

Publier une version : monter la version dans `package.json`, `npm run dist`, puis créer la release GitHub (publiée, ni brouillon ni pré-release) avec **les quatre fichiers** `dist/ILostMyJobAgain-Setup.exe`, `dist/ILostMyJobAgain-Setup.exe.blockmap`, `dist/latest.yml` et `dist/ILostMyJobAgain-Installeur.exe`. Sans `latest.yml`, les jeux installés ne voient pas la mise à jour.

Pour tester sans le vrai serveur (développement uniquement) : `ILMJ_AI_URL` et `ILMJ_AI_KEY` pointent vers un faux serveur local ; ces variables sont ignorées par la version installée.

Raccourcis : **F11** plein écran, **M** couper/remettre le son, **E** sortir le carnet pendant l'entretien, **Échap** le ranger.
