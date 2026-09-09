"""
evaluate.py

Loads the best trained checkpoint and evaluates it properly on eval.csv
(the held-out set with attack types unseen during training).

Reports: accuracy, precision, recall, F1, confusion matrix, ROC-AUC, EER.
EER (Equal Error Rate) is the standard metric in anti-spoofing research,
since raw accuracy is misleading under class imbalance.

Usage:
    python -m ml.evaluation.evaluate
"""

import csv
import torch
import numpy as np
from torch.utils.data import DataLoader
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, roc_auc_score, roc_curve,
)

from ml.training.dataset import VoiceDataset
from ml.models.cnn_baseline import AudioCNN

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
EVAL_CSV = PROJECT_ROOT / "ml" / "data" / "processed" / "eval.csv"
CHECKPOINT_PATH = PROJECT_ROOT / "ml" / "models" / "checkpoints" / "best_model.pt"
SCORES_OUTPUT_PATH = PROJECT_ROOT / "ml" / "evaluation" / "eval_scores.csv"

BATCH_SIZE = 32
NUM_WORKERS = 4


def compute_eer(labels, scores):
    """
    Computes Equal Error Rate: the point where False Acceptance Rate
    (spoof classified as bonafide) equals False Rejection Rate
    (bonafide classified as spoof).
    """
    fpr, tpr, thresholds = roc_curve(labels, scores, pos_label=1)
    fnr = 1 - tpr
    eer_idx = np.nanargmin(np.abs(fnr - fpr))
    eer = (fpr[eer_idx] + fnr[eer_idx]) / 2
    eer_threshold = thresholds[eer_idx]
    return eer, eer_threshold


def evaluate():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    if not CHECKPOINT_PATH.exists():
        print(f"ERROR: checkpoint not found at {CHECKPOINT_PATH}. Run training first.")
        return

    print("Loading eval dataset (this scans the CSV, not the audio yet)...")
    eval_dataset = VoiceDataset(str(EVAL_CSV))
    print(f"Eval samples: {len(eval_dataset)}")

    eval_loader = DataLoader(
        eval_dataset, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=NUM_WORKERS, pin_memory=True,
    )

    model = AudioCNN().to(device)
    model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=device))
    model.eval()

    all_labels = []
    all_preds = []
    all_probs_bonafide = []

    print("Running inference on eval set...")
    with torch.no_grad():
        for batch_idx, (x, y) in enumerate(eval_loader):
            x = x.to(device)
            logits = model(x)
            probs = torch.softmax(logits, dim=1)
            preds = torch.argmax(logits, dim=1)

            all_labels.extend(y.numpy().tolist())
            all_preds.extend(preds.cpu().numpy().tolist())
            all_probs_bonafide.extend(probs[:, 1].cpu().numpy().tolist())

            if batch_idx % 200 == 0:
                print(f"  Batch {batch_idx}/{len(eval_loader)}")

    all_labels = np.array(all_labels)
    all_preds = np.array(all_preds)
    all_probs_bonafide = np.array(all_probs_bonafide)

    accuracy = accuracy_score(all_labels, all_preds)
    precision = precision_score(all_labels, all_preds, zero_division=0)
    recall = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    cm = confusion_matrix(all_labels, all_preds)

    try:
        roc_auc = roc_auc_score(all_labels, all_probs_bonafide)
    except ValueError:
        roc_auc = float("nan")

    eer, eer_threshold = compute_eer(all_labels, all_probs_bonafide)

    with open(SCORES_OUTPUT_PATH, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["true_label", "predicted_label", "bonafide_probability"])
        for label, pred, prob in zip(all_labels, all_preds, all_probs_bonafide):
            writer.writerow([label, pred, prob])

    print("\n" + "=" * 50)
    print("EVAL SET RESULTS (unseen attack types)")
    print("=" * 50)
    print(f"Samples evaluated: {len(all_labels)}")
    print(f"Accuracy:  {accuracy:.4f}  (misleading here due to class imbalance)")
    print(f"Precision: {precision:.4f}  (of predicted bonafide, how many really are)")
    print(f"Recall:    {recall:.4f}  (of real bonafide, how many we caught)")
    print(f"F1 score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}  (threshold-independent discriminative power)")
    print(f"EER:       {eer * 100:.2f}%  (standard anti-spoofing metric, lower is better)")
    print(f"  -> EER threshold: {eer_threshold:.4f} (vs. our fixed 0.5 cutoff)")
    print("\nConfusion Matrix (at 0.5 threshold):")
    print("                 Predicted Spoof   Predicted Bonafide")
    print(f"Actual Spoof     {cm[0][0]:>15}   {cm[0][1]:>18}")
    print(f"Actual Bonafide  {cm[1][0]:>15}   {cm[1][1]:>18}")
    print("=" * 50)
    print(f"\nRaw scores saved to: {SCORES_OUTPUT_PATH}")


if __name__ == "__main__":
    evaluate()
