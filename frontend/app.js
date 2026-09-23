/* Smart Livestock - Demo mode
   Uses browser localStorage instead of MongoDB so the project works without a database.
*/
let currentRole = "";
const STORAGE = {
  animals: "smartLivestock_animals",
  reports: "smartLivestock_reports",
  location: "smartLivestock_location"
};

function tr(key){ return (typeof t === "function" ? t(key) : key); }
function read(key){ try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

let selectedPhotoData = "";

let livestockVisionModel = null;
let livestockVisionLoading = null;
let photoAIResult = null;

async function loadLivestockVisionModel(){
  if(livestockVisionModel) return livestockVisionModel;
  if(livestockVisionLoading) return livestockVisionLoading;
  livestockVisionLoading = (async()=>{
    if(typeof mobilenet === "undefined") throw new Error("AI model library unavailable");
    livestockVisionModel = await mobilenet.load({version:2, alpha:1.0});
    return livestockVisionModel;
  })();
  return livestockVisionLoading;
}

const HUMAN_LABELS = /\b(person|people|man|woman|boy|girl|human|face|bride|groom|child|baby)\b/i;
const ANIMAL_LABELS = /\b(cow|ox|bull|bullock|water buffalo|buffalo|bison|goat|sheep|ram|lamb|horse|pony|donkey|pig|boar|dog|cat|animal|livestock|calf|heifer|steer|mare|foal|kid|ewe|hog|sow|boar|kitten|puppy)\b/i;



async function validateAnimalPhoto(file){
  if(!file || !file.type.startsWith('image/')) return false;
  const status=document.getElementById('photoAIStatus');
  if(status) status.textContent='🔎 '+tr('analyzingPhoto');
  try{
    const model=await loadLivestockVisionModel();
    const img=new Image();
    const url=URL.createObjectURL(file);
    await new Promise((resolve,reject)=>{img.onload=resolve; img.onerror=reject; img.src=url;});
    const predictions=await model.classify(img,5);
    URL.revokeObjectURL(url);
    const top=predictions[0] || {className:'',probability:0};
    const all=predictions.map(p=>p.className).join(' ');
    const looksHuman=HUMAN_LABELS.test(all) && !ANIMAL_LABELS.test(all);
    const animalPrediction=predictions.find(p=>ANIMAL_LABELS.test(p.className));
    const looksAnimal=!!animalPrediction;

    // Do not reject a real animal just because MobileNet is uncertain.
    // MobileNet is only a browser-side guard; the disease model performs the
    // actual screening. We only hard-block a clearly human image.
    if(looksHuman && top.probability >= 0.35){
      photoAIResult=null;
      if(status) status.textContent='❌ '+tr('invalidAnimalPhoto');
      return false;
    }
    photoAIResult={
      label: looksAnimal ? animalPrediction.className : top.className,
      confidence: Math.round((looksAnimal ? animalPrediction.probability : top.probability)*100),
      uncertain: !looksAnimal
    };
    if(status) status.textContent = looksAnimal
      ? '✅ '+tr('animalDetected')+': '+animalPrediction.className
      : '⚠️ '+tr('analyzingPhoto');
    return true;
  }catch(err){
    console.warn('Photo AI validation:',err);
    // Do not block uploads if the optional browser model cannot load.
    if(status) status.textContent='⚠️ '+tr('analyzingPhoto');
    return true;
  }
}

function renderPhotoAIResult(symptoms){
  const box=document.getElementById('analysisResult');
  if(!box) return;
  const disease=inferPossibleDisease(symptoms);
  const visual=photoAIResult ? `${photoAIResult.label} (${photoAIResult.confidence}%)` : tr('animalDetected');
  box.innerHTML += `<div class="result photo-ai-result"><h3>🤖 ${tr('photoPrediction')}</h3><p><b>${tr('animalDetected')}:</b> ${visual}</p><p><b>${tr('possibleDisease')}:</b> ${disease.name} (${disease.confidence}%)</p><p><small>${tr('vetConfirm')}</small></p></div>`;
}

function setupPhotoPicker(){
  const input = document.getElementById("photoFile");
  const camera = document.getElementById("cameraFile");
  const preview = document.getElementById("photoPreview");
  if (!input && !camera) return;
  const handle = async (file) => {
    if(!file) return;
    if(!file.type.startsWith("image/")){ alert(tr("invalidAnimalPhoto")); return; }
    const valid = await validateAnimalPhoto(file);
    if(!valid){ selectedPhotoData=""; if(preview) preview.classList.add("hidden"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      selectedPhotoData = e.target.result;
      if(preview){ preview.src = selectedPhotoData; preview.classList.remove("hidden"); }
    };
    reader.readAsDataURL(file);
  };
  input?.addEventListener("change", e => handle(e.target.files[0]));
  camera?.addEventListener("change", e => handle(e.target.files[0]));
}

document.addEventListener("DOMContentLoaded", setupPhotoPicker);

function refreshDynamicLanguage(){
  if(document.getElementById("roleBadge") && currentRole){
    document.getElementById("roleBadge").textContent = currentRole === "Farmer" ? tr("farmerDash") : currentRole === "Veterinarian" ? tr("vetDash") : tr("govDash");
  }
}

async function loginAs(role){
  const name = (document.getElementById("userName")?.value || "").trim();
  if(!name){ alert(tr("fillRequired") || "Please enter your name."); return; }

  // Startup is intentionally password-free for the SIH prototype. For Vet and
  // Government, the demo password is sent silently to the backend when the
  // backend is available; judges never see or type a password here.
  const demoPasswords = { Veterinarian: "Vet@2026#SL", Government: "Gov@2026#SL" };
  const password = role === "Farmer" ? "" : (demoPasswords[role] || "");
  let loggedIntoBackend = false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({name, password, role}),
      signal: controller.signal
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    if(response.ok && data.token){
      localStorage.setItem("smartLivestockToken", data.token);
      localStorage.setItem("smartLivestockUser", JSON.stringify(data.user || {name, role}));
      loggedIntoBackend = true;
    }
  } catch(err) {
    console.warn("Backend login unavailable; using browser demo mode:", err.message);
  }

  if(!loggedIntoBackend){
    localStorage.setItem("smartLivestockToken", "demo-" + role.toLowerCase());
    localStorage.setItem("smartLivestockUser", JSON.stringify({name, role, demo:true}));
  }

  currentRole = role;
  enterDashboard(role);
}

function enterDashboard(role){
  document.getElementById("login").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("roleBadge").textContent = role === "Farmer" ? tr("farmerDash") : role === "Veterinarian" ? tr("vetDash") : tr("govDash");
  document.querySelectorAll(".role-view").forEach(v => v.classList.add("hidden"));
  if(role === "Farmer") document.getElementById("farmerView").classList.remove("hidden");
  if(role === "Veterinarian") document.getElementById("vetView").classList.remove("hidden");
  if(role === "Government") document.getElementById("govView").classList.remove("hidden");
  // These functions use the real API when available and local demo data when not.
  // Sync any reports/records that were saved offline earlier (e.g. while the
  // backend was down) now that we have a fresh, authenticated login session.
  (async () => {
    try { await syncOfflineReports(true); } catch(e) { console.warn(e); }
    try { loadDashboard(); } catch(e) { console.warn(e); }
    try { startLiveDashboard(); } catch(e) { console.warn(e); }
    try { loadRecords(); } catch(e) { console.warn(e); }
    try { loadAlerts(); } catch(e) { console.warn(e); }
    // Breeding & management stats are now shown on the Government dashboard directly,
    // and the Veterinarian can open the Breeding panel, so load both on login.
    try { loadManagementStats(); } catch(e) { console.warn(e); }
    if(role === "Veterinarian") { try { renderBreedingList(); } catch(e) { console.warn(e); } }
  })();
  // The dashboard is created/revealed after login, so run the visible-UI
  // translator once more after it exists in the DOM.
  if(typeof translateVisibleUI === 'function') {
    translateVisibleUI();
    setTimeout(translateVisibleUI, 120);
  }
}

function logout(){ localStorage.removeItem("smartLivestockToken"); localStorage.removeItem("smartLivestockUser"); location.reload(); }

function showPanel(id){
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  const panel = document.getElementById(id);
  if(!panel) return;
  panel.classList.remove("hidden");
  if(id === "recordsPanel") loadRecords();
  if(id === "alertsPanel") loadAlerts();
  panel.scrollIntoView({behavior:"smooth"});
}


// Global location helper. Keep this in app.js as a safety net so the Location
// button and report submission still work even if the optional inline language
// script is unavailable or blocked by a browser extension.
async function getLocation(forceFresh=true){
  const status=document.getElementById('locationStatus');
  const lang=window.selectedLanguage || 'en';
  const setStatus=(msg)=>{ if(status){ status.style.display='block'; status.textContent='📍 '+msg; } };
  setStatus('Getting a fresh GPS location...');
  if(!navigator.geolocation){ setStatus(tr('locationUnsupported') || 'Location is not supported by this browser.'); return null; }
  const getPosition=()=>new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:forceFresh?0:60000}));
  try{
    const pos=await getPosition();
    const c=pos?.coords || {};
    const lat=Number(c.latitude), lon=Number(c.longitude), accuracy=Number(c.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)) throw new Error('Invalid GPS reading.');
    let location={lat,lon,accuracy:Number.isFinite(accuracy)?accuracy:null,address:'',capturedAt:new Date().toISOString()};
    // Reverse geocoding is optional; a valid GPS coordinate is enough to save
    // the report when the public geocoder is unavailable.
    try{
      const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`,{headers:{'Accept':'application/json','Accept-Language':lang}});
      if(response.ok){
        const data=await response.json(), a=data.address||{};
        location={...location,address:data.display_name||'',displayName:data.display_name||'',village:a.village||a.hamlet||'',town:a.town||a.city_district||'',city:a.city||a.municipality||'',taluka:a.subdistrict||a.county||'',district:a.state_district||a.district||'',state:a.state||'',country:a.country||'',pincode:a.postcode||''};
      }
    }catch(e){ console.warn('Reverse geocoding unavailable:',e.message); }
    try{ localStorage.setItem(STORAGE.location,JSON.stringify(location)); }catch{}
    const readable=[location.village||location.town||location.city||location.address,location.taluka,location.district,location.state].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
    setStatus(readable || 'Location detected');
    return location;
  }catch(err){
    console.warn('GPS unavailable:',err.message);
    setStatus('Location unavailable; the report will still be saved.');
    return null;
  }
}
window.getLocation=getLocation;

const API_BASE = localStorage.getItem("smartLivestockApiBase") || "http://localhost:5000";
async function api(path, options={}){
  // Keep the browser demo usable even when the optional Node/Mongo/AI services
  // are not running. A short timeout also prevents a dead local service from
  // making the UI look frozen.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 9000));
  const token = localStorage.getItem("smartLivestockToken") || "";
  const fetchOptions = {...options, signal: controller.signal, headers:{"Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers||{})}};
  delete fetchOptions.timeoutMs;
  try {
    const response = await fetch(`${API_BASE}${path}`, fetchOptions);
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.message || `API error ${response.status}`);
    return data;
  } catch (err) {
    if(err?.name === 'AbortError') throw new Error('Backend request timed out. Offline demo mode is available.');
    if(err instanceof TypeError) throw new Error('Backend is not running. Using offline demo mode.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadDashboard(){
  let animals = read(STORAGE.animals);
  let reports = read(STORAGE.reports);
  try { animals = await api('/api/animals'); } catch(e) {}
  try { reports = await api('/api/reports'); } catch(e) {}
  const high = reports.filter(r => r.riskLevel === "High").length;
  const medium = reports.filter(r => r.riskLevel === "Medium").length;
  const low = reports.filter(r => r.riskLevel === "Low").length;
  const areas = new Set(reports.map(r => r.location?.area || r.location?.lat).filter(Boolean)).size;

  [
    ["animalCount", animals.length], ["highCount", high],
    ["vetHigh", high], ["vetMedium", medium], ["vetLow", low],
    ["govHigh", high], ["govAreas", areas], ["govReports", reports.length]
  ].forEach(([id,value]) => { const el=document.getElementById(id); if(el) el.textContent=value; });
}

async function registerAnimal(){
  const animalId = document.getElementById("animalId")?.value.trim();
  const speciesSelect = document.getElementById("species")?.value;
  const otherSpecies = document.getElementById("otherSpecies")?.value.trim();
  const ageValue = document.getElementById("age")?.value;

  if(!animalId || !speciesSelect || (speciesSelect === "Other" && !otherSpecies) || ageValue === ""){
    alert(tr("fillRequired") || "Please fill all required fields.");
    return;
  }

  const animals = read(STORAGE.animals);
  if(animals.some(a => a.animalId.toLowerCase() === animalId.toLowerCase())){
    alert(tr("duplicateAnimal") || "This Animal ID is already registered.");
    return;
  }

  const animal = {
    animalId,
    species: speciesSelect === "Other" ? otherSpecies : speciesSelect,
    age: Number(ageValue),
    gender: document.getElementById("gender")?.value || "Male",
    vaccinationHistory: document.getElementById("vaccinationHistory")?.value.trim() || "",
    medicalHistory: document.getElementById("medicalHistory")?.value.trim() || "",
    ownerName: document.getElementById("userName")?.value.trim() || "Demo Farmer",
    createdAt: new Date().toISOString()
  };

  animals.push(animal);
  write(STORAGE.animals, animals);

  // Persist to the backend when it is available. Local storage remains the
  // source of truth for demo/offline mode, so registration never gets lost
  // just because MongoDB is unavailable or not running.
  try {
    await api('/api/animals', {method:'POST', body:JSON.stringify(animal)});
  } catch (err) {
    console.warn('Backend animal sync skipped:', err.message);
  }

  alert(tr("registered"));
  document.getElementById("registerPanel")?.classList.add("hidden");
  loadDashboard();
  loadRecords();
  clearRegisterForm();
}

function calculateRisk(symptoms){
  let score = Math.min(100, symptoms.length * 18);
  if(symptoms.includes("fever")) score += 20;
  if(symptoms.includes("weakness")) score += 10;
  if(symptoms.includes("cough")) score += 5;
  score = Math.min(100, score);
  const riskLevel = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";
  const possibleRisks = [];
  if(symptoms.includes("skin problem")) possibleRisks.push("Skin-related infection risk");
  if(symptoms.includes("cough")) possibleRisks.push("Respiratory illness risk");
  if(symptoms.includes("fever") || symptoms.includes("weakness")) possibleRisks.push("Systemic illness risk");
  if(!possibleRisks.length) possibleRisks.push("General health concern");
  return {riskScore:score, riskLevel, possibleRisks};
}

async function submitReport(){
  const animalId = document.getElementById("reportAnimalId")?.value.trim();
  const symptoms = [...document.querySelectorAll(".symptom:checked")].map(x=>x.value);
  if(!animalId){ alert(tr("fillRequired") || "Please enter Animal ID."); return; }

  // Check both backend and local storage. A successful backend response
  // can legitimately contain zero records while the just-registered animal
  // exists in this browser's local demo data.
  const localAnimals = read(STORAGE.animals);
  let backendAnimals = [];
  try { backendAnimals = await api('/api/animals'); } catch (err) {
    console.warn('Backend animal lookup unavailable; using local records:', err.message);
  }
  const animals = [...backendAnimals, ...localAnimals];
  const animal = animals.find(a => String(a.animalId || '').trim().toLowerCase() === animalId.toLowerCase());
  if(!animal){ alert(tr("animalNotFound") || "Animal ID not found. Please register the animal first."); return; }
  if(!symptoms.length && !selectedPhotoData){ alert(tr("selectSymptom") || "Please select at least one symptom or upload a photo."); return; }

  const submitBtn=document.getElementById("submitReportBtn");
  if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent="⏳ Analyzing..."; }
  try{
    let ai=null;
    let aiOffline=false;
    if(selectedPhotoData){
      const status=document.getElementById('photoAIStatus');
      if(status) status.textContent='🤖 '+tr('analyzingPhoto');
      try {
        // The disease AI is optional. If the backend/AI service is unavailable,
        // never fail the whole report: continue with the browser photo check
        // and symptom-based screening below.
        ai=await api('/api/ai/predict',{method:'POST',body:JSON.stringify({imageData:selectedPhotoData,species:animal.species}),timeoutMs:12000});
      } catch(err) {
        aiOffline=true;
        console.warn('Disease AI unavailable; continuing in offline mode:', err.message);
        ai={
          success:true,
          status:'ai_unavailable',
          disease:'AI model unavailable — photo saved for veterinary review',
          confidence:0,
          top3:[],
          model:'not-running',
          note:'The image was saved, but no disease diagnosis was generated because the disease AI service is not running. Start the AI service for Lumpy Skin Disease image detection.'
        };
        if(status) status.textContent='⚠️ Photo saved — start Disease AI service for image diagnosis';
      }
    }
    // Always request a fresh high-accuracy GPS fix for the case instead of using stale storage.
    const location = await getLocation(true);
    const result = calculateRisk(symptoms);
    const payload = { animalId, symptoms, photoUrl: document.getElementById("photoUrl")?.value.trim() || "", location,
      aiPrediction: ai ? {disease:ai.disease, confidence:ai.confidence, top3:ai.top3||[], model:ai.model} : null };
    let saved;
    try { saved = await api('/api/reports',{method:'POST',body:JSON.stringify(payload)}); }
    catch(err){
      const report={id:Date.now(),...payload,...result,photoAttached:!!selectedPhotoData,createdAt:new Date().toISOString(),offline:true};
      const reports=read(STORAGE.reports); reports.push(report); write(STORAGE.reports,reports);
      const queue=read('smartLivestock_offlineQueue'); queue.push(report); write('smartLivestock_offlineQueue',queue); saved={report,offline:true};
    }
    const report=saved.report || saved;
    const riskMap = {High:tr("highRisk"), Medium:tr("mediumRisk"), Low:tr("lowRisk")};
    const box=document.getElementById("analysisResult");
    if(box){
      let html=`<div class="result"><h3>${tr("healthResult")}</h3><p class="risk-${result.riskLevel.toLowerCase()}">${tr("riskLevel")}: ${riskMap[result.riskLevel] || result.riskLevel} (${result.riskScore}/100)</p><p><b>${tr("possible")}</b> ${result.possibleRisks.join(", ")}</p><p><b>${tr("recommendation")}</b> ${result.riskLevel==='High'?tr('highRecommendation'):result.riskLevel==='Medium'?tr('mediumRecommendation'):tr('lowRecommendation')}</p>${location?.address?`<p>📍 <b>Case location:</b> ${escapeHtml(location.address)} ${location.accuracy?`(GPS accuracy ~${Math.round(location.accuracy)} m)`:''}</p>`:''}</div>`;
      if(ai){
        const disease=ai.disease || 'Uncertain';
        const conf=Number(ai.confidence||0);
        const top3=(ai.top3||[]).map(x=>`${x.label} (${x.confidence}%)`).join(', ');
        const offlineNote=aiOffline ? '<p><small>⚠️ Disease AI is unavailable. The photo was saved, but no image-based disease diagnosis was generated.</small></p>' : '';
        html += `<div class="result photo-ai-result"><h3>🤖 ${tr('photoPrediction')}</h3><p><b>${tr('possibleDisease')}:</b> ${escapeHtml(disease)}</p><p><b>${tr('confidence')}:</b> ${conf}%</p>${top3 ? `<p><b>Top predictions:</b> ${escapeHtml(top3)}</p>` : ''}<p><small>${tr('vetConfirm')}</small></p>${offlineNote}</div>`;
      }
      if(saved.hotspot){ html += `<div class="result"><b>📍 ${saved.hotspot.status.replace('_',' ')}</b> — ${saved.hotspot.cases} ${saved.hotspot.cases===1?'case':'cases'} in ${escapeHtml(saved.hotspot.area)}.</div>`; }
      box.innerHTML=html;
    }
    await loadLiveDashboard(); loadAlerts(); loadRecords();
  }catch(err){ console.error(err); alert(err.message || 'Unable to analyze this case.'); }
  finally{ if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=tr('submit');} }
}
let liveMap = null;
let liveMapLayer = null;
async function loadLiveDashboard(){
  try{
    const data=await api('/api/dashboard/live');
    const vals=[['animalCount',data.totalAnimals],['highCount',data.highRiskCases],['vetHigh',data.highRiskCases],['vetMedium',data.mediumRiskCases],['vetLow',data.lowRiskCases],['govHigh',data.highRiskCases],['govAreas',data.affectedAreas],['govReports',data.totalReports]];
    vals.forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
    renderGovAnalytics(data);
    renderLiveMap(data);
    renderHotspots(data.hotspots||[]);
    showLiveDataNotice(false);
  }catch(err){ console.warn('Live dashboard:',err.message); showLiveDataNotice(true,err.message); loadDashboard(); }
}
function showLiveDataNotice(show,detail){
  let n=document.getElementById('liveDataNotice');
  if(!show){ if(n) n.remove(); return; }
  if(!n){
    n=document.createElement('div'); n.id='liveDataNotice'; n.setAttribute('data-no-i18n','');
    n.style.cssText='background:#7a1f1f;color:#fff;padding:10px 16px;border-radius:12px;font:600 13px/1.4 Arial,sans-serif;margin-bottom:14px';
    const container=document.getElementById('govView')||document.getElementById('vetView');
    if(container) container.insertBefore(n,container.firstChild.nextSibling);
  }
  n.textContent='⚠️ Live data unavailable: '+(detail||'cannot reach the backend')+'. Make sure the backend (and MongoDB) are running, then log out and log in again.';
}
function renderLiveMap(data){
  const el=document.getElementById('liveMap'); if(!el || typeof L==='undefined') return;
  if(!liveMap){ liveMap=L.map(el).setView([20.5937,78.9629],5); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(liveMap); liveMapLayer=L.layerGroup().addTo(liveMap); }
  liveMapLayer.clearLayers();
  const bounds=[];
  (data.markers||[]).forEach(m=>{ const marker=L.marker([m.lat,m.lon]).bindPopup(`<b>${escapeHtml(m.disease)}</b><br>Animal: ${escapeHtml(m.animalId)}<br>Risk: ${escapeHtml(m.riskLevel)}<br>${escapeHtml(m.area)}<br>${escapeHtml(m.address||'')}<br>GPS accuracy: ${m.accuracy?Math.round(m.accuracy)+' m':'N/A'}`); marker.addTo(liveMapLayer); bounds.push([m.lat,m.lon]); });
  (data.hotspots||[]).filter(h=>h.status!=='MONITOR' && h.locations?.length).forEach(h=>{ const avg=h.locations.reduce((a,p)=>[a[0]+p.lat,a[1]+p.lon],[0,0]).map(x=>x/h.locations.length); L.circle(avg,{radius:h.status==='INFECTED_ZONE'?1500:800}).bindPopup(`<b>${h.status.replace('_',' ')}</b><br>${escapeHtml(h.disease)}<br>${h.cases} cases<br>${escapeHtml(h.area)}`).addTo(liveMapLayer); bounds.push(avg); });
  if(bounds.length) liveMap.fitBounds(bounds,{padding:[30,30],maxZoom:15});
}
function renderHotspots(groups){
  const box=document.getElementById('hotspotList'); if(!box) return;
  const active=groups.filter(g=>g.status!=='MONITOR');
  box.innerHTML=active.length ? active.map(g=>`<div class="record"><b>⚠️ ${escapeHtml(g.status.replace('_',' '))}</b> — ${escapeHtml(g.disease)}<br>${g.cases} cases in <b>${escapeHtml(g.area)}</b><br><small>${escapeHtml(g.note)}</small></div>`).join('') : '<p>No hotspot-level cluster detected in the configured surveillance window.</p>';
}
function renderGovAnalytics(data){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??0};
  set('govStatAnimals',data.totalAnimals); set('govStatReports',data.totalReports); set('govStatHigh',data.highRiskCases); set('govStatAreas',data.affectedAreas);
  set('govRiskHigh',data.highRiskCases); set('govRiskMedium',data.mediumRiskCases); set('govRiskLow',data.lowRiskCases);
  const box=document.getElementById('govAlertList'); if(!box)return;
  const alerts=(data.recentAlerts||[]).slice(0,8);
  box.innerHTML=alerts.length ? alerts.map(a=>`<div class="record"><b>⚠️ ${escapeHtml(a.riskLevel||'Alert')} — Animal ${escapeHtml(a.animalId||'')}</b><br><small>Status: ${escapeHtml(a.status||'Open')} • ${a.createdAt?new Date(a.createdAt).toLocaleString():''}</small></div>`).join('') : '<p>No alerts found.</p>';
}
let liveTimer=null;
function startLiveDashboard(){
  loadLiveDashboard(); clearInterval(liveTimer); liveTimer=setInterval(loadLiveDashboard,10000);
}

async function loadRecords(){
  let animals = read(STORAGE.animals);
  let reports = read(STORAGE.reports);
  try { const a=await api('/api/animals'); animals=[...a,...animals.filter(x=>!a.some(y=>String(y.animalId).toLowerCase()===String(x.animalId).toLowerCase()))]; } catch(e) {}
  try { const r=await api('/api/reports'); reports=[...r,...reports.filter(x=>!r.some(y=>String(y._id||y.id)===String(x.id)))]; } catch(e) {}
  const box = document.getElementById("records");
  if(!box) return;
  if(!animals.length && !reports.length){ box.innerHTML=`<p>${tr("noRecords")}</p>`; return; }
  const speciesMap={Cow:tr("cow"),Buffalo:tr("buffalo"),Goat:tr("goat"),Sheep:tr("sheep")};
  const genderMap={Male:tr("male"),Female:tr("female")};
  const symptomMap={fever:tr("fever"),"loss of appetite":tr("appetite"),"skin problem":tr("skin"),cough:tr("cough"),weakness:tr("weakness"),"reduced milk production":tr("milk")};
  const riskMap={High:tr("highRisk"),Medium:tr("mediumRisk"),Low:tr("lowRisk")};
  box.innerHTML=`<h4>${tr("animals")}</h4>${animals.map(a=>`<div class="record"><b>${a.animalId}</b> — ${speciesMap[a.species]||a.species}, ${a.age} ${tr("years")}, ${genderMap[a.gender]||a.gender}<br><small>${tr("vaccinationLabel")} ${a.vaccinationHistory||tr("notAdded")}</small></div>`).join("")}<h4>${tr("reports")}</h4>${reports.map(r=>`<div class="record"><b>${r.animalId}</b> — <span class="risk-${r.riskLevel.toLowerCase()}">${riskMap[r.riskLevel]||r.riskLevel} (${r.riskScore}/100)</span><br>${tr("symptoms")} ${(r.symptoms||[]).map(x=>symptomMap[x]||x).join(", ")} ${r.photoAttached?'📷':''}</div>`).join("")}`;
}

async function loadAlerts(){
  const box=document.getElementById("alerts");
  if(!box) return;
  let reports=read(STORAGE.reports);
  try { reports=await api('/api/reports'); } catch(e) {}
  const alerts=reports.filter(r=>r.riskLevel !== "Low").slice().reverse();
  box.innerHTML=alerts.length ? alerts.map(a=>`<div class="alert">⚠️ <b>${riskLabel(a.riskLevel)}</b> — Animal ${escapeHtml(a.animalId||'')}</div><div class="record"><b>Risk:</b> ${escapeHtml(a.riskLevel||'')} (${escapeHtml(a.riskScore??'')}/100)<br><b>Status:</b> ${escapeHtml(a.status||'Open')}<br>${recommendation(a.riskLevel)}</div>`).join("") : `<p>${tr("noAlerts")}</p>`;
}
function riskLabel(level){ return level==="High"?tr("highRisk"):level==="Medium"?tr("mediumRisk"):tr("lowRisk"); }
function recommendation(level){ return level==="High"?tr("highRecommendation"):level==="Medium"?tr("mediumRecommendation"):tr("lowRecommendation"); }

function clearRegisterForm(){
  ["animalId","age","vaccinationHistory","medicalHistory","otherSpecies"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const species=document.getElementById("species"); if(species){species.value=""; if(typeof handleSpeciesChange==='function')handleSpeciesChange();}
}

// Device camera support. This avoids opening File Explorer when Take Photo is pressed.
let cameraStream = null;

async function openCamera(){
  const modal = document.getElementById("cameraModal");
  const video = document.getElementById("cameraVideo");
  const message = document.getElementById("cameraMessage");
  if(!modal || !video) return;

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    alert("Camera is not supported by this browser. Please use a modern browser or open the app on a phone.");
    return;
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  message.textContent = "Requesting camera permission...";

  try{
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = cameraStream;
    await video.play();
    message.textContent = "Camera ready. Tap Capture Photo.";
  }catch(err){
    closeCamera();
    if(err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")){
      alert("Camera permission was denied. Please allow camera access in your browser settings and try again.");
    }else{
      alert("Unable to open the camera. Please check that your camera is connected and not being used by another app.");
    }
  }
}

function captureCameraPhoto(){
  const video = document.getElementById("cameraVideo");
  const canvas = document.getElementById("cameraCanvas");
  const preview = document.getElementById("photoPreview");
  if(!video || !canvas || !video.videoWidth){
    alert("Camera is not ready yet. Please wait a moment and try again.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  selectedPhotoData = canvas.toDataURL("image/jpeg", 0.88);
  if(preview){
    preview.src = selectedPhotoData;
    preview.classList.remove("hidden");
  }
  closeCamera();
}

function closeCamera(){
  if(cameraStream){
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById("cameraVideo");
  if(video) video.srcObject = null;
  const modal = document.getElementById("cameraModal");
  if(modal){
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden","true");
  }
}


// ---------- V4 interaction fixes ----------
const CONTACT_STORAGE = "smartLivestock_contacts";

function getContacts(){
  try { return JSON.parse(localStorage.getItem(CONTACT_STORAGE) || "[]"); }
  catch { return []; }
}
function saveContacts(items){ localStorage.setItem(CONTACT_STORAGE, JSON.stringify(items)); }

function speakHere(){
  if(!window.speechSynthesis || !window.SpeechSynthesisUtterance){
    alert(tr("speakerUnsupported"));
    return;
  }
  const box=document.getElementById("analysisResult");
  const text=(box && box.innerText ? box.innerText : "").replace(/\s+/g," ").trim();
  if(!text){
    alert(tr("speakerNoText") || "Please analyze a case first.");
    return;
  }
  speechSynthesis.cancel();
  const lang = selectedLanguage === "hi" ? "hi-IN" : selectedLanguage === "mr" ? "mr-IN" : "en-IN";
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang; u.rate=0.9;
  const voices=speechSynthesis.getVoices();
  const v=voices.find(x=>x.lang.toLowerCase()===lang.toLowerCase()) || voices.find(x=>x.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));
  if(v) u.voice=v;
  const btn=document.getElementById("speakHereBtn");
  if(btn) btn.textContent="⏹️ "+(tr("micStopped") || "Stop");
  u.onend=()=>{ if(btn) btn.textContent="🎙️ "+tr("speakHere"); };
  u.onerror=()=>{ if(btn) btn.textContent="🎙️ "+tr("speakHere"); };
  speechSynthesis.speak(u);
}

function clearAndAddNew(){
  speechSynthesis?.cancel?.();
  selectedPhotoData="";
  photoAIResult=null;
  const ids=["reportAnimalId","photoUrl"];
  ids.forEach(id=>{const e=document.getElementById(id); if(e)e.value="";});
  document.querySelectorAll(".symptom").forEach(x=>x.checked=false);
  const preview=document.getElementById("photoPreview"); if(preview){preview.src="";preview.classList.add("hidden");}
  const status=document.getElementById("photoAIStatus"); if(status) status.textContent="";
  const result=document.getElementById("analysisResult"); if(result) result.innerHTML="";
  const gallery=document.getElementById("photoFile"); if(gallery) gallery.value="";
  const camera=document.getElementById("cameraFile"); if(camera) camera.value="";
  const loc=document.getElementById("locationStatus");
  if(loc) loc.style.display="none";
  showPanel("reportPanel");
  const input=document.getElementById("reportAnimalId"); if(input) input.focus();
}

function openContactPanel(from){
  const panel=document.getElementById("contactPanel");
  if(!panel) return;
  panel.dataset.from=from || "farmer";
  const title=document.getElementById("contactTitle");
  if(title) title.textContent = from === "vet" ? tr("contactFarmers") : tr("contactVet");
  renderContactInbox();
  document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden"));
  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth"});
}

function renderContactInbox(){
  const box=document.getElementById("contactInbox"); if(!box) return;
  const items=getContacts();
  if(!items.length){ box.innerHTML=`<p>${tr("noMessages")}</p>`; return; }
  box.innerHTML=items.slice().reverse().map(m=>{
    const sender=m.from === "vet" ? tr("vetMessage") : tr("farmerMessage");
    return `<div class="record"><b>${sender}</b><br>${escapeHtml(m.message)}<br><small>${new Date(m.createdAt).toLocaleString()}</small></div>`;
  }).join("");
}
function escapeHtml(value){
  return String(value).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;"}[c]||c));
}
function sendContactMessage(){
  const field=document.getElementById("contactMessage");
  const message=field?.value.trim();
  if(!message){ alert(tr("contactPlaceholder") || "Please type a message."); return; }
  const items=getContacts();
  items.push({from:currentRole === "Veterinarian" ? "vet" : "farmer", message, createdAt:new Date().toISOString(), name:document.getElementById("userName")?.value.trim()||"User"});
  saveContacts(items);
  if(field) field.value="";
  renderContactInbox();
  alert(tr("sent"));
}

// Better prototype disease reasoning: uses symptom combinations instead of pretending
// that a generic image classifier can diagnose a livestock disease.
function inferPossibleDisease(symptoms){
  const s=new Set((symptoms||[]).map(x=>String(x).toLowerCase()));
  if(s.has("fever") && s.has("loss of appetite") && s.has("weakness"))
    return {name:"Systemic infection / febrile illness", confidence:78};
  if(s.has("cough") && (s.has("fever") || s.has("difficulty breathing")))
    return {name:"Respiratory disease (possible pneumonia/respiratory infection)", confidence:80};
  if(s.has("reduced milk production") && (s.has("fever") || s.has("weakness")))
    return {name:"Mastitis / udder-related illness (possible)", confidence:76};
  if(s.has("skin problem"))
    return {name:"Dermatitis / skin infection (possible)", confidence:74};
  if(s.has("diarrhea") && (s.has("weakness") || s.has("fever")))
    return {name:"Gastrointestinal infection (possible)", confidence:75};
  if(s.has("diarrhea")) return {name:"Gastrointestinal illness (possible)", confidence:68};
  if(s.has("cough")) return {name:"Respiratory illness (possible)", confidence:65};
  if(s.has("fever")) return {name:"Febrile illness (possible)", confidence:62};
  return {name:"Insufficient symptoms for a specific disease prediction", confidence:40};
}

// The camera capture path must go through the same animal-photo validation as gallery uploads.
const _captureCameraPhoto = captureCameraPhoto;
captureCameraPhoto = function(){
  const video=document.getElementById("cameraVideo");
  const canvas=document.getElementById("cameraCanvas");
  if(!video || !canvas || !video.videoWidth){ alert("Camera is not ready yet."); return; }
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
  canvas.toBlob(async blob=>{
    if(!blob) return;
    const file=new File([blob],"camera-photo.jpg",{type:"image/jpeg"});
    const valid=await validateAnimalPhoto(file);
    if(!valid){ selectedPhotoData=""; return; }
    selectedPhotoData=canvas.toDataURL("image/jpeg",0.88);
    const preview=document.getElementById("photoPreview");
    if(preview){preview.src=selectedPhotoData;preview.classList.remove("hidden");}
    closeCamera();
  },"image/jpeg",0.88);
};

/* ============================================================
   SIH FINAL UPGRADE: breeding, vaccination, treatment, lab,
   verification, offline queue and government filtering.
   All features use localStorage fallback when backend is offline.
   ============================================================ */
const EXT_STORAGE = {
  breeding:'smartLivestock_breeding',
  vaccinations:'smartLivestock_vaccinations',
  treatments:'smartLivestock_treatments',
  labs:'smartLivestock_labs',
  queue:'smartLivestock_offlineQueue'
};
function extRead(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}}
function extWrite(k,v){localStorage.setItem(k,JSON.stringify(v))}
async function postWithOffline(path,key,payload){
  try{return await api(path,{method:'POST',body:JSON.stringify(payload)})}
  catch(e){const arr=extRead(key);arr.unshift({...payload,id:Date.now(),offline:true,createdAt:new Date().toISOString()});extWrite(key,arr);return arr[0]}
}
async function saveBreeding(){
  const animalId=document.getElementById('breedAnimalId')?.value.trim();
  if(!animalId){alert(tr('animalRequired')||'Please enter Animal ID.');return}
  const local=read(STORAGE.animals), animal=local.find(a=>String(a.animalId).toLowerCase()===animalId.toLowerCase());
  const payload={animalId,breed:document.getElementById('breedName')?.value.trim()||'',heatDetectedDate:document.getElementById('heatDate')?.value||null,aiDate:document.getElementById('aiDate')?.value||null,pregnancyStatus:document.getElementById('pregnancyStatus')?.value||'Unknown',expectedDeliveryDate:document.getElementById('deliveryDate')?.value||null,lastCalvingDate:document.getElementById('calvingDate')?.value||null,numberOfCalves:Number(document.getElementById('calvesCount')?.value||0),notes:document.getElementById('breedingNotes')?.value||''};
  if(!animal){try{const bs=await api('/api/animals');if(!bs.some(a=>String(a.animalId).toLowerCase()===animalId.toLowerCase())){alert(tr('animalNotFound')||'Animal ID not found.');return}}catch{}}
  const result=await postWithOffline('/api/breeding',EXT_STORAGE.breeding,payload);
  const box=document.getElementById('breedingResult'); if(box) box.innerHTML=`<div class="result"><b>🧬 Breeding record saved.</b><br>${escapeHtml(result.recommendation||'Veterinary health verification is recommended before breeding.')}</div>`;
  loadManagementStats();
  renderBreedingList();
}
async function renderBreedingList(){
  const box=document.getElementById('breedingList');if(!box)return;
  let items=extRead(EXT_STORAGE.breeding);try{items=[...(await api('/api/breeding')), ...items]}catch{}
  box.innerHTML=items.slice(0,20).map(x=>`<div class="record"><b>${escapeHtml(x.animalId||'')}</b> ${x.breed?'— '+escapeHtml(x.breed):''}<br>Pregnancy: <b>${escapeHtml(x.pregnancyStatus||'Unknown')}</b>${x.expectedDeliveryDate?' • Due: '+new Date(x.expectedDeliveryDate).toLocaleDateString():''}<br><small>${x.aiDate?'AI date: '+new Date(x.aiDate).toLocaleDateString():''} ${x.numberOfCalves?'• Calves: '+x.numberOfCalves:''}</small></div>`).join('')||'<p>No breeding records.</p>';
}
async function saveTreatment(){
  const animalId=document.getElementById('treatAnimalId')?.value.trim();
  if(!animalId){alert(tr('animalRequired')||'Please enter Animal ID.');return}
  const payload={animalId,diagnosis:document.getElementById('treatDiagnosis')?.value.trim()||'',medicine:document.getElementById('treatMedicine')?.value.trim()||'',treatmentDate:document.getElementById('treatDate')?.value||new Date().toISOString(),followUpDate:document.getElementById('followDate')?.value||null,vetName:document.getElementById('treatVet')?.value.trim()||'',notes:document.getElementById('treatNotes')?.value||''};
  await postWithOffline('/api/treatments',EXT_STORAGE.treatments,payload);
  alert('Treatment record saved.'); renderTreatmentList(); loadManagementStats();
}
async function saveLabReferral(){
  const animalId=document.getElementById('labAnimalId')?.value.trim();
  if(!animalId){alert(tr('animalRequired')||'Please enter Animal ID.');return}
  const payload={animalId,reportId:document.getElementById('labReportId')?.value.trim()||'',sampleType:document.getElementById('sampleType')?.value.trim()||'',reason:document.getElementById('labReason')?.value.trim()||'',labName:document.getElementById('labName')?.value.trim()||'',referralDate:new Date().toISOString(),status:'Pending'};
  await postWithOffline('/api/lab-referrals',EXT_STORAGE.labs,payload);
  alert('Lab referral created.'); renderLabList(); loadManagementStats();
}
async function renderTreatmentList(){
  const box=document.getElementById('treatmentList');if(!box)return;
  let items=extRead(EXT_STORAGE.treatments);try{items=[...(await api('/api/treatments')), ...items]}catch{}
  box.innerHTML=items.slice(0,20).map(x=>`<div class="record"><b>${escapeHtml(x.animalId||'')}</b> — ${escapeHtml(x.diagnosis||'Treatment')}<br>${escapeHtml(x.medicine||'')}<br><small>${x.treatmentDate?new Date(x.treatmentDate).toLocaleDateString():''} ${x.vetName?'• '+escapeHtml(x.vetName):''}</small></div>`).join('')||'<p>No treatment records.</p>';
}
async function renderLabList(){
  const box=document.getElementById('labList');if(!box)return;
  let items=extRead(EXT_STORAGE.labs);try{items=[...(await api('/api/lab-referrals')), ...items]}catch{}
  box.innerHTML=items.slice(0,20).map(x=>`<div class="record"><b>${escapeHtml(x.animalId||'')}</b> — 🧪 ${escapeHtml(x.sampleType||'Sample')}<br>${escapeHtml(x.reason||'')} <b>${escapeHtml(x.status||'Pending')}</b></div>`).join('')||'<p>No lab referrals.</p>';
}
async function loadManagementStats(){
  let d=null;try{d=await api('/api/dashboard/management')}catch{}
  if(!d){
    const b=extRead(EXT_STORAGE.breeding),v=extRead(EXT_STORAGE.vaccinations),t=extRead(EXT_STORAGE.treatments),l=extRead(EXT_STORAGE.labs);
    d={breedingTotal:b.length,pregnant:b.filter(x=>x.pregnancyStatus==='Pregnant').length,aiCases:b.filter(x=>x.aiDate).length,dueDeliveries:b.filter(x=>x.expectedDeliveryDate).length,vaccinationTotal:v.length,vaccinationCompleted:v.filter(x=>x.givenDate||x.status==='Completed').length,treatments:t.length,pendingLabs:l.filter(x=>x.status==='Pending').length};
  }
  [['breedTotal',d.breedingTotal],['pregnantCount',d.pregnant],['aiCount',d.aiCases],['dueDeliveryCount',d.dueDeliveries],['vaxTotal',d.vaccinationTotal],['vaxDone',d.vaccinationCompleted],['treatmentCount',d.treatments],['pendingLabCount',d.pendingLabs]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v??0});
}
async function loadVerificationCases(){
  const box=document.getElementById('verificationList');if(!box)return;
  let reports=[];try{reports=await api('/api/reports')}catch{reports=read(STORAGE.reports)}
  box.innerHTML=reports.slice(0,50).map(r=>`<div class="record"><b>${escapeHtml(r.animalId||'')}</b> — ${escapeHtml(r.disease||'Uncertain')}<br>Risk: ${escapeHtml(r.riskLevel||'')} • Status: ${escapeHtml(r.status||'Open')}<br><button onclick="verifyCase('${String(r._id||r.id)}','Verified')">✅ Verify</button> <button onclick="verifyCase('${String(r._id||r.id)}','Needs Review')">🔎 Needs Review</button></div>`).join('')||'<p>No cases found.</p>';
}
async function verifyCase(id,status){
  try{await api('/api/reports/'+encodeURIComponent(id)+'/verify',{method:'PATCH',body:JSON.stringify({status})});alert('Case status updated.');loadVerificationCases();loadLiveDashboard()}
  catch{const rs=read(STORAGE.reports);const r=rs.find(x=>String(x.id)===String(id));if(r){r.status=status;write(STORAGE.reports,rs);alert('Case status updated locally.');loadVerificationCases()}}
}
async function syncOfflineReports(silent){
  const queue=extRead(EXT_STORAGE.queue); if(!queue.length){if(!silent)alert('No pending offline reports.');updateOfflineUI();return}
  const remaining=[];
  for(const r of queue){
    try{
      const payload={animalId:r.animalId,symptoms:r.symptoms||[],photoUrl:r.photoUrl||'',location:r.location||null,aiPrediction:r.aiPrediction||null};
      await api('/api/reports',{method:'POST',body:JSON.stringify(payload),timeoutMs:12000});
    }catch{remaining.push(r)}
  }
  extWrite(EXT_STORAGE.queue,remaining);
  if(!silent||remaining.length<queue.length) alert(remaining.length?`${remaining.length} report(s) still pending.`:'All pending reports synced successfully.');
  updateOfflineUI();loadRecords();loadLiveDashboard();
}
function updateOfflineUI(){
  const q=extRead(EXT_STORAGE.queue),e=document.getElementById('offlineCount');if(e)e.textContent=q.length;
  const box=document.getElementById('offlineList');if(box)box.innerHTML=q.map(r=>`<div class="record">📴 <b>${escapeHtml(r.animalId||'')}</b> — ${new Date(r.createdAt).toLocaleString()}</div>`).join('')||'<p>Nothing waiting for sync.</p>';
}
let lastGovData=null;
function populateGovFilters(data){
  const diseases=[...new Set((data.markers||[]).map(x=>x.disease).filter(Boolean))].sort();
  const areas=[...new Set((data.markers||[]).map(x=>x.area).filter(Boolean))].sort();
  const fill=(id,items,all)=>{const s=document.getElementById(id);if(!s)return;const old=s.value;s.innerHTML=`<option value="">${all}</option>`+items.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');s.value=items.includes(old)?old:''};
  fill('govDiseaseFilter',diseases,'All diseases');fill('govAreaFilter',areas,'All areas');
}
function applyGovFilters(){
  if(!lastGovData)return;
  const disease=document.getElementById('govDiseaseFilter')?.value||'',area=document.getElementById('govAreaFilter')?.value||'',risk=document.getElementById('govRiskFilter')?.value||'';
  const data={...lastGovData,markers:(lastGovData.markers||[]).filter(m=>(!disease||m.disease===disease)&&(!area||m.area===area)&&(!risk||m.riskLevel===risk))};
  renderLiveMap(data);renderHotspots(data.hotspots||[]);
}
const _renderLiveMapOriginal=renderLiveMap;
renderLiveMap=function(data){lastGovData=data;populateGovFilters(data);_renderLiveMapOriginal(data)};
const _showPanelOriginal=showPanel;
showPanel=function(id){
  _showPanelOriginal(id);
  if(id==='breedingPanel'){loadManagementStats();renderBreedingList();}
  if(id==='treatmentPanel')renderTreatmentList();
  if(id==='labPanel')renderLabList();
  if(id==='verificationPanel')loadVerificationCases();
  if(id==='offlinePanel')updateOfflineUI();
  if(id==='managementPanel')loadManagementStats();
};
window.showPanel=showPanel;
window.saveBreeding=saveBreeding;window.renderBreedingList=renderBreedingList;window.saveTreatment=saveTreatment;window.saveLabReferral=saveLabReferral;window.syncOfflineReports=syncOfflineReports;window.verifyCase=verifyCase;window.applyGovFilters=applyGovFilters;

window.addEventListener('online',syncOfflineReports);
window.addEventListener('load',()=>{setTimeout(()=>{updateOfflineUI();loadManagementStats();syncOfflineReports();},1200)});

async function saveVaccination(){
  const animalId=document.getElementById('vaxAnimalId')?.value.trim();
  if(!animalId){alert(tr('animalRequired')||'Please enter Animal ID.');return}
  const payload={animalId,vaccine:document.getElementById('vaxName')?.value||'FMD',dueDate:document.getElementById('vaxDueDate')?.value||null,givenDate:document.getElementById('vaxGivenDate')?.value||null,status:document.getElementById('vaxStatus')?.value||'Scheduled'};
  await postWithOffline('/api/vaccinations',EXT_STORAGE.vaccinations,payload);
  alert('Vaccination record saved.');renderVaccinationList();loadManagementStats();
}
async function renderVaccinationList(){
  const box=document.getElementById('vaccinationList');if(!box)return;
  let items=extRead(EXT_STORAGE.vaccinations);try{items=[...(await api('/api/vaccinations')), ...items]}catch{}
  box.innerHTML=items.slice(0,20).map(x=>`<div class="record"><b>${escapeHtml(x.animalId||'')}</b> — 💉 ${escapeHtml(x.vaccine||'')}<br>${escapeHtml(x.status||'Scheduled')} ${x.dueDate?'• due '+new Date(x.dueDate).toLocaleDateString():''}</div>`).join('')||'<p>No vaccination records.</p>';
}
window.saveVaccination=saveVaccination;
