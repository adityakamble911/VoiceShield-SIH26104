"""
main.py

FastAPI backend for the voice cloning detection system.
Serves /health, /predict, /history, and /model-info endpoints.

Run with:
    uvicorn backend.app.main:app --reload --port 8000
"""

import os
import tempfile
import time
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.app.model_service import get_model, DemoHeuristicModel
from backend.app.risk_engine import compute_risk


app = FastAPI(title="Voice Cloning Detection API")


# Local dev origins are always allowed. Add production frontend
# origins (e.g. your Netlify site) via the FRONTEND_ORIGINS env var,
# comma-separated, e.g.:
#   FRONTEND_ORIGINS=https://voiceshield.netlify.app,https://voiceshield.app
_default_origins = [
    "http://localhost:9990",
    "http://127.0.0.1:9990",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_env_origins = [
    origin.strip()
    for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _env_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Audio formats accepted by the ML inference pipeline.
#
# WAV/MP3/FLAC/M4A/OGG were already supported.
# WebM and MP4 are added because browser MediaRecorder commonly
# produces one of these formats for live microphone recordings.
ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".m4a",
    ".ogg",
    ".webm",
    ".mp4",
}

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


# Simple in-memory history for the prototype.
# This resets when the server restarts.
scan_history = []


@app.on_event("startup")
def load_model_on_startup():
    """
    Load the model once when the server starts.

    This prevents the checkpoint from being loaded again for every
    individual prediction request.
    """
    get_model()


@app.get("/health")
def health():
    """
    Health check endpoint.
    """
    model = get_model()
    is_demo = isinstance(model, DemoHeuristicModel)

    return {
        "status": "ok",
        "model_loaded": True,
        "device": "CPU",
        "demo_mode": is_demo,
    }


@app.get("/model-info")
def model_info():
    """
    Return basic information about the currently loaded model.
    """
    model = get_model()

    if isinstance(model, DemoHeuristicModel):
        return {
            "model_name": "VoiceShield Demo Heuristic",
            "architecture": "Deterministic demo classifier",
            "training_dataset": "N/A — demo mode",
            "dev_accuracy": None,
            "note": (
                "Demo mode is enabled because the real ONNX model file "
                "was not found (Git LFS pointer detected). This endpoint "
                "does not perform real ML inference. Run 'git lfs pull' "
                "to enable the real model."
            ),
        }

    return {
        "model_name": "Wav2Vec2 AntiDeepfake (ONNX)",
        "architecture": "Wav2Vec2-Small AntiDeepfake foundation model",
        "training_dataset": "AntiDeepfake project training corpus",
        "dev_accuracy": None,
        "note": "Local ONNX inference.",
    }


@app.get("/history")
def get_history():
    """
    Return the most recent scans first.
    """
    return {
        "scans": scan_history[::-1]
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Run the uploaded audio through the actual local AudioCNN model.

    Pipeline:

        uploaded audio
            ↓
        temporary file
            ↓
        shared audio preprocessing
            ↓
        AudioCNN
            ↓
        synthetic / real probabilities
            ↓
        risk engine
            ↓
        response
    """

    # ---------------------------------------------------------
    # Validate filename / extension
    # ---------------------------------------------------------

    original_filename = file.filename or "uploaded_audio"

    file_ext = Path(original_filename).suffix.lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{file_ext}'. "
                f"Allowed: {sorted(ALLOWED_EXTENSIONS)}"
            ),
        )

    # ---------------------------------------------------------
    # Read uploaded audio
    # ---------------------------------------------------------

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File too large. Max 20 MB.",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file.",
        )

    # ---------------------------------------------------------
    # Save audio temporarily
    # ---------------------------------------------------------

    # We keep the original extension because the audio decoder
    # needs to know what format it is dealing with.
    #
    # This is particularly important for browser recordings:
    #
    #     .webm → WebM container
    #     .mp4  → MP4 container
    #
    # The model itself does not consume these formats directly.
    # librosa decodes them during preprocessing and converts the
    # resulting waveform to mono 16 kHz.
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=file_ext,
    ) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # -----------------------------------------------------
        # Run actual ML inference
        # -----------------------------------------------------

        start_time = time.time()

        model = get_model()

        result = model.predict(tmp_path)

        processing_time_ms = round(
            (time.time() - start_time) * 1000
        )

        # -----------------------------------------------------
        # Calculate risk
        # -----------------------------------------------------

        synthetic_prob = result["prob_synthetic"]

        risk = compute_risk(synthetic_prob)

        # -----------------------------------------------------
        # Build API response
        # -----------------------------------------------------

        response = {
            "prediction": (
                "SYNTHETIC"
                if result["prediction"] == "SYNTHETIC"
                else "REAL"
            ),
            "confidence": result["confidence"],
            "prob_synthetic": result["prob_synthetic"],
            "prob_real": result["prob_real"],
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "recommendation": risk["recommendation"],
            "processing_time_ms": processing_time_ms,
            "filename": original_filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # -----------------------------------------------------
        # Store scan in prototype history
        # -----------------------------------------------------

        scan_history.append(response)

        return response

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}",
        )

    finally:
        # -----------------------------------------------------
        # Always remove temporary audio file
        # -----------------------------------------------------

        Path(tmp_path).unlink(missing_ok=True)