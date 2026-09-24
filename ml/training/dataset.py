"""
dataset.py

PyTorch Dataset that reads our CSV manifests (train.csv, dev.csv, eval.csv)
and returns preprocessed log-mel spectrograms + labels.
"""

import csv
import torch
from torch.utils.data import Dataset

from ml.preprocessing.audio_preprocessing import preprocess_audio_file


class VoiceDataset(Dataset):
    def __init__(self, csv_path):
        self.samples = []
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.samples.append({
                    "filepath": row["filepath"],
                    "label": int(row["label"]),
                })

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        spectrogram = preprocess_audio_file(sample["filepath"])
        x = torch.tensor(spectrogram, dtype=torch.float32)
        y = torch.tensor(sample["label"], dtype=torch.long)
        return x, y


if __name__ == "__main__":
    import sys
    from torch.utils.data import DataLoader

    csv_path = sys.argv[1] if len(sys.argv) > 1 else "ml/data/processed/dev.csv"

    dataset = VoiceDataset(csv_path)
    print(f"Dataset loaded: {len(dataset)} samples from {csv_path}")

    loader = DataLoader(dataset, batch_size=8, shuffle=True, num_workers=2)
    x_batch, y_batch = next(iter(loader))

    print(f"Batch input shape: {tuple(x_batch.shape)}")
    print(f"Batch label shape: {tuple(y_batch.shape)}")
    print(f"Sample labels: {y_batch.tolist()}")
