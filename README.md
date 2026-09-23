## Quick SIH demo
1. Double-click `START_DEMO.bat`.
2. Open `http://localhost:5500`.
3. Farmer needs only a name. Vet/Government demo passwords are auto-used.

For backend/database setup see `BACKEND_SETUP.md`.

# Smart Livestock Professional

## Upgraded features
- Real AI disease inference service with Hugging Face model loading. Model weights are not required in the source ZIP. The service downloads the configured remote model on first use, or uses a locally trained model if you train one.
- High-accuracy browser GPS capture with `enableHighAccuracy`, fresh location per case, GPS accuracy in metres, and reverse geocoding to village/taluka/district.
- MongoDB persistence for cases, AI predictions and locations, with browser localStorage fallback for demo/offline use. Animal registration now syncs to the backend when available and report lookup checks both backend and local records.
- Near-real-time veterinarian/government surveillance dashboard: refreshes every 10 seconds and shows case markers on a Leaflet/OpenStreetMap map.
- Disease clustering by village/taluka/district. Default system alert: 3+ cases of the same disease in the same area within 7 days = HOTSPOT; 5+ = INFECTED ZONE alert. These are surveillance alerts, not an official government declaration until confirmed by authorised veterinary/government staff.
- Multilingual UI choices and a Google Cloud Translation API endpoint for a large language range. Add the API key in `.env`. Browser speech recognition/voice availability still depends on the device/browser.

## Run

### Browser-only demo (no MongoDB/AI server required)
Serve the `frontend/` folder with VS Code Live Server and open `index.html`. Animal registration, report storage, GPS handling, photo validation and symptom-based screening work locally. If the Node/AI services are unavailable, the UI automatically falls back to offline mode instead of showing `Failed to fetch`.

1. Start MongoDB.
2. Backend: `cd backend`, `npm install`, copy `.env.example` to `.env`, configure values, then `npm start`.
3. AI service: `pip install -r ai_requirements.txt`, then `uvicorn ai_service:app --host 127.0.0.1 --port 8001`.
4. Serve `frontend/` from a local web server (not `file://`) so camera/GPS permissions work reliably.

## AI model
The default remote screening model is `xprotocol/EfficientNet-B3-Cattle-Disease` with three classes: `foot-and-mouth`, `healthy`, and `lumpy`. If a locally trained `backend/ai_service/model/cattle_disease_efficientnet_b0.pt` exists, the AI service uses that model first; otherwise it falls back to the remote model. Do not treat an AI output as a confirmed veterinary diagnosis.


## Surveillance Upgrade Contract

See `docs/SURVEILLANCE_UPGRADE_CONTRACT.md` for the required production behavior: real device GPS, truthful AI status, reverse geocoding, multilingual i18n/voice, realtime government/veterinarian surveillance, configurable hotspot detection, role-based verification, and privacy/security requirements.

## AI model training
The project now includes a local EfficientNet-B0 training pipeline under `backend/ml/`. Run `python backend/ml/download_datasets.py`, then `python backend/ml/train_model.py --epochs 5 --freeze-backbone`. After training, the generated model is automatically detected by `backend/ai_service.py` and served through the existing `/api/ai/predict` flow.

## Important: image disease detection

The browser's MobileNet is only an animal-photo validator; it is **not** the
lumpy-disease classifier. The disease classifier is the server-side
`xprotocol/EfficientNet-B3-Cattle-Disease` model, which has three classes:
`foot-and-mouth`, `healthy`, and `lumpy`.

Start the AI service before testing disease detection:

```bat
START_AI.bat
```

Then serve `frontend/` with Live Server. The first AI prediction downloads and
caches the model from Hugging Face, so internet access is required once.

If the AI service is not running, the app will **not invent a disease name**.
It will explicitly say that the photo was saved and that image diagnosis is
unavailable.


## SIH final modules added

- Farmer: animal registration, disease screening, GPS, breeding, vaccination, treatment and offline queue/sync.
- Veterinarian: case verification, treatment records, lab referral and farmer contact.
- Government: live geospatial case map, disease/area/risk filters, potential hotspot alerts and management statistics.
- Multilingual: English is the single source text. Marathi, Hindi and all other selected languages are translated at runtime through the backend Google Cloud Translation API. Configure `TRANSLATION_API_KEY` in `backend/.env`.
- Hotspot language is intentionally non-official: Potential Hotspot / Infected Zone / Under Verification. Veterinary or government staff must verify an affected area.


## AI Model Training (SIH Demo)
The project includes a reproducible EfficientNet-B0 training pipeline. Dataset images are not bundled; download/prepare the permitted datasets locally first.

### Windows steps
1. Open Command Prompt in the project folder.
2. Create environment: `python -m venv .venv`
3. Activate: `.venv\Scripts\activate`
4. Install AI packages: `pip install -r backend/ai_requirements.txt`
5. Download/prepare datasets: `python backend/ml/download_datasets.py`
6. Train the model: `python backend/ml/train_model.py --epochs 5 --freeze-backbone`
7. For a stronger model, use more epochs after confirming the pipeline works, e.g. `--epochs 10`.
8. The trained weights are saved under `backend/ai_service/model/` and the AI service automatically prefers the local trained model when present.

### Login behavior

- **Farmer:** enter the farmer name and click **Continue as Farmer**. No password is required in this prototype. A JWT session is still created for protected API access.
- **Veterinarian / Government:** enter name + role password from `backend/.env`.
- This farmer quick-access mode is intended for the SIH prototype/demo; production deployment should use real user accounts and stronger identity verification.

## Security implemented
- JWT authentication for login sessions.
- Role-based API access for Farmer, Veterinarian and Government.
- Helmet security headers.
- API and login rate limiting.
- CORS restricted through `FRONTEND_ORIGIN`.
- Translation API key remains on the backend; it is never placed in HTML/JavaScript.
- Password/secret values are configured through `backend/.env`, not hard-coded in frontend files.

Before demo: copy `backend/.env.example` to `backend/.env`, set a strong `JWT_SECRET`, role passwords (`FARMER_PASSWORD`, `VET_PASSWORD`, `GOV_PASSWORD`), `FRONTEND_ORIGIN`, MongoDB URI and Google Translation API key.
