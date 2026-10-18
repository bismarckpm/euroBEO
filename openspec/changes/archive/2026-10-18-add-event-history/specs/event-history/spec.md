# Spec Delta

## Purpose

Historial de eventos procesados que permite buscarlos, reabrirlos, regenerar documentos como nuevas versiones, comparar versiones y anular B.E.O.

## ADDED Requirements

### Requirement: Lista y búsqueda de eventos
El sistema MUST listar los eventos procesados con su estado (en revisión, generado) y MUST permitir buscarlos por cliente, nombre del evento, fecha y localizador.

#### Scenario: Buscar por cliente
- **WHEN** la asistente busca "Leti"
- **THEN** aparece el evento MED URO de Laboratorios Leti con su estado

### Requirement: Reabrir y regenerar
La asistente MUST poder reabrir un evento generado, editar una o varias B.E.O. o memorándums y regenerarlos como nueva versión conservando su número.

#### Scenario: Cambio de último momento
- **WHEN** la asistente cambia el horario de la B.E.O. 0.935 y la regenera
- **THEN** se crea la versión 2 de la B.E.O. 0.935 y se sube al Drive con sufijo v2

### Requirement: Versiones conservadas
El sistema MUST conservar cada versión generada de un documento con su fecha y MUST permitir descargarla y compararla con la versión anterior, mostrando los campos que cambiaron.

#### Scenario: Comparar versiones
- **WHEN** la asistente compara la versión 2 con la versión 1 de una B.E.O.
- **THEN** ve solo los campos modificados con su valor anterior y nuevo

### Requirement: Anulación de B.E.O.
La asistente MUST poder anular una B.E.O.; el número anulado MUST quedar registrado como usado y MUST NOT reasignarse.

#### Scenario: Anular una B.E.O.
- **WHEN** la asistente anula la B.E.O. 0.950
- **THEN** la B.E.O. queda marcada como anulada, se excluye de la descarga y el próximo número propuesto no es 0.950
