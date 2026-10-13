// Client Groq (API compatible OpenAI) avec rotation de clés.
// Chaque requête part sur la clé suivante (round-robin). Si une clé atteint sa limite (429),
// elle est mise en pause pour ce modèle jusqu'à la fin de la limite et on passe à la suivante.
// Si toutes les clés sont en pause sur un modèle, on essaie le modèle de secours suivant
// (les limites Groq sont comptées par organisation ET par modèle).

const BASE_URL = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 6; // appels réseau max par requête

// Ordre de préférence quand le modèle choisi n'est pas disponible ou est limité.
const PREFERRED_MODELS = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];
// Transcription du micro : le plus précis d'abord, le plus rapide en secours.
const WHISPER_MODELS = ["whisper-large-v3", "whisper-large-v3-turbo"];
// Phrases que Whisper invente parfois sur du silence ou du bruit (sous-titres de vidéos).
const HALLUCINATION = /[^.!?]*(sous-titres réalisés|sous-titrage st|amara\.org|merci d'avoir regardé cette vidéo)[^.!?]*[.!?]?/gi;

function cleanTranscript(text) {
  return String(text || "").replace(HALLUCINATION, "").replace(/\s+/g, " ").trim();
}

// Modèles listés par /models qui ne sont pas des modèles de chat.
const NON_CHAT = /whisper|tts|orpheus|playai|guard|compound|distil/i;

/** "2m59.56s", "7.66s", "500ms", "1h2m" -> millisecondes */
function parseDuration(s) {
  if (!s) return 0;
  let ms = 0;
  for (const [, n, unit] of String(s).matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    ms += parseFloat(n) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[unit];
  }
  return Math.ceil(ms);
}

class GroqPool {
  /** @param {() => {id:string, key:string, label:string}[]} getKeys */
  constructor(getKeys, onKeyInvalid) {
    this.getKeys = getKeys;
    this.onKeyInvalid = onKeyInvalid || (() => {});
    this.cooldown = new Map(); // "keyId|model" -> timestamp de fin de pause
    this.deadModels = new Set(); // modèles retirés / introuvables pendant cette session
    this.next = 0;
    this.lastUsed = null;
  }

  pausedUntil(keyId, model) {
    const t = this.cooldown.get(keyId + "|" + model) || 0;
    return t > Date.now() ? t : 0;
  }

  pause(keyId, model, ms) {
    this.cooldown.set(keyId + "|" + model, Date.now() + Math.max(1000, ms));
  }

  /**
   * Essaie chaque (modèle, clé) dans l'ordre de rotation jusqu'à obtenir une réponse exploitable.
   * send(key, model) -> Promise<Response> ; read(res) -> {data} ou {retry:{code}} (essayer la clé/le modèle suivant).
   * Renvoie {data, model, keyLabel} ou {error:{code, message, retryAt?}}.
   */
  async rotate(models, send, read) {
    const keys = this.getKeys();
    if (!keys.length) return { error: { code: "no_key" } };

    const start = this.next++ % keys.length;
    const order = keys.map((_, i) => keys[(start + i) % keys.length]);
    let soonest = Infinity, lastErr = null, badOutput = 0, attempts = 0;

    models:
    for (const model of [...new Set(models)].filter(m => m && !this.deadModels.has(m))) {
      for (const k of order) {
        if (k.invalid) continue;
        const paused = this.pausedUntil(k.id, model);
        if (paused) { soonest = Math.min(soonest, paused); continue; }

        if (++attempts > MAX_ATTEMPTS) break models;
        let res;
        try {
          res = await send(k.key, model);
        } catch (e) {
          if (e && e.name === "TimeoutError") { lastErr = { code: "timeout" }; continue; }
          return { error: { code: "network", message: String(e && e.message || e) } };
        }

        // Pause préventive si la clé vient d'épuiser son quota pour ce modèle.
        const remReq = res.headers.get("x-ratelimit-remaining-requests");
        const remTok = res.headers.get("x-ratelimit-remaining-tokens");
        if (remReq === "0") this.pause(k.id, model, parseDuration(res.headers.get("x-ratelimit-reset-requests")) || 60000);
        else if (remTok !== null && Number(remTok) < 300) this.pause(k.id, model, parseDuration(res.headers.get("x-ratelimit-reset-tokens")) || 10000);

        if (res.ok) {
          const r = await read(res);
          if (r.data !== undefined) {
            this.lastUsed = { model, keyLabel: k.label };
            return { data: r.data, model, keyLabel: k.label };
          }
          lastErr = r.retry;
          if (++badOutput >= 2) return { error: lastErr };
          continue;
        }

        const err = await res.json().catch(() => ({}));
        const code = err && err.error && err.error.code;
        const message = err && err.error && err.error.message || res.statusText;

        if (res.status === 429) {
          const wait = (Number(res.headers.get("retry-after")) * 1000) ||
            parseDuration(res.headers.get("x-ratelimit-reset-requests")) ||
            parseDuration(res.headers.get("x-ratelimit-reset-tokens")) || 60000;
          this.pause(k.id, model, wait);
          soonest = Math.min(soonest, Date.now() + wait);
          lastErr = { code: "rate_limited", message };
          continue;
        }
        if (res.status === 401 || res.status === 403) {
          k.invalid = true;
          this.onKeyInvalid(k.id);
          lastErr = { code: "bad_key", message };
          continue;
        }
        if (res.status === 404 || code === "model_not_found" || code === "model_decommissioned") {
          this.deadModels.add(model);
          lastErr = { code: "model_unavailable", message };
          break; // modèle suivant
        }
        if (code === "json_validate_failed") {
          lastErr = { code: "bad_json", message };
          if (++badOutput >= 2) return { error: lastErr };
          continue;
        }
        if (res.status >= 500) { lastErr = { code: "server", message }; continue; }
        return { error: { code: "api", message } };
      }
    }

    if (!keys.some(k => !k.invalid)) return { error: { code: "bad_key", message: "Toutes les clés ont été refusées par Groq." } };
    if (soonest !== Infinity) return { error: { code: "rate_limited", retryAt: soonest } };
    return { error: lastErr || { code: "unknown" } };
  }

  /** Envoie le prompt au recruteur et renvoie l'objet JSON qu'il produit. */
  json(prompt, selectedModel) {
    return this.rotate([selectedModel, ...PREFERRED_MODELS], (key, model) => {
      const body = {
        model,
        messages: [
          { role: "system", content: "Tu réponds toujours avec un seul objet JSON valide, sans aucun texte autour." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
        max_completion_tokens: 1200,
      };
      if (model.startsWith("openai/gpt-oss")) { body.reasoning_effort = "low"; body.include_reasoning = false; }
      return fetch(BASE_URL + "/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }, async res => {
      const out = await res.json().catch(() => null);
      const text = out && out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content;
      try { return { data: JSON.parse(text) }; } catch { return { retry: { code: "bad_json" } }; }
    });
  }

  /** Transcrit la réponse dictée au micro (Whisper sur Groq). */
  transcribe(audio, mime) {
    const ext = /ogg/.test(mime) ? "ogg" : /mp4|m4a/.test(mime) ? "m4a" : /wav/.test(mime) ? "wav" : "webm";
    return this.rotate(WHISPER_MODELS, (key, model) => {
      const form = new FormData();
      form.append("file", new Blob([audio], { type: mime || "audio/webm" }), "reponse." + ext);
      form.append("model", model);
      form.append("language", "fr");
      form.append("response_format", "verbose_json");
      form.append("temperature", "0");
      return fetch(BASE_URL + "/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }, async res => {
      const out = await res.json().catch(() => null);
      if (!out) return { retry: { code: "server" } };
      // Ignore les passages que Whisper juge silencieux (mêmes seuils que Whisper par défaut).
      const text = Array.isArray(out.segments)
        ? out.segments.filter(s => !(s.no_speech_prob > 0.6 && s.avg_logprob < -1)).map(s => s.text).join("")
        : out.text || "";
      return { data: { text: cleanTranscript(text), raw: out.text || "" } };
    });
  }

  /** Vérifie une clé sans consommer de tokens (liste des modèles). */
  async check(key) {
    try {
      const res = await fetch(BASE_URL + "/models", {
        headers: { Authorization: "Bearer " + key },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 401 || res.status === 403) return { ok: false, code: "bad_key" };
      if (!res.ok) return { ok: false, code: "api", message: res.statusText };
      const out = await res.json();
      const models = (out.data || [])
        .filter(m => m.active !== false && !NON_CHAT.test(m.id))
        .map(m => m.id);
      return { ok: true, models };
    } catch (e) {
      return { ok: false, code: "network", message: String(e && e.message || e) };
    }
  }

  /** État des clés pour l'écran Paramètres. */
  status(model) {
    return this.getKeys().map(k => ({
      id: k.id, label: k.label, source: k.source,
      state: k.invalid ? "invalid" : this.pausedUntil(k.id, model) ? "paused" : "ok",
      pausedUntil: this.pausedUntil(k.id, model) || null,
    }));
  }
}

module.exports = { GroqPool, PREFERRED_MODELS, parseDuration, cleanTranscript };
