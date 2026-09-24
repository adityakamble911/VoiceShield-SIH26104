"""
audio_preprocessing.py

Shared audio preprocessing pipeline used by both training and inference.
Converts a raw audio file into a fixed-size log-mel spectrogram tensor.
"""

import numpy as np
import librosa

SAMPLE_RATE = 16000
N_MELS = 80
N_FFT = 400          # 25ms window at 16kHz
HOP_LENGTH = 160      # 10ms hop at 16kHz
MAX_DURATION_SECONDS = 4.0
MAX_FRAMES = int((MAX_DURATION_SECONDS * SAMPLE_RATE) / HOP_LENGTH) + 1


def load_audio(filepath, target_sr=SAMPLE_RATE):
    """
    Loads an audio file, converts to mono, resamples to target_sr.
    Returns a 1D numpy waveform array.
    """
    waveform, _ = librosa.load(filepath, sr=target_sr, mono=True)
    return waveform


def extract_log_mel_spectrogram(waveform, sr=SAMPLE_RATE):
    """
    Converts a 1D waveform into a log-mel spectrogram.
    Returns a 2D numpy array of shape (N_MELS, time_frames).
    """
    mel_spec = librosa.feature.melspectrogram(
        y=waveform,
        sr=sr,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
    )
    log_mel_spec = librosa.power_to_db(mel_spec, ref=np.max)
    return log_mel_spec


def pad_or_trim(spectrogram, max_frames=MAX_FRAMES):
    """
    Pads with zeros or trims the time axis so every sample has
    the same fixed shape (N_MELS, max_frames). Required for batching.
    """
    n_mels, current_frames = spectrogram.shape

    if current_frames >= max_frames:
        return spectrogram[:, :max_frames]

    pad_width = max_frames - current_frames
    padded = np.pad(spectrogram, ((0, 0), (0, pad_width)), mode="constant", constant_values=0.0)
    return padded


def preprocess_audio_file(filepath):
    """
    Full pipeline: filepath -> fixed-size log-mel spectrogram, ready for the model.
    Returns a numpy array of shape (N_MELS, MAX_FRAMES).
    """
    waveform = load_audio(filepath)
    log_mel = extract_log_mel_spectrogram(waveform)
    fixed_size = pad_or_trim(log_mel)
    return fixed_size


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python audio_preprocessing.py <path_to_audio_file>")
        sys.exit(1)

    test_path = sys.argv[1]
    result = preprocess_audio_file(test_path)
    print(f"Input file: {test_path}")
    print(f"Output shape: {result.shape}")
    print(f"Value range: [{result.min():.2f}, {result.max():.2f}]")
