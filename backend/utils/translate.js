// Translation helpers with hard time limits, so the API never hangs silently.
const GOOGLE_TIMEOUT_MS = Number(process.env.TRANSLATION_TIMEOUT_MS || 10000);

function describe(err) {
  if (err && (err.name === "TimeoutError" || err.name === "AbortError"))
    return `no answer from Google within ${GOOGLE_TIMEOUT_MS / 1000}s (check internet connection, firewall/antivirus/proxy)`;
  const cause = err && err.cause && (err.cause.code || err.cause.message);
  return (err && err.message ? err.message : String(err)) + (cause ? ` (${cause})` : "");
}

// Official Google Cloud Translation API v2. Texts go in the JSON body.
async function googleTranslate({ texts, target, source, apiKey, apiUrl }) {
  const url = new URL(apiUrl);
  url.searchParams.set("key", apiKey);
  const body = { q: texts, target: String(target), format: "text" };
  if (source && source !== "auto") body.source = String(source);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Google HTTP ${response.status}`);
  const list = (data?.data?.translations || []).map(x => x.translatedText);
  if (list.length !== texts.length) throw new Error("Google returned an unexpected number of translations");
  return list;
}

// Fallback (no key / key rejected): unofficial endpoint, 8 strings in parallel.
async function fallbackTranslate({ texts, target, source }) {
  const out = new Array(texts.length);
  for (let i = 0; i < texts.length; i += 8) {
    await Promise.all(texts.slice(i, i + 8).map(async (q, j) => {
      const u = new URL("https://translate.googleapis.com/translate_a/single");
      u.searchParams.set("client", "gtx");
      u.searchParams.set("sl", source && source !== "auto" ? String(source) : "auto");
      u.searchParams.set("tl", String(target));
      u.searchParams.set("dt", "t");
      u.searchParams.set("q", q);
      const r = await fetch(u, { headers: { "User-Agent": "Smart-Livestock-SIH26128/1.0" }, signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
      if (!r.ok) throw new Error(`Fallback translation provider failed (HTTP ${r.status})`);
      const data = await r.json();
      out[i + j] = (Array.isArray(data?.[0]) ? data[0].map(x => x?.[0] || "").join("") : "") || q;
    }));
  }
  return out;
}

// Tries the official API first, then the fallback. Always returns or throws within ~2x timeout.
async function translateTexts({ texts, target, source, apiKey, apiUrl }) {
  let googleError = "";
  if (apiKey) {
    try {
      const list = await googleTranslate({ texts, target, source, apiKey, apiUrl });
      return { list, provider: "Google Cloud Translation" };
    } catch (e) {
      googleError = describe(e);
      console.warn("[translate] Google Cloud Translation failed:", googleError);
    }
  } else {
    googleError = "TRANSLATION_API_KEY is empty in backend/.env";
    console.warn("[translate]", googleError);
  }
  try {
    const list = await fallbackTranslate({ texts, target, source });
    return { list, provider: "Backend Translation Fallback", warning: googleError };
  } catch (e) {
    const err = new Error(`Google API: ${googleError} | Fallback: ${describe(e)}`);
    console.error("[translate] FAILED:", err.message);
    throw err;
  }
}

module.exports = { translateTexts, googleTranslate, fallbackTranslate, describe };
