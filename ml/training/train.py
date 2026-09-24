"""
train.py

Training loop for our baseline CNN voice classifier.
Trains on train.csv, validates on dev.csv, saves the best checkpoint
based on validation accuracy.

Usage:
    python -m ml.training.train
"""

import time
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from pathlib import Path

from ml.training.dataset import VoiceDataset
from ml.models.cnn_baseline import AudioCNN

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
TRAIN_CSV = PROJECT_ROOT / "ml" / "data" / "processed" / "train.csv"
DEV_CSV = PROJECT_ROOT / "ml" / "data" / "processed" / "dev.csv"
CHECKPOINT_DIR = PROJECT_ROOT / "ml" / "models" / "checkpoints"

BATCH_SIZE = 32
NUM_EPOCHS = 5
LEARNING_RATE = 1e-3
NUM_WORKERS = 4


def evaluate(model, loader, device, criterion):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            loss = criterion(logits, y)

            total_loss += loss.item() * x.size(0)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == y).sum().item()
            total += x.size(0)

    avg_loss = total_loss / total
    accuracy = correct / total
    return avg_loss, accuracy


def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading datasets (this scans the CSVs, not the audio yet)...")
    train_dataset = VoiceDataset(str(TRAIN_CSV))
    dev_dataset = VoiceDataset(str(DEV_CSV))
    print(f"Train samples: {len(train_dataset)} | Dev samples: {len(dev_dataset)}")

    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True,
        num_workers=NUM_WORKERS, pin_memory=True,
    )
    dev_loader = DataLoader(
        dev_dataset, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=NUM_WORKERS, pin_memory=True,
    )

    model = AudioCNN().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    best_dev_accuracy = 0.0
    best_checkpoint_path = CHECKPOINT_DIR / "best_model.pt"

    for epoch in range(1, NUM_EPOCHS + 1):
        model.train()
        epoch_start = time.time()
        running_loss = 0.0
        running_correct = 0
        running_total = 0

        for batch_idx, (x, y) in enumerate(train_loader):
            x, y = x.to(device), y.to(device)

            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * x.size(0)
            preds = torch.argmax(logits, dim=1)
            running_correct += (preds == y).sum().item()
            running_total += x.size(0)

            if batch_idx % 50 == 0:
                print(f"  Epoch {epoch} | Batch {batch_idx}/{len(train_loader)} | Loss: {loss.item():.4f}")

        train_loss = running_loss / running_total
        train_acc = running_correct / running_total

        dev_loss, dev_acc = evaluate(model, dev_loader, device, criterion)

        epoch_time = time.time() - epoch_start
        print(
            f"Epoch {epoch}/{NUM_EPOCHS} done in {epoch_time:.1f}s | "
            f"Train loss: {train_loss:.4f} acc: {train_acc:.4f} | "
            f"Dev loss: {dev_loss:.4f} acc: {dev_acc:.4f}"
        )

        if dev_acc > best_dev_accuracy:
            best_dev_accuracy = dev_acc
            torch.save(model.state_dict(), best_checkpoint_path)
            print(f"  -> New best model saved (dev acc: {dev_acc:.4f}) to {best_checkpoint_path}")

    print(f"\nTraining complete. Best dev accuracy: {best_dev_accuracy:.4f}")
    print(f"Best model saved at: {best_checkpoint_path}")


if __name__ == "__main__":
    train()
