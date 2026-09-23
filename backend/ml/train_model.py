import argparse, json, random
from pathlib import Path
import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'datasets' / 'train'
OUT = ROOT / 'ai_service' / 'model' / 'cattle_disease_efficientnet_b0.pt'
METRICS = ROOT / 'ai_service' / 'model' / 'training_metrics.json'
CLASSES = ['healthy', 'lumpy', 'fmd']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--epochs', type=int, default=5)
    ap.add_argument('--batch-size', type=int, default=16)
    ap.add_argument('--image-size', type=int, default=224)
    ap.add_argument('--val-ratio', type=float, default=0.2)
    ap.add_argument('--freeze-backbone', action='store_true')
    args = ap.parse_args()

    torch.manual_seed(42); random.seed(42)
    if not all((DATA / c).exists() and any((DATA / c).iterdir()) for c in CLASSES):
        raise SystemExit('Dataset missing. Run: python backend/ml/download_datasets.py')

    tfm = transforms.Compose([
        transforms.Resize((args.image_size, args.image_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406], [0.229,0.224,0.225]),
    ])
    ds = datasets.ImageFolder(DATA, transform=tfm)
    if ds.classes != CLASSES:
        raise SystemExit(f'Expected classes {CLASSES}, found {ds.classes}')
    val_n = max(1, int(len(ds) * args.val_ratio)); train_n = len(ds) - val_n
    train_ds, val_ds = random_split(ds, [train_n, val_n], generator=torch.Generator().manual_seed(42))
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(CLASSES))
    if args.freeze_backbone:
        for p in model.features.parameters(): p.requires_grad = False
    model.to(device)
    opt = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=2e-4)
    criterion = nn.CrossEntropyLoss()
    best = 0.0
    history = []

    for epoch in range(1, args.epochs + 1):
        model.train(); correct = total = 0; loss_sum = 0.0
        for x,y in train_loader:
            x,y = x.to(device),y.to(device); opt.zero_grad()
            logits=model(x); loss=criterion(logits,y); loss.backward(); opt.step()
            loss_sum += loss.item()*x.size(0); correct += (logits.argmax(1)==y).sum().item(); total += y.numel()
        train_acc=correct/total
        model.eval(); vcorrect=vtotal=0; vloss=0.0
        with torch.no_grad():
            for x,y in val_loader:
                x,y=x.to(device),y.to(device); logits=model(x); loss=criterion(logits,y)
                vloss += loss.item()*x.size(0); vcorrect += (logits.argmax(1)==y).sum().item(); vtotal += y.numel()
        val_acc=vcorrect/vtotal
        row={'epoch':epoch,'train_loss':loss_sum/total,'train_accuracy':train_acc,'val_loss':vloss/vtotal,'val_accuracy':val_acc}
        history.append(row); print(row)
        if val_acc > best:
            best=val_acc
            OUT.parent.mkdir(parents=True, exist_ok=True)
            torch.save({'state_dict':model.state_dict(),'classes':CLASSES,'image_size':args.image_size}, OUT)

    METRICS.write_text(json.dumps({
        'classes':CLASSES,
        'best_val_accuracy':best,
        'history':history,
        'evaluation_note':'Validation accuracy is measured on a held-out split with a fixed seed. For production use, evaluate on an independent test set and obtain veterinary review.'
    }, indent=2))
    print(f'Best model saved to {OUT}')

if __name__ == '__main__': main()
