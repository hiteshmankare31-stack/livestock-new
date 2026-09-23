"""Copy images from  dataset/Disease_Images/<Class>/  into  backend/datasets/train/<label>/  for training.

    python backend/ml/import_dataset_images.py

* Only the 3 classes supported by the current AI model are copied (healthy, lumpy, fmd).
* Mastitis and Ringworm images are counted and reported but NOT copied (the model is 3-class).
* Exact duplicate files (same SHA-1) are skipped, and re-running is safe.
"""
import hashlib, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]                 # backend/
SRC = ROOT.parent / 'dataset' / 'Disease_Images'
TRAIN = ROOT / 'datasets' / 'train'
MAP = {'Healthy': 'healthy', 'Lumpy_Skin_Disease': 'lumpy', 'Foot_Mouth_Disease': 'fmd'}
NOT_USED = ['Mastitis', 'Ringworm']
EXT = {'.jpg', '.jpeg', '.png', '.webp'}


def images(folder: Path):
    return [p for p in sorted(folder.rglob('*')) if p.is_file() and p.suffix.lower() in EXT]


def sha1(p: Path):
    h = hashlib.sha1()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    if not SRC.exists():
        raise SystemExit(f'Folder not found: {SRC}')
    total = 0
    for folder, label in MAP.items():
        dest = TRAIN / label
        dest.mkdir(parents=True, exist_ok=True)
        seen = {sha1(p) for p in images(dest)}
        added = dup = 0
        for p in images(SRC / folder):
            h = sha1(p)
            if h in seen:
                dup += 1
                continue
            seen.add(h)
            shutil.copy2(p, dest / f'ds_{h[:12]}{p.suffix.lower()}')
            added += 1
        total += added
        print(f'{folder:20s} -> datasets/train/{label:8s} added {added:5d}  duplicates skipped {dup:4d}  total now {len(images(dest)):5d}')
    for folder in NOT_USED:
        n = len(images(SRC / folder))
        print(f'{folder:20s} found {n:5d} images (kept in dataset/, not used by the current 3-class model)')
    print('\nNext: python backend/ml/train_model.py --epochs 5 --freeze-backbone' if total else '\nNo new images. Add images to dataset/Disease_Images/<Class>/ first.')


if __name__ == '__main__':
    main()
