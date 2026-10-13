// Process principal Electron : fenêtre du jeu, réglages, et appels à l'API Groq.
const { app, BrowserWindow, ipcMain, safeStorage, protocol, net, shell, Menu, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { GroqPool, PREFERRED_MODELS } = require("./groq");

const ROOT = __dirname;
const DEV = process.argv.includes("--dev");
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
].join("; ");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/* ============ Réglages (userData/settings.json) ============ */
const DEFAULTS = { keys: [], model: PREFERRED_MODELS[0], fullscreen: false, bounds: { width: 1280, height: 800 } };
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
let settings = { ...DEFAULTS };

function loadSettings() {
  try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) }; } catch { settings = { ...DEFAULTS }; }
}
function saveSettings() {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

// Les clés sont chiffrées avec DPAPI (safeStorage) : illisibles hors de ce compte Windows.
function encrypt(key) {
  return safeStorage.isEncryptionAvailable()
    ? { enc: safeStorage.encryptString(key).toString("base64") }
    : { plain: Buffer.from(key).toString("base64") };
}
function decrypt(k) {
  try {
    if (k.enc) return safeStorage.decryptString(Buffer.from(k.enc, "base64"));
    if (k.plain) return Buffer.from(k.plain, "base64").toString();
  } catch {}
  return null;
}
const mask = key => key.slice(0, 4) + "…" + key.slice(-4);

// Clés en variable d'environnement (GROQ_API_KEYS="k1,k2" ou GROQ_API_KEY), non enregistrées.
const envKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
  .split(/[\s,;]+/).filter(Boolean)
  .map((key, i) => ({ id: "env" + i, key, label: mask(key), source: "env", invalid: false }));

function allKeys() {
  const saved = settings.keys
    .map(k => ({ id: k.id, key: decrypt(k), label: k.label, source: "settings", invalid: !!k.invalid }))
    .filter(k => k.key);
  return [...saved, ...envKeys];
}

const pool = new GroqPool(allKeys, id => {
  const k = settings.keys.find(x => x.id === id);
  if (k) { k.invalid = true; saveSettings(); }
  const e = envKeys.find(x => x.id === id);
  if (e) e.invalid = true;
});
let knownModels = null;

function publicSettings() {
  return {
    version: app.getVersion(),
    model: settings.model,
    models: knownModels || PREFERRED_MODELS,
    fullscreen: win ? win.isFullScreen() : settings.fullscreen,
    keys: pool.status(settings.model),
    lastUsed: pool.lastUsed,
  };
}

/* ============ IPC ============ */
ipcMain.handle("ai:json", (_e, prompt) => pool.json(String(prompt || ""), settings.model));

// Réponse dictée au micro : audio enregistré par la page -> texte (Whisper sur Groq).
ipcMain.handle("ai:transcribe", (_e, audio, mime) => {
  if (!audio || !audio.byteLength || audio.byteLength > 20 * 1024 * 1024) return { error: { code: "bad_audio" } };
  return pool.transcribe(Buffer.from(audio), String(mime || "audio/webm"));
});

ipcMain.handle("settings:get", () => publicSettings());

ipcMain.handle("keys:add", (_e, text) => {
  const found = String(text || "").split(/[\s,;]+/).map(s => s.trim()).filter(s => s.length >= 20 && s.length <= 300);
  const existing = new Set(allKeys().map(k => k.key));
  let added = 0;
  for (const key of found) {
    if (existing.has(key)) continue;
    existing.add(key);
    settings.keys.push({ id: crypto.randomUUID(), label: mask(key), ...encrypt(key) });
    added++;
  }
  saveSettings();
  return { added, ignored: found.length - added, settings: publicSettings() };
});

ipcMain.handle("keys:remove", (_e, id) => {
  settings.keys = settings.keys.filter(k => k.id !== id);
  saveSettings();
  return publicSettings();
});

// Teste chaque clé (requête gratuite /models) et récupère la liste des modèles disponibles.
ipcMain.handle("keys:test", async () => {
  const results = {};
  for (const k of allKeys()) {
    const r = await pool.check(k.key);
    results[k.id] = r.ok ? "ok" : r.code;
    const saved = settings.keys.find(x => x.id === k.id);
    if (saved) saved.invalid = r.code === "bad_key";
    const env = envKeys.find(x => x.id === k.id);
    if (env) env.invalid = r.code === "bad_key";
    if (r.ok && r.models.length) knownModels = sortModels(r.models);
  }
  saveSettings();
  return { results, settings: publicSettings() };
});

function sortModels(list) {
  const rank = m => { const i = PREFERRED_MODELS.indexOf(m); return i < 0 ? 99 : i; };
  return [...list].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

ipcMain.handle("settings:model", (_e, model) => {
  if (typeof model === "string" && model.length < 120) { settings.model = model; saveSettings(); }
  return publicSettings();
});

ipcMain.handle("win:fullscreen", (_e, on) => { if (win) win.setFullScreen(!!on); return !!on; });
ipcMain.handle("open:keys", () => shell.openExternal("https://console.groq.com/keys"));
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
    if (!file.startsWith(ROOT + path.sep)) return new Response("Introuvable", { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    headers.set("Content-Security-Policy", CSP);
    return new Response(res.body, { status: res.status, headers });
  });

  createWindow();
});

app.on("window-all-closed", () => app.quit());
