from pathlib import Path

import numpy as np
import onnxruntime as ort
import soundfile as sf
from scipy.signal import resample_poly


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


# ============================================================
# AntiDeepfake Model Wrapper
# ============================================================

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
            audio = resample_poly(
                audio,
                TARGET_SAMPLE_RATE,
                sample_rate,
            ).astype(np.float32)

        return audio.astype(np.float32)

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
# Singleton Model
# ============================================================

_model = None


def get_model():
    """
    Return the loaded AntiDeepfake model.

    main.py expects the returned object to provide:
        model.predict(...)
    """

    global _model

    if _model is None:
        _model = AntiDeepfakeModel(
            MODEL_PATH
        )

    return _model