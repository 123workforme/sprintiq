import os
import uuid
import tempfile
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from extract_features import extract_features, compute_flags
from model_predict import predict_risk
from annotate_video import annotate_video

app = FastAPI(title="SprintIQ Biomechanics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=2)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
MAX_FILE_SIZE_MB = 200

_video_store: dict[str, str] = {}


def _run_analysis(tmp_path: str) -> dict:
    features   = extract_features(tmp_path)
    flags      = compute_flags(features)
    prediction = predict_risk(features)
    return {
        "risk_score":          prediction['risk_score'],
        "risk_level":          prediction['risk_level'],
        "class_probabilities": prediction['class_probabilities'],
        "top_contributors":    prediction['top_contributors'],
        "flags":               flags,
        "features":            features,
    }


def _run_annotate(tmp_path: str, result: dict) -> str:
    session_id  = str(uuid.uuid4())
    output_path = tempfile.mktemp(suffix='.mp4')
    annotate_video(tmp_path, output_path, result)
    _video_store[session_id] = output_path
    return session_id


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(video: UploadFile = File(...)):
    ext = os.path.splitext(video.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'.")

    content = await video.read()
    if len(content) / (1024 * 1024) > MAX_FILE_SIZE_MB:
        raise HTTPException(413, "File too large. Max 200 MB.")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        loop   = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, _run_analysis, tmp_path)

        session_id = str(uuid.uuid4())
        _video_store[session_id] = None

        async def _annotate_bg():
            try:
                sid = await loop.run_in_executor(executor, _run_annotate, tmp_path, result)
                _video_store[session_id] = _video_store.pop(sid)
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        asyncio.create_task(_annotate_bg())
        result["session_id"] = session_id

    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(500, f"Analysis failed: {str(e)}")

    return result


@app.get("/video/{session_id}/status")
def video_status(session_id: str):
    if session_id not in _video_store:
        raise HTTPException(404, "Session not found.")
    ready = _video_store[session_id] is not None
    return {"ready": ready}


@app.get("/video/{session_id}")
def get_video(session_id: str):
    path = _video_store.get(session_id)
    if path is None:
        raise HTTPException(404, "Video not ready yet." if session_id in _video_store else "Session not found.")
    if not os.path.exists(path):
        raise HTTPException(410, "Video expired.")
    return FileResponse(path, media_type="video/mp4", filename="sprintiq_overlay.mp4")
