# Smart Livestock Dataset

```
dataset/                              (on Windows "Dataset" and "dataset" are the same folder)
├── Disease_Images/
│   ├── Healthy/                      <- put real photos here (see README.txt in each folder)
│   ├── Lumpy_Skin_Disease/
│   ├── Mastitis/
│   ├── Foot_Mouth_Disease/
│   └── Ringworm/
├── animal_health_records.csv         health reports (symptoms, temperature, disease, risk)
├── vaccination_records.csv           vaccines given / due per animal
├── treatment_records.csv             medicines, vet, outcome, follow-up
├── disease_location_records.csv      GPS + village/taluka/district of every diseased case
├── classes.csv                       image class list
└── generate_dataset.py               regenerates the CSV files
```

## IMPORTANT - what is real and what is not
* **CSV files = SYNTHETIC demo data** (240 animals, 321 health records, 986 vaccinations, 485 treatments, 151 disease locations,
  Maharashtra, May-Sep 2026). Animals, owners and vets are invented. Use for demo / testing / dashboards only, never as real statistics.
* Symptoms use only the 6 symptoms of the app; `risk_score` / `risk_level` are computed with the same rules as `backend/utils/riskEngine.js`.
* Treatment `dose` is deliberately "As prescribed by veterinarian" - do not use this data as veterinary advice.
* **Images: Healthy (1807), Lumpy_Skin_Disease (1629) and Foot_Mouth_Disease (832, combining a Roboflow
  train/test/valid split with a second "Cows datasets" collection; COCO annotation files kept alongside for
  reference) are now populated.** `DATASET_SOURCES.md` lists their sources/licences. Mastitis and Ringworm
  are still empty - search Kaggle / Roboflow Universe / Mendeley and verify the licence before adding.

## Use the CSV data in the app (MongoDB)
```bat
cd backend
node seed_dataset.js            :: load
node seed_dataset.js --reset    :: delete dataset records (animalId DS...) and load again
```
Needs MongoDB running and `npm install` done. Animal IDs are `DS001...DS240`, so your own animals are never touched.
Log in through the backend (not demo mode) to see the data in the Farmer / Vet / Government dashboards.

## Use the images for AI training
1. Copy images into `Disease_Images/<Class>/`.
2. `python backend/ml/import_dataset_images.py`  (copies Healthy, Lumpy, FMD into `backend/datasets/train/`, skips duplicates)
3. `python backend/ml/train_model.py --epochs 5 --freeze-backbone`

The current AI model has **3 classes** (healthy, lumpy, fmd). Mastitis and Ringworm folders are ready, but using them needs the
model/`ai_service.py` changed to 5 classes and retrained.

## Make a bigger / different CSV set
`python dataset/generate_dataset.py --animals 500 --seed 7`
