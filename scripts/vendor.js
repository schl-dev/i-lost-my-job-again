// Copie three.js (r128) et la police Baloo 2 dans vendor/ pour que le jeu tourne hors-ligne.
// À relancer après une mise à jour de ces dépendances : npm run vendor
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = path.join(root, "vendor");
fs.mkdirSync(path.join(out, "fonts"), { recursive: true });

fs.copyFileSync(path.join(root, "node_modules/three/build/three.min.js"), path.join(out, "three.min.js"));
for (const w of [500, 700, 800]) {
  const f = `baloo-2-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join(root, "node_modules/@fontsource/baloo-2/files", f), path.join(out, "fonts", f));
}
console.log("vendor/ à jour");
