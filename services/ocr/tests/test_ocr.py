import io
import os
import subprocess
from pathlib import Path

import cv2
import pytest
from PIL import Image

from app.perspective import warp_for_test
from app.pipeline import column_count, read_pdf
from app.quality import QualityError

FIXTURE = Path(os.environ.get("CALOX_PDF", "/fixtures/golden/scan-calox/presupuesto-escaneado.pdf"))


def test_pinned_versions() -> None:
    import cv2 as opencv

    version = subprocess.check_output(["tesseract", "--version"], text=True)
    assert version.splitlines()[0].startswith("tesseract 5.3.0")
    assert opencv.__version__.startswith("4.6.0")


def test_spanish_traineddata_is_in_the_image() -> None:
    path = Path(os.environ["TESSDATA_PREFIX"]) / "spa.traineddata"
    assert path.is_file()
    assert path.stat().st_size > 1_000_000
    langs = subprocess.check_output(["tesseract", "--list-langs"], text=True, stderr=subprocess.STDOUT)
    assert "spa" in langs.split()


def _first_page(pdf: Path):
    work = Path("/tmp/eurobeo-ocr-page")
    work.mkdir(exist_ok=True)
    subprocess.run(
        ["pdftoppm", "-png", "-r", "300", "-gray", "-f", "1", "-l", "1", str(pdf), str(work / "page")],
        check=True,
    )
    image = cv2.imread(str(work / "page-1.png"), cv2.IMREAD_GRAYSCALE)
    assert image is not None
    return image


def test_calox_table_cells() -> None:
    assert FIXTURE.is_file(), "Falta el escaneo de Calox montado en /fixtures"
    result = read_pdf(FIXTURE.read_bytes())
    texts = [
        fragment["text"]
        for page in result["pages"]
        for fragment in page["fragments"]
    ]
    blob = "\n".join(texts)
    assert "Acceso de agua" in blob
    assert "50,00" in blob
    assert "58,50" in blob
    assert "39,00" in blob
    assert "78,00" in blob
    assert "186,50" in blob
    assert "29,84" in blob
    assert "216,84" in blob
    folded = blob.lower()
    assert "alimentos" in folded
    assert "montaje" in folded


def test_synthetic_perspective_recovers_the_table() -> None:
    assert FIXTURE.is_file(), "Falta el escaneo de Calox montado en /fixtures"
    original = _first_page(FIXTURE)
    original_columns = column_count(original)
    recovered = column_count(warp_for_test(original))
    assert original_columns >= 5
    assert recovered == original_columns


def test_blank_page_is_rejected() -> None:
    image = Image.new("L", (900, 1200), 255)
    buffer = io.BytesIO()
    image.save(buffer, format="PDF", resolution=300)
    with pytest.raises(QualityError, match="tabla"):
        read_pdf(buffer.getvalue())
