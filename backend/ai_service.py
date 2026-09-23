"""Smart Livestock disease-image AI service.

Primary disease model:
  xprotocol/EfficientNet-B3-Cattle-Disease
  Classes: foot-and-mouth, healthy, lumpy.

The model is downloaded automatically from Hugging Face on first AI use and
cached locally. This is intentionally different from the old generic
Cattle_Skin_Disease model, whose labels did NOT include Lumpy Skin Disease.
"""
from io import BytesIO
import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, HTTPException, File
from PIL import Image

BASE = Path(__file__).resolve().parent
HF_MODEL_ID = os.getenv("LIVESTOCK_MODEL_ID", "xprotocol/EfficientNet-B3-Cattle-Disease")
MODEL_FILENAME = os.getenv("LIVESTOCK_MODEL_FILENAME", "efficientnet_b3_best.keras")
LOCAL_TORCH_MODEL = BASE / "ai_service" / "model" / "cattle_disease_efficientnet_b0.pt"

app = FastAPI(title="Smart Livestock AI")
_model = None
_model_error = None
_torch_model = None

CLASS_NAMES = ["foot-and-mouth", "healthy", "lumpy"]
DISPLAY_NAMES = {
    "foot-and-mouth": "Foot-and-Mouth Disease",
    "healthy": "Healthy",
    "lumpy": "Lumpy Skin Disease",
}


def _load_model():
    """Load the validated 3-class cattle disease model lazily."""
    global _model, _model_error
    if _model is not None:
        return _model
    if _model_error:
        raise RuntimeError(_model_error)
    try:
        # Prefer a locally trained EfficientNet-B0 model when it exists.
        if LOCAL_TORCH_MODEL.exists():
            import torch
            from torchvision import models
            from torch import nn
            net = models.efficientnet_b0(weights=None)
            net.classifier[1] = nn.Linear(net.classifier[1].in_features, len(CLASS_NAMES))
            checkpoint = torch.load(LOCAL_TORCH_MODEL, map_location="cpu")
            net.load_state_dict(checkpoint["state_dict"])
            net.eval()
            globals()["_torch_model"] = net
            return net
        os.environ.setdefault("KERAS_BACKEND", "torch")
        import keras
        _model = keras.saving.load_model(f"hf://{HF_MODEL_ID}", compile=False)
        return _model
    except Exception as exc:
        _model_error = (
            f"Disease model could not be loaded: {exc}. "
            "Run: pip install -r ai_requirements.txt and make sure internet "
            "access is available for the first model download."
        )
        raise RuntimeError(_model_error) from exc


def _predict(image: Image.Image):
    import numpy as np

    model = _load_model()
    if globals().get("_torch_model") is model:
        import torch
        from torchvision import transforms
        tfm = transforms.Compose([
            transforms.Resize((224,224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
        ])
        with torch.no_grad():
            probs = torch.softmax(model(tfm(image).unsqueeze(0)), dim=1).cpu().numpy()[0]
    else:
        arr = np.asarray(image.resize((300, 300)), dtype="float32")
        arr = np.expand_dims(arr, axis=0)
        probs = np.asarray(model.predict(arr, verbose=0))[0]
    # Defensive softmax in case a backend/model returns logits.
    if np.any(probs < 0) or abs(float(probs.sum()) - 1.0) > 0.05:
        probs = np.exp(probs - np.max(probs))
        probs = probs / probs.sum()
    order = np.argsort(probs)[::-1]
    top3 = [
        {
            "label": DISPLAY_NAMES.get(CLASS_NAMES[int(i)], CLASS_NAMES[int(i)]),
            "rawLabel": CLASS_NAMES[int(i)],
            "confidence": round(float(probs[int(i)]) * 100, 2),
        }
        for i in order[:3]
    ]
    top = int(order[0])
    conf = float(probs[top])
    raw = CLASS_NAMES[top]
    return raw, conf, top3


@app.get("/health")
def health():
    return {
        "ok": True,
        "model": HF_MODEL_ID,
        "model_loaded": _model is not None,
        "model_error": _model_error,
        "classes": [DISPLAY_NAMES[x] for x in CLASS_NAMES],
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    raw = await file.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "Image must be below 8 MB.")
    try:
        image = Image.open(BytesIO(raw)).convert("RGB")
        raw_label, conf, top3 = _predict(image)
        # Do not turn low confidence into a fake diagnosis.
        if conf < 0.55:
            disease = "Uncertain — please retake a clear cattle photo"
            status = "low_confidence"
        else:
            disease = DISPLAY_NAMES[raw_label]
            status = "prediction"
        return {
            "success": True,
            "status": status,
            "disease": disease,
            "rawLabel": raw_label,
            "confidence": round(conf * 100, 2),
            "top3": top3,
            "model": HF_MODEL_ID,
            "supportedClasses": [DISPLAY_NAMES[x] for x in CLASS_NAMES],
            "note": "AI screening only. Confirm suspected disease with a qualified veterinarian.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc
