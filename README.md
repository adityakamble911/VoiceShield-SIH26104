# VoiceShield — SIH26104

VoiceShield is a full-stack AI system for detecting potentially synthetic / AI-generated speech and distinguishing it from human speech.

## Project structure

- `frontend/` — React + TypeScript + Vite UI
- `backend/` — FastAPI REST API
- `ml/` — PyTorch CNN model, preprocessing, training and evaluation code
- `ml/models/checkpoints/best_model.pt` — trained model checkpoint used by the API

## Features

- Audio file upload and ML analysis
- Live microphone detection flow
- FastAPI `/predict` inference endpoint
- Synthetic vs human prediction probabilities
- Risk score and risk level
- Recommendation returned with each prediction
- Scan history in the frontend

## Local setup (Windows PowerShell)

### Backend

From the repository root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" python-multipart torch librosa soundfile numpy
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

API:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

The frontend sends audio to the local FastAPI server at `http://127.0.0.1:8000/predict`.

## Important

The repository includes the trained checkpoint required for local inference. Do not commit API keys, passwords, `.env` files, virtual environments, `node_modules`, or other secrets.

The supplied ML model is a prototype and should not be treated as production-grade forensic evidence. Review model evaluation results before making claims about accuracy.

## SIH

Problem statement: **SIH26104 — Voice Cloning / Synthetic Speech Detection**

Project: **VoiceShield**
