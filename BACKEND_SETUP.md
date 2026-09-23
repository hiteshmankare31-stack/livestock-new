# Smart Livestock - Backend Setup (SIH Demo)

## How the system works

Frontend (HTML/CSS/JS) -> Node.js/Express API -> MongoDB

The optional AI service is: Frontend -> Node API -> Python AI service.

### 1. Start MongoDB
Install MongoDB Community Server and keep the local MongoDB service running. The project uses:
`mongodb://127.0.0.1:27017/smart_livestock`

### 2. Start backend
Double-click `START_BACKEND.bat`. The API runs at `http://localhost:5000`.

Check `http://localhost:5000/api/health` in the browser.

### 3. Start frontend
Double-click `START_DEMO.bat` (recommended). It starts the backend, a simple frontend server on port 5500, and opens the app.

### Demo login
- Farmer: any name, no password.
- Veterinarian: `Vet@2026#SL` (the demo button sends it automatically).
- Government: `Gov@2026#SL` (the demo button sends it automatically).

For a real deployment, never expose passwords in frontend code; keep them only in environment variables and use proper user accounts/hashed passwords.

## Backend data flow

1. Farmer registers an animal -> POST `/api/animals` -> MongoDB `animals`.
2. Farmer reports symptoms -> POST `/api/reports` -> MongoDB `healthreports`.
3. Risk engine evaluates symptoms and creates/updates alerts.
4. Veterinarian reviews the report and can verify it.
5. Government dashboard reads aggregated reports/hotspots and shows geographic trends.
6. AI image screening can call the Python AI service when it is running; otherwise the app records the case for veterinary review.

The frontend also has a browser-only demo fallback, so the UI can be demonstrated even when Node/MongoDB are not running. With the backend running, real JWT authentication and database APIs are used.
