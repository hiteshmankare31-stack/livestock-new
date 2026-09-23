Smart Livestock v7 — Verification UI fix

- Added a visible "Verify Cases" button to the Veterinarian Dashboard.
- Added Veterinary Case Verification panel.
- The existing API endpoint PATCH /api/reports/:id/verify is used by the existing verifyCase() function.
- The verification panel loads health reports from /api/reports and provides Verify / Needs Review actions.


## v5 – Language fix (English / हिंदी / मराठी)
Root causes found and fixed:
1. `index.html`: the UI translation block was pasted with literal `\n` characters, so the whole block became ONE `//` comment.
   `applyLanguage` never existed -> `setLanguage()` threw "applyLanguage is not defined" and nothing was translated.
2. `translateVisibleUI()` used `textNode.dataset` (text nodes have no `dataset`) -> crashed even when reached.
3. Roughly half of the UI strings (and all dynamic strings: alerts, records, hotspots, pop-ups, alert()/confirm() texts)
   had no Hindi/Marathi translation at all.
4. `micListening` / `recognition` were never declared -> Microphone button threw a ReferenceError.
5. Text produced by CSS (`.container:before`) was hard-coded English.

What changed:
- NEW `frontend/i18n.js` (loaded before app.js): one dictionary + one engine for en / hi / mr.
  App code always renders English; the engine translates what is on screen and can switch back losslessly.
  A MutationObserver translates content rendered later (dashboards, lists, alerts, map pop-ups).
- alert()/confirm() messages are translated too.
- Language selectors are marked `data-no-i18n` so "English / हिंदी / मराठी" never change.
- To add a new string: add an entry in `I18N_EXTRA` inside `frontend/i18n.js`  ("English": ["हिंदी", "मराठी"]).

### v6 – Translation API added (hybrid)
- Built-in dictionary is used first (instant, works offline, curated medical terms).
- Any text NOT in the dictionary (user notes, new labels, backend messages) is sent in batches to
  `POST /api/translate` (backend -> Google Cloud Translation; key stays in backend/.env), cached in
  localStorage (`smartLivestockApiTranslations_v1`) and applied automatically.
- If the backend is not running, the app silently keeps using the dictionary (retries after 30 s).
- Backend must be running on `smartLivestockApiBase` (default http://localhost:5000) and `TRANSLATION_API_KEY` set in backend/.env.

### v7 – API-ONLY translation (no dictionary)
- All built-in Hindi/Marathi dictionaries and hand-written translations were removed.
- Every visible string (labels, records, alerts, alert() popups, placeholders, page title, CSS tagline)
  is translated through `POST /api/translate` (backend -> Google Cloud Translation) and cached in localStorage.
- Backend MUST be running with a valid `TRANSLATION_API_KEY`; otherwise the UI stays English and a red notice is shown.

### v8 – "Translation not working / connect backend" fix
- backend `/api/translate`: texts now sent to Google in the JSON BODY (long `?q=` URLs of big batches were rejected,
  which pushed every request into the slow fallback and caused timeouts). Fallback now runs 8 strings in parallel.
  Real Google error text is returned to the browser.
- backend CORS: accepts http://localhost:* and http://127.0.0.1:* (Live Server port / host mismatch no longer blocks it).
- frontend: the red notice now shows the REAL reason (backend unreachable / Google API error / timeout).
- Quick test in browser console (F12):
  fetch('http://localhost:5000/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texts:['Hello'],target:'mr'})}).then(r=>r.json()).then(console.log)
- Backend needs Node 18+ (uses built-in fetch).

### v9 – Translation "took too long" fix
- NEW backend/utils/translate.js: every Google call has a hard 10 s limit (env TRANSLATION_TIMEOUT_MS) so the API can never hang;
  errors say exactly why (key invalid / key empty / no answer from Google = internet, firewall, proxy).
- NEW diagnostic: open http://localhost:5000/api/translate/check  (optional ?target=hi)

### v10 – Dataset added
- dataset/Disease_Images/{Healthy,Lumpy_Skin_Disease,Mastitis,Foot_Mouth_Disease,Ringworm}/ (empty, with instructions; no real photos included)
- dataset/*.csv  (synthetic: animal_health, vaccination, treatment, disease_location) + generate_dataset.py
- backend/seed_dataset.js  (CSV -> MongoDB),  backend/ml/import_dataset_images.py  (images -> AI training folders)
