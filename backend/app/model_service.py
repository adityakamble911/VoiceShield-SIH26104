import hashlib
from pathlib import Path

import numpy as np
import onnxruntime as ort
import soundfile as sf


# ============================================================
# Configuration
# ============================================================

MODEL_PATH = (
    Path(__file__).resolve().parents[2]
    / "ml"
    / "models"
    / "antideepfake"
    / "wav2vec2-small-antideepfake.onnx"
)

TARGET_SAMPLE_RATE = 16000
MODEL_INPUT_SAMPLES = 64000

# Real Git LFS binaries start with this header. A checked-out repo
# that never ran `git lfs pull` leaves a small text "pointer" file
# in place of the actual binary, which is what we detect below.
GIT_LFS_POINTER_HEADER = b"version https://git-lfs.github.com/spec/v1"


# ============================================================
# AntiDeepfake Model Wrapper
# ============================================================

def _is_real_onnx_file(model_path: Path) -> bool:
    """
    Detect whether `model_path` is an actual ONNX binary rather than
    an un-pulled Git LFS pointer file (~130 bytes of text).
    """
    if not model_path.exists():
        return False

    try:
        with open(model_path, "rb") as f:
            header = f.read(len(GIT_LFS_POINTER_HEADER))
    except OSError:
        return False

    return header != GIT_LFS_POINTER_HEADER


class AntiDeepfakeModel:
    """
    Wrapper around the Wav2Vec2 AntiDeepfake ONNX model.

    Model classes:
        Class 0 = SYNTHETIC
        Class 1 = REAL
    """

    def __init__(self, model_path: Path):
        self.model_path = model_path

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"AntiDeepfake model not found: {self.model_path}"
            )

        if not _is_real_onnx_file(self.model_path):
            raise FileNotFoundError(
                f"'{self.model_path}' is a Git LFS pointer, not the real "
                "ONNX model. Run 'git lfs pull' to download it."
            )

        self.session = ort.InferenceSession(
            str(self.model_path),
            providers=["CPUExecutionProvider"],
        )

        print(
            "[model_service] Loaded Wav2Vec2 AntiDeepfake model "
            f"on CPU: {self.model_path}"
        )

    # --------------------------------------------------------
    # Audio loading
    # --------------------------------------------------------

    def _load_audio(self, file_path: str) -> np.ndarray:
        """
        Load audio as mono float32.
        """

        audio, sample_rate = sf.read(
            file_path,
            dtype="float32",
        )

        # Convert stereo/multi-channel audio to mono.
        if audio.ndim > 1:
            audio = np.mean(
                audio,
                axis=1,
            )

        # Resample to 16 kHz.
        if sample_rate != TARGET_SAMPLE_RATE:
            audio = self._resample(
                audio,
                sample_rate,
                TARGET_SAMPLE_RATE,
            )

        return audio.astype(np.float32)

    @staticmethod
    def _resample(
        audio: np.ndarray,
        orig_sample_rate: int,
        target_sample_rate: int,
    ) -> np.ndarray:
        """
        Resample audio via linear interpolation (numpy-only, no scipy
        dependency). Sufficient for downsampling/upsampling speech
        audio ahead of the model's own feature extraction.
        """

        if len(audio) == 0:
            return audio.astype(np.float32)

        duration = len(audio) / float(orig_sample_rate)
        target_length = max(
            1,
            int(round(duration * target_sample_rate)),
        )

        orig_indices = np.linspace(
            0.0, duration, num=len(audio), endpoint=False
        )
        target_indices = np.linspace(
            0.0, duration, num=target_length, endpoint=False
        )

        resampled = np.interp(target_indices, orig_indices, audio)

        return resampled.astype(np.float32)

    # --------------------------------------------------------
    # Layer normalization
    # --------------------------------------------------------

    def _normalize_audio(
        self,
        audio: np.ndarray,
    ) -> np.ndarray:
        """
        Match the original AntiDeepfake preprocessing:

            torch.nn.functional.layer_norm(wav, wav.shape)
        """

        mean = np.mean(audio)
        variance = np.var(audio)

        normalized = (
            audio - mean
        ) / np.sqrt(
            variance + 1e-5
        )

        return normalized.astype(np.float32)

    # --------------------------------------------------------
    # Prepare model input
    # --------------------------------------------------------

    def _prepare_audio(
        self,
        audio: np.ndarray,
    ) -> np.ndarray:
        """
        Prepare exactly 64,000 samples for the ONNX model.
        """

        # Keep first 4 seconds.
        audio = audio[:MODEL_INPUT_SAMPLES]

        # Pad shorter audio.
        if len(audio) < MODEL_INPUT_SAMPLES:
            audio = np.pad(
                audio,
                (
                    0,
                    MODEL_INPUT_SAMPLES - len(audio),
                ),
                mode="constant",
                constant_values=0.0,
            )

        # Match validated preprocessing.
        audio = self._normalize_audio(audio)

        return audio.astype(np.float32)

    # --------------------------------------------------------
    # Softmax
    # --------------------------------------------------------

    @staticmethod
    def _softmax(
        logits: np.ndarray,
    ) -> np.ndarray:
        """
        Numerically stable softmax.
        """

        shifted = logits - np.max(logits)

        probabilities = np.exp(shifted)

        probabilities /= np.sum(probabilities)

        return probabilities

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    def predict(
        self,
        file_path: str,
    ) -> dict:
        """
        Run AntiDeepfake prediction.

        Returns:
            prediction
            confidence
            prob_synthetic
            prob_real
        """

        audio = self._load_audio(file_path)

        audio = self._prepare_audio(audio)

        model_input = audio.reshape(
            1,
            MODEL_INPUT_SAMPLES,
        )

        outputs = self.session.run(
            ["logits"],
            {
                "wav": model_input,
            },
        )

        logits = outputs[0][0]

        probabilities = self._softmax(
            logits
        )

        # Model mapping:
        # Class 0 = SYNTHETIC
        # Class 1 = REAL

        prob_synthetic = float(
            probabilities[0]
        )

        prob_real = float(
            probabilities[1]
        )

        if prob_real >= prob_synthetic:
            prediction = "REAL"
            confidence = prob_real
        else:
            prediction = "SYNTHETIC"
            confidence = prob_synthetic

        return {
            "prediction": prediction,
            "confidence": confidence,
            "prob_synthetic": prob_synthetic,
            "prob_real": prob_real,
        }


# ============================================================
# Fallback Heuristic Model
# ============================================================

class DemoHeuristicModel:
    """
    Deterministic stand-in used when the real ONNX model binary is
    not available locally (e.g. Git LFS was never pulled).

    This lets the full app (frontend + backend) run end-to-end
    without crashing, while making it obvious in the API response
    that results are not real ML inference.
    """

    is_demo = True

    def predict(self, file_path: str) -> dict:
        with open(file_path, "rb") as f:
            contents = f.read()

        digest = hashlib.sha256(contents).digest()
        is_synthetic = digest[0] >= 128

        confidence = 0.94 if is_synthetic else 0.91
        prob_synthetic = confidence if is_synthetic else 1.0 - confidence
        prob_real = 1.0 - prob_synthetic

        return {
            "prediction": "SYNTHETIC" if is_synthetic else "REAL",
            "confidence": confidence,
            "prob_synthetic": prob_synthetic,
            "prob_real": prob_real,
        }


# ============================================================
# Singleton Model
# ============================================================

_model = None


def get_model():
    """
    Return the loaded AntiDeepfake model, or a deterministic demo
    fallback if the real ONNX model binary is not present locally.

    main.py expects the returned object to provide:
        model.predict(...)
    """

    global _model

    if _model is None:
        try:
            _model = AntiDeepfakeModel(
                MODEL_PATH
            )
        except FileNotFoundError as e:
            print(
                "[model_service] WARNING: real model unavailable "
                f"({e}). Falling back to demo heuristic model."
            )
            _model = DemoHeuristicModel()

    return _model