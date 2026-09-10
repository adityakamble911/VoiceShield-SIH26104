from datetime import datetime, timezone
import hashlib
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VoiceShield Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

scan_history = []


def demo_result(filename: str, contents: bytes):
    name = (filename or "uploaded_audio").lower()
    is_synthetic = any(k in name for k in ["ai", "synthetic", "deepfake", "clone", "fake"])
    is_human = any(k in name for k in ["human", "real", "natural", "voice"])

    if not is_synthetic and not is_human:
        digest = hashlib.sha256(contents).digest()
        # Deterministic demo-only score. This is NOT ML inference.
        is_synthetic = digest[0] >= 128

    confidence = 0.94 if is_synthetic else 0.91
    synthetic_probability = confidence if is_synthetic else 1.0 - confidence
    risk_level = "HIGH" if is_synthetic else "LOW"
    recommendation = (
        "Demo result: treat this recording as potentially synthetic and verify the speaker through a second channel."
        if is_synthetic
        else "Demo result: no strong synthetic signal was simulated for this recording. Continue with normal verification."
    )

    result = {
        "prediction": "SYNTHETIC" if is_synthetic else "REAL",
        "confidence": confidence,
        "prob_synthetic": synthetic_probability,
        "prob_real": 1.0 - synthetic_probability,
        "risk_score": round(synthetic_probability * 100),
        "risk_level": risk_level,
        "recommendation": recommendation,
        "processing_time_ms": 42,
        "filename": filename or "uploaded_audio",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "demo_mode": True,
        "model_name": "VoiceShield Demo Heuristic",
    }
    scan_history.append(result)
    return result


@app.get("/")
@app.get("/api")
@app.get("/api/")
def root():
    return {"service": "VoiceShield Demo API", "status": "ok", "demo_mode": True}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": False, "device": "demo", "demo_mode": True}


@app.get("/model-info")
@app.get("/api/model-info")
def model_info():
    return {
        "model_name": "VoiceShield Demo Heuristic",
        "architecture": "Deterministic demo classifier",
        "training_dataset": "N/A — demo mode",
        "dev_accuracy": None,
        "note": "Demo mode is enabled because the production ONNX model is stored through Git LFS. This endpoint does not claim real ML inference.",
    }


@app.get("/history")
@app.get("/api/history")
def history():
    return {"scans": scan_history[::-1]}


@app.post("/predict")
@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    if not contents:
        return {"error": "Empty file."}
    if len(contents) > 20 * 1024 * 1024:
        return {"error": "File too large. Max 20 MB."}
    return demo_result(file.filename or "uploaded_audio", contents)
