"""
cnn_baseline.py

Baseline CNN for real-vs-synthetic voice classification.
Input:  log-mel spectrogram of shape (batch, 1, 80, 401)
Output: raw logits of shape (batch, 2) -> [spoof_logit, bonafide_logit]
"""

import torch
import torch.nn as nn


class AudioCNN(nn.Module):
    def __init__(self, n_mels=80, num_classes=2):
        super().__init__()

        self.conv_block1 = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )
        self.conv_block2 = nn.Sequential(
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )
        self.conv_block3 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )

        self.global_pool = nn.AdaptiveAvgPool2d(1)

        self.classifier = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(32, num_classes),
        )

    def forward(self, x):
        # x shape: (batch, n_mels, time) -> add channel dim -> (batch, 1, n_mels, time)
        if x.dim() == 3:
            x = x.unsqueeze(1)

        x = self.conv_block1(x)
        x = self.conv_block2(x)
        x = self.conv_block3(x)

        x = self.global_pool(x)      # (batch, 64, 1, 1)
        x = x.view(x.size(0), -1)    # (batch, 64)

        logits = self.classifier(x)  # (batch, 2)
        return logits


if __name__ == "__main__":
    model = AudioCNN()
    dummy_input = torch.randn(4, 80, 401)  # batch of 4 spectrograms
    output = model(dummy_input)

    total_params = sum(p.numel() for p in model.parameters())

    print(f"Input shape:  {tuple(dummy_input.shape)}")
    print(f"Output shape: {tuple(output.shape)}")
    print(f"Total parameters: {total_params:,}")
