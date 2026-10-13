// Compile le petit installeur (installeur/Installeur.cs) avec le csc de .NET Framework 4 fourni par Windows.
// Résultat : dist/ILostMyJobAgain-Installeur.exe (à envoyer aux testeurs, et joint à chaque release).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const windir = process.env.WINDIR || "C:\\Windows";
const csc = ["Framework64", "Framework"]
  .map(d => path.join(windir, "Microsoft.NET", d, "v4.0.30319", "csc.exe"))
  .find(p => fs.existsSync(p));
if (!csc) { console.error("csc.exe (.NET Framework 4) introuvable : impossible de compiler l'installeur."); process.exit(1); }

const out = path.join(root, "dist", "ILostMyJobAgain-Installeur.exe");
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync(csc, [
  "/nologo", "/target:winexe", "/platform:anycpu", "/optimize+", "/utf8output", "/codepage:65001",
  "/win32icon:" + path.join(root, "installeur", "icon.ico"),
  "/r:System.Windows.Forms.dll", "/r:System.Drawing.dll",
  "/out:" + out,
  path.join(root, "installeur", "Installeur.cs"),
], { stdio: "inherit" });
console.log("Installeur prêt : " + path.relative(root, out) + " (" + Math.round(fs.statSync(out).size / 1024) + " Ko)");
