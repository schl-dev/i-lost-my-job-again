// Pont sécurisé entre la page du jeu et le process principal (window.desktop).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  aiJson: prompt => ipcRenderer.invoke("ai:json", prompt),
  transcribe: (audio, mime, seconds) => ipcRenderer.invoke("ai:transcribe", audio, mime, seconds),
  aiStatus: () => ipcRenderer.invoke("ai:status"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setFullscreen: on => ipcRenderer.invoke("win:fullscreen", on),
  quit: () => ipcRenderer.invoke("app:quit"),
  onFullscreen: cb => ipcRenderer.on("win:fullscreen", (_e, on) => cb(on)),
  onUpdate: cb => ipcRenderer.on("update:event", (_e, ev) => cb(ev)),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
});
