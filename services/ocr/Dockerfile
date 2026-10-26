FROM debian:bookworm-slim

# Tesseract queda fijado a 5.3.0, el paquete tesseract-ocr 5.3.0-2 de Debian bookworm.
# OpenCV queda fijado a 4.6.0, el paquete python3-opencv 4.6.0+dfsg-12 de Debian bookworm.
# Al cambiar cualquiera de las dos hay que volver a medir el escaneo de Calox.
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-opencv=4.6.0+dfsg-12 \
    tesseract-ocr=5.3.0-2 \
    tesseract-ocr-osd \
    poppler-utils \
    ca-certificates \
    libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

# spa.traineddata de tessdata_best, copiado en la construcción. No se descarga al leer un PDF.
ARG TESSDATA_BEST_COMMIT=e12c65a915945e4c28e237a9b52bc4a8f39a0cec
ADD https://github.com/tesseract-ocr/tessdata_best/raw/${TESSDATA_BEST_COMMIT}/spa.traineddata /usr/share/tesseract-ocr/5/tessdata/spa.traineddata
RUN chmod 644 /usr/share/tesseract-ocr/5/tessdata/spa.traineddata
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

WORKDIR /app
COPY requirements.txt .
RUN python3 -m venv --system-site-packages /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH=/opt/venv/bin:$PATH
COPY app ./app
COPY tests ./tests
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
