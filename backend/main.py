import io
import re
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

logging.getLogger("ppocr").setLevel(logging.ERROR)

ocr_engine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ocr_engine
    from paddleocr import PaddleOCR
    ocr_engine = PaddleOCR(use_angle_cls=True, lang="ru")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/api/ocr")
async def ocr_recognize(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")

    # PaddleOCR принимает numpy array
    import numpy as np
    img_array = np.array(img)

    results = ocr_engine.predict(img_array)

    rec_texts = results[0].get("rec_texts", [])
    rec_scores = results[0].get("rec_scores", [])

    text = "\n".join(rec_texts)
    character_count = len(re.sub(r"\s", "", text))

    avg_confidence = (
        sum(rec_scores) / len(rec_scores) * 100 if rec_scores else 0
    )

    return {
        "text": text,
        "characterCount": character_count,
        "confidence": round(avg_confidence, 1),
    }
