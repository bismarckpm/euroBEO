# Spec Delta

## ADDED Requirements

### Requirement: Servicio de OCR en el despliegue local
Docker Compose MUST incluir un servicio de OCR (Python con OpenCV y Tesseract con el idioma español) accesible solo desde la aplicación dentro de la red interna, y la aplicación MUST seguir funcionando para PDF digitales si el servicio de OCR no está disponible.

#### Scenario: OCR caído
- **WHEN** el servicio de OCR no responde y se sube un PDF escaneado
- **THEN** el sistema informa que el escaneo no se puede procesar en ese momento y los PDF digitales siguen funcionando
