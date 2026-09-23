/* Smart Livestock - Demo mode
   Uses browser localStorage instead of MongoDB so the project works without a database.
*/
let currentRole = "";

const STORAGE = {
  animals: "smartLivestock_animals",
  reports: "smartLivestock_reports",
  location: "smartLivestock_location"
};

function tr(key) {
  return (typeof t === "function" ? t(key) : key);
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================================================
   DEPLOYMENT API CONFIGURATION
   ========================================================= */

/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API_BASE = "https://livestock-new-v7ca.onrender.com";

window.SMART_LIVESTOCK_API_BASE = API_BASE;

/* =========================================================
   API HELPER
   ========================================================= */

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const config = {
    method: options.method || "GET",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  };

  if (options.body !== undefined) {
    config.body =
      options.body instanceof FormData
        ? options.body
        : typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
  }

  const token = localStorage.getItem("smartLivestockToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  const contentType = response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message ||
          data.error ||
          `Request failed: ${response.status}`
        : data || `Request failed: ${response.status}`;

    throw new Error(message);
  }

  return data;
}

/* =========================================================
   API HELPER
   ========================================================= */

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const config = {
    method: options.method || "GET",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  };

  if (options.body !== undefined) {
    config.body =
      options.body instanceof FormData
        ? options.body
        : typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
  }

  const token = localStorage.getItem("smartLivestockToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  const contentType = response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error || `Request failed: ${response.status}`
        : data || `Request failed: ${response.status}`;

    throw new Error(message);
  }

  return data;
}

/* =========================================================
   SAFE FETCH / BACKEND STATUS
   ========================================================= */

async function checkBackendConnection() {
  try {
    const result = await api("/api/health");
    return {
      ok: true,
      data: result
    };
  } catch (error) {
    console.error("Backend connection failed:", error);

    return {
      ok: false,
      error
    };
  }
}

/* =========================================================
   TRANSLATION
   ========================================================= */

async function translateText(text, targetLanguage) {
  if (!text || !targetLanguage) return text;

  try {
    const result = await api("/api/translate", {
      method: "POST",
      body: {
        texts: [text],
        targetLanguage
      }
    });

    if (
      result &&
      Array.isArray(result.translations) &&
      result.translations.length
    ) {
      return result.translations[0];
    }

    return text;
  } catch (error) {
    console.error("Translation failed:", error);

    throw new Error(
      `Translation failed: cannot reach the backend at ${API_BASE}.`
    );
  }
}

/* =========================================================
   AUTH
   ========================================================= */

async function loginUser(role, password) {
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: {
        role,
        password
      }
    });

    if (result && result.token) {
      localStorage.setItem("smartLivestockToken", result.token);
    }

    currentRole = role;

    return result;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

function logoutUser() {
  localStorage.removeItem("smartLivestockToken");
  currentRole = "";
}

/* =========================================================
   ANIMAL STORAGE
   ========================================================= */

function getAnimals() {
  return read(STORAGE.animals);
}

function saveAnimals(animals) {
  write(STORAGE.animals, animals);
}

function getReports() {
  return read(STORAGE.reports);
}

function saveReports(reports) {
  write(STORAGE.reports, reports);
}

/* =========================================================
   ANIMAL REGISTRATION
   ========================================================= */

async function registerAnimal(animalData) {
  try {
    const result = await api("/api/animals", {
      method: "POST",
      body: animalData
    });

    return result;
  } catch (error) {
    console.warn(
      "Backend animal registration failed. Using local storage.",
      error
    );

    const animals = getAnimals();

    const animal = {
      ...animalData,
      id: animalData.id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    animals.push(animal);
    saveAnimals(animals);

    return animal;
  }
}

/* =========================================================
   SYMPTOM REPORT
   ========================================================= */

async function submitHealthReport(reportData) {
  try {
    const result = await api("/api/reports", {
      method: "POST",
      body: reportData
    });

    return result;
  } catch (error) {
    console.warn(
      "Backend report submission failed. Using local storage.",
      error
    );

    const reports = getReports();

    const report = {
      ...reportData,
      id: reportData.id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    reports.push(report);
    saveReports(reports);

    return report;
  }
}

/* =========================================================
   AI DISEASE PREDICTION
   ========================================================= */

async function predictDisease(file, options = {}) {
  if (!file) {
    throw new Error("Please select an animal image.");
  }

  const formData = new FormData();

  formData.append("image", file);

  if (options.animalId) {
    formData.append("animalId", options.animalId);
  }

  if (options.symptoms) {
    formData.append("symptoms", options.symptoms);
  }

  try {
    const result = await api("/api/ai/predict", {
      method: "POST",
      body: formData
    });

    return result;
  } catch (error) {
    console.error("AI prediction failed:", error);
    throw error;
  }
}

/* =========================================================
   AI CALL COMPATIBILITY
   ========================================================= */

async function callAI(file, options = {}) {
  return predictDisease(file, options);
}

/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

function getSelectedImageFile(input) {
  if (!input || !input.files || !input.files.length) {
    return null;
  }

  return input.files[0];
}

function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      message: "Please select an image."
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      valid: false,
      message: "Please select a valid image file."
    };
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    return {
      valid: false,
      message: "Image size must be less than 10 MB."
    };
  }

  return {
    valid: true
  };
}

/* =========================================================
   IMAGE PREVIEW
   ========================================================= */

function previewImage(file, previewElement) {
  if (!file || !previewElement) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    previewElement.src = event.target.result;
    previewElement.style.display = "block";
  };

  reader.readAsDataURL(file);
}

/* =========================================================
   DISEASE RESULT NORMALIZATION
   ========================================================= */

function normalizeDiseaseResult(result) {
  if (!result) {
    return {
      disease: "Unknown",
      confidence: 0
    };
  }

  const disease =
    result.disease ||
    result.prediction ||
    result.predicted_class ||
    result.class_name ||
    result.label ||
    result.name ||
    "Unknown";

  let confidence =
    result.confidence ??
    result.probability ??
    result.score ??
    0;

  if (typeof confidence === "string") {
    confidence = parseFloat(confidence);
  }

  if (confidence <= 1) {
    confidence *= 100;
  }

  return {
    disease,
    confidence: Math.round(confidence * 100) / 100,
    raw: result
  };
}

/* =========================================================
   RISK LEVEL
   ========================================================= */

function getRiskLevel(disease, confidence = 0) {
  const value = String(disease || "").toLowerCase();

  if (
    value.includes("lumpy") ||
    value.includes("foot") ||
    value.includes("fmd")
  ) {
    if (confidence >= 80) {
      return "High";
    }

    return "Medium";
  }

  if (value.includes("healthy")) {
    return "Low";
  }

  return confidence >= 80 ? "Medium" : "Low";
}

/* =========================================================
   DASHBOARD DATA
   ========================================================= */

async function loadDashboardData() {
  try {
    return await api("/api/dashboard");
  } catch (error) {
    console.warn(
      "Dashboard API unavailable. Loading local data.",
      error
    );

    const animals = getAnimals();
    const reports = getReports();

    return {
      animals,
      reports,
      alerts: []
    };
  }
}

/* =========================================================
   ALERTS
   ========================================================= */

async function loadAlerts() {
  try {
    return await api("/api/alerts");
  } catch (error) {
    console.warn("Unable to load alerts:", error);
    return [];
  }
}

/* =========================================================
   LOCATION
   ========================================================= */

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        localStorage.setItem(
          STORAGE.location,
          JSON.stringify(location)
        );

        resolve(location);
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
}

/* =========================================================
   SAVED LOCATION
   ========================================================= */

function getSavedLocation() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE.location) || "null"
    );
  } catch {
    return null;
  }
}

/* =========================================================
   VACCINATION
   ========================================================= */

async function loadVaccinations() {
  try {
    return await api("/api/vaccinations");
  } catch (error) {
    console.warn("Unable to load vaccinations:", error);
    return [];
  }
}

/* =========================================================
   TREATMENTS
   ========================================================= */

async function loadTreatments() {
  try {
    return await api("/api/treatments");
  } catch (error) {
    console.warn("Unable to load treatments:", error);
    return [];
  }
}

/* =========================================================
   BREEDING
   ========================================================= */

async function loadBreedingRecords() {
  try {
    return await api("/api/breeding");
  } catch (error) {
    console.warn("Unable to load breeding records:", error);
    return [];
  }
}

/* =========================================================
   LAB REPORTS
   ========================================================= */

async function loadLabReports() {
  try {
    return await api("/api/lab");
  } catch (error) {
    console.warn("Unable to load lab reports:", error);
    return [];
  }
}

/* =========================================================
   GENERIC DOM HELPERS
   ========================================================= */

function byId(id) {
  return document.getElementById(id);
}

function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

function showElement(element) {
  if (!element) return;
  element.style.display = "";
}

function hideElement(element) {
  if (!element) return;
  element.style.display = "none";
}

function setText(element, text) {
  if (!element) return;
  element.textContent = text ?? "";
}

/* =========================================================
   NOTIFICATION
   ========================================================= */

function showMessage(message, type = "info") {
  console.log(`[${type}]`, message);

  const existing = document.querySelector(".smart-livestock-message");

  if (existing) {
    existing.remove();
  }

  const box = document.createElement("div");

  box.className = `smart-livestock-message smart-livestock-message-${type}`;

  box.textContent = message;

  box.style.position = "fixed";
  box.style.top = "20px";
  box.style.right = "20px";
  box.style.zIndex = "99999";
  box.style.padding = "12px 16px";
  box.style.borderRadius = "8px";
  box.style.background = "#ffffff";
  box.style.boxShadow = "0 4px 18px rgba(0,0,0,0.15)";
  box.style.maxWidth = "420px";

  document.body.appendChild(box);

  setTimeout(() => {
    box.remove();
  }, 5000);
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Smart Livestock frontend initialized.");
  console.log("API Base:", API_BASE);

  const imageInputs = qsa(
    'input[type="file"][accept*="image"], input[type="file"]'
  );

  imageInputs.forEach(input => {
    input.addEventListener("change", function () {
      const file = getSelectedImageFile(input);

      const preview =
        document.querySelector(
          `[data-preview-for="${input.id}"]`
        ) ||
        input.parentElement?.querySelector("img");

      if (file && preview) {
        previewImage(file, preview);
      }
    });
  });
});

/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.smartLivestock = {
  API_BASE,
  api,
  checkBackendConnection,
  translateText,
  loginUser,
  logoutUser,
  getAnimals,
  saveAnimals,
  getReports,
  saveReports,
  registerAnimal,
  submitHealthReport,
  predictDisease,
  callAI,
  getSelectedImageFile,
  validateImageFile,
  previewImage,
  normalizeDiseaseResult,
  getRiskLevel,
  loadDashboardData,
  loadAlerts,
  getLocation,
  getSavedLocation,
  loadVaccinations,
  loadTreatments,
  loadBreedingRecords,
  loadLabReports,
  showMessage
};