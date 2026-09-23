import hashlib, shutil, subprocess, zipfile
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'datasets' / 'raw'
TRAIN = ROOT / 'datasets' / 'train'
RAW.mkdir(parents=True, exist_ok=True)
TRAIN.mkdir(parents=True, exist_ok=True)

SOURCES = [
    ('lumpy_skin_images.zip', 'https://www.kaggle.com/api/v1/datasets/download/warcoder/lumpy-skin-images-dataset'),
    ('cow_lumpy.zip', 'https://www.kaggle.com/api/v1/datasets/download/shivamagarwal29/cow-lumpy-disease-dataset'),
    ('fmd_cattle.zip', 'https://zenodo.org/records/7779246/files/FMD_Cattle.zip?download=1'),
]


def download(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        print(f'Already downloaded: {dest.name}')
        return
    print(f'Downloading {dest.name} ...')
    req = Request(url, headers={'User-Agent': 'Smart-Livestock-Dataset-Downloader/1.0'})
    with urlopen(req, timeout=120) as r, open(dest, 'wb') as f:
        shutil.copyfileobj(r, f)


def extract_all():
    for z in RAW.glob('*.zip'):
        out = RAW / z.stem
        out.mkdir(exist_ok=True)
        print(f'Extracting {z.name} ...')
        with zipfile.ZipFile(z) as f:
            f.extractall(out)


def label_from_path(p: Path):
    s = str(p).lower().replace('_', ' ').replace('-', ' ')
    if any(x in s for x in ['lumpy', 'lsd', 'lumpyskin']):
        return 'lumpy'
    if any(x in s for x in ['fmd', 'foot mouth', 'footandmouth', 'foot and mouth']):
        return 'fmd'
    if any(x in s for x in ['healthy', 'normal', 'uninfected']):
        return 'healthy'
    return None


def sha1(path):
    h = hashlib.sha1()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def build_dataset():
    for c in ['healthy', 'lumpy', 'fmd']:
        (TRAIN / c).mkdir(parents=True, exist_ok=True)
    seen = set()
    allowed = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
    copied = {'healthy': 0, 'lumpy': 0, 'fmd': 0}
    for p in RAW.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in allowed:
            continue
        label = label_from_path(p)
        if not label:
            continue
        try:
            h = sha1(p)
        except Exception:
            continue
        if h in seen:
            continue
        seen.add(h)
        dst = TRAIN / label / f'{h}{p.suffix.lower()}'
        shutil.copy2(p, dst)
        copied[label] += 1
    print('Dataset summary:', copied)
    if any(v == 0 for v in copied.values()):
        print('WARNING: one or more classes have no images. Inspect datasets/raw and adjust mapping if needed.')


if __name__ == '__main__':
    for name, url in SOURCES:
        download(url, RAW / name)
    extract_all()
    build_dataset()
