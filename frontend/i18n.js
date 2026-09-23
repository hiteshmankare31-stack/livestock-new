/* Smart Livestock - i18n.js (English / Hindi / Marathi via Translation API). Loaded BEFORE app.js. */
/* English source strings. There is no local dictionary: everything is translated by the API. */
const SOURCE_TEXT = {
    subtitle:'Health Monitoring & Early Warning System', name:'Enter your name', choose:'Choose Language',
    farmer:'Continue as Farmer', vet:'Continue as Veterinarian', gov:'Continue as Government',
    title:'Smart Livestock', farmerDash:'Farmer Dashboard', vetDash:'Veterinarian Dashboard', govDash:'Government / Animal Husbandry Dashboard',
    myAnimals:'My Animals', highRisk:'High Risk', vaccinationDue:'Vaccination Due', highRiskCases:'High Risk Cases', mediumRisk:'Medium Risk', lowRisk:'Low Risk', affectedAreas:'Affected Areas', totalReports:'Total Reports',
    diseaseMonitoring:'Disease Spread Monitoring', map:'Area-wise monitoring map', register:'Register Animal', report:'Report Symptoms', records:'Health Records', vaccination:'Vaccination', alerts:'Alerts', trends:'Disease Trends', programs:'Vaccination Programs', save:'Save Animal', submit:'Submit & Analyze', logout:'Logout',
    location:'Location', mic:'Microphone', speaker:'Speaker', registerAnimal:'Register New Animal', animalId:'Animal ID (e.g. A001)', species:'Select Species', age:'Age in years', genderMale:'Male', genderFemale:'Female', vaccinationHistory:'Vaccination history', medicalHistory:'Medical history',
    fever:'Fever', appetite:'Loss of appetite', skin:'Skin problem', cough:'Cough', weakness:'Weakness', milk:'Reduced milk production', photo:'Photo URL (optional)', photoUpload:'Animal Photo', photoHelp:'Choose a photo from gallery or take a new photo with camera', gallery:'Choose Photo', camera:'Take Photo', healthResult:'Health Analysis Result', possible:'Possible risks:', recommendation:'Recommendation:',
    noRecords:'No records yet. Register an animal first.', animals:'Animals', reports:'Health Reports', breedingTitle:'Breeding Management', saveBreeding:'Save Breeding Record', vaccinationLabel:'Vaccination:', notAdded:'Not added', symptoms:'Symptoms:', noAlerts:'No alerts yet.',
    fmd:'💉 FMD Vaccine', hs:'💉 HS Vaccine', bq:'💉 BQ Vaccine', due:'Due soon', upcoming:'Upcoming', scheduled:'Scheduled',
    locationFound:'Location found', locationDenied:'Unable to get your location. Please allow location permission.', locationUnsupported:'Location is not supported by this browser.', micUnsupported:'Microphone voice input is not supported by this browser.', micListening:'Listening… speak now', micStopped:'Microphone stopped', micNoSpeech:'No speech detected. Please try again.', speakerUnsupported:'Speaker is not supported by this browser.', speakerNoText:'Please analyze a case first.', registered:'Animal registered successfully!',
    welcome:'Welcome', getStarted:'Get started', selectRole:'Select your language and choose your role', yourName:'Your name', chooseRole:'Choose your role', healthPoint:'Health Monitoring', healthPointSmall:'Track livestock health easily', warningPoint:'Early Warning', warningPointSmall:'Identify risks before they grow', managementPoint:'Smart Management', managementPointSmall:'Make better farming decisions', status:'Smart & Connected Livestock Care', farmerSmall:'Manage animals & health', vetSmall:'Review cases & alerts', govSmall:'Monitor trends & areas', footer:'Smart & Connected Livestock Care', years:'years', riskLevel:'Risk Level', skinRisk:'Skin-related infection risk', systemicRisk:'Systemic illness risk', respiratoryRisk:'Respiratory illness risk', generalConcern:'General health concern', highRecommendation:'Contact a veterinarian promptly and isolate the animal if advised by the veterinarian.', mediumRecommendation:'Monitor the animal closely and consider veterinary consultation.', lowRecommendation:'Continue preventive care and monitor for new symptoms.', speciesPlaceholder:'Select Species', smartAgriculture:'SMART AGRICULTURE',
    cow:'Cow', buffalo:'Buffalo', goat:'Goat', sheep:'Sheep', other:'Other', otherSpecies:'Enter species name', male:'Male', female:'Female', invalidAnimalPhoto:'Invalid photo. Please upload an animal photo.', analyzingPhoto:'AI is checking the photo...', animalDetected:'Animal detected', photoPrediction:'AI Photo Screening', possibleDisease:'Possible disease / condition', confidence:'Confidence', vetConfirm:'This is a screening result, not a veterinary diagnosis. Please confirm with a veterinarian.',
    speakHere:'Speak Here', clearNew:'Clear & Add New', contactVet:'Contact Veterinarian', contactFarmers:'Contact Farmers', contactTitle:'Veterinarian Contact', contactPlaceholder:'Type your message', sendMessage:'Send Message', noMessages:'No messages yet.', farmerMessage:'Farmer message', vetMessage:'Veterinarian message', sent:'Message sent successfully.', newCase:'Ready for a new animal health check.', breeding:'Breeding', treatment:'Treatment', offline:'Offline Sync', lab:'Lab Referral', verify:'Verify Cases', management:'Management Statistics', animalRequired:'Please enter Animal ID.'
  };

// Keys that app.js uses but were missing from SOURCE_TEXT
Object.assign(SOURCE_TEXT, {
 "fillRequired": "Please fill all required fields.",
 "duplicateAnimal": "This Animal ID is already registered.",
 "animalNotFound": "Animal ID not found. Please register the animal first.",
 "selectSymptom": "Please select at least one symptom or upload a photo."
});

/* =====================================================================
   Translation engine - API ONLY (English / Hindi / Marathi)
   ---------------------------------------------------------------------
   * The app always renders ENGLISH text (t()/tr() return English).
   * Every visible string is translated by the backend endpoint
     POST /api/translate  (Google Cloud Translation, key stays on server).
   * There is NO built-in dictionary. Results are cached in localStorage,
     so each string is requested only once per language.
   * A MutationObserver translates content rendered later (records,
     alerts, results, popups). alert() messages are translated too.
   * Switching back to English restores the original text losslessly.
   ===================================================================== */
const SUPPORTED_LANGUAGES = ['en','hi','mr'];
let selectedLanguage = 'en';
try {
  const saved = localStorage.getItem('smartLivestockLanguage');
  if (SUPPORTED_LANGUAGES.includes(saved)) selectedLanguage = saved;
} catch(e) {}

const TRANSLATE_API_BASE = () => localStorage.getItem('smartLivestockApiBase') || 'http://localhost:5000';
const API_CACHE_KEY = 'smartLivestockApiTranslations_v2';
const API_CACHE_MAX = 4000;
const API_BATCH = 25;                                  // backend accepts max 100 per request
let _apiCache = {};                                     // { "mr|English text": "मराठी मजकूर" }
try { _apiCache = JSON.parse(localStorage.getItem(API_CACHE_KEY) || '{}') || {}; } catch(e) { _apiCache = {}; }
const _apiQueue = new Set(), _apiInflight = new Set();  // "lang|text"
let _apiTimer = null, _apiFailedUntil = 0;

const LEAD = /^([^\p{L}\p{N}]*)([\s\S]*)$/u;            // leading emoji / symbols are kept, not translated

// Should this piece of text be sent to the translation API?
function _needsApi(body){
  if (body.length < 2 || body.length > 500) return false;
  if (!/[A-Za-z]{3,}/.test(body.replace(/\b[A-Z0-9]{2,5}\b/g, ''))) return false;   // dates, numbers, acronyms (FMD, GPS, AI)
  if (!/\s/.test(body) && (/\d/.test(body) || /^[A-Z]{2,5}$/.test(body))) return false; // IDs like A001
  if (/^https?:|@/.test(body)) return false;
  return true;
}
// -> { text, pending, body }  (text = translation if cached, otherwise the English original)
function _translateCore(core, lang){
  const m = core.match(LEAD), lead = m[1];
  const body = m[2].replace(/\s+$/, ''), trail = m[2].slice(body.length);
  if (!body || !_needsApi(body)) return { text: core, pending: false };
  const hit = _apiCache[lang + '|' + body];
  if (hit !== undefined) return { text: lead + hit + trail, pending: false };
  return { text: core, pending: true, body };
}
function translateString(text, lang = selectedLanguage){
  if (!text || lang === 'en' || !SUPPORTED_LANGUAGES.includes(lang)) return text;
  return _translateCore(text, lang).text;
}

function _queueApi(lang, body){
  const k = lang + '|' + body;
  if (_apiCache[k] !== undefined || _apiQueue.has(k) || _apiInflight.has(k)) return;
  _apiQueue.add(k);
  clearTimeout(_apiTimer);
  _apiTimer = setTimeout(flushTranslationQueue, 60);
}

function _showNotice(show, detail){
  let n = document.getElementById('i18nNotice');
  if (!show) { if (n) n.remove(); return; }
  if (!document.body) return;
  if (!n) {
    n = document.createElement('div');
    n.id = 'i18nNotice'; n.setAttribute('data-no-i18n', '');
    n.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;background:#7a1f1f;color:#fff;padding:10px 16px;border-radius:12px;font:600 13px/1.4 Arial,sans-serif;box-shadow:0 8px 24px #0004;max-width:92%;text-align:center';
    document.body.appendChild(n);
  }
  n.textContent = 'Translation failed: ' + (detail || 'unknown error');
}

// One request to the backend. Fills the cache; returns true on success.
async function _translateBatch(lang, batch){
  try {
    const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 30000);
    const r = await fetch(TRANSLATE_API_BASE() + '/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: batch, target: lang, source: 'en' }), signal: ctrl.signal });
    clearTimeout(to);
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(d.translatedTexts) || d.translatedTexts.length !== batch.length) throw new Error(d.message || ('HTTP ' + r.status));
    batch.forEach((x, j) => { _apiCache[lang + '|' + x] = d.translatedTexts[j] || x; });
    _showNotice(false);
    return true;
  } catch (e) {
    const base = TRANSLATE_API_BASE();
    let why;
    if (e.name === 'AbortError') why = 'the backend took too long to answer (over 30 s). Check TRANSLATION_API_KEY in backend/.env and the backend window for errors.';
    else if (e instanceof TypeError) why = 'cannot reach the backend at ' + base + '. Start START_BACKEND.bat and open this page from http://localhost:5500 (Live Server).';
    else why = e.message;
    console.warn('Translation API failed:', why);
    _apiFailedUntil = Date.now() + 15000;
    _showNotice(true, why);
    return false;
  } finally {
    batch.forEach(x => { const k = lang + '|' + x; _apiQueue.delete(k); _apiInflight.delete(k); });
  }
}
function _persistCache(){
  const keys = Object.keys(_apiCache);
  if (keys.length > API_CACHE_MAX) keys.slice(0, keys.length - API_CACHE_MAX).forEach(k => delete _apiCache[k]);
  try { localStorage.setItem(API_CACHE_KEY, JSON.stringify(_apiCache)); } catch(e) {}
}

async function flushTranslationQueue(){
  if (Date.now() < _apiFailedUntil) return;
  const items = [..._apiQueue].filter(k => !_apiInflight.has(k));
  if (!items.length) return;
  items.forEach(k => _apiInflight.add(k));
  document.body && document.body.classList.add('i18n-loading');
  const groups = {};
  items.forEach(k => { const i = k.indexOf('|'); (groups[k.slice(0, i)] ||= []).push(k.slice(i + 1)); });
  const jobs = [];
  Object.entries(groups).forEach(([lang, texts]) => {
    for (let i = 0; i < texts.length; i += API_BATCH) jobs.push(_translateBatch(lang, texts.slice(i, i + API_BATCH)));
  });
  const results = await Promise.all(jobs);
  if (results.some(Boolean)) { _persistCache(); translateVisibleUI(); }
  if (!_apiInflight.size && document.body) document.body.classList.remove('i18n-loading');
  if (results.includes(false)) setTimeout(() => { if (selectedLanguage !== 'en') translateVisibleUI(); }, 15500);  // auto-retry
}

// Translate a list right now (used for alert()); resolves with English on failure.
async function translateNow(texts, lang = selectedLanguage){
  const need = [...new Set(texts.map(x => _translateCore(x, lang)).filter(r => r.pending).map(r => r.body))];
  for (let i = 0; i < need.length; i += API_BATCH) await _translateBatch(lang, need.slice(i, i + API_BATCH));
  _persistCache();
  return texts.map(x => translateString(x, lang));
}
function translateText(text, target = selectedLanguage){ return translateNow([text], target).then(r => r[0]); }

// English source text used by app code: t('key') -> English string.
function t(key){ return SOURCE_TEXT[key] ?? ''; }

// ---- DOM translation with reversible originals ----
const _textRec = new WeakMap();   // text node / option -> {src,out}
const _attrRec = new WeakMap();   // element -> {placeholder:{src,out}, title:{src,out}}

function _sync(rec, current, lang){
  if (!rec || (current !== rec.out && current !== rec.src)) rec = { src: current, out: current };
  const m = rec.src.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
  if (lang === 'en' || !core || !/[A-Za-z]/.test(core)) { rec.out = rec.src; return rec; }
  const r = _translateCore(core, lang);
  if (r.pending) _queueApi(lang, r.body);
  rec.out = m[1] + r.text + m[3];
  return rec;
}
const _skipParent = el => !el || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION)$/.test(el.tagName) || el.closest('[data-no-i18n]');

const PAGE_TITLE = 'Smart Livestock | Health Monitoring & Early Warning System';
const PAGE_TAGLINE = 'SMART LIVESTOCK • INTELLIGENT ANIMAL HEALTH';   // text drawn by CSS (:before)

function _translatePlain(text, lang){
  const r = _translateCore(text, lang);
  if (r.pending) _queueApi(lang, r.body);
  return r.text;
}

function translateVisibleUI(root = document.body){
  if (!root) return;
  const lang = selectedLanguage;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      if (_skipParent(n.parentElement)) return;
      const rec = _sync(_textRec.get(n), n.nodeValue, lang);
      _textRec.set(n, rec);
      if (n.nodeValue !== rec.out) n.nodeValue = rec.out;
    });
    const scope = root.querySelectorAll ? root : document;
    scope.querySelectorAll('option').forEach(o => {
      if (o.closest('[data-no-i18n]')) return;
      const rec = _sync(_textRec.get(o), o.textContent, lang);
      _textRec.set(o, rec);
      if (o.textContent !== rec.out) o.textContent = rec.out;
    });
    scope.querySelectorAll('[placeholder],[title]').forEach(el => {
      if (el.closest('[data-no-i18n]')) return;
      const store = _attrRec.get(el) || {};
      ['placeholder','title'].forEach(a => {
        if (!el.hasAttribute(a)) return;
        const rec = _sync(store[a], el.getAttribute(a), lang);
        store[a] = rec;
        if (el.getAttribute(a) !== rec.out) el.setAttribute(a, rec.out);
      });
      _attrRec.set(el, store);
    });
    document.title = lang === 'en' ? PAGE_TITLE : _translatePlain(PAGE_TITLE, lang);
    const de = document.documentElement;
    if (lang === 'en') de.style.removeProperty('--tagline');
    else de.style.setProperty('--tagline', JSON.stringify(_translatePlain(PAGE_TAGLINE, lang)));
  } finally {
    if (_mo) _mo.takeRecords();   // ignore the mutations we just made ourselves
  }
}

// ---- keep newly rendered content translated ----
let _mo = null, _obsTimer = null;
function startTranslationObserver(){
  if (_mo || !document.body) return;
  _mo = new MutationObserver(() => {
    clearTimeout(_obsTimer);
    _obsTimer = setTimeout(() => translateVisibleUI(), 40);
  });
  _mo.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['placeholder','title'] });
}

// alert()/confirm(): use the cache when possible, otherwise translate first (max 4 s).
(function patchDialogs(){
  const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window);
  window.alert = msg => {
    const s = String(msg ?? '');
    if (selectedLanguage === 'en') return _alert(s);
    if (!_translateCore(s, selectedLanguage).pending) return _alert(translateString(s));
    Promise.race([translateNow([s]).then(r => r[0]), new Promise(res => setTimeout(() => res(s), 4000))]).then(_alert);
  };
  window.confirm = msg => {           // must stay synchronous: cached translation or English
    const s = String(msg ?? '');
    const r = selectedLanguage === 'en' ? { text: s } : _translateCore(s, selectedLanguage);
    if (r.pending) _queueApi(selectedLanguage, r.body);
    return _confirm(r.text);
  };
})();

function setText(id, key){ const e = document.getElementById(id); if (e) e.textContent = t(key); }
function applyLanguage(){ translateVisibleUI(); }

function setLanguage(lang){
  selectedLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
  try { localStorage.setItem('smartLivestockLanguage', selectedLanguage); } catch(e) {}
  document.documentElement.lang = selectedLanguage;
  ['loginLanguage','languageSelect'].forEach(id => { const s = document.getElementById(id); if (s) s.value = selectedLanguage; });
  try { if (window.refreshDynamicLanguage) window.refreshDynamicLanguage(); } catch(e) { console.warn(e); }
  const dash = document.getElementById('dashboard');
  if (dash && !dash.classList.contains('hidden')) {
    try { if (window.loadRecords) loadRecords(); } catch(e) {}
    try { if (window.loadAlerts) loadAlerts(); } catch(e) {}
  }
  if (selectedLanguage !== 'en') {
    _apiFailedUntil = 0;                                       // user action: try again immediately
    Object.values(SOURCE_TEXT).forEach(v => { const r = _translateCore(v, selectedLanguage); if (r.pending) _queueApi(selectedLanguage, r.body); });   // pre-load app messages (for alert())
  } else _showNotice(false);
  translateVisibleUI();
  startTranslationObserver();
}
function changeLanguage(){ setLanguage(document.getElementById('languageSelect').value); }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setLanguage(selectedLanguage));
else setLanguage(selectedLanguage);
