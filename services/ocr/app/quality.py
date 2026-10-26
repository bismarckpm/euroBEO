"""Resolución efectiva y rechazo cuando no hay tabla."""

from __future__ import annotations

import subprocess
from pathlib import Path


class QualityError(Exception):
    """El escaneo no cumple la calidad mínima."""


def page_dpi(pdf_path: Path) -> dict[int, float]:
    """ppp de la imagen embebida en cada página. Sin imagen, la página no aporta ppp."""
    completed = subprocess.run(
        ["pdfimages", "-list", str(pdf_path)],
        capture_output=True,
        text=True,
        check=True,
    )
    dpi: dict[int, float] = {}
    for line in completed.stdout.splitlines():
        parts = line.split()
        if len(parts) < 14 or not parts[0].isdigit():
            continue
        page = int(parts[0])
        try:
            ppi = min(float(parts[-4]), float(parts[-3]))
        except ValueError:
            continue
        if ppi <= 0:
            continue
        current = dpi.get(page)
        dpi[page] = ppi if current is None else min(current, ppi)
    return dpi


def assert_page_dpi(dpi_by_page: dict[int, float]) -> None:
    for page, dpi in sorted(dpi_by_page.items()):
        if dpi < 150:
            raise QualityError(
                f"La página {page} tiene una resolución de {dpi:.0f} ppp, menor a 150. "
                "Hace falta un escaneo o una foto más nítida, o el PDF digital.",
            )


def no_table_message() -> str:
    return (
        "No se detectó la tabla del presupuesto. "
        "Hace falta un escaneo o una foto más nítida, o el PDF digital."
    )
