# ⚡ Ranking of Ranking — Jeu de Soirée

Jeu de soirée interactif où les joueurs piochent aléatoirement des personnages de fiction (animés, mangas, jeux vidéo, comics, films & séries) pour les **classer en aveugle** selon leur puissance, à l'aide d'un deck principal, d'un deck **Joker** et d'une phase d'échanges finaux.

Application **100 % statique** (HTML / CSS / JS vanilla sans outil de build) : elle fonctionne aussi bien en ouvrant directement `index.html` (`file://`) qu'hébergée sur **GitHub Pages**.

---

## 🎮 Fonctionnalités

- **Accueil & Modes de jeu** :
  - **⚡ Puissance** : cartes classiques avec image **paysage** (ou image verticale centrée sur fond flouté stylisé en repli), description et capacités.
  - **✨ Beauté & Charisme** : cartes **full-art verticales** sans description ni capacités, mettant en valeur le portrait du personnage, avec deux sous-modes : **Mode par défaut** (priorité standard) et **Mode BG** (priorise les personnages à plus fort indice `beauty`).
  - Architecture prête pour de futurs modes (Smash or Pass, Autres Critères).
- **Paramètres de partie** :
  - Nombre de personnages à classer (`5` en `5` jusqu'à `50`, puis par dizaines jusqu'à `100`).
  - Nombre d'échanges autorisés en fin de partie (`1` à `10`).
  - Sélection hiérarchique par **Médium** et **Licence** via panneaux déroulants.
  - **Priorisation intelligente** : si les licences cochées dépassent le nombre de cartes demandé, les personnages à plus fort `priority` (`1` à `10`) sont retenus en premier.
  - **Catégories spéciales (Mode Puissance)** : bloc déroulant dédié (ex. **`♾️ Overcheaté`**, désactivé par défaut) pour isoler les personnages à puissance absolue, méta-narrative ou impossible à argumenter en 1v1 inter-univers.
- **Écran de jeu** :
  - **Deck Principal** + **Deck Joker** (~20 % du nombre de cibles, selon le pool disponible) face cachée sur la gauche.
  - Pioche au centre face cachée → clic pour révéler la carte → placement dans une case libre à droite.
  - **Joker** utilisable lorsqu'une carte est au centre : brûle la carte actuelle et pioche immédiatement une carte Joker.
  - **Grille d'ensemble** accessible à tout moment sans interrompre la partie, ainsi qu'en phase d'échanges finaux (avec bouton d'inspection `👁` sur chaque carte).
  - Sauvegarde locale automatique de l'historique des classements (`localStorage`) + copie du classement en texte.
- **Base de personnages** : consultation des **773 personnages** (53 licences) inclus, recherche, filtres par **Médium**, **Licence** et **Catégorie spéciale**, et import local `.json` / `.csv`.
- **Générateur de personnages local** :
  - Création, modification et duplication de personnages stockés localement (`localStorage`) et immédiatement jouables.
  - Listes déroulantes pour **Médium** et **Licence** avec option **`➕ Personnalisé (saisir à la main)`**.
  - Champ **`Complément`** optionnel (affiché en plus petit à côté du nom, ex. *Avant Dark Vador*, *Avec Gantelet de l'Infini*).
  - Cases à cocher pour les catégories spéciales (`♾️ Overcheaté`).
  - Image **verticale** (`image` pour le mode full-art / vignettes) et image **paysage** optionnelle (`imageLandscape` pour le mode Puissance), par URL, import de fichier local (compressé automatiquement) ou blason SVG généré automatiquement.
  - Aperçu en direct basculable entre **⚡ Puissance (Paysage)** et **✨ Beauté (Full-Art Vertical)**.
  - **Export `.zip`** contenant `characters.json`, les images extraites dans `portraits/` et un `README.txt` pour faciliter l'envoi et l'intégration à la base principale.

---

## 🚀 Lancer le jeu

### 1. En local sans serveur
Ouvrez simplement [`index.html`](index.html) dans votre navigateur (Chrome, Edge, Firefox…). Les données de repli [`data/characters.js`](data/characters.js) assurent le fonctionnement complet en `file://`.

### 2. Avec un serveur local (optionnel)
```bash
# Python 3
python -m http.server 8080

# ou Node.js (npx)
npx serve .
```
Puis ouvrez `http://localhost:8080`.

### 3. Hébergement GitHub Pages
1. Poussez le dépôt sur GitHub (branche `main`).
2. Dans **Settings → Pages**, sélectionnez la source **Deploy from a branch** (`main` / `/ (root)`).
3. Le site se charge directement via `index.html` et lit `data/characters.json`.

---

## 🛠️ Script de maintenance des portraits (`scripts/sync_portraits.mjs`)

Le script [`scripts/sync_portraits.mjs`](scripts/sync_portraits.mjs) nécessite uniquement **Node.js 18+** (aucun `npm install` requis).

Il permet d'ajouter de nouveaux personnages dans `data/characters.json` sans se soucier des images manquantes ni de la synchronisation avec `data/characters.js`.

### Commandes utiles

```bash
# Détecte les personnages sans image (ou fichier local manquant), cherche un portrait
# en ligne via les APIs publiques, génère les SVG de repli manquants et synchronise data/characters.js
node scripts/sync_portraits.mjs

# Vérifie en plus toutes les URL https:// existantes et remplace celles qui renvoient une erreur
node scripts/sync_portraits.mjs --check-urls

# Tente de remplacer les portraits utilisant actuellement un .svg local par une vraie image https://
node scripts/sync_portraits.mjs --upgrade-svg

# Mode 100 % hors-ligne : génère uniquement les SVG manquants et resynchronise data/characters.js
node scripts/sync_portraits.mjs --sync-only

# Régénère tous les portraits SVG de repli dans assets/portraits/
node scripts/sync_portraits.mjs --regen-svg

# Affiche l'aide du script
node scripts/sync_portraits.mjs --help
```

### Workflow recommandé lors de l'ajout de personnages
1. Ajoutez vos nouveaux objets dans `data/characters.json` (vous pouvez laisser `"image": ""` si vous voulez que le script cherche automatiquement un portrait).
   *(Si vous avez reçu un `.zip` depuis le générateur, copiez ses portraits dans `assets/portraits/` et fusionnez son `characters.json` dans `data/characters.json`.)*
2. Exécutez :
   ```bash
   node scripts/sync_portraits.mjs
   ```
3. Vérifiez que [`data/characters.json`](data/characters.json), [`data/characters.js`](data/characters.js) et `assets/portraits/` sont bien à jour avant de commit.

### 🖼️ Contribuer une image locale ou paysage à la main
En mode **Puissance**, l'encart d'image est horizontal : si un personnage n'a pas d'image paysage dédiée, son image verticale (`image`) est automatiquement centrée sur un fond flouté stylisé. Vous pouvez ajouter vos propres images locales ou URLs :

1. **Méthode rapide par fichier local (recommandée)** :
   - Placez votre image dans `assets/portraits/` en la nommant avec l'`id` du personnage (visible dans [`data/characters.json`](data/characters.json)) :
     - **Portrait vertical** : `assets/portraits/<id>.png` *(ou `.jpg`, `.jpeg`, `.webp`)*
     - **Image paysage (16:9 recommandé, ex. `1280×720`)** : `assets/portraits/<id>-landscape.png` *(ou `.jpg`, `.jpeg`, `.webp`)*
   - Exécutez ensuite :
     ```bash
     node scripts/sync_portraits.mjs --sync-only
     ```
     Le script détecte automatiquement ces fichiers, met à jour [`data/characters.json`](data/characters.json) et resynchronise [`data/characters.js`](data/characters.js).
2. **Via URL externe ou via le Générateur** :
   - Pour un personnage existant : ajoutez `"imageLandscape": "https://..."` dans [`data/characters.json`](data/characters.json), puis lancez `node scripts/sync_portraits.mjs --check-urls` (ou `--sync-only`).
   - Pour un personnage créé dans le jeu : utilisez les champs **Image Verticale** et **Image Paysage** du générateur (l'export `.zip` génère directement les fichiers `<id>.<ext>` et `<id>-landscape.<ext>`).

---

## 📦 Format des données d'un personnage

Exemple d'entrée dans [`data/characters.json`](data/characters.json) :

```json
{
  "id": "anakin-skywalker",
  "name": "Anakin Skywalker",
  "complement": "Avant Dark Vador",
  "medium": "Films & Séries",
  "licence": "Star Wars",
  "description": "L'Élu de la Force au potentiel midi-chlorien le plus élevé jamais mesuré.",
  "image": "https://...",
  "imageLandscape": "https://...",
  "abilities": [
    "Potentiel de Force illimité",
    "Agressivité foudroyante au sabre"
  ],
  "priority": 9,
  "beauty": 8,
  "specialCategories": {
    "overcheate": false
  }
}
```

| Champ | Obligatoire | Description |
| --- | :---: | --- |
| `id` | Non | Identifiant unique (généré automatiquement si absent) |
| `name` | Oui | Nom affiché sur la carte |
| `complement` | Non | Précision affichée en plus petit à côté du nom |
| `medium` | Oui | Catégorie parente (`Animé / Manga`, `Jeux Vidéo`, `Comics / BD / Super-Héros`, `Films & Séries`, …) |
| `licence` | Oui | Univers / licence du personnage |
| `description` | Non | Courte description |
| `image` | Non | Image **verticale / portrait** (URL `https://` ou chemin local ; utilisée en full-art, vignettes et en repli sur fond flouté en mode Puissance) |
| `imageLandscape` | Non | Image **paysage / horizontale** optionnelle (URL `https://` ou chemin local ; utilisée en priorité dans l'encart horizontal du mode Puissance) |
| `abilities` | Non | Liste de points forts / capacités |
| `priority` | Non | Indice de priorité de `1` à `10` (défaut `5`) |
| `beauty` | Non | Indice beauté / BG de `1` à `10` (défaut `5`, utilisé par le sous-mode **Mode BG**) |
| `specialCategories` | Non | Booléens de catégories spéciales (ex. `{"overcheate": true}`) |

### Import CSV
Colonnes reconnues (séparateur `,` ou `;`, capacités séparées par `|` ou `;`) :
`name`, `complement`, `medium`, `licence`, `description`, `image`, `image_landscape`, `abilities`, `priority`, `beauty`, `overcheate`.

---

## 📁 Arborescence du projet

```text
.
├── index.html                  # Point d'entrée unique (file:// & GitHub Pages)
├── README.md                   # Documentation du projet
├── assets/
│   └── portraits/              # 773 portraits SVG locaux de repli (<id>.svg)
├── data/
│   ├── characters.json         # Source de vérité de la base de personnages
│   └── characters.js           # Export JS (window.CHARACTERS_DB) pour le mode file://
├── scripts/
│   └── sync_portraits.mjs      # Script CLI de recherche d'images, SVG et synchro JSON -> JS
└── src/
    ├── app.js                  # Routeur d'écrans et initialisation
    ├── state.js                # État global, normalisation, tirage, historique, export ZIP
    ├── zip.js                  # Générateur d'archives .zip (STORE + CRC32) sans dépendance
    ├── ui-home.js              # Écran d'accueil, historique, explorateur de base
    ├── ui-setup.js             # Paramètres de partie, sliders, Médiums/Licences & Overcheaté
    ├── ui-game.js              # Plateau de jeu, cartes retournables, grille d'ensemble & échanges
    ├── ui-generator.js         # Générateur local de personnages + aperçu en direct
    └── styles.css              # Thème sombre et mise en page responsive
```
