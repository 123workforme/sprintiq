# SprintIQ

SprintIQ turns an ordinary phone video of a sprinter into biomechanical feedback: a pose skeleton drawn over the run, joint-angle measurements, left/right asymmetries, and form flags tied to the sports-medicine literature.

**Live app:** https://sprintiq-eta.vercel.app
Built for the Congressional App Challenge.

## Why I built it

Shin splints pushed me out of cross country and into sprinting my freshman year. The only explanation I got was "you're heel striking," with no way to see what that looked like. SprintIQ is the tool I wanted then: record a sprint on a phone, see the skeleton, and get told which joint is doing what.

## What it does

1. **Upload** a running video (`.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`, up to 200 MB).
2. **Pose estimation.** Every frame goes through MediaPipe's Pose Landmarker (heavy model) to locate the hips, knees, ankles, heels, and feet.
3. **Feature extraction.** From those landmarks, SprintIQ measures:
   - knee flexion (minimum and mean, each leg)
   - ankle dorsiflexion (minimum and mean, each leg)
   - hip angle and hip-drive asymmetry
   - ground contact time per foot, using an adaptive threshold on foot height, and the left/right contact-time ratio
   - stride width
4. **Form flags.** Rule-based checks turn those numbers into readable feedback, for example restricted ankle dorsiflexion, a large left/right ankle asymmetry, or a knee that is nearly straight at ground contact. Each flag includes a recommendation and the study it is based on.
5. **Risk score.** A Random Forest classifier produces a 0–100 score with low, medium, and high probabilities, plus the features that weighed most.
6. **Annotated video.** In the background, the server redraws the run with the skeleton, joint angles, and flagged joints highlighted, then stores it in Cloudflare R2 for playback.
7. **Training tools.** The web app also has split entry and race analysis with pacing targets for the 100, 200, and 400, a PR tracker, a goal planner, and a session history saved in the browser.

## Limitations (please read)

- **The model is not trained on real athletes.** It was trained on 1,050 synthetic samples (350 per risk class) generated from ranges informed by published research (`backend/generate_dataset.py`). I did not collect a labeled injury dataset, because research with human participants, especially minors, needs approval from an institutional review board before any data is gathered.
- **It is not clinically validated.** Treat the score and flags as coaching feedback, not a diagnosis. Anyone with pain should see a medical professional.
- **2D pose has blind spots.** Joint angles are measured from flat two-dimensional keypoints, so they change with the camera's position and angle. Side-on video, filmed at hip height with the whole body in frame, gives the most consistent results.

## Architecture

```
React + Vite frontend (Vercel)
        │  POST /analyze (video)
        ▼
FastAPI backend (Railway, Docker)
  ├─ MediaPipe Pose Landmarker + OpenCV  → features
  ├─ rule-based flags                     → feedback + citations
  ├─ Random Forest (scikit-learn)         → risk score
  └─ background task: annotated video     → Cloudflare R2
        ▲
        │  GET /video/{session_id}/status
React frontend polls until the annotated video is ready
```

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, Recharts
- **Backend:** Python, FastAPI, Uvicorn
- **Computer vision:** MediaPipe Pose Landmarker, OpenCV
- **Machine learning:** scikit-learn (Random Forest), NumPy, pandas
- **Storage:** Cloudflare R2 (S3-compatible, via boto3)
- **Hosting:** Vercel (frontend), Railway (backend)

## Repository layout

```
backend/
  main.py               FastAPI app: /analyze, /video/{id}/status, /health
  extract_features.py   pose estimation, joint angles, contact times, form flags
  model_predict.py      loads model.pkl and returns the risk score
  generate_dataset.py   builds the synthetic training set
  train_model.py        trains and cross-validates the Random Forest
  annotate_video.py     draws the skeleton overlay video
  model.pkl             trained model
  pose_landmarker_heavy.task   MediaPipe model file
sprintiq/               React frontend (the deployed app)
Dockerfile              builds the backend image
src/                    earlier prototype of the frontend
```

## Running locally

**Backend** (Python 3.11 or newer):

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Analysis works without any configuration. To store annotated videos, set these environment variables for a Cloudflare R2 bucket: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.

To rebuild the model:

```bash
python generate_dataset.py
python train_model.py
```

**Frontend:**

```bash
cd sprintiq
npm install
npm run dev
```

The frontend points at the deployed backend. To use a local backend instead, change `API_URL` in `sprintiq/src/utils/api.js` to `http://localhost:8000`.

## API

| Method | Path | Returns |
| --- | --- | --- |
| `POST` | `/analyze` | Risk score, class probabilities, top features, form flags, all measurements, and a `session_id` |
| `GET` | `/video/{session_id}/status` | Whether the annotated video is ready, and its URL when it is |
| `GET` | `/health` | `{"status": "ok"}` |
