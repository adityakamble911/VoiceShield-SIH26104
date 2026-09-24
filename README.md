# VoiceShield

Voice deepfake / spoof detection app. React + TypeScript frontend, FastAPI
backend, ONNX-based ML inference.

> **Read this first:** the real ML model file is **not included** in this
> repository. Right now the backend runs in a **demo/heuristic fallback
> mode** that does not perform real detection. See
> [Current status: demo mode](#current-status-demo-mode) before you judge
> any prediction it gives you. Everything else described here (build,
> run, deploy) is fully working and verified.

---

## Table of contents

- [Current status: demo mode](#current-status-demo-mode)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Run from scratch (local)](#run-from-scratch-local)
- [Getting the real ML model working](#getting-the-real-ml-model-working)
- [Deploy live (Netlify + Render, free)](#deploy-live-netlify--render-free)
- [API reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Disclaimer](#disclaimer)

---

## Current status: demo mode

The detection model this project was designed around is
`Wav2Vec2-Small-AntiDeepfake`, exported to ONNX
(`ml/models/antideepfake/wav2vec2-small-antideepfake.onnx`, ~377 MB).
That file was originally distributed via Git LFS and was **never actually
present** in this checkout — only a small placeholder is committed at
`ml/models/antideepfake/wav2vec2-small-antideepfake.onnx.placeholder`.

Because of that, `backend/app/model_service.py` automatically falls back
to a `DemoHeuristicModel`: it hashes the uploaded audio file's raw bytes
and returns a result based on the hash. **It does not listen to or
analyze the audio at all.** Same file → same result, every time. A real
human recording can just as easily hash to "SYNTHETIC" as to "REAL" —
that's expected and not a bug.

You can tell which mode is active by calling `/health`:

```json
{ "status": "ok", "model_loaded": true, "device": "CPU", "demo_mode": true }
```

`"demo_mode": true` means you're seeing heuristic output, not real ML.
See [Getting the real ML model working](#getting-the-real-ml-model-working)
to fix this.

---

## Project structure

```
VoiceShield/
├── api/index.py                  # Lightweight demo API (Vercel serverless entry point)
├── app.py                        # Alternate ASGI entry point mounting the real backend app
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app: /health, /predict, /history, /model-info
│   │   ├── model_service.py       # Loads ONNX model OR falls back to demo heuristic
│   │   └── risk_engine.py         # Converts probability -> risk score/level/recommendation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/            # UploadScreen, LiveDetectionScreen, Dashboard, etc.
│   │   ├── config.ts              # API_BASE_URL (reads VITE_API_BASE_URL at build time)
│   │   └── ...
│   ├── server.ts                  # Express+Vite dev/prod server (local dev only)
│   ├── package.json
│   └── vite.config.ts
├── ml/
│   ├── models/
│   │   ├── antideepfake/           # Real ONNX model goes here (not included)
│   │   ├── checkpoints/            # PyTorch checkpoints from ml/training/train.py
│   │   └── cnn_baseline.py         # Simple CNN architecture (alternative to Wav2Vec2)
│   ├── preprocessing/audio_preprocessing.py
│   ├── training/                   # train.py / dataset.py — train your own model from a dataset
│   ├── evaluation/evaluate.py      # Accuracy / F1 / ROC-AUC / EER on a held-out set
│   └── requirements.txt
├── netlify.toml                   # Netlify build config (frontend)
├── render.yaml                    # Render build config (backend)
└── vercel.json                    # Optional: alternate all-in-one Vercel deploy (demo mode)
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.12 (see `.python-version`)
- **Git**

No GPU, Docker, or paid services required for local dev.

---

## Run from scratch (local)

### 1. Clone and enter the project

```cmd
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
```

### 2. Backend setup

From the project root (not inside `backend/`):

```cmd
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
```

Start the backend:

```cmd
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

You should see:

```
Uvicorn running on http://127.0.0.1:8000
[model_service] WARNING: real model unavailable (...). Falling back to demo heuristic model.
Application startup complete.
```

That warning is expected (see [Current status](#current-status-demo-mode)).
Verify it's up:

```cmd
curl http://127.0.0.1:8000/health
```

### 3. Frontend setup

Open a **second terminal**, from the project root:

```cmd
cd frontend
npm install
npm run dev
```

This starts a custom Express+Vite dev server (`frontend/server.ts`) on
**port 9990** (configurable via the `PORT` env var). Open:

```
http://localhost:9990
```

The frontend talks to the backend at `http://127.0.0.1:8000` by default
in local dev (see `frontend/src/config.ts`). No extra config needed for
local use.

### 4. Test detection end-to-end

Upload one of the bundled samples (`frontend/public/samples/real_sample.wav`
or `spoof_sample.wav`) through the UI, or test the API directly:

```cmd
curl -X POST "http://127.0.0.1:8000/predict" -F "file=@frontend\public\samples\real_sample.wav"
```

Remember: in demo mode, the result is a hash of the file, not real
analysis.

---

## Getting the real ML model working

You have two real options. Both are legitimate, neither is quick.

### Option A — Obtain the original ONNX export

If you (or your team) have the original `wav2vec2-small-antideepfake.onnx`
file from wherever this project was first built (a teammate's machine, a
private repo with Git LFS actually pulled, cloud storage, etc.):

1. Place it at exactly:
   ```
   ml/models/antideepfake/wav2vec2-small-antideepfake.onnx
   ```
2. Restart the backend. `model_service.py` auto-detects a real ONNX
   binary (as opposed to a Git LFS pointer or missing file) and switches
   out of demo mode automatically — **no code changes needed**.
3. Confirm via `/health` → `"demo_mode": false`.

The model must accept input named `wav` of shape `(1, 64000)` (4 seconds
@ 16kHz, layer-normalized) and return logits named `logits` of shape
`(1, 2)` where index 0 = synthetic, index 1 = real. This matches the
`nii-yamagishilab` AntiDeepfake family of models — if you're sourcing a
replacement, verify the exported input/output names and shapes match, or
adjust `backend/app/model_service.py` accordingly.

### Option B — Train your own model from scratch

The repo includes a full (if minimal) training pipeline for a baseline
CNN classifier as an alternative to the Wav2Vec2 model:

1. Get a labeled spoof-detection dataset. The standard public one is
   **ASVspoof 2019 LA** (logical access), which has bonafide + spoofed
   speech with train/dev/eval partitions.
2. Set up ML dependencies (separate from the backend's):
   ```cmd
   pip install -r ml\requirements.txt
   ```
3. Build CSV manifests at `ml/data/processed/train.csv`, `dev.csv`,
   `eval.csv`, each with columns `filepath,label` (`0` = spoof, `1` =
   bonafide) pointing at your dataset's audio files. This step isn't
   scripted in the repo — you write it based on your dataset's own
   metadata format.
4. Train:
   ```cmd
   python -m ml.training.train
   ```
   This trains `ml/models/cnn_baseline.py` (`AudioCNN`, a 3-block CNN
   over 80-bin log-mel spectrograms) and saves the best checkpoint to
   `ml/models/checkpoints/best_model.pt`.
5. Evaluate on the held-out eval set (reports accuracy, precision,
   recall, F1, ROC-AUC, EER):
   ```cmd
   python -m ml.evaluation.evaluate
   ```
6. Export the trained PyTorch model to ONNX (not scripted in the repo —
   use `torch.onnx.export`), matching the input contract your backend
   expects, or update `backend/app/model_service.py` to match your
   model's actual input/output shapes and preprocessing (this baseline
   CNN uses log-mel spectrograms, not raw waveform like Wav2Vec2 — the
   current `model_service.py` is written for the Wav2Vec2 raw-waveform
   contract, so you'll need to adjust it if you go this route).
7. Place the resulting `.onnx` file per Option A step 1.

This is genuine ML engineering work (dataset acquisition, training,
tuning, export, integration) — budget real time for it.

---

## Deploy live (Netlify + Render, free)

This setup is tested and working: frontend on Netlify, backend on Render,
both free tier.

### Backend on Render

1. Push this repo to GitHub.
2. On [render.com](https://render.com): New → Web Service → connect your
   repo. Render auto-detects `render.yaml`:
   - Build: `pip install -r backend/requirements.txt`
   - Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/health`
3. Deploy. Note your backend URL, e.g. `https://your-app.onrender.com`.
4. Confirm: `curl https://your-app.onrender.com/health`.

Free tier spins down after ~15 min idle; the first request after that
takes 30-50 seconds to wake up. This is normal.

### Frontend on Netlify

1. On [netlify.com](https://netlify.com): Add new site → Import from
   GitHub → same repo. Netlify auto-detects `netlify.toml`:
   - Base: `frontend`
   - Build: `npm install && npx vite build`
   - Publish: `dist` (resolves to `frontend/dist`)
2. **Before deploying**, add an environment variable:
   - Key: `VITE_API_BASE_URL`
   - Value: your Render backend URL from above (no trailing slash)
3. Deploy. Note your frontend URL, e.g. `https://your-app.netlify.app`.

### Connect them (CORS)

The backend only accepts requests from origins it explicitly allows.
On Render → your service → **Environment**, add:

- Key: `FRONTEND_ORIGINS`
- Value: your exact Netlify URL, e.g. `https://your-app.netlify.app`
  (comma-separate multiple origins if needed; no trailing slash, no
  extra text — just the bare URL)

Save. Render redeploys automatically (~1-2 min). Verify:

```cmd
curl -i -X OPTIONS "https://your-app.onrender.com/predict" -H "Origin: https://your-app.netlify.app" -H "Access-Control-Request-Method: POST"
```

Look for `access-control-allow-origin: https://your-app.netlify.app` and
`200 OK` in the response. If you instead see `Disallowed CORS origin`,
`FRONTEND_ORIGINS` isn't set correctly — check for typos, trailing
slashes, or stray text pasted into the value field.

---

## API reference

### `GET /health`

```json
{ "status": "ok", "model_loaded": true, "device": "CPU", "demo_mode": true }
```

### `GET /model-info`

Returns which model is active and basic metadata (demo heuristic or real
ONNX model).

### `GET /history`

Returns the most recent scans (in-memory only, resets on server restart).

### `POST /predict`

Multipart form field `file` (wav/mp3/flac/m4a/ogg/webm/mp4, max 20MB).

```cmd
curl -X POST "http://127.0.0.1:8000/predict" -F "file=@frontend\public\samples\real_sample.wav"
```

```json
{
  "prediction": "REAL",
  "confidence": 0.91,
  "prob_synthetic": 0.09,
  "prob_real": 0.91,
  "risk_score": 9,
  "risk_level": "LOW",
  "recommendation": "No significant indicators of synthetic audio detected.",
  "processing_time_ms": 1,
  "filename": "real_sample.wav",
  "timestamp": "2026-09-24T12:00:00+00:00"
}
```

---

## Troubleshooting

**"Failed to fetch" in the browser after deploying**
Almost always CORS. Check `FRONTEND_ORIGINS` on Render matches your
Netlify URL exactly (see [Connect them](#connect-them-cors) above).

**Netlify build fails: "Deploy directory ... does not exist"**
`publish` in `netlify.toml` must be relative to `base`, not the repo
root. If `base = "frontend"`, use `publish = "dist"`, not
`publish = "frontend/dist"`.

**Backend crashes on startup with a Git LFS / FileNotFoundError**
Expected if the real ONNX file isn't present — but it should **not**
crash the app; it should fall back to demo mode automatically. If it's
actually crashing, check that `backend/app/model_service.py` hasn't been
modified to remove the fallback in `get_model()`.

**Predictions seem random / your real voice shows as "AI"**
You're in demo mode. See [Current status](#current-status-demo-mode).

**`pip install` or scipy fails to import on Windows with an "Application
Control policy" error**
Some locked-down Windows environments (corporate policy, Smart App
Control) block scipy's native DLLs. This project's audio resampling is
implemented with numpy only (no scipy dependency) specifically to avoid
this — make sure you're on the current `backend/requirements.txt` (no
`scipy` entry).

---

## Disclaimer

VoiceShield is intended for research, educational, and experimental
purposes. Even with the real ML model active, a prediction is
probabilistic and should not be treated as definitive proof of
authenticity, fraud, or identity. For high-impact decisions, use
additional verification methods.
