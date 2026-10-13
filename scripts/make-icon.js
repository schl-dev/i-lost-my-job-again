// Dessine l'icône du jeu (build/icon.png, 512x512) avec un canvas, puis quitte.
// Usage : npm run icon   (electron-builder la convertit en .ico pour Windows)
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SIZE = 512;
const html = `<!doctype html><html><body style="margin:0;background:transparent">
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script>
const c = document.getElementById("c").getContext("2d");
const ink = "#1e2a4a";
function rr(x, y, w, h, r){ c.beginPath(); c.roundRect(x, y, w, h, r); }
// Fond
rr(16, 16, 480, 480, 110); c.fillStyle = "#7fd3e8"; c.fill(); c.lineWidth = 22; c.strokeStyle = ink; c.stroke();
c.save(); rr(27, 27, 458, 458, 100); c.clip();
// Corps + cravate
c.beginPath(); c.ellipse(256, 520, 190, 150, 0, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 14; c.stroke();
c.beginPath(); c.moveTo(232, 372); c.lineTo(280, 372); c.lineTo(268, 470); c.lineTo(244, 470); c.closePath(); c.fillStyle = "#3a6ea5"; c.fill(); c.stroke();
// Tête
c.beginPath(); c.arc(256, 232, 128, 0, Math.PI * 2); c.fillStyle = "#f2c29b"; c.fill(); c.lineWidth = 14; c.stroke();
// Yeux
for (const x of [206, 306]) {
  c.beginPath(); c.ellipse(x, 228, 30, 24, 0, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 9; c.stroke();
  c.beginPath(); c.arc(x, 234, 13, 0, Math.PI * 2); c.fillStyle = ink; c.fill();
}
// Sourcils furieux
c.lineCap = "round"; c.lineWidth = 18;
c.beginPath(); c.moveTo(170, 176); c.lineTo(236, 196); c.stroke();
c.beginPath(); c.moveTo(342, 176); c.lineTo(276, 196); c.stroke();
// Moustache
c.beginPath(); c.ellipse(256, 292, 62, 18, 0, 0, Math.PI * 2); c.fillStyle = "#5a3a2a"; c.fill();
c.restore();
// Tampon REFUSÉ
c.save(); c.translate(256, 410); c.rotate(-0.2);
rr(-170, -46, 340, 92, 18); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 14; c.strokeStyle = "#e0446b"; c.stroke();
c.fillStyle = "#e0446b"; c.font = "900 70px 'Segoe UI', Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
c.fillText("REFUSÉ", 0, 4);
c.restore();
</script></body></html>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: SIZE, height: SIZE, show: false, transparent: true, frame: false,
    useContentSize: true, webPreferences: { offscreen: true } });
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 300));
  const png = await win.webContents.executeJavaScript('document.getElementById("c").toDataURL("image/png")');
  const out = path.join(__dirname, "..", "build", "icon.png");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(png.split(",")[1], "base64"));
  console.log("Icône écrite :", out);
  app.quit();
});
