# Smart Livestock AI training

This project is wired for a local **3-class cattle image model**:

- Healthy
- Lumpy Skin Disease (LSD)
- Foot-and-Mouth Disease (FMD)

## 1. Install

From the project root:

```bash
pip install -r backend/ai_requirements.txt
```

## 2. Download and prepare datasets

```bash
python backend/ml/download_datasets.py
```

The script downloads public datasets and creates:

```text
backend/datasets/train/healthy/
backend/datasets/train/lumpy/
backend/datasets/train/fmd/
```

## 3. Train

```bash
python backend/ml/train_model.py --epochs 5 --freeze-backbone
```

For a stronger training run, use 10-20 epochs without `--freeze-backbone` if your laptop has enough CPU/GPU time.

The trained model is saved as:

`backend/ai_service/model/cattle_disease_efficientnet_b0.pt`

## 4. Start AI service

```bash
uvicorn backend.ai_service:app --host 127.0.0.1 --port 8001
```

The Node backend already calls `http://127.0.0.1:8001/predict`, so the frontend remains connected to the AI endpoint.

## Important

This is an AI screening system, not a veterinary diagnosis. Predictions should be verified by a qualified veterinarian.
