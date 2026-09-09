# VoiceShield

## Local AI-Powered Voice Deepfake Detection

VoiceShield is a local voice-analysis application that detects whether a
speech recording is likely to be **real human speech** or
**synthetically generated / spoofed speech**.

The project contains three main parts:

-   **Frontend** --- React + TypeScript + Vite user interface
-   **Backend** --- Python + FastAPI REST API
-   **ML Model** --- Local ONNX-based Wav2Vec2 AntiDeepfake inference

> **Current status:** The application is working end-to-end locally.
> Audio can be uploaded or recorded through the browser, sent to the
> local FastAPI backend, analyzed by the local ML model, and returned
> with a prediction, confidence, and risk level.

------------------------------------------------------------------------

# Project Structure

``` text
VoiceShield_local_ML_connected/
│
├── backend/
│   └── app/
│       ├── main.py
│       ├── model_service.py
│       └── risk_engine.py
│
├── frontend/
│   ├── public/
│   │   └── samples/
│   │       ├── real_sample.wav
│   │       └── spoof_sample.wav
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadScreen.tsx
│   │   │   ├── LiveDetectionScreen.tsx
│   │   │   ├── DetailedAnalysisScreen.tsx
│   │   │   └── ...
│   │   │
│   │   ├── services/
│   │   └── ...
│   │
│   ├── package.json
│   ├── vite.config.*
│   └── ...
│
├── ml/
│   └── models/
│       └── antideepfake/
│           └── wav2vec2-small-antideepfake.onnx
│
├── README.md
└── ...
```

------------------------------------------------------------------------

# Frontend

The frontend is the user-facing part of VoiceShield.

## Frontend Technology

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   Browser audio APIs

## Frontend Responsibilities

The frontend handles:

1.  Selecting an audio file
2.  Recording audio from the microphone
3.  Converting/formatting recorded audio for the backend
4.  Sending audio to the FastAPI `/predict` endpoint
5.  Displaying prediction results
6.  Displaying confidence and risk information
7.  Providing the user interface for the VoiceShield workflow

## Important Frontend Components

### `UploadScreen.tsx`

Responsible for audio upload/sample analysis.

The component sends the selected audio to:

``` text
POST http://127.0.0.1:8000/predict
```

using multipart form data.

### `LiveDetectionScreen.tsx`

Responsible for microphone-based detection.

The browser records the user's voice and prepares it as PCM WAV audio
before sending it to the local backend.

### `DetailedAnalysisScreen.tsx`

Displays the detailed analysis/results interface.

------------------------------------------------------------------------

# Backend

The backend is responsible for receiving audio and running the
machine-learning inference pipeline.

## Backend Technology

-   Python
-   FastAPI
-   Uvicorn
-   NumPy
-   SoundFile
-   SciPy
-   ONNX Runtime

## Backend Responsibilities

The backend:

1.  Receives uploaded/recorded audio
2.  Validates the request
3.  Loads and preprocesses the audio
4.  Runs the local AntiDeepfake model
5.  Converts model logits into probabilities
6.  Determines REAL/SYNTHETIC prediction
7.  Calculates risk level
8.  Returns a JSON response to the frontend

------------------------------------------------------------------------

# Backend Files

## `backend/app/main.py`

This is the FastAPI application entry point.

It provides the HTTP API used by the frontend.

Important endpoint:

``` text
POST /predict
```

Health endpoint:

``` text
GET /health
```

------------------------------------------------------------------------

## `backend/app/model_service.py`

This is the ML inference service.

Responsibilities include:

-   Loading the ONNX model
-   Loading audio
-   Converting audio to mono
-   Resampling audio to 16 kHz
-   Preparing the model input
-   Applying layer normalization
-   Running ONNX inference
-   Calculating probabilities
-   Returning REAL/SYNTHETIC prediction

The model is loaded once and reused rather than being loaded for every
request.

------------------------------------------------------------------------

## `backend/app/risk_engine.py`

Converts the synthetic probability into a user-facing risk result.

Current logic:

``` text
Synthetic probability × 100 = Risk Score
```

Risk levels:

``` text
0–30     LOW
31–70    MEDIUM
71–100   HIGH
```

------------------------------------------------------------------------

# Machine Learning Pipeline

The current inference pipeline is:

``` text
Audio
  │
  ▼
Load audio
  │
  ▼
Convert to mono
  │
  ▼
Resample to 16 kHz
  │
  ▼
Prepare 64,000 samples
  │
  ▼
Layer normalization
  │
  ▼
ONNX Runtime
  │
  ▼
Wav2Vec2 AntiDeepfake
  │
  ▼
Two logits
  │
  ├───────────────┐
  ▼               ▼
Synthetic        Real
  │               │
  └───────┬───────┘
          ▼
       Softmax
          │
          ▼
   Prediction + Confidence
          │
          ▼
      Risk Engine
          │
          ▼
      API Response
```

The current ONNX model accepts:

``` text
Sample rate: 16,000 Hz
Input size: 64,000 samples
Duration: 4 seconds
```

For audio shorter than four seconds, the input is padded.

For audio longer than four seconds, the current implementation uses the
first four seconds.

------------------------------------------------------------------------

# API

## Health Check

``` http
GET /health
```

Example:

``` json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu"
}
```

------------------------------------------------------------------------

## Prediction

``` http
POST /predict
```

Form field:

``` text
file
```

Example:

``` cmd
curl -X POST "http://127.0.0.1:8000/predict" -F "file=@frontend\public\samples\real_sample.wav"
```

Example response:

``` json
{
  "prediction": "REAL",
  "confidence": 0.9974889755249023,
  "prob_synthetic": 0.0025110526476055384,
  "prob_real": 0.9974889755249023,
  "risk_score": 0,
  "risk_level": "LOW",
  "recommendation": "No significant indicators of synthetic audio detected.",
  "processing_time_ms": 196,
  "filename": "real_sample.wav"
}
```

------------------------------------------------------------------------

# Local Processing

VoiceShield is designed to perform detection locally.

``` text
Browser
   │
   ▼
Local FastAPI Server
   │
   ▼
Local ONNX Model
   │
   ▼
Local Result
```

The detection pipeline does not require a cloud AI API.

------------------------------------------------------------------------

# Current Validation

The new model and backend were tested using known audio samples and a
real voice recording.

  Test                     Synthetic       Real Prediction
  ---------------------- ----------- ---------- ------------
  Known Real                 0.2511%   99.7489% REAL
  Known Spoof               99.9956%    0.0044% SYNTHETIC
  Real Voice Recording       0.1216%   99.8784% REAL

The same audio was also successfully tested through the FastAPI
`/predict` endpoint.

------------------------------------------------------------------------

# Setup

## Requirements

Recommended environment:

``` text
Windows 10 / Windows 11
Python 3.11
Node.js
npm
Git
```

------------------------------------------------------------------------

# Backend Setup

From the project root:

``` cmd
cd backend
```

Create the virtual environment if necessary:

``` cmd
python -m venv .venv
```

Activate it:

``` cmd
.venv\Scripts\activate
```

Install Python dependencies:

``` cmd
pip install -r requirements.txt
```

If ONNX Runtime is not already included:

``` cmd
pip install onnxruntime
```

------------------------------------------------------------------------

# Start Backend

Run this command from the **project root**:

``` cmd
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Expected:

``` text
Uvicorn running on http://127.0.0.1:8000
Application startup complete.
```

API documentation:

``` text
http://127.0.0.1:8000/docs
```

Health check:

``` text
http://127.0.0.1:8000/health
```

------------------------------------------------------------------------

# Frontend Setup

Open a second terminal.

Go to the frontend:

``` cmd
cd frontend
```

Install dependencies:

``` cmd
npm install
```

Start the development server:

``` cmd
npm run dev
```

Open the localhost address shown by Vite.

Usually:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# Complete Startup

For a fresh clone:

### Terminal 1 --- Backend

From the project root:

``` cmd
.venv\Scripts\activate
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 --- Frontend

``` cmd
cd frontend
npm install
npm run dev
```

Then open the Vite URL in the browser.

------------------------------------------------------------------------

# Testing from Command Line

## Known Real Sample

``` cmd
curl -X POST "http://127.0.0.1:8000/predict" -F "file=@frontend\public\samples\real_sample.wav"
```

Expected:

``` text
Prediction: REAL
Risk Level: LOW
```

## Known Spoof Sample

``` cmd
curl -X POST "http://127.0.0.1:8000/predict" -F "file=@frontend\public\samples\spoof_sample.wav"
```

Expected:

``` text
Prediction: SYNTHETIC
Risk Level: HIGH
```

------------------------------------------------------------------------

# Machine Learning Model Attribution

VoiceShield currently uses a locally deployed ONNX version of the:

``` text
Wav2Vec2-Small-AntiDeepfake
```

model.

The underlying model is an existing research model. VoiceShield does
**not** claim that the underlying neural network was trained from
scratch by this project.

The VoiceShield project itself includes the application integration,
backend inference service, audio preprocessing pipeline, API, risk
engine, frontend, and local deployment workflow.

Model attribution and licensing information should be preserved when
redistributing the model.

------------------------------------------------------------------------

# Future ML Work

A future version of VoiceShield can move from using an existing
pretrained anti-deepfake model to a project-specific trained/fine-tuned
model.

Potential workflow:

``` text
Dataset
   │
   ▼
Audio preprocessing
   │
   ▼
Train / Fine-tune model
   │
   ▼
Validation
   │
   ▼
Held-out test set
   │
   ▼
Evaluate
   │
   ├── Accuracy
   ├── Precision
   ├── Recall
   ├── F1
   ├── ROC-AUC
   └── EER
   │
   ▼
Export model
   │
   ▼
ONNX
   │
   ▼
VoiceShield
```

Once a project-specific model is trained and evaluated, it can replace
the current model in:

``` text
ml/models/antideepfake/
```

------------------------------------------------------------------------

# Limitations

Voice deepfake detection is probabilistic and should not be considered
absolute proof that audio is real or fake.

Potential sources of errors include:

-   Background noise
-   Audio compression
-   Very short recordings
-   Poor microphone quality
-   Unseen voice-generation systems
-   Audio manipulation
-   Distribution differences between training and real-world audio

The current ONNX model uses a fixed four-second input.

Future versions should consider overlapping windows and score
aggregation for longer recordings.

------------------------------------------------------------------------

# Project Goal

The long-term goal of VoiceShield is to provide a practical,
privacy-oriented voice deepfake detection system that can run locally
without requiring users to upload sensitive voice recordings to external
AI services.

------------------------------------------------------------------------

# Disclaimer

VoiceShield is intended for research, educational, and experimental
purposes.

A model prediction should not be treated as definitive proof of
authenticity, fraud, or identity.

For high-impact decisions, additional verification methods should always
be used.
