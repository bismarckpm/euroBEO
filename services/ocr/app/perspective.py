"""Contorno de la hoja y corrección de perspectiva.

Las pruebas usan deformaciones sintéticas del escaneo. No validan fotos reales de celular.
"""

from __future__ import annotations

import cv2
import numpy as np


def _order_quad(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    summed = points.sum(axis=1)
    diff = np.diff(points, axis=1).reshape(-1)
    rect[0] = points[np.argmin(summed)]
    rect[2] = points[np.argmax(summed)]
    rect[1] = points[np.argmin(diff)]
    rect[3] = points[np.argmax(diff)]
    return rect


def find_page_quad(gray: np.ndarray) -> np.ndarray | None:
    """Cuadrilátero de la hoja si no ocupa ya casi toda la imagen."""
    height, width = gray.shape[:2]
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    contour = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(contour)
    if area < 0.2 * width * height or area > 0.92 * width * height:
        return None
    perimeter = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
    if len(approx) != 4:
        return None
    return _order_quad(approx.reshape(4, 2).astype("float32"))


def correct_perspective(gray: np.ndarray) -> np.ndarray:
    """Endereza la hoja cuando hay fondo alrededor. Un escaneo a sangre se deja igual."""
    quad = find_page_quad(gray)
    if quad is None:
        return gray
    width_top = float(np.linalg.norm(quad[1] - quad[0]))
    width_bottom = float(np.linalg.norm(quad[2] - quad[3]))
    height_left = float(np.linalg.norm(quad[3] - quad[0]))
    height_right = float(np.linalg.norm(quad[2] - quad[1]))
    width = max(int(max(width_top, width_bottom)), 1)
    height = max(int(max(height_left, height_right)), 1)
    destination = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(quad, destination)
    return cv2.warpPerspective(gray, matrix, (width, height), flags=cv2.INTER_CUBIC, borderValue=255)


def warp_for_test(gray: np.ndarray) -> np.ndarray:
    """Rota y deforma el raster sobre un fondo. Solo para la prueba sintética."""
    height, width = gray.shape[:2]
    source = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype="float32")
    canvas_w = int(width * 1.25)
    canvas_h = int(height * 1.25)
    destination = np.array(
        [
            [int(width * 0.08), int(height * 0.04)],
            [canvas_w - int(width * 0.04), int(height * 0.1)],
            [canvas_w - int(width * 0.1), canvas_h - int(height * 0.05)],
            [int(width * 0.05), canvas_h - int(height * 0.12)],
        ],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(source, destination)
    warped = cv2.warpPerspective(gray, matrix, (canvas_w, canvas_h), borderValue=0)
    canvas = np.full((canvas_h, canvas_w), 170, np.uint8)
    mask = warped > 0
    canvas[mask] = warped[mask]
    center = (canvas_w / 2, canvas_h / 2)
    rotation = cv2.getRotationMatrix2D(center, 4.0, 1.0)
    return cv2.warpAffine(canvas, rotation, (canvas_w, canvas_h), flags=cv2.INTER_CUBIC, borderValue=170)
