// Pont sécurisé entre la page du jeu et le process principal (window.desktop).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  aiJson: prompt => ipcRenderer.invoke("ai:json", prompt),
  transcribe: (audio, mime, seconds) => ipcRenderer.invoke("ai:transcribe", audio, mime, seconds),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  addKeys: text => ipcRenderer.invoke("keys:add", text),
  removeKey: id => ipcRenderer.invoke("keys:remove", id),
  testKeys: () => ipcRenderer.invoke("keys:test"),
  setModel: model => ipcRenderer.invoke("settings:model", model),
  setFullscreen: on => ipcRenderer.invoke("win:fullscreen", on),
  openKeyPage: () => ipcRenderer.invoke("open:keys"),
  quit: () => ipcRenderer.invoke("app:quit"),
  onFullscreen: cb => ipcRenderer.on("win:fullscreen", (_e, on) => cb(on)),
});
