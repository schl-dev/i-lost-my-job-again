// Prépare secret.js (ignoré par Git) à partir de la clé du serveur IA du jeu.
// Source : variable ILMJ_AI_KEY, sinon le fichier secret/ai-key.txt (lui aussi ignoré par Git).
// La clé est chiffrée (XOR avec un flux dérivé d'un sel aléatoire) pour ne pas apparaître en clair
// dans les fichiers du jeu. Ce n'est pas inviolable : la vraie protection, ce sont les restrictions
// de la clé côté serveur (modèle autorisé, limites par minute et par adresse IP).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const out = path.join(root, "secret.js");
const optional = process.argv.includes("--optional");

let token = process.env.ILMJ_AI_KEY || "";
if (!token) {
  try { token = fs.readFileSync(path.join(root, "secret", "ai-key.txt"), "utf8"); } catch {}
}
token = token.trim();

if (!/^gsk_[A-Za-z0-9]{20,}$/.test(token)) {
  if (optional) { console.log("Pas de clé du serveur IA : le jeu tournera en mode hors-ligne."); process.exit(0); }
  console.error("Clé du serveur IA introuvable : mets-la dans secret/ai-key.txt (ou ILMJ_AI_KEY) avant de construire le jeu.");
  process.exit(1);
}

const salt = crypto.randomBytes(24);
const stream = n => {
  const parts = [];
  for (let i = 0; Buffer.concat(parts).length < n; i++) parts.push(crypto.createHash("sha256").update(salt).update(String(i)).digest());
  return Buffer.concat(parts);
};
const data = Buffer.from(token, "utf8");
const ks = stream(data.length);
const enc = Buffer.from(data.map((b, i) => b ^ ks[i]));

fs.writeFileSync(out, `// Généré par scripts/embed-secret.js : ne pas committer.
const c = require("node:crypto");
const s = Buffer.from(${JSON.stringify(salt.toString("base64"))}, "base64");
const d = Buffer.from(${JSON.stringify(enc.toString("base64"))}, "base64");
const k = [];
for (let i = 0; Buffer.concat(k).length < d.length; i++) k.push(c.createHash("sha256").update(s).update(String(i)).digest());
const f = Buffer.concat(k);
module.exports = Buffer.from(d.map((b, i) => b ^ f[i])).toString("utf8");
`);
console.log("secret.js prêt");
