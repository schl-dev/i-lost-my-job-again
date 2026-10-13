// Recruteur IA et transcription du micro, via le serveur IA du jeu (GroqProxy, API compatible OpenAI).
// Le modèle est imposé : le joueur ne peut pas en choisir un autre. La clé reste dans le process
// principal et n'est jamais transmise à la page du jeu.

const MODEL = "openai/gpt-oss-120b";
const WHISPER_MODEL = "whisper-large-v3";
const TIMEOUT_MS = 30000;

// Phrases que Whisper invente parfois sur du silence ou du bruit (sous-titres de vidéos).
const HALLUCINATION = /[^.!?]*(sous-titres réalisés|sous-titrage st|amara\.org|merci d'avoir regardé cette vidéo)[^.!?]*[.!?]?/gi;

function cleanTranscript(text) {
  return String(text || "").replace(HALLUCINATION, "").replace(/\s+/g, " ").trim();
}

/** "2m59.56s", "7.66s", "500ms", "1h2m" -> millisecondes */
function parseDuration(s) {
  if (!s) return 0;
  let ms = 0;
  for (const [, n, unit] of String(s).matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    ms += parseFloat(n) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[unit];
  }
  return Math.ceil(ms);
}

class GameAI {
  constructor({ baseUrl, token }) {
    this.base = String(baseUrl).replace(/\/+$/, "");
    this.token = token || null;
  }

  get available() { return !!this.token; }

  /** Appel au serveur IA avec une nouvelle tentative sur erreur serveur ou délai dépassé. */
  async request(path, init) {
    if (!this.token) return { error: { code: "no_service" } };
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(this.base + path, {
          ...init,
          headers: { ...(init.headers || {}), Authorization: "Bearer " + this.token },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (e) {
        if (attempt === 0 && e && e.name === "TimeoutError") continue;
        return { error: { code: e && e.name === "TimeoutError" ? "timeout" : "network" } };
      }
      if (res.status >= 500 && attempt === 0) continue;
      break;
    }
    if (res.ok) return { res };

    const err = await res.json().catch(() => ({}));
    const code = err && err.error && err.error.code;
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || parseDuration(res.headers.get("retry-after")) || 20000;
      return { error: { code: "rate_limited", retryAt: Date.now() + wait } };
    }
    if (code === "model_not_allowed") return { error: { code: "model_not_allowed" } };
    if (res.status === 401 || res.status === 403) return { error: { code: "service_refused" } };
    return { error: { code: res.status >= 500 ? "server" : "api" } };
  }

  /** Envoie le prompt au recruteur et renvoie l'objet JSON qu'il produit. */
  async json(prompt) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await this.request("/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu réponds toujours avec un seul objet JSON valide, sans aucun texte autour." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.9,
          max_completion_tokens: 400, // largement assez pour une réplique ; Groq compte ce plafond dans le quota par minute
          reasoning_effort: "low",
          include_reasoning: false,
        }),
      });
      if (r.error) {
        // JSON invalide généré par le modèle : Groq renvoie 400 json_validate_failed, on retente une fois.
        if (r.error.code === "api" && attempt === 0) continue;
        return r;
      }
      const out = await r.res.json().catch(() => null);
      const text = out && out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content;
      try { return { data: JSON.parse(text) }; } catch {}
    }
    return { error: { code: "bad_json" } };
  }

  /** Transcrit la réponse dictée au micro (Whisper). */
  async transcribe(audio, mime) {
    const ext = /ogg/.test(mime) ? "ogg" : /mp4|m4a/.test(mime) ? "m4a" : /wav/.test(mime) ? "wav" : "webm";
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mime || "audio/webm" }), "reponse." + ext);
    form.append("model", WHISPER_MODEL);
    form.append("language", "fr");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    const r = await this.request("/audio/transcriptions", { method: "POST", body: form });
    if (r.error) return r;
    const out = await r.res.json().catch(() => null);
    if (!out) return { error: { code: "server" } };
    // Ignore les passages que Whisper juge silencieux (mêmes seuils que Whisper par défaut).
    const text = Array.isArray(out.segments)
      ? out.segments.filter(s => !(s.no_speech_prob > 0.6 && s.avg_logprob < -1)).map(s => s.text).join("")
      : out.text || "";
    return { data: { text: cleanTranscript(text), raw: out.text || "" }, model: WHISPER_MODEL };
  }

  /** Vérifie que le serveur IA répond et accepte la clé (requête gratuite). */
  async status() {
    const r = await this.request("/models", { method: "GET" });
    return r.error ? { ok: false, code: r.error.code } : { ok: true };
  }
}

module.exports = { GameAI, MODEL, WHISPER_MODEL, cleanTranscript, parseDuration };
