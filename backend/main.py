import os
import uuid
import tempfile
import asyncio
from concurrent.futures import ThreadPoolExecutor

import boto3
from botocore.client import Config
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

R2_BUCKET     = os.getenv('R2_BUCKET', 'sprintiq')
R2_PUBLIC_URL = os.getenv('R2_PUBLIC_URL', '').rstrip('/')

_s3 = None
if os.getenv('R2_ACCOUNT_ID'):
    _s3 = boto3.client(
        's3',
        endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )


def _r2_ready(key: str) -> bool:
    if not _s3:
        return False
    try:
        _s3.head_object(Bucket=R2_BUCKET, Key=key)
        return True
    except Exception:
        return False


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


def _annotate_and_upload(tmp_path: str, result: dict, key: str):
    output_path = tempfile.mktemp(suffix='.mp4')
    try:
        annotate_video(tmp_path, output_path, result)
        if _s3 and os.path.exists(output_path):
            _s3.upload_file(
                output_path, R2_BUCKET, key,
                ExtraArgs={'ContentType': 'video/mp4'},
            )
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


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
        loop       = asyncio.get_event_loop()
        result     = await loop.run_in_executor(executor, _run_analysis, tmp_path)
        session_id = str(uuid.uuid4())
        key        = f'annotations/{session_id}.mp4'

        async def _bg():
            try:
                await loop.run_in_executor(executor, _annotate_and_upload, tmp_path, result, key)
            except Exception as e:
                print(f"annotation error: {e}")
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        asyncio.create_task(_bg())
        result["session_id"] = session_id

    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(500, f"Analysis failed: {str(e)}")

    return result


@app.get("/video/{session_id}/status")
def video_status(session_id: str):
    key   = f'annotations/{session_id}.mp4'
    ready = _r2_ready(key)
    resp  = {"ready": ready}
    if ready:
        resp["url"] = f'{R2_PUBLIC_URL}/{key}'
    return resp
