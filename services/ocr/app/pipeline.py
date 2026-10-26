"""OCR local del presupuesto: raster, rejilla y fragmentos en puntos PDF."""

from __future__ import annotations

import base64
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from app.perspective import correct_perspective
from app.quality import QualityError, assert_page_dpi, no_table_message, page_dpi

DPI = 300
SCALE = 72.0 / DPI
NUMERIC_WHITELIST = "0123456789.,"
# Centros de columna en puntos PDF, alineados con el parser (cantidad…total).
COLUMN_X = (70, 200, 340, 390, 450, 540)
HEADER_NAMES = (
    ("cantidad", re.compile(r"^cantidad$", re.I)),
    ("descripcion", re.compile(r"^descripci[oó]n$", re.I)),
    ("noches", re.compile(r"^(noches|d[ií]a)$", re.I)),
    ("moneda", re.compile(r"^moneda$", re.I)),
    ("tarifa", re.compile(r"^(tarifa|sub\s*-?\s*total)$", re.I)),
    ("total", re.compile(r"^total$", re.I)),
)


@dataclass
class Fragment:
    text: str
    x: float
    y: float
    width: float
    height: float
    confidence: float
    kind: str
    crop: str


def _groups(indexes: np.ndarray, gap: int) -> list[int]:
    if len(indexes) == 0:
        return []
    groups: list[list[int]] = []
    for value in indexes.tolist():
        if not groups or value - groups[-1][-1] > gap:
            groups.append([value])
        else:
            groups[-1].append(value)
    return [int(np.mean(group)) for group in groups]


def _png_b64(image: np.ndarray) -> str:
    ok, encoded = cv2.imencode(".png", image)
    if not ok:
        return ""
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def _ocr(image: np.ndarray, psm: int, whitelist: str | None = None) -> tuple[str, float]:
    words, confidence = _tesseract_words(image, psm, whitelist)
    text = " ".join(word for word, _left, _top, _width, _height, _confidence in words).strip()
    return text, confidence


def _tesseract_words(
    image: np.ndarray,
    psm: int,
    whitelist: str | None = None,
) -> tuple[list[tuple[str, int, int, int, int, float]], float]:
    prepared = cv2.copyMakeBorder(image, 16, 16, 16, 16, cv2.BORDER_CONSTANT, value=255)
    prepared = cv2.resize(prepared, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    _threshold, prepared = cv2.threshold(prepared, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "cell.png"
        cv2.imwrite(str(path), prepared)
        command = ["tesseract", str(path), "stdout", "-l", "spa", "--psm", str(psm), "tsv"]
        if whitelist:
            command.extend(["-c", f"tessedit_char_whitelist={whitelist}"])
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
    words: list[tuple[str, int, int, int, int, float]] = []
    confidences: list[float] = []
    for line in completed.stdout.splitlines()[1:]:
        parts = line.split("\t")
        if len(parts) < 12:
            continue
        text = parts[11].strip()
        try:
            confidence = float(parts[10])
            left, top, width, height = (int(parts[index]) for index in (6, 7, 8, 9))
        except ValueError:
            continue
        if confidence < 0 or not text:
            continue
        # El borde y el aumento se deshacen para volver a la imagen original.
        left = int((left - 16 * 1.5) / 1.5)
        top = int((top - 16 * 1.5) / 1.5)
        width = int(width / 1.5)
        height = int(height / 1.5)
        words.append((text, left, top, max(width, 1), max(height, 1), confidence))
        confidences.append(confidence)
    mean = sum(confidences) / len(confidences) if confidences else 0.0
    return words, mean


def _rotate_upright(gray: np.ndarray) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "page.png"
        cv2.imwrite(str(path), gray)
        completed = subprocess.run(
            ["tesseract", str(path), "stdout", "--psm", "0"],
            capture_output=True,
            text=True,
            check=False,
        )
    rotate = 0
    for line in completed.stdout.splitlines():
        if line.lower().startswith("rotate:"):
            try:
                rotate = int(line.split(":", 1)[1].strip())
            except ValueError:
                rotate = 0
    if rotate == 90:
        return cv2.rotate(gray, cv2.ROTATE_90_COUNTERCLOCKWISE)
    if rotate == 180:
        return cv2.rotate(gray, cv2.ROTATE_180)
    if rotate == 270:
        return cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)
    return gray


def _deskew(gray: np.ndarray) -> np.ndarray:
    _threshold, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (80, 1))
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    coords = cv2.findNonZero(horizontal)
    if coords is None or len(coords) < 50:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle
    elif angle > 45:
        angle -= 90
    if abs(angle) < 0.3 or abs(angle) > 8:
        return gray
    height, width = gray.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    return cv2.warpAffine(gray, matrix, (width, height), flags=cv2.INTER_CUBIC, borderValue=255)


def _prepare(gray: np.ndarray) -> np.ndarray:
    return _deskew(_rotate_upright(correct_perspective(gray)))


def _clusters(values: list[int], gap: int) -> list[list[int]]:
    clusters: list[list[int]] = []
    for value in values:
        if not clusters or value - clusters[-1][-1] > gap:
            clusters.append([value])
        else:
            clusters[-1].append(value)
    return clusters


def detect_grid(gray: np.ndarray) -> tuple[list[int], list[int]] | None:
    """Líneas de la tabla del presupuesto, no las de la cabecera.

    Se agrupan las horizontales y, en cada grupo, se miden las verticales.
    Gana el grupo con más columnas: en Calox es la tabla de ítems.
    """
    height, width = gray.shape[:2]
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 25, 10)
    inverted = 255 - binary
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(40, width // 25), 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(25, height // 80)))
    horizontal = cv2.morphologyEx(inverted, cv2.MORPH_OPEN, horizontal_kernel)
    vertical = cv2.morphologyEx(inverted, cv2.MORPH_OPEN, vertical_kernel)
    ys = _groups(np.where(horizontal.sum(axis=1) / 255 > width * 0.08)[0], 16)
    best: tuple[list[int], list[int]] | None = None
    best_score = 0
    grouped = _clusters(ys, 90)
    for cluster in grouped:
        if len(cluster) < 4:
            continue
        top, bottom = cluster[0], cluster[-1]
        if bottom - top < 80:
            continue
        xs = _groups(np.where(vertical[top:bottom].sum(axis=0) / 255 > (bottom - top) * 0.15)[0], 10)
        if len(xs) < 5:
            continue
        score = (len(xs) - 1) * 1000 + len(cluster)
        if score > best_score:
            best_score = score
            best = (cluster, xs)
    if best is None:
        return None
    chosen, xs = best
    table_top = chosen[0]
    above = [y for y in ys if table_top - 270 <= y < table_top]
    extended = above + list(chosen)
    for cluster in grouped:
        if cluster[0] <= extended[-1]:
            continue
        if cluster[0] - extended[-1] > 280:
            break
        extended.extend(cluster)
    return extended, xs


def _ink_columns(gray: np.ndarray, xs: list[int], top: int, bottom: int) -> int:
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 25, 10)
    occupied = 0
    for left, right in zip(xs, xs[1:]):
        cell = binary[top + 3 : bottom - 3, left + 4 : right - 4]
        if cell.size == 0:
            continue
        if np.mean(cell < 200) > 0.01:
            occupied += 1
    return occupied


def _row_image(gray: np.ndarray, top: int, bottom: int, left: int, right: int) -> np.ndarray:
    return gray[max(top + 4, 0) : max(bottom - 4, top + 5), max(left + 4, 0) : max(right - 4, left + 5)]


def _point(px: float, py: float, page_height_pt: float) -> tuple[float, float]:
    return px * SCALE, page_height_pt - py * SCALE


def _fragment(
    text: str,
    x_px: float,
    y_px: float,
    w_px: float,
    h_px: float,
    confidence: float,
    kind: str,
    crop: np.ndarray,
    page_height_pt: float,
) -> Fragment:
    x, y = _point(x_px, y_px + h_px, page_height_pt)
    return Fragment(
        text=text,
        x=x,
        y=y,
        width=max(w_px * SCALE, 4),
        height=max(h_px * SCALE, 4),
        confidence=confidence / 100,
        kind=kind,
        crop=_png_b64(crop),
    )


def _banner_text(text: str) -> str:
    """La fila sombreada de fecha o título se lee con ruido a los lados."""
    date = re.search(
        r"(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo),?\s+\d{1,2}\s+de\s+[A-Za-zÁÉÍÓÚáéíóúñ]+\s+de\s+\d{4}",
        text,
        re.I,
    )
    if date:
        return date.group(0)
    title = re.search(r"d[ií]a\s+\S*revio\s+de\s+montaje", text, re.I)
    if title:
        return "Día previo de montaje"
    return re.sub(r"\s+", " ", text).strip()


def _header_index(names: list[str]) -> dict[int, str]:
    found: dict[int, str] = {}
    for index, name in enumerate(names):
        folded = name.strip()
        for key, pattern in HEADER_NAMES:
            if pattern.match(folded) and key not in found.values():
                found[index] = key
                break
    return found


def _read_table(
    gray: np.ndarray,
    ys: list[int],
    xs: list[int],
    page_height_pt: float,
) -> list[Fragment]:
    fragments: list[Fragment] = []
    numeric_indexes = {0, 2, 4, 5}
    header_map: dict[int, str] = {}
    for top, bottom in zip(ys, ys[1:]):
        if bottom - top < 22:
            continue
        occupied = _ink_columns(gray, xs, top, bottom)
        cells = []
        for index, (left, right) in enumerate(zip(xs, xs[1:])):
            crop = _row_image(gray, top, bottom, left, right)
            if crop.size == 0 or float(np.mean(crop < 200)) < 0.004:
                cells.append(("", 0.0, crop, left, right))
                continue
            whitelist = NUMERIC_WHITELIST if index in numeric_indexes and header_map else None
            text, confidence = _ocr(crop, 7, whitelist)
            if index == 1:
                text = re.sub(r"^(?:o|O|_)\s+(?=[A-ZÁÉÍÓÚÑ])", "", text).strip()
            cells.append((text, confidence, crop, left, right))
        joined = " ".join(text for text, *_rest in cells if text).strip()
        if not header_map and re.search(r"cantidad", joined, re.I) and re.search(r"total", joined, re.I):
            header_map = _header_index([text for text, *_rest in cells])
            if len(header_map) >= 4:
                numeric_indexes = {
                    index for index, key in header_map.items() if key in {"cantidad", "noches", "tarifa", "total"}
                }
            row_y = page_height_pt - ((top + bottom) / 2) * SCALE
            for column, (text, confidence, crop, left, _right) in enumerate(cells):
                if not text:
                    continue
                fragment = _fragment(text, left + 6, top, 30, bottom - top, confidence, "header", crop, page_height_pt)
                fragment.y = row_y
                if column < len(COLUMN_X):
                    fragment.x = COLUMN_X[column]
                fragments.append(fragment)
            continue
        # Una fila de ítem trae cantidad y un importe. El resto se lee a lo ancho.
        quantity = cells[0][0].replace(" ", "") if cells else ""
        money_hits = sum(1 for text, *_rest in cells if re.search(r"\d,\d{2}", text.replace(" ", "")))
        full_width = not re.fullmatch(r"\d{1,4}", quantity) or money_hits < 1 or occupied < 3
        row_y = page_height_pt - ((top + bottom) / 2) * SCALE
        if full_width:
            left = xs[0]
            right = xs[-1]
            raw = gray[top + 3 : max(bottom - 3, top + 4), left:right]
            shaded = raw.size > 0 and float(np.mean(raw)) < 170
            if shaded:
                _level, raw = cv2.threshold(raw, 75, 255, cv2.THRESH_BINARY)
            if bottom - top > 90 and not shaded:
                words, _mean = _tesseract_words(raw, 6)
                desc_left = (xs[1] - xs[0]) if len(xs) > 2 else 0
                desc_right = (xs[2] - xs[0]) if len(xs) > 2 else right - left
                words = [word for word in words if desc_left - 8 <= word[1] <= desc_right]
                bands: list[list[tuple[str, int, int, int, int, float]]] = []
                for word in sorted(words, key=lambda item: item[2]):
                    if not bands or word[2] - bands[-1][0][2] > 18:
                        bands.append([word])
                    else:
                        bands[-1].append(word)
                for band in bands:
                    text = re.sub(r"\s+", " ", " ".join(word[0] for word in band)).strip()
                    if not re.search(r"stand|hora|montaje|área|area|sal[oó]n", text, re.I):
                        continue
                    confidence = sum(word[5] for word in band) / len(band)
                    fragment = _fragment(text, left + desc_left + 6, top + band[0][2], 80, 24, confidence, "line", raw, page_height_pt)
                    fragment.y = page_height_pt - (top + band[0][2] + 12) * SCALE
                    fragment.x = max(fragment.x, 240)
                    fragments.append(fragment)
                continue
            text, confidence = _ocr(raw if shaded else _row_image(gray, top, bottom, left, right), 7)
            text = _banner_text(text) if shaded else re.sub(r"\s+", " ", text).strip()
            text = re.sub(r"^[\W_]+", "", text).strip()
            text = re.sub(r"^(?:es|o)\s+", "", text, flags=re.I).strip()
            if text:
                fragment = _fragment(text, left + 6, top, max(right - left, 40), bottom - top, confidence, "line", raw, page_height_pt)
                fragment.y = row_y
                if re.search(
                    r"alimento|personal|montaje|desmontaje|\d{4}|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo",
                    text,
                    re.I,
                ):
                    fragment.x = max(fragment.x, 240)
                fragments.append(fragment)
            continue
        for column, (text, confidence, crop, left, _right) in enumerate(cells):
            if not text:
                continue
            fragment = _fragment(text, left + 6, top, 36, bottom - top, confidence, "cell", crop, page_height_pt)
            fragment.y = row_y
            if column < len(COLUMN_X):
                fragment.x = COLUMN_X[column]
            fragments.append(fragment)
    return fragments


def _zone_fragments(
    gray: np.ndarray,
    top: int,
    bottom: int,
    page_height_pt: float,
    kind: str,
) -> list[Fragment]:
    if bottom - top < 20:
        return []
    crop = gray[top:bottom, :]
    words, _mean = _tesseract_words(crop, 6)
    fragments: list[Fragment] = []
    for text, left, word_top, width, height, confidence in words:
        fragment = _fragment(
            text,
            left,
            top + word_top,
            width,
            height,
            confidence,
            kind,
            crop[max(word_top, 0) : max(word_top + height, 1), max(left, 0) : max(left + width, 1)],
            page_height_pt,
        )
        fragments.append(fragment)
    return fragments


def _handwriting(gray: np.ndarray, ys: list[int], xs: list[int], page: int, page_height_pt: float) -> list[dict[str, object]]:
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 10)
    mask = np.zeros_like(binary)
    if ys and xs:
        mask[ys[0] : ys[-1], xs[0] : xs[-1]] = 255
    outside = cv2.bitwise_and(binary, cv2.bitwise_not(mask))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    outside = cv2.morphologyEx(outside, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(outside, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    notes: list[dict[str, object]] = []
    height, width = gray.shape[:2]
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h < 2500 or w > width * 0.85 or h > height * 0.4:
            continue
        crop = gray[y : y + h, x : x + w]
        text, confidence = _ocr(crop, 7)
        letters = re.sub(r"[^0-9A-Za-zÁÉÍÓÚáéíóúÑñ]", "", text)
        if confidence >= 55 and len(letters) >= 4:
            continue
        x_pt, y_pt = _point(x, y + h, page_height_pt)
        notes.append(
            {
                "page": page,
                "x": x_pt,
                "y": y_pt,
                "width": w * SCALE,
                "height": h * SCALE,
                "crop": _png_b64(crop),
            }
        )
    return notes


def _page_size_pts(pdf_path: Path) -> list[tuple[float, float]]:
    completed = subprocess.run(["pdfinfo", "-f", "1", "-l", "50", str(pdf_path)], capture_output=True, text=True, check=True)
    sizes: list[tuple[float, float]] = []
    for line in completed.stdout.splitlines():
        match = re.search(r"(\d+(?:\.\d+)?)\s+x\s+(\d+(?:\.\d+)?)\s+pts", line)
        if match and "size" in line.lower():
            sizes.append((float(match.group(1)), float(match.group(2))))
    if not sizes:
        raise QualityError("El archivo no es un PDF válido.")
    return sizes


def read_pdf(data: bytes) -> dict[str, object]:
    if not data.startswith(b"%PDF"):
        raise QualityError("El archivo no es un PDF válido.")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pdf_path = root / "in.pdf"
        pdf_path.write_bytes(data)
        assert_page_dpi(page_dpi(pdf_path))
        sizes = _page_size_pts(pdf_path)
        subprocess.run(
            ["pdftoppm", "-png", "-r", str(DPI), "-gray", str(pdf_path), str(root / "page")],
            check=True,
            capture_output=True,
        )
        images = sorted(root.glob("page-*.png"))
        if not images:
            raise QualityError("El archivo no es un PDF válido.")
        pages: list[dict[str, object]] = []
        handwriting: list[dict[str, object]] = []
        saw_table = False
        for index, image_path in enumerate(images):
            gray = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
            if gray is None:
                continue
            gray = _prepare(gray)
            width_pt, height_pt = sizes[min(index, len(sizes) - 1)]
            grid = detect_grid(gray)
            page_number = index + 1
            if grid is None:
                # Las páginas de cláusulas no traen tabla: no se leen como ítems.
                fragments = []
            else:
                saw_table = True
                ys, xs = grid
                fragments = _read_table(gray, ys, xs, height_pt)
                fragments = (
                    _zone_fragments(gray, 0, max(ys[0] - 4, 0), height_pt, "header")
                    + fragments
                    + _zone_fragments(gray, min(ys[-1] + 4, gray.shape[0] - 1), gray.shape[0], height_pt, "line")
                )
                handwriting.extend(_handwriting(gray, ys, xs, page_number, height_pt))
            pages.append(
                {
                    "page": page_number,
                    "widthPt": width_pt,
                    "heightPt": height_pt,
                    "fragments": [fragment.__dict__ for fragment in fragments if fragment.text],
                }
            )
        if not saw_table:
            raise QualityError(no_table_message())
        return {"pages": pages, "handwriting": handwriting}


def column_count(gray: np.ndarray) -> int:
    grid = detect_grid(_prepare(gray))
    if grid is None:
        return 0
    _ys, xs = grid
    return max(len(xs) - 1, 0)
