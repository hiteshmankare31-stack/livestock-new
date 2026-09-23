// Loads the CSV dataset (../dataset/*.csv) into MongoDB so the dashboards show data.
//
//   node seed_dataset.js            # load (stops if the dataset was already loaded)
//   node seed_dataset.js --reset    # delete the dataset's animals (DS001, DS002 ...) and their records, then load again
//
// Only records whose animalId starts with "DS" are ever touched - your own animals are never deleted.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DIR = path.join(__dirname, "..", "dataset");
const PRETTY = { Healthy: "", Lumpy_Skin_Disease: "Lumpy Skin Disease", Mastitis: "Mastitis", Foot_Mouth_Disease: "Foot-and-Mouth Disease", Ringworm: "Ringworm" };
const SAMPLE = { Lumpy_Skin_Disease: "Skin nodule biopsy / scab", Foot_Mouth_Disease: "Vesicular fluid / epithelium", Mastitis: "Milk sample", Ringworm: "Skin scraping" };

// Small CSV parser (handles quoted fields, commas and quotes inside quotes, \r\n).
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
const read = f => parseCSV(fs.readFileSync(path.join(DIR, f), "utf8"));
const day = s => (s ? new Date(s + "T09:00:00.000Z") : null);
const list = s => (s ? s.split(";").map(x => x.trim()).filter(Boolean) : []);

function buildDocs() {
  const H = read("animal_health_records.csv"), V = read("vaccination_records.csv"), T = read("treatment_records.csv"), L = read("disease_location_records.csv");
  const locByRecord = new Map(L.map(l => [l.health_record_id, l]));

  const byAnimal = new Map();                       // latest record per animal = current profile
  H.forEach(r => { const p = byAnimal.get(r.animal_id); if (!p || r.report_date >= p.report_date) byAnimal.set(r.animal_id, r); });
  const vaccByAnimal = {}; V.forEach(v => { (vaccByAnimal[v.animal_id] ||= []).push(v); });
  const diseasesByAnimal = {}; H.forEach(r => { if (r.disease !== "Healthy") (diseasesByAnimal[r.animal_id] ||= new Set()).add(PRETTY[r.disease]); });

  const animals = [...byAnimal.values()].map(r => ({
    animalId: r.animal_id, species: r.species, age: Number(r.age_years), gender: r.gender, ownerName: r.owner_name,
    vaccinationHistory: (vaccByAnimal[r.animal_id] || []).filter(v => v.date_given).map(v => `${v.vaccine} ${v.date_given}`).join("; "),
    medicalHistory: [...(diseasesByAnimal[r.animal_id] || [])].join("; "),
    breeding: { breed: r.breed, pregnancyStatus: "Unknown", numberOfCalves: 0, vetVerified: false }
  }));

  const reports = [], alerts = [];
  H.forEach(r => {
    const l = locByRecord.get(r.record_id);
    const location = l ? { lat: Number(l.latitude), lon: Number(l.longitude), accuracy: Number(l.gps_accuracy_m), village: l.village, taluka: l.taluka,
      district: l.district, state: l.state, country: "India", capturedAt: day(l.reported_date) } : null;
    const createdAt = day(r.report_date);
    reports.push({ animalId: r.animal_id, symptoms: list(r.symptoms), disease: PRETTY[r.disease], location, riskLevel: r.risk_level, riskScore: Number(r.risk_score),
      possibleRisks: list(r.possible_risks), recommendation: r.recommendation, status: r.status, createdAt, updatedAt: createdAt });
    if (r.risk_level === "High" && r.disease !== "Healthy")
      alerts.push({ animalId: r.animal_id, type: "Health Alert", message: `${PRETTY[r.disease]} suspected in ${r.village}, ${r.taluka}`, riskLevel: "High",
        disease: PRETTY[r.disease], location, read: r.status === "Verified", createdAt, updatedAt: createdAt });
  });

  const vaccinations = V.map(v => ({ animalId: v.animal_id, vaccine: `${v.vaccine} - ${v.disease_covered}`, dueDate: day(v.next_due_date), givenDate: day(v.date_given),
    status: v.status, notes: [v.batch_number && `Batch ${v.batch_number}`, v.administered_by, v.schedule].filter(Boolean).join(" | ") }));

  const treatments = T.map(t => ({ animalId: t.animal_id, diagnosis: PRETTY[t.disease] || "Routine preventive care", medicine: t.medicine, treatmentDate: day(t.treatment_start_date),
    followUpDate: day(t.followup_date), vetName: t.veterinarian, status: t.outcome === "Under treatment" ? "Active" : "Completed",
    notes: `Type: ${t.medicine_type}; Dose: ${t.dose}; Duration: ${t.duration_days} days; Isolation advised: ${t.isolation_advised}; Outcome: ${t.outcome}; Cost: INR ${t.cost_inr}` }));

  const labs = [], seen = new Set();
  T.filter(t => t.outcome === "Referred to lab" && !seen.has(t.health_record_id) && seen.add(t.health_record_id)).forEach(t => labs.push({
    animalId: t.animal_id, reportId: t.health_record_id, sampleType: SAMPLE[t.disease] || "Blood sample", reason: `Confirm suspected ${PRETTY[t.disease] || "condition"}`,
    referralDate: day(t.diagnosis_date), labName: "District Veterinary Lab (demo)", status: "Pending", result: "" }));

  return { animals, reports, alerts, vaccinations, treatments, labs };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const Animal = require("./models/Animal"), HealthReport = require("./models/HealthReport"), Alert = require("./models/Alert");
  // same collections/fields as in server.js (defined there inline, so declared again here safely)
  const S = mongoose.Schema, m = (n, def) => mongoose.models[n] || mongoose.model(n, new S(def, { timestamps: true }));
  const Vaccination = m("Vaccination", { animalId: String, vaccine: String, dueDate: Date, givenDate: Date, status: String, notes: String });
  const Treatment = m("Treatment", { animalId: String, diagnosis: String, medicine: String, treatmentDate: Date, followUpDate: Date, vetName: String, notes: String, status: String });
  const LabReferral = m("LabReferral", { animalId: String, reportId: String, sampleType: String, reason: String, referralDate: Date, labName: String, status: String, result: String });

  const d = buildDocs();
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_livestock", { serverSelectionTimeoutMS: 8000 });
  console.log("Connected to MongoDB");
  const ds = { animalId: /^DS\d+$/ };
  if (reset) {
    for (const M of [Animal, HealthReport, Alert, Vaccination, Treatment, LabReferral]) await M.deleteMany(ds);
    console.log("Old dataset records removed.");
  } else if (await Animal.countDocuments(ds)) {
    console.log("Dataset is already loaded. Run:  node seed_dataset.js --reset   to reload it.");
    return mongoose.disconnect();
  }
  const opt = { timestamps: false };                // keep the dates from the CSV
  await Animal.insertMany(d.animals);
  await HealthReport.insertMany(d.reports, opt); await Alert.insertMany(d.alerts, opt);
  await Vaccination.insertMany(d.vaccinations, opt); await Treatment.insertMany(d.treatments, opt); await LabReferral.insertMany(d.labs, opt);
  console.log(Object.entries(d).map(([k, v]) => `${k}: ${v.length}`).join(" | "));
  await mongoose.disconnect();
}

module.exports = { parseCSV, buildDocs };
if (require.main === module) main().catch(e => { console.error("Seed failed:", e.message); process.exit(1); });
