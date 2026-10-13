// Process principal Electron : fenêtre du jeu, réglages, et appels au serveur IA du jeu.
const { app, BrowserWindow, ipcMain, protocol, net, shell, Menu, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { GameAI } = require("./ai");
const { autoUpdater } = require("electron-updater");

// Version installée : refuse les options de débogage qui permettraient d'espionner le jeu
// (et de lire la clé du serveur IA en mémoire).
const DEBUG_SWITCHES = ["remote-debugging-port", "remote-debugging-pipe", "inspect", "inspect-brk", "inspect-port", "js-flags"];
if (app.isPackaged && (DEBUG_SWITCHES.some(s => app.commandLine.hasSwitch(s)) ||
    process.argv.some(a => /^--(inspect|remote-debugging|js-flags)/.test(a)))) {
  process.exit(0);
}

const ROOT = __dirname;
const DEV = !app.isPackaged && process.argv.includes("--dev");
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
].join("; ");
// Seuls ces fichiers sont servis à la page du jeu (jamais main.js, ai.js ou secret.js).
const PUBLIC_FILE = /^\/(index\.html|vendor\/[\w./-]+)$/;

/* ============ Serveur IA du jeu ============ */
// En développement seulement, ILMJ_AI_URL / ILMJ_AI_KEY permettent de pointer vers un faux serveur de test.
const AI_URL = (!app.isPackaged && process.env.ILMJ_AI_URL) || "https://ai.drafthome.fr/openai/v1";
function loadToken() {
  if (!app.isPackaged && process.env.ILMJ_AI_KEY) return process.env.ILMJ_AI_KEY;
  try { return require("./secret.js"); } catch { return null; }
}
const ai = new GameAI({ baseUrl: AI_URL, token: loadToken() });

/* ============ Mises à jour (releases GitHub) ============ */
// Au lancement, la version installée regarde s'il y a une nouvelle release sur GitHub et la propose au joueur.
// En développement, ILMJ_UPDATE_URL pointe vers un faux serveur de mises à jour (ou « github » pour les vraies releases,
// via dev-app-update.yml) et ILMJ_UPDATE_DRY_RUN évite d'installer.
const UPDATE_TEST = !app.isPackaged && process.env.ILMJ_UPDATE_URL;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
if (UPDATE_TEST) {
  autoUpdater.forceDevUpdateConfig = true;
  if (process.env.ILMJ_UPDATE_URL !== "github") autoUpdater.setFeedURL({ provider: "generic", url: process.env.ILMJ_UPDATE_URL });
}
let updateFound = false;
const sendUpdate = (type, data = {}) => { if (win) win.webContents.send("update:event", { type, ...data }); };

// Notes de version GitHub (HTML) -> texte simple pour la fenêtre de mise à jour.
function plainNotes(notes) {
  const text = Array.isArray(notes) ? notes.map(n => n.note || "").join("\n") : String(notes || "");
  return text.replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, "\n").replace(/<li>/gi, "• ").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n\s*\n+/g, "\n").trim().slice(0, 700);
}

autoUpdater.on("update-available", info => {
  updateFound = true;
  sendUpdate("available", { version: info.version, current: app.getVersion(), notes: plainNotes(info.releaseNotes) });
});
autoUpdater.on("download-progress", p => sendUpdate("progress", { percent: Math.floor(p.percent) }));
autoUpdater.on("update-downloaded", () => {
  sendUpdate("installing");
  if (process.env.ILMJ_UPDATE_DRY_RUN && !app.isPackaged) return;
  // Installation silencieuse puis relance automatique du jeu.
  setTimeout(() => autoUpdater.quitAndInstall(true, true), 1200);
});
autoUpdater.on("error", err => sendUpdate("error", { message: String((err && err.message) || err).slice(0, 200) }));

function checkForUpdates() {
  if (!app.isPackaged && !UPDATE_TEST) return;
  autoUpdater.checkForUpdates().catch(() => {}); // hors-ligne : on joue simplement avec la version installée
}
ipcMain.handle("update:download", () => {
  if (updateFound) autoUpdater.downloadUpdate().catch(() => {});
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/* ============ Réglages (userData/settings.json) ============ */
const DEFAULTS = { fullscreen: false, bounds: { width: 1280, height: 800 } };
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
let settings = { ...DEFAULTS };

function loadSettings() {
  try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) }; } catch { settings = { ...DEFAULTS }; }
  // Anciennes versions : clés Groq du joueur et choix du modèle, désormais inutiles. On les efface du disque.
  if ("keys" in settings || "model" in settings) {
    delete settings.keys;
    delete settings.model;
    saveSettings();
  }
}
function saveSettings() {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

function publicSettings() {
  return {
    version: app.getVersion(),
    fullscreen: win ? win.isFullScreen() : settings.fullscreen,
    ai: ai.available,
  };
}

/* ============ IPC ============ */
ipcMain.handle("ai:json", (_e, prompt) => {
  if (typeof prompt !== "string" || !prompt || prompt.length > 20000) return { error: { code: "api" } };
  return ai.json(prompt);
});

// Réponse dictée au micro : audio enregistré par la page -> texte (Whisper).
ipcMain.handle("ai:transcribe", async (_e, audio, mime, seconds) => {
  if (!audio || !audio.byteLength || audio.byteLength > 20 * 1024 * 1024) return { error: { code: "bad_audio" } };
  const r = await ai.transcribe(Buffer.from(audio), String(mime || "audio/webm"));
  logDictation(r, seconds);
  return r;
});

ipcMain.handle("ai:status", () => ai.status());

// Journal local des 30 dernières dictées (ce que Whisper a entendu / ce qui a été envoyé), pour vérifier en cas de doute.
function logDictation(r, seconds) {
  try {
    const file = path.join(app.getPath("userData"), "dictees.log");
    const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).slice(-29) : [];
    lines.push(JSON.stringify({
      date: new Date().toISOString(), duree_s: Math.round((seconds || 0) * 10) / 10, modele: r.model || null,
      entendu: r.data ? r.data.raw : null, envoye: r.data ? r.data.text : null, erreur: r.error ? r.error.code : null,
    }));
    fs.writeFileSync(file, lines.join("\n") + "\n");
  } catch {}
}

ipcMain.handle("settings:get", () => publicSettings());
ipcMain.handle("win:fullscreen", (_e, on) => { if (win) win.setFullScreen(!!on); return !!on; });
ipcMain.handle("app:quit", () => app.quit());

/* ============ Fenêtre ============ */
let win = null;

function createWindow() {
  const b = settings.bounds || DEFAULTS.bounds;
  win = new BrowserWindow({
    width: b.width, height: b.height, x: b.x, y: b.y,
    minWidth: 720, minHeight: 540,
    title: "I Lost My Job (Again)",
    icon: path.join(ROOT, "build", "icon.png"),
    backgroundColor: "#7fd3e8",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required", // musique dès l'écran titre
      devTools: DEV,
    },
  });
  if (settings.maximized) win.maximize();
  if (settings.fullscreen) win.setFullScreen(true);

  win.once("ready-to-show", () => { win.show(); if (DEV) win.webContents.openDevTools({ mode: "detach" }); });

  // F11 : plein écran.
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.key === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  const sendFs = () => win.webContents.send("win:fullscreen", win.isFullScreen());
  win.on("enter-full-screen", sendFs);
  win.on("leave-full-screen", sendFs);

  // Liens externes : navigateur par défaut, jamais dans la fenêtre du jeu.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("app://")) e.preventDefault(); });

  win.on("close", () => {
    settings.fullscreen = win.isFullScreen();
    settings.maximized = win.isMaximized();
    if (!win.isFullScreen() && !win.isMaximized()) settings.bounds = win.getBounds();
    saveSettings();
  });
  win.on("closed", () => { win = null; });

  // La page doit être prête à afficher la fenêtre de mise à jour avant qu'on cherche une nouvelle version.
  win.webContents.once("did-finish-load", () => setTimeout(checkForUpdates, 1500));
  win.loadURL("app://game/index.html");
}

app.on("second-instance", () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  if (!gotLock) return;
  loadSettings();
  Menu.setApplicationMenu(null);

  // Seul le jeu (app://) peut demander le micro, et uniquement l'audio (pas la caméra).
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const audioOnly = (details.mediaTypes || []).every(t => t === "audio");
    callback(permission === "media" && audioOnly && String(details.requestingUrl || "").startsWith("app://"));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, _permission, origin) => String(origin || "").startsWith("app://"));

  // Sert les fichiers du jeu sur app://game/ avec une politique de sécurité stricte.
  protocol.handle("app", async req => {
    const rel = decodeURIComponent(new URL(req.url).pathname);
    const file = path.normalize(path.join(ROOT, rel));
    if (!PUBLIC_FILE.test(rel) || rel.includes("..") || !file.startsWith(ROOT + path.sep)) return new Response("Introuvable", { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    headers.set("Content-Security-Policy", CSP);
    return new Response(res.body, { status: res.status, headers });
  });

  createWindow();
});

app.on("window-all-closed", () => app.quit());
