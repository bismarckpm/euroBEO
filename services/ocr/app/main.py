from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from app.pipeline import read_pdf
from app.quality import QualityError

app = FastAPI()


@app.exception_handler(HTTPException)
async def http_error(_request: Request, error: HTTPException) -> JSONResponse:
    detail = error.detail if isinstance(error.detail, str) else "No se pudo leer el escaneo."
    return JSONResponse({"message": detail}, status_code=error.status_code)


@app.get("/health")
def health() -> dict[str, str]:
    import subprocess

    import cv2

    version = subprocess.check_output(["tesseract", "--version"], text=True).splitlines()[0]
    return {"tesseract": version, "opencv": cv2.__version__}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)) -> dict[str, object]:
    data = await file.read()
    try:
        return read_pdf(data)
    except QualityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
