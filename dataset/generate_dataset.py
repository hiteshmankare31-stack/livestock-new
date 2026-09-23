"""Generates the SYNTHETIC demo CSV dataset for Smart Livestock.

    python dataset/generate_dataset.py            # 240 animals (default)
    python dataset/generate_dataset.py --animals 500 --seed 7

All records are artificially generated for demo / testing / dashboard development.
They are NOT real animals, owners or veterinary records.
Symptom names, risk score/level and disease names match the app (backend/utils/riskEngine.js).
"""
import argparse, csv, random
from datetime import date, timedelta
from pathlib import Path

TODAY = date(2026, 9, 21)
OUT = Path(__file__).resolve().parent

DISEASES = ["Healthy", "Lumpy_Skin_Disease", "Mastitis", "Foot_Mouth_Disease", "Ringworm"]  # = Disease_Images/<folder>
DISEASE_WEIGHTS = [34, 21, 19, 14, 12]

# (village, taluka, district, lat, lon)  - approximate centre points, Maharashtra
PLACES = [
    ("Baramati", "Baramati", "Pune", 18.151, 74.577), ("Junnar", "Junnar", "Pune", 19.209, 73.875),
    ("Shirur", "Shirur", "Pune", 18.827, 74.376), ("Sinnar", "Sinnar", "Nashik", 19.848, 73.998),
    ("Niphad", "Niphad", "Nashik", 20.083, 74.109), ("Karad", "Karad", "Satara", 17.289, 74.182),
    ("Phaltan", "Phaltan", "Satara", 17.992, 74.430), ("Kagal", "Kagal", "Kolhapur", 16.573, 74.315),
    ("Shirol", "Shirol", "Kolhapur", 16.742, 74.602), ("Miraj", "Miraj", "Sangli", 16.826, 74.646),
    ("Sangamner", "Sangamner", "Ahmednagar", 19.567, 74.211), ("Rahuri", "Rahuri", "Ahmednagar", 19.391, 74.650),
    ("Pandharpur", "Pandharpur", "Solapur", 17.679, 75.332), ("Hingna", "Hingna", "Nagpur", 21.030, 78.990),
    ("Kamptee", "Kamptee", "Nagpur", 21.229, 79.196),
]
# where each disease clusters (relative weight per place index) -> creates realistic hotspots
CLUSTER = {
    "Lumpy_Skin_Disease": {7: 9, 8: 9, 9: 7, 5: 5, 6: 3, 0: 2},
    "Foot_Mouth_Disease": {3: 8, 4: 8, 10: 6, 11: 5, 12: 2},
    "Mastitis": {0: 6, 1: 4, 2: 4, 5: 4, 6: 5, 7: 3, 13: 2},
}
FIRST = ["Ramesh", "Suresh", "Ganesh", "Sunita", "Anita", "Vijay", "Prakash", "Sanjay", "Meena", "Rajesh", "Kavita",
         "Dattatray", "Shivaji", "Bhagwan", "Lata", "Sachin", "Nitin", "Mangal", "Sopan", "Balasaheb"]
LAST = ["Patil", "Jadhav", "Shinde", "Pawar", "More", "Gaikwad", "Kale", "Deshmukh", "Kadam", "Bhosale", "Chavan", "Salunkhe"]
VETS = ["Dr. A. Kulkarni", "Dr. S. Joshi", "Dr. R. Deshpande", "Dr. P. Naik", "Dr. M. Sawant", "Dr. V. Thorat"]
BREEDS = {"Cow": ["Gir", "Sahiwal", "Holstein Friesian", "Jersey", "Deoni", "Khillar", "Red Kandhari", "Crossbred"],
          "Buffalo": ["Murrah", "Jaffarabadi", "Pandharpuri", "Nili-Ravi"],
          "Goat": ["Osmanabadi", "Sirohi"], "Sheep": ["Deccani"]}
TEMP = {"Healthy": (38.0, 39.0), "Lumpy_Skin_Disease": (39.5, 41.0), "Mastitis": (39.2, 40.5),
        "Foot_Mouth_Disease": (39.8, 41.5), "Ringworm": (38.2, 39.2)}
# (symptom, probability)  - only the 6 symptoms the app offers
SYMPTOMS = {
    "Healthy": [],
    "Lumpy_Skin_Disease": [("skin problem", 1), ("fever", .85), ("loss of appetite", .6), ("reduced milk production", .55), ("weakness", .5)],
    "Mastitis": [("reduced milk production", 1), ("fever", .6), ("loss of appetite", .35), ("weakness", .3)],
    "Foot_Mouth_Disease": [("fever", .95), ("loss of appetite", .9), ("reduced milk production", .7), ("weakness", .6), ("skin problem", .3)],
    "Ringworm": [("skin problem", 1), ("loss of appetite", .05)],
}
SIGNS = {
    "Healthy": ["No abnormal signs; normal feeding and rumination", "Alert, normal gait, normal milk yield"],
    "Lumpy_Skin_Disease": ["Firm skin nodules 2-5 cm on neck, back and legs; enlarged lymph nodes",
                           "Multiple raised skin nodules, nasal discharge, swelling of legs",
                           "Skin nodules with scabs, reduced movement, watery eyes"],
    "Mastitis": ["Swollen hot painful udder; clotted or watery milk", "Hard quarter of udder, flakes in milk, kicks when milked",
                 "Udder swelling with reduced milk yield and mild fever"],
    "Foot_Mouth_Disease": ["Vesicles and erosions in mouth and between hooves; drooling; lameness",
                           "Excess salivation, smacking lips, blisters on tongue, reluctant to walk",
                           "Painful hooves, mouth ulcers, sudden drop in milk yield"],
    "Ringworm": ["Circular hairless scaly patches on face and neck", "Grey crusty round lesions around eyes, mild itching",
                 "Patchy hair loss with dry scales on shoulder"],
}
RECOMMEND = {"High": "Contact a veterinarian promptly and isolate the animal if advised by the veterinarian.",
             "Medium": "Monitor the animal closely and consider veterinary consultation.",
             "Low": "Continue preventive care and monitor for new symptoms."}
TREATMENTS = {  # (medicine, type, duration_days)   dose is intentionally NOT invented: a vet decides
    "Lumpy_Skin_Disease": [("Oxytetracycline (secondary infection)", "Antibiotic", 5), ("Meloxicam", "Anti-inflammatory", 3),
                           ("Antiseptic wound spray", "Topical", 10), ("Vitamin and mineral supplement", "Supportive", 14)],
    "Mastitis": [("Cloxacillin intramammary infusion", "Antibiotic", 5), ("Meloxicam", "Anti-inflammatory", 3),
                 ("Teat dip and udder hygiene", "Management", 14)],
    "Foot_Mouth_Disease": [("Potassium permanganate mouth and foot wash", "Antiseptic", 7), ("Oxytetracycline (secondary infection)", "Antibiotic", 5),
                           ("Soft feed and oral fluids", "Supportive", 10)],
    "Ringworm": [("Natamycin topical wash", "Antifungal", 14), ("Isolation and bedding disinfection", "Management", 14)],
    "Healthy": [("Deworming (routine)", "Preventive", 1), ("Mineral mixture supplement", "Preventive", 30)],
}
VACCINES = [("FMD", "Foot-and-Mouth Disease", 182), ("HS", "Haemorrhagic Septicaemia", 365), ("BQ", "Black Quarter", 365),
            ("Brucellosis", "Brucellosis", 0), ("LSD", "Lumpy Skin Disease", 365)]


def risk(symptoms):
    """Python port of backend/utils/riskEngine.js so scores match the app."""
    high = {"fever", "severe skin lesion", "skin problem", "loss of appetite", "swelling", "difficulty breathing"}
    med = {"cough", "weakness", "reduced milk production", "diarrhea"}
    score = sum(25 if s in high else 12 if s in med else 5 for s in symptoms)
    risks = []
    if "skin problem" in symptoms: risks.append("Skin-related infection risk")
    if "fever" in symptoms and "loss of appetite" in symptoms: risks.append("Systemic illness risk")
    if "cough" in symptoms or "difficulty breathing" in symptoms: risks.append("Respiratory illness risk")
    if not risks: risks.append("General health concern")
    score = min(score, 100)
    return score, ("High" if score >= 50 else "Medium" if score >= 25 else "Low"), risks


def pick_place(rng, disease):
    w = CLUSTER.get(disease)
    idx = rng.choices(list(w), list(w.values()))[0] if w else rng.randrange(len(PLACES))
    return PLACES[idx]


def rdate(rng, disease):
    start = date(2026, 5, 1)
    span = (TODAY - start).days
    # outbreaks are rising: bias towards recent weeks
    bias = 1.8 if disease in ("Lumpy_Skin_Disease", "Foot_Mouth_Disease") else 1.0
    return start + timedelta(days=int(span * (rng.random() ** (1 / bias))))


def write(name, header, rows):
    with open(OUT / name, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)
    print(f"{name:32s} {len(rows):5d} rows")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--animals", type=int, default=240); ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args(); rng = random.Random(a.seed)

    health, vacc, treat, loc = [], [], [], []
    hr = tr = vc = lc = 0
    for n in range(1, a.animals + 1):
        aid = f"DS{n:03d}" if a.animals < 1000 else f"DS{n:04d}"
        disease = rng.choices(DISEASES, DISEASE_WEIGHTS)[0]
        species = rng.choices(["Cow", "Buffalo", "Goat", "Sheep"], [62, 28, 6, 4])[0]
        if disease in ("Lumpy_Skin_Disease", "Foot_Mouth_Disease", "Mastitis"): species = rng.choices(["Cow", "Buffalo"], [70, 30])[0]
        if disease == "Ringworm" and species in ("Goat", "Sheep"): species = "Cow"
        gender = "Female" if (disease == "Mastitis" or rng.random() < .8) else "Male"
        breed = rng.choice(BREEDS[species]); age = round(rng.uniform(1.0, 11.0), 1) if disease != "Mastitis" else round(rng.uniform(3, 11), 1)
        weight = round(rng.uniform(280, 520) if species == "Cow" else rng.uniform(350, 620) if species == "Buffalo" else rng.uniform(25, 60), 0)
        owner = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        village, taluka, district, lat0, lon0 = pick_place(rng, disease)
        lat, lon = round(lat0 + rng.uniform(-.06, .06), 5), round(lon0 + rng.uniform(-.06, .06), 5)
        d0 = rdate(rng, disease)
        syms = [s for s, p in SYMPTOMS[disease] if rng.random() < p]
        if disease == "Ringworm" and not syms: syms = ["skin problem"]
        score, level, risks = risk(syms)
        lo, hi = TEMP[disease]; temp = round(rng.uniform(lo, hi), 1)
        status = rng.choices(["Open", "Verified", "Needs Review"], [40, 45, 15])[0] if disease != "Healthy" else "Verified"
        hr += 1; hid = f"HR{hr:04d}"
        health.append([hid, aid, species, breed, age, gender, int(weight), temp, ";".join(syms), rng.choice(SIGNS[disease]), disease,
                       score, level, ";".join(risks), RECOMMEND[level], status, d0.isoformat(), village, taluka, district, "Maharashtra", owner,
                       f"Disease_Images/{disease}"])
        # follow-up visit: most treated animals recover -> Healthy record
        outcome = "Recovered" if disease == "Healthy" else rng.choices(["Recovered", "Under treatment", "Referred to lab"], [62, 28, 10])[0]
        if disease != "Healthy" and outcome == "Recovered":
            d1 = d0 + timedelta(days=rng.randint(8, 21))
            if d1 <= TODAY:
                hr += 1
                health.append([f"HR{hr:04d}", aid, species, breed, age, gender, int(weight), round(rng.uniform(38.0, 39.0), 1), "", rng.choice(SIGNS["Healthy"]),
                               "Healthy", 0, "Low", "General health concern", RECOMMEND["Low"], "Verified", d1.isoformat(), village, taluka, district,
                               "Maharashtra", owner, "Disease_Images/Healthy"])
        # treatments
        vet = rng.choice(VETS)
        meds = TREATMENTS[disease] if disease != "Healthy" else ([rng.choice(TREATMENTS["Healthy"])] if rng.random() < .35 else [])
        for m, kind, days in meds:
            if disease != "Healthy" and rng.random() < .2 and kind in ("Supportive", "Management"): continue
            tr += 1
            treat.append([f"TR{tr:04d}", aid, hid, disease, d0.isoformat(), (d0 + timedelta(days=rng.randint(0, 1))).isoformat(), m, kind,
                          "As prescribed by veterinarian", days, vet, "Yes" if disease in ("Lumpy_Skin_Disease", "Foot_Mouth_Disease") else "No",
                          outcome, (d0 + timedelta(days=days + rng.randint(2, 7))).isoformat(), rng.randrange(250, 3600, 50)])
        # disease location (diseased animals only)
        if disease != "Healthy":
            lc += 1
            loc.append([f"LOC{lc:04d}", hid, aid, disease, lat, lon, rng.choice([8, 12, 15, 20, 25, 35, 50]), village, taluka, district,
                        "Maharashtra", d0.isoformat(), level])
        # vaccinations
        for code, covers, interval in VACCINES:
            if code == "Brucellosis" and not (gender == "Female" and age <= 3): continue
            if code == "LSD" and species not in ("Cow", "Buffalo"): continue
            if species in ("Goat", "Sheep") and code in ("BQ", "Brucellosis", "LSD"): continue
            p_vacc = .85
            if disease == "Lumpy_Skin_Disease" and code == "LSD": p_vacc = .15   # infected animals were mostly unvaccinated
            if disease == "Foot_Mouth_Disease" and code == "FMD": p_vacc = .25
            vc += 1
            if rng.random() > p_vacc:
                vacc.append([f"VC{vc:04d}", aid, code, covers, "", "", "", "", "Due", ""]); continue
            given = TODAY - timedelta(days=rng.randint(10, interval if interval else 400))
            nxt = given + timedelta(days=interval) if interval else None
            status = "Completed" if (nxt is None or (nxt - TODAY).days > 30) else ("Scheduled" if nxt > TODAY else "Due")
            vacc.append([f"VC{vc:04d}", aid, code, covers, given.isoformat(), nxt.isoformat() if nxt else "", f"{code}-{rng.randint(2501, 2612)}",
                         rng.choice(VETS), status, "One-time (calfhood)" if not interval else f"Every {interval // 30} months"])

    write("animal_health_records.csv",
          ["record_id", "animal_id", "species", "breed", "age_years", "gender", "weight_kg", "body_temperature_c", "symptoms", "clinical_signs",
           "disease", "risk_score", "risk_level", "possible_risks", "recommendation", "status", "report_date", "village", "taluka", "district",
           "state", "owner_name", "image_class_folder"], health)
    write("vaccination_records.csv",
          ["vaccination_id", "animal_id", "vaccine", "disease_covered", "date_given", "next_due_date", "batch_number", "administered_by", "status", "schedule"], vacc)
    write("treatment_records.csv",
          ["treatment_id", "animal_id", "health_record_id", "disease", "diagnosis_date", "treatment_start_date", "medicine", "medicine_type", "dose",
           "duration_days", "veterinarian", "isolation_advised", "outcome", "followup_date", "cost_inr"], treat)
    # cluster size = same disease, same taluka, within +-14 days
    for r in loc:
        d = date.fromisoformat(r[11])
        r.append(sum(1 for x in loc if x[3] == r[3] and x[8] == r[8] and abs((date.fromisoformat(x[11]) - d).days) <= 14))
    write("disease_location_records.csv",
          ["location_id", "health_record_id", "animal_id", "disease", "latitude", "longitude", "gps_accuracy_m", "village", "taluka", "district", "state",
           "reported_date", "risk_level", "cases_nearby_14d"], loc)


if __name__ == "__main__":
    main()
