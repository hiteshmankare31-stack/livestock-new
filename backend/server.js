require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const Animal = require("./models/Animal");
const HealthReport = require("./models/HealthReport");
const Alert = require("./models/Alert");
const { calculateRisk } = require("./utils/riskEngine");
const { translateTexts } = require("./utils/translate");

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5500";
const JWT_SECRET = process.env.JWT_SECRET || "";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "";
const ROLE_PASSWORDS = { Farmer: process.env.FARMER_PASSWORD || DEMO_PASSWORD, Veterinarian: process.env.VET_PASSWORD || DEMO_PASSWORD, Government: process.env.GOV_PASSWORD || DEMO_PASSWORD };

app.use(helmet({ crossOriginResourcePolicy: false }));
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin: (origin, cb) => {
    // no Origin header (curl / same-origin) or "*" or configured origin or any local dev origin
    if (!origin || FRONTEND_ORIGIN === "*" || origin === FRONTEND_ORIGIN || LOCAL_ORIGIN.test(origin)) return cb(null, true);
    cb(null, false);
  }
}));
app.use(express.json({ limit: "12mb" }));
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

function authRequired(req, res, next) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!JWT_SECRET) return res.status(503).json({ message: "Security is not configured. Set JWT_SECRET in backend/.env." });
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Session expired or invalid token." }); }
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "Access denied for this role." });
}


const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001/predict";
const TRANSLATION_API_URL = process.env.TRANSLATION_API_URL || "https://translation.googleapis.com/language/translate/v2";
const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY || "";
const HOTSPOT_CASE_THRESHOLD = Number(process.env.HOTSPOT_CASE_THRESHOLD || 3);
const INFECTED_ZONE_CASE_THRESHOLD = Number(process.env.INFECTED_ZONE_CASE_THRESHOLD || 5);
const HOTSPOT_DAYS = Number(process.env.HOTSPOT_DAYS || 7);

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_livestock")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err.message));

function cleanDisease(value) {
  return String(value || "Unknown").trim().toLowerCase().replace(/\s+/g, " ");
}
function areaFromLocation(location = {}) {
  return location.village || location.town || location.city || location.municipality || location.county || location.district || "Unknown area";
}
function diseaseFromReport(report) {
  return report.disease || report.aiPrediction?.disease || (report.possibleRisks || [])[0] || "Unknown disease";
}
function makeAreaKey(location = {}) {
  const area = areaFromLocation(location);
  const taluka = location.taluka || location.subdistrict || location.county || "";
  const district = location.district || location.state_district || "";
  return [area, taluka, district].filter(Boolean).join(" | ");
}
function parseLocation(location) {
  if (!location || typeof location !== "object") return null;
  const lat = Number(location.lat ?? location.latitude);
  const lon = Number(location.lon ?? location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return {
    lat, lon,
    accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null,
    address: String(location.address || location.displayName || ""),
    village: String(location.village || ""),
    town: String(location.town || ""),
    city: String(location.city || ""),
    taluka: String(location.taluka || location.subdistrict || ""),
    district: String(location.district || location.state_district || ""),
    state: String(location.state || ""),
    country: String(location.country || ""),
    area: areaFromLocation(location),
    capturedAt: location.capturedAt ? new Date(location.capturedAt) : new Date()
  };
}

async function callAI(imageData, species) {
  const raw = String(imageData);
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  const mime = match[1] || "image/jpeg";
  const binary = Buffer.from(match[2], "base64");
  const form = new FormData();
  const extension = mime.split("/")[1] || "jpeg";
  form.append("file", new Blob([binary], { type: mime }), `animal.${extension}`);
  const aiResponse = await fetch(AI_SERVICE_URL, { method: "POST", body: form });
  const data = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) throw new Error(data.detail || "AI service failed.");
  return data;
}

app.post("/api/auth/login", authLimiter, (req, res) => {
  const { name, role, password } = req.body || {};
  const allowedRoles = ["Farmer", "Veterinarian", "Government"];
  if (!name || !allowedRoles.includes(role)) return res.status(400).json({ message: "Name and a valid role are required." });
  if (!JWT_SECRET) return res.status(503).json({ message: "Security is not configured. Set JWT_SECRET in backend/.env." });

  // Farmer quick access is intentional for the prototype: name is enough.
  // Vet/Government remain password protected.
  if (role !== "Farmer") {
    if (!password) return res.status(400).json({ message: "Secure password is required for this role." });
    if (!ROLE_PASSWORDS[role]) return res.status(503).json({ message: "Role password is not configured. Set the role password in backend/.env." });
    if (String(password) !== String(ROLE_PASSWORDS[role])) return res.status(401).json({ message: "Invalid login password." });
  }

  const token = jwt.sign({ name: String(name).slice(0, 80), role }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ success: true, token, user: { name: String(name).slice(0, 80), role } });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Smart Livestock API is running", aiService: AI_SERVICE_URL, hotspotThreshold: HOTSPOT_CASE_THRESHOLD });
});

app.post("/api/ai/predict", async (req, res) => {
  try {
    const { imageData, species } = req.body || {};
    if (!imageData || !String(imageData).startsWith("data:image/")) return res.status(400).json({ message: "Animal photo is required." });
    res.json(await callAI(imageData, species));
  } catch (err) {
    res.status(503).json({ message: `AI service is unavailable: ${err.message}` });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const { text, texts, target, source = "auto" } = req.body || {};
    if ((!text && !Array.isArray(texts)) || !target) return res.status(400).json({ message: "text/texts and target language are required" });
    const input = Array.isArray(texts) ? texts.map(x => String(x)) : [String(text)];
    if (input.length > 100) return res.status(400).json({ message: "Maximum 100 texts per translation request" });
    const { list, provider, warning } = await translateTexts({ texts: input, target, source, apiKey: TRANSLATION_API_KEY, apiUrl: TRANSLATION_API_URL });
    res.json({ success: true, translatedText: list[0], translatedTexts: list, source, target, provider, warning: warning || undefined });
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
});

// Open http://localhost:5000/api/translate/check in the browser to test translation quickly.
app.get("/api/translate/check", async (req, res) => {
  const started = Date.now();
  try {
    const { list, provider, warning } = await translateTexts({ texts: ["Hello, how are you?"], target: String(req.query.target || "mr"), source: "en", apiKey: TRANSLATION_API_KEY, apiUrl: TRANSLATION_API_URL });
    res.json({ ok: true, provider, keyConfigured: Boolean(TRANSLATION_API_KEY), warning: warning || undefined, result: list[0], ms: Date.now() - started });
  } catch (err) {
    res.status(502).json({ ok: false, keyConfigured: Boolean(TRANSLATION_API_KEY), error: err.message, ms: Date.now() - started });
  }
});

app.use("/api/protected", authRequired);

app.get("/api/animals", authRequired, async (req, res) => {
  try { res.json(await Animal.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/animals", authRequired, requireRole("Farmer","Veterinarian"), async (req, res) => {
  try { res.status(201).json(await Animal.create(req.body)); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

app.get("/api/reports", authRequired, async (req, res) => {
  try { res.json(await HealthReport.find().sort({ createdAt: -1 }).limit(1000)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/reports", authRequired, requireRole("Farmer","Veterinarian"), async (req, res) => {
  try {
    const { animalId, symptoms = [], photoUrl = "", aiPrediction = null, location = null } = req.body || {};
    if (!animalId || (!Array.isArray(symptoms) && !aiPrediction)) return res.status(400).json({ message: "animalId and symptoms or AI prediction are required" });
    const risk = calculateRisk(Array.isArray(symptoms) ? symptoms : []);
    const safeLocation = parseLocation(location);
    const disease = aiPrediction?.disease || "";
    const report = await HealthReport.create({
      animalId, symptoms: Array.isArray(symptoms) ? symptoms : [], photoUrl,
      aiPrediction, disease, location: safeLocation, ...risk
    });
    if (risk.riskLevel === "High" || (aiPrediction && Number(aiPrediction.confidence || 0) >= 55)) {
      await Alert.create({ animalId, type: "Health Alert", message: `Potential livestock health case: ${disease || "high-risk symptoms"}.`, riskLevel: risk.riskLevel, disease, location: safeLocation });
    }
    const hotspot = await getHotspotSummary();
    res.status(201).json({ report, hotspot: hotspot.find(x => x.disease === disease || cleanDisease(x.disease) === cleanDisease(disease)) || null });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.get("/api/alerts", authRequired, async (req, res) => {
  try { res.json(await Alert.find().sort({ createdAt: -1 }).limit(500)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

async function getHotspotSummary() {
  const since = new Date(Date.now() - HOTSPOT_DAYS * 24 * 60 * 60 * 1000);
  const reports = await HealthReport.find({ createdAt: { $gte: since } }).lean();
  const groups = new Map();
  for (const r of reports) {
    const loc = r.location || {};
    const disease = diseaseFromReport(r);
    const key = `${cleanDisease(disease)}__${makeAreaKey(loc).toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { disease, area: areaFromLocation(loc), areaKey: makeAreaKey(loc), cases: 0, locations: [], reports: [] });
    const g = groups.get(key);
    g.cases += 1;
    if (Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lon))) g.locations.push({ lat: Number(loc.lat), lon: Number(loc.lon), accuracy: loc.accuracy, animalId: r.animalId, createdAt: r.createdAt });
    g.reports.push(r._id);
  }
  return [...groups.values()].map(g => ({
    ...g,
    status: g.cases >= INFECTED_ZONE_CASE_THRESHOLD ? "INFECTED_ZONE" : g.cases >= HOTSPOT_CASE_THRESHOLD ? "HOTSPOT" : "MONITOR",
    officialDeclaration: false,
    note: "System-generated surveillance alert; official outbreak/zone declaration requires veterinary or government confirmation."
  })).sort((a,b) => b.cases - a.cases);
}

app.get("/api/hotspots", authRequired, requireRole("Veterinarian","Government"), async (req, res) => {
  try { res.json({ success: true, windowDays: HOTSPOT_DAYS, hotspotThreshold: HOTSPOT_CASE_THRESHOLD, infectedZoneThreshold: INFECTED_ZONE_CASE_THRESHOLD, groups: await getHotspotSummary() }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/dashboard/live", authRequired, requireRole("Veterinarian","Government","Farmer"), async (req, res) => {
  try {
    const [reports, animals, alerts, groups] = await Promise.all([
      HealthReport.find().sort({ createdAt: -1 }).limit(1000).lean(),
      Animal.countDocuments(), Alert.find().sort({ createdAt: -1 }).limit(100).lean(), getHotspotSummary()
    ]);
    const high = reports.filter(r => r.riskLevel === "High").length;
    const medium = reports.filter(r => r.riskLevel === "Medium").length;
    const low = reports.filter(r => r.riskLevel === "Low").length;
    const markers = reports.filter(r => Number.isFinite(Number(r.location?.lat)) && Number.isFinite(Number(r.location?.lon))).map(r => ({
      id: String(r._id), animalId: r.animalId, disease: diseaseFromReport(r), riskLevel: r.riskLevel, riskScore: r.riskScore,
      lat: Number(r.location.lat), lon: Number(r.location.lon), accuracy: r.location.accuracy, area: areaFromLocation(r.location),
      address: r.location.address || "", createdAt: r.createdAt
    }));
    res.json({ success: true, generatedAt: new Date().toISOString(), totalAnimals: animals, totalReports: reports.length, highRiskCases: high, mediumRiskCases: medium, lowRiskCases: low, affectedAreas: new Set(reports.map(r => makeAreaKey(r.location || {}))).size, markers, hotspots: groups, recentAlerts: alerts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/dashboard", authRequired, requireRole("Veterinarian","Government","Farmer"), async (req, res) => {
  try {
    const data = await fetch(`http://127.0.0.1:${PORT}/api/dashboard/live`).then(r => r.json());
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ---------- Extended livestock management ----------
const Breeding = mongoose.models.Breeding || mongoose.model("Breeding", new mongoose.Schema({
  animalId:{type:String,required:true}, breed:String, heatDetectedDate:Date, aiDate:Date,
  pregnancyStatus:{type:String,default:"Unknown"}, expectedDeliveryDate:Date, vetVerified:{type:Boolean,default:false},
  recommendation:String, notes:String
},{timestamps:true}));
const Vaccination = mongoose.models.Vaccination || mongoose.model("Vaccination", new mongoose.Schema({
  animalId:{type:String,required:true}, vaccine:String, dueDate:Date, givenDate:Date, status:{type:String,default:"Scheduled"}, notes:String
},{timestamps:true}));
const Treatment = mongoose.models.Treatment || mongoose.model("Treatment", new mongoose.Schema({
  animalId:{type:String,required:true}, diagnosis:String, medicine:String, treatmentDate:Date, followUpDate:Date,
  vetName:String, notes:String, status:{type:String,default:"Active"}
},{timestamps:true}));
const LabReferral = mongoose.models.LabReferral || mongoose.model("LabReferral", new mongoose.Schema({
  animalId:{type:String,required:true}, reportId:String, sampleType:String, reason:String, referralDate:Date,
  labName:String, status:{type:String,default:"Pending"}, result:String
},{timestamps:true}));

function breedingRecommendation(animal={}){
  const age=Number(animal.age||0), gender=String(animal.gender||"").toLowerCase();
  if(gender && gender!=="female") return "Breeding recommendation is mainly applicable to female animals; consult a veterinarian.";
  if(age>0 && age<2) return "Animal is young. Follow breed-specific maturity guidance and veterinary advice before breeding.";
  if(animal.medicalHistory) return "Review medical history and obtain veterinary health clearance before breeding.";
  if(animal.breeding?.pregnancyStatus==="Pregnant") return "Pregnancy is recorded. Monitor expected delivery date with a veterinarian.";
  return "Check heat signs, breed suitability and health status; veterinary confirmation is recommended before insemination.";
}
app.get("/api/breeding", authRequired, requireRole("Farmer","Veterinarian","Government"), async (req,res)=>{ try{res.json(await Breeding.find().sort({createdAt:-1}).limit(1000));}catch(e){res.status(500).json({message:e.message});} });
app.post("/api/breeding", authRequired, requireRole("Farmer","Veterinarian"), async (req,res)=>{ try{
  const a=await Animal.findOne({animalId:req.body.animalId}); if(!a)return res.status(404).json({message:"Animal not found"});
  const recommendation=breedingRecommendation(a);
  const record=await Breeding.create({...req.body,recommendation});
  await Animal.updateOne({animalId:a.animalId},{$set:{breeding:{breed:req.body.breed||"",lastHeatDate:req.body.heatDetectedDate||null,inseminationDate:req.body.aiDate||null,pregnancyStatus:req.body.pregnancyStatus||"Unknown",expectedDeliveryDate:req.body.expectedDeliveryDate||null,lastCalvingDate:req.body.lastCalvingDate||null,numberOfCalves:Number(req.body.numberOfCalves||0),vetVerified:false}}});
  res.status(201).json(record);
}catch(e){res.status(400).json({message:e.message});} });
app.get("/api/vaccinations", authRequired, requireRole("Farmer","Veterinarian"), async(req,res)=>{try{res.json(await Vaccination.find().sort({dueDate:1}).limit(2000));}catch(e){res.status(500).json({message:e.message});}});
app.post("/api/vaccinations", authRequired, requireRole("Farmer","Veterinarian"), async(req,res)=>{try{res.status(201).json(await Vaccination.create(req.body));}catch(e){res.status(400).json({message:e.message});}});
app.get("/api/treatments", authRequired, requireRole("Farmer","Veterinarian"), async(req,res)=>{try{res.json(await Treatment.find().sort({createdAt:-1}).limit(2000));}catch(e){res.status(500).json({message:e.message});}});
app.post("/api/treatments", authRequired, requireRole("Farmer","Veterinarian"), async(req,res)=>{try{res.status(201).json(await Treatment.create(req.body));}catch(e){res.status(400).json({message:e.message});}});
app.get("/api/lab-referrals", authRequired, requireRole("Veterinarian"), async(req,res)=>{try{res.json(await LabReferral.find().sort({createdAt:-1}).limit(2000));}catch(e){res.status(500).json({message:e.message});}});
app.post("/api/lab-referrals", authRequired, requireRole("Veterinarian"), async(req,res)=>{try{res.status(201).json(await LabReferral.create(req.body));}catch(e){res.status(400).json({message:e.message});}});
app.patch("/api/reports/:id/verify", authRequired, requireRole("Veterinarian","Government"), async(req,res)=>{
  try{const r=await HealthReport.findByIdAndUpdate(req.params.id,{status:req.body.status||"Verified"},{new:true}); if(!r)return res.status(404).json({message:"Case not found"}); res.json(r);}
  catch(e){res.status(400).json({message:e.message});}
});
app.get("/api/dashboard/management", authRequired, requireRole("Farmer","Veterinarian","Government"), async(req,res)=>{
  try{
    const [breeding,vaccinations,treatments,labs]=await Promise.all([
      Breeding.find().lean(),Vaccination.find().lean(),Treatment.find().lean(),LabReferral.find().lean()
    ]);
    res.json({
      breedingTotal:breeding.length,
      pregnant:breeding.filter(x=>x.pregnancyStatus==="Pregnant").length,
      aiCases:breeding.filter(x=>x.aiDate).length,
      dueDeliveries:breeding.filter(x=>x.expectedDeliveryDate && new Date(x.expectedDeliveryDate)>=new Date()).length,
      vaccinationTotal:vaccinations.length,
      vaccinationCompleted:vaccinations.filter(x=>String(x.status).toLowerCase()==="completed"||x.givenDate).length,
      vaccinationDue:vaccinations.filter(x=>String(x.status).toLowerCase()==="due").length,
      treatments:treatments.length, labReferrals:labs.length, pendingLabs:labs.filter(x=>String(x.status).toLowerCase()==="pending").length
    });
  }catch(e){res.status(500).json({message:e.message});}
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
