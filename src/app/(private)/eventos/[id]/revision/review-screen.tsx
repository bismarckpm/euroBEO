"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  EventReview,
  ReviewBeo,
  ReviewField,
  ReviewLine,
  ReviewMemo,
} from "@/lib/event-review";
import { generateButtonState } from "@/core/documents/validate-beo";
import {
  adjacentWizardStep,
  beoNeedsReview,
  describeGeneratedFile,
  wizardSequence,
  wizardStepHref,
  type WizardStep,
} from "@/core/review/guide";
import { formatAmount } from "@/lib/format";

const FIELD_LABELS: Record<string, string> = {
  company: "Compañía",
  contact: "Contacto",
  phone: "Teléfono",
  address: "Dirección",
  weekday: "Día",
  formattedDate: "Fecha",
  schedule: "Horario",
  eventType: "Evento",
  salonName: "Salón",
  guarantee: "Garantía",
  rentCents: "Renta de salón",
  billboard: "Cartelera",
  setup: "Montaje",
  specialInstructions: "Instrucciones especiales",
  servicePreparation: "Preparación del servicio",
  numero: "Número del memorándum",
  fecha: "Fecha",
  para: "Para",
  empresa: "Empresa",
  de: "De",
  cargo: "Cargo",
  referencia: "Referencia",
  cuerpo: "Cuerpo",
};

const HEADER_KEYS = ["weekday", "formattedDate", "schedule", "eventType", "salonName"];
const SUMMARY_KEYS = ["guarantee", "rentCents", "billboard", "setup"];
const NOTE_KEYS = [
  "specialInstructions",
  "servicePreparation",
  "company",
  "contact",
  "phone",
  "address",
];
const RIGHT_SECTIONS = [
  "BEBIDAS",
  "ACCESOS",
  "DESCORCHE",
  "SISTEMAS",
  "MOBILIARIO",
  "ELECTRICIDAD",
  "PERSONAL",
  "PENDIENTE",
];
const KIND_LABEL: Record<string, string> = {
  MONTAJE: "Montaje",
  EVENTO: "Evento",
  DESMONTAJE: "Desmontaje",
};

function stepNumber(steps: WizardStep[], current: WizardStep): number {
  const index = steps.findIndex((item) => {
    if (item.kind !== current.kind) return false;
    if (item.kind === "beo" && current.kind === "beo") return item.id === current.id;
    if (item.kind === "memo" && current.kind === "memo") return item.id === current.id;
    return true;
  });
  return index + 1;
}

function shownValue(key: string, value: string | null): string {
  if (value === null) return "";
  if (key === "rentCents" && /^-?\d+$/.test(value)) return formatAmount(Number(value));
  return value;
}

function badge(status: string): string {
  if (status === "AI") return "IA";
  if (status === "PENDING") return "Pendiente";
  if (status === "ABSENT") return "Sin dato";
  if (status === "REVIEW") return "Revisar";
  if (status === "VALIDATE") return "Validar";
  return "";
}

function needsAction(status: string): boolean {
  return status === "PENDING" || status === "AI" || status === "REVIEW";
}

type GeneratedFile = {
  id: string;
  fileName: string;
  number: string;
  exceedsPage: boolean;
  kind?: string;
  beoId?: string | null;
  driveStatus?: string;
  driveUrl?: string | null;
  version?: number;
  createdAt?: string;
  voided?: boolean;
  earlier?: { id: string; version: number; createdAt: string }[];
};

type FieldChange = { key: string; before: string | null; after: string | null };

function fieldLabel(key: string): string {
  if (key.startsWith("linea:")) return "Línea";
  return FIELD_LABELS[key] ?? key;
}

function rowFor(review: EventReview, file: GeneratedFile) {
  const beo = review.beos.find((item) => item.id === file.beoId);
  return describeGeneratedFile({
    event: review.title,
    number: file.number,
    kind: file.kind ?? (file.beoId ? "beo" : "memo"),
    beo: beo ? { salon: beo.salon, date: beo.date, kind: beo.kind } : null,
  });
}

function driveLabel(status: string | undefined): string {
  if (status === "subido") return "Subido";
  if (status === "error") return "Error al subir";
  return "Pendiente de subir";
}

function tone(status: string): string {
  if (status === "AI") return "field-ai";
  if (status === "ABSENT") return "field-absent";
  if (status === "PENDING" || status === "REVIEW" || status === "VALIDATE") return "field-pending";
  return "field-rule";
}

function AmountAlert({
  issue,
  onCorrect,
  onReview,
}: {
  issue: EventReview["arithmetic"][number];
  onCorrect: (value: string) => void;
  onReview: () => void;
}) {
  const [value, setValue] = useState(formatAmount(issue.printed));
  return (
    <div data-testid="alerta-monto">
      <p className="alert">{issue.message}</p>
      {issue.reviewed ? (
        <p>Revisada</p>
      ) : (
        <div className="form-inline">
          <label>
            Valor
            <input
              aria-label={`Valor de ${issue.cell}`}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <button type="button" onClick={() => onCorrect(value)}>
            Corregir
          </button>
          <button type="button" onClick={onReview}>
            Revisada
          </button>
        </div>
      )}
    </div>
  );
}

export function ReviewScreen({
  initial,
  step,
  announced = false,
}: {
  initial: EventReview;
  step: WizardStep;
  announced?: boolean;
}) {
  const router = useRouter();
  const [review, setReview] = useState(initial);
  const [selectedId, setSelectedId] = useState(step.kind === "beo" ? step.id : initial.beos[0]?.id ?? "");
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    announced ? "Se inició la generación de los documentos del evento." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(initial.shared);
  const [splitSalon, setSplitSalon] = useState("");
  const [splitLines, setSplitLines] = useState<string[]>([]);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [acknowledge, setAcknowledge] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);
  const [chosenBeos, setChosenBeos] = useState<string[]>([]);
  const [chosenMemos, setChosenMemos] = useState<string[]>([]);
  const [changes, setChanges] = useState<FieldChange[] | null>(null);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);
  const requestId = useRef(0);
  const pendingSaves = useRef(0);
  const saveIdle = useRef<Array<() => void>>([]);
  const numbered = review.beos.filter((beo) => beo.status !== "voided");
  const beoState = review.beos.map((beo) => `${beo.id}:${beo.status}`).join();
  const selected =
    (step.kind === "beo" ? review.beos.find((beo) => beo.id === step.id) : undefined) ??
    review.beos.find((beo) => beo.id === selectedId) ??
    review.beos[0];
  const selectedMemo =
    (step.kind === "memo" ? review.memos.find((memo) => memo.id === step.id) : undefined) ??
    review.memos.find((memo) => memo.id === selectedMemoId) ??
    null;
  const guideInput = {
    beos: review.beos,
    issues: review.issues,
    memos: review.memos.map((memo) => ({ id: memo.id, pendingCount: memo.pendingCount })),
  };
  const sequence = wizardSequence(guideInput);
  const previousStep = adjacentWizardStep(guideInput, step, -1);
  const nextStep = adjacentWizardStep(guideInput, step, 1);

  useEffect(() => {
    if (review.pendingCount > 0) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/events/${review.eventId}/documents`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          suggested: string[];
          files: GeneratedFile[];
          driveMessage?: string | null;
        };
      })
      .then((data) => {
        if (!data || cancelled) return;
        setFiles(data.files);
        setDriveNotice(data.files.length > 0 ? (data.driveMessage ?? null) : null);
        setNumbers((current) =>
          current.length === data.suggested.length ? current : data.suggested,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [review.eventId, review.pendingCount, beoState]);

  function releaseSave(): void {
    pendingSaves.current = Math.max(0, pendingSaves.current - 1);
    if (pendingSaves.current > 0) return;
    const waiting = saveIdle.current.splice(0);
    for (const resolve of waiting) resolve();
  }

  function whenSavesFinish(): Promise<void> {
    if (pendingSaves.current === 0) return Promise.resolve();
    return new Promise((resolve) => {
      saveIdle.current.push(resolve);
    });
  }

  async function send(body: Record<string, unknown>, notice?: string) {
    const id = requestId.current + 1;
    requestId.current = id;
    setError(null);
    const locksButton =
      body.action === "generate" ||
      body.action === "regenerate-selected" ||
      body.action === "regenerate-memo";
    if (locksButton) setBusy(true);
    else pendingSaves.current += 1;
    try {
      const response = await fetch(`/api/events/${review.eventId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as
        | (EventReview & {
            message?: string;
            started?: boolean;
            files?: GeneratedFile[];
            driveMessage?: string | null;
          })
        | null;
      if (id !== requestId.current) return false;
      if (!response.ok || !data) {
        if (response.status === 409 && (data?.message ?? "").includes("ya fue usado")) {
          setAcknowledge(true);
        }
        setError(data?.message ?? "No se pudo guardar.");
        return false;
      }
      if (data.started) {
        setFiles(data.files ?? []);
        setDriveNotice(data.driveMessage ?? null);
        setAcknowledge(false);
        setMessage(notice ?? "Se inició la generación de los documentos del evento.");
        const refreshed = await fetch(`/api/events/${review.eventId}/review`);
        if (id !== requestId.current) return false;
        if (refreshed.ok) {
          const next = (await refreshed.json()) as EventReview;
          setReview(next);
          setShared(next.shared);
        }
        return true;
      }
      if (data.files) {
        setFiles(data.files);
        setDriveNotice(data.driveMessage ?? null);
      }
      setReview(data);
      setShared(data.shared);
      if (!data.beos.some((beo) => beo.id === selectedId)) {
        setSelectedId(data.beos[0]?.id ?? "");
      }
      if (selectedMemoId && !data.memos.some((memo) => memo.id === selectedMemoId)) {
        setSelectedMemoId(null);
      }
      setMessage(notice ?? null);
      return true;
    } catch {
      if (id !== requestId.current) return false;
      setError("No se pudo conectar con el servidor.");
      return false;
    } finally {
      if (!locksButton) releaseSave();
      if (locksButton && id === requestId.current) setBusy(false);
    }
  }

  async function generateDocuments(scope: "beos" | "memos" | "both") {
    if (busy || generateButtonState(review).disabled) return;
    setBusy(true);
    await whenSavesFinish();
    const notice =
      scope === "beos"
        ? "Se inició la generación de las B.E.O."
        : scope === "memos"
          ? "Se inició la generación del memorándum."
          : "Se inició la generación de los documentos del evento.";
    const started = await send(
      { action: "generate", numbers: scope === "memos" ? undefined : numbers, acknowledge, scope },
      notice,
    );
    if (started) {
      router.push(`${wizardStepHref(review.eventId, { kind: "archivos" })}?listo=1`);
    }
  }

  async function saveOcr(key: string, value: string) {
    await send({ action: "edit-ocr-field", key, value });
  }

  async function confirmOcr(key: string) {
    await send({ action: "validate-ocr-field", key });
  }

  async function confirmShared() {
    for (const key of ["billboard", "company", "contact", "phone"] as const) {
      await send({ action: "update-shared", key, value: shared[key] ?? "" });
    }
    setMessage("Datos del evento replicados.");
  }

  async function compare(documentId: string) {
    const response = await fetch(`/api/events/${review.eventId}/documents/${documentId}/compare`);
    const data = (await response.json()) as { changes?: FieldChange[]; message?: string | null };
    setChanges(data.changes ?? []);
    setCompareMessage(data.message ?? null);
  }

  return (
    <main className="panel review">
      <header className="review-heading">
        <div>
          <h1>
            {step.kind === "datos"
              ? "Datos del evento"
              : step.kind === "beo"
                ? "B.E.O."
                : step.kind === "memo"
                  ? "Memorándum"
                  : step.kind === "generar"
                    ? "Generar"
                    : "Archivos"}
          </h1>
          <p className="lede">{review.title}</p>
        </div>
        <div className="review-actions">
          <p data-testid="pendientes-evento">
            {review.pendingCount === 0 ? "Sin pendientes" : `Faltan ${review.pendingCount}`}
          </p>
          <div data-testid="guia-revision">
            <p>{`Paso ${stepNumber(sequence, step)} de ${sequence.length}. Siguiente salta las que ya están en cero.`}</p>
            {previousStep ? (
              <Link href={wizardStepHref(review.eventId, previousStep)} data-testid="beo-anterior">
                Anterior
              </Link>
            ) : null}
            {nextStep ? (
              <Link href={wizardStepHref(review.eventId, nextStep)} data-testid="beo-siguiente">
                Siguiente
              </Link>
            ) : null}
          </div>
          {step.kind === "generar" && numbers[0] ? (
            <p data-testid="siguiente-numero">Siguiente número {numbers[0]}</p>
          ) : null}
          {step.kind === "generar" && review.pendingCount === 0 ? (
            <div className="form-inline" data-testid="numeros-beo">
              {numbered.map((beo, index) => (
                <label key={beo.id}>
                  {`Número ${index + 1}`}
                  <input
                    aria-label={`Número ${index + 1}`}
                    value={numbers[index] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAcknowledge(false);
                      setNumbers((current) => {
                        const next = numbered.map((_, itemIndex) => current[itemIndex] ?? "");
                        next[index] = value;
                        return next;
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}
          {step.kind === "generar" ? (
          <>
          <button
            type="button"
            data-testid="generar-beo"
            disabled={busy || generateButtonState(review).disabled}
            onClick={() => void generateDocuments("beos")}
          >
            {busy ? "Generando…" : "Generar B.E.O."}
          </button>
          <button
            type="button"
            data-testid="generar-memo"
            disabled={busy || generateButtonState(review).disabled}
            onClick={() => void generateDocuments("memos")}
          >
            {busy ? "Generando…" : "Generar memorándum"}
          </button>
          <button
            type="button"
            data-testid="generar-ambos"
            disabled={busy || generateButtonState(review).disabled}
            onClick={() => void generateDocuments("both")}
          >
            {busy ? "Generando…" : "Generar ambos"}
          </button>
          </>
          ) : null}
          {step.kind === "archivos" ? (
          <button
            type="button"
            data-testid="regenerar-seleccion"
            disabled={chosenBeos.length + chosenMemos.length === 0}
            onClick={() =>
              void send(
                { action: "regenerate-selected", beoIds: chosenBeos, memoIds: chosenMemos },
                "Se regeneró la selección.",
              )
            }
          >
            Regenerar seleccionados
          </button>
          ) : null}
        </div>
      </header>
      <div className="review-layout">
        <nav className="review-nav" aria-label="Documentos del evento">
          <h2>Pasos</h2>
          <Link
            href={wizardStepHref(review.eventId, { kind: "datos" })}
            data-testid="paso-datos"
            aria-current={step.kind === "datos" ? "page" : undefined}
          >
            Datos del evento
          </Link>
          <h2>B.E.O.</h2>
          {review.beos.map((beo) => (
            <div key={beo.id}>
              <Link
                href={wizardStepHref(review.eventId, { kind: "beo", id: beo.id })}
                data-testid="beo-nav"
                className={beoNeedsReview(beo, review.issues) ? "needs-review" : undefined}
                aria-current={step.kind === "beo" && step.id === beo.id ? "page" : undefined}
              >
                <span>
                  {beo.date.slice(8)}.{beo.date.slice(5, 7)}.{beo.date.slice(0, 4)} · {beo.salon}
                </span>
                <small>
                  {beo.status === "voided" ? "Anulada" : (KIND_LABEL[beo.kind] ?? beo.kind)} ·{" "}
                  {beo.pendingCount}
                  {beo.version > 1 ? ` · v${beo.version}` : ""}
                  {beoNeedsReview(beo, review.issues) ? (
                    <>
                      {" "}
                      · <strong data-testid="senal-revisar">Revisar</strong>
                    </>
                  ) : null}
                </small>
              </Link>
              {step.kind === "archivos" && beo.status === "generated" ? (
                <label>
                  <input
                    type="checkbox"
                    data-testid="elegir-regenerar"
                    checked={chosenBeos.includes(beo.id)}
                    onChange={() =>
                      setChosenBeos((current) =>
                        current.includes(beo.id)
                          ? current.filter((id) => id !== beo.id)
                          : [...current, beo.id],
                      )
                    }
                  />
                  Regenerar
                </label>
              ) : null}
              {beo.status === "generated" ? (
                <button
                  type="button"
                  data-testid="anular-beo"
                  onClick={() =>
                    void send({ action: "void-beo", beoId: beo.id }, "Se anuló la B.E.O.")
                  }
                >
                  Anular
                </button>
              ) : null}
            </div>
          ))}
          <Link
            href={wizardStepHref(review.eventId, { kind: "generar" })}
            data-testid="paso-generar"
            aria-current={step.kind === "generar" ? "page" : undefined}
          >
            Generar
          </Link>
          <Link
            href={wizardStepHref(review.eventId, { kind: "archivos" })}
            data-testid="paso-archivos"
            aria-current={step.kind === "archivos" ? "page" : undefined}
          >
            Archivos
          </Link>
          <h2>Memorándums</h2>
          {review.memos.length === 0 ? <p>Ninguno</p> : null}
          {review.memos.map((memo) => (
            <div key={memo.id}>
              <Link
                href={wizardStepHref(review.eventId, { kind: "memo", id: memo.id })}
                data-testid="memo-nav"
                aria-current={step.kind === "memo" && step.id === memo.id ? "page" : undefined}
              >
                <span>
                  {memo.name}
                  {memo.stale ? " · desactualizado" : ""}
                </span>
                <small>
                  {memo.pendingCount}
                  {memo.version > 1 ? ` · v${memo.version}` : ""}
                </small>
              </Link>
              {step.kind === "archivos" && memo.generated ? (
                <label>
                  <input
                    type="checkbox"
                    data-testid="elegir-memo"
                    checked={chosenMemos.includes(memo.id)}
                    onChange={() =>
                      setChosenMemos((current) =>
                        current.includes(memo.id)
                          ? current.filter((id) => id !== memo.id)
                          : [...current, memo.id],
                      )
                    }
                  />
                  Regenerar
                </label>
              ) : null}
            </div>
          ))}
          <AddMemo
            types={review.memoTypes.filter(
              (type) => !review.memos.some((memo) => memo.memoTypeId === type.id),
            )}
            onAdd={(memoTypeId) =>
              void send({ action: "add-memo", memoTypeId }, "Memorándum agregado.")
            }
          />
        </nav>
        <div className="review-step">
      {(step.kind === "generar" || step.kind === "beo") && generateButtonState(review).messages.length > 0 ? (
        <ul className="alert" data-testid="errores-validacion">
          {review.issues.map((issue) => (
            <li key={`${issue.beo}-${issue.field}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {step.kind === "beo" ? (
      <form
        className="form-inline"
        data-testid="caso-dorado"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem("referencia");
          if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
            setError("Adjunta la B.E.O. corregida en .docx o PDF.");
            return;
          }
          const body = new FormData();
          body.set("referencia", input.files[0]);
          void fetch(`/api/events/${review.eventId}/golden`, { method: "POST", body })
            .then(async (response) => {
              const data = (await response.json()) as { message?: string };
              if (!response.ok) {
                setError(data.message ?? "No se pudo guardar el caso dorado.");
                return;
              }
              setReview((current) => ({ ...current, goldenCandidate: true }));
              setMessage(data.message ?? "El evento quedó como caso dorado candidato.");
              setError(null);
            })
            .catch(() => setError("No se pudo guardar el caso dorado."));
        }}
      >
        <label>
          B.E.O. corregida
          <input name="referencia" type="file" accept=".docx,.pdf,application/pdf" />
        </label>
        <button type="submit">
          {review.goldenCandidate ? "Caso dorado candidato" : "Marcar como caso dorado"}
        </button>
      </form>
      ) : null}
      {error ? <p className="alert">{error}</p> : null}
      {message ? (
        <p className="notice" data-testid="generacion">
          {message}
        </p>
      ) : null}
      {step.kind === "archivos" && files.length > 0 ? (
        <section className="downloads" data-testid="descargas">
          {driveNotice ? <p data-testid="drive-aviso">{driveNotice}</p> : null}
          <table data-testid="tabla-archivos">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Número</th>
                <th>Lugar</th>
                <th>Fecha</th>
                <th>Contenido</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const row = rowFor(review, file);
                return (
                  <tr key={file.id} data-testid="fila-archivo">
                    <td>{row.event}</td>
                    <td>{row.number}</td>
                    <td>{row.salon}</td>
                    <td>{row.date}</td>
                    <td>{row.content}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {files.map((file) => (
            <p key={file.id}>
              {file.voided ? (
                <span>{file.fileName} Anulada</span>
              ) : (
                <>
                  <a href={`/api/events/${review.eventId}/documents/${file.id}?format=docx`}>
                    {file.fileName}
                  </a>{" "}
                  <a href={`/api/events/${review.eventId}/documents/${file.id}?format=pdf`}>PDF</a>
                </>
              )}{" "}
              <span>
                v{file.version ?? 1}
                {file.createdAt ? ` · ${file.createdAt}` : ""}
              </span>
              {file.exceedsPage ? " Excede una página" : ""}{" "}
              <span data-testid="estado-drive">{driveLabel(file.driveStatus)}</span>
              {file.driveStatus === "subido" && file.driveUrl ? (
                <>
                  {" "}
                  <a
                    href={file.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="enlace-drive"
                  >
                    Abrir en Drive
                  </a>
                </>
              ) : null}
              {!file.voided &&
              (file.driveStatus === "error" ||
                file.driveStatus === "pendiente" ||
                !file.driveStatus) ? (
                <>
                  {" "}
                  <button
                    type="button"
                    data-testid="reintentar-drive"
                    onClick={() =>
                      void send(
                        { action: "retry-drive", documentId: file.id },
                        "Se reintentó la subida a Drive.",
                      )
                    }
                  >
                    Reintentar
                  </button>
                </>
              ) : null}
              {(file.version ?? 1) > 1 ? (
                <>
                  {" "}
                  <button
                    type="button"
                    data-testid="comparar-version"
                    onClick={() => void compare(file.id)}
                  >
                    Comparar
                  </button>
                </>
              ) : null}
              {file.earlier?.map((version) => (
                <span key={version.id}>
                  {" "}
                  <a href={`/api/events/${review.eventId}/documents/${version.id}?format=docx`}>
                    v{version.version}
                  </a>
                </span>
              ))}
            </p>
          ))}
          {changes ? (
            <div data-testid="diferencias">
              {compareMessage ? <p>{compareMessage}</p> : null}
              {changes.length === 0 && !compareMessage ? <p>No hay campos modificados.</p> : null}
              {changes.map((change) => (
                <p key={change.key}>
                  {fieldLabel(change.key)}: {change.before ?? "—"} → {change.after ?? "—"}
                </p>
              ))}
            </div>
          ) : null}
          <a href={`/api/events/${review.eventId}/documents/archive`}>Descargar todo</a>
        </section>
      ) : null}

      {step.kind === "datos" && review.arithmetic.length > 0 ? (
        <section data-testid="alertas-montos">
          <h2>Alertas de montos</h2>
          {review.arithmetic.map((issue) => (
            <AmountAlert
              key={`${issue.equation}-${issue.cell}-${issue.printed}-${issue.reviewed}`}
              issue={issue}
              onCorrect={(value) =>
                void send({ action: "correct-amount-alert", equation: issue.equation, cell: issue.cell, value })
              }
              onReview={() => void send({ action: "review-amount-alert", equation: issue.equation, cell: issue.cell })}
            />
          ))}
        </section>
      ) : null}

      {step.kind === "datos" && review.ocrFields.length > 0 ? (
        <section data-testid="lectura-escaneo">
          <h2>Lectura del escaneo</h2>
          {review.handwriting.map((note) => (
            <p key={note.cropId} data-testid="manuscrito">
              {note.message}
              <img
                className="ocr-crop"
                src={`/api/events/${review.eventId}/crops/${note.cropId}`}
                alt="Recorte manuscrito"
              />
            </p>
          ))}
          {review.ocrFields.map((field) => {
            const highlighted = field.status === "VALIDATE";
            return (
              <label
                key={field.key}
                className={`review-field ${highlighted ? "field-pending" : "field-rule"}`}
                data-testid="campo"
              >
                <span>
                  {field.label}
                  {highlighted ? <em className="badge">Validar</em> : null}
                </span>
                {field.amountVerified ? <small>Monto verificado</small> : null}
                {field.cropId ? (
                  <img
                    className="ocr-crop"
                    src={`/api/events/${review.eventId}/crops/${field.cropId}`}
                    alt=""
                  />
                ) : null}
                <input
                  aria-label={field.label}
                  defaultValue={field.value}
                  key={`${field.key}-${field.value}-${field.status}`}
                  onBlur={(event) => void saveOcr(field.key, event.target.value)}
                />
                {highlighted ? (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void confirmOcr(field.key)}
                  >
                    Validar
                  </button>
                ) : null}
              </label>
            );
          })}
        </section>
      ) : null}

      {step.kind === "datos" ? (
      <section className="review-shared" data-testid="datos-compartidos">
        <h2>Datos del evento</h2>
        <div className="form-inline">
          {(["billboard", "company", "contact", "phone"] as const).map((key) => (
            <label key={key}>
              {FIELD_LABELS[key]} del evento
              <input
                aria-label={`${FIELD_LABELS[key]} del evento`}
                value={shared[key] ?? ""}
                onChange={(event) =>
                  setShared((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </label>
          ))}
          <button type="button" onClick={() => void confirmShared()}>
            Confirmar datos del evento
          </button>
        </div>
      </section>
      ) : null}


        {step.kind === "memo" && selectedMemo ? (
          <MemoView
            memo={selectedMemo}
            onField={(key, value) =>
              void send({ action: "update-memo-field", memoId: selectedMemo.id, key, value })
            }
            onValidate={(key) =>
              void send({ action: "validate-memo-field", memoId: selectedMemo.id, key })
            }
            onRegenerate={() =>
              void send(
                { action: "regenerate-memo", memoId: selectedMemo.id },
                "Se regeneró el memorándum.",
              )
            }
          />
        ) : step.kind === "beo" && selected ? (
          <BeoView
            beo={selected}
            others={review.beos.filter(
              (beo) => beo.id !== selected.id && beo.date === selected.date,
            )}
            splitSalon={splitSalon}
            splitLines={splitLines}
            onSplitSalon={setSplitSalon}
            onToggleLine={(lineId) =>
              setSplitLines((current) =>
                current.includes(lineId)
                  ? current.filter((id) => id !== lineId)
                  : [...current, lineId],
              )
            }
            onField={(key, value, remember) =>
              void send({ action: "update-field", beoId: selected.id, key, value, remember })
            }
            onValidate={(key) => void send({ action: "validate-field", beoId: selected.id, key })}
            onLine={(line, qty, description, unitPrice) =>
              void send({
                action: "update-line",
                lineId: line.id,
                qty,
                description,
                unitPrice,
                section: line.section,
              })
            }
            onDelete={(lineId) => void send({ action: "delete-line", lineId })}
            onAdd={(section, groupName, qty, description, unitPrice) =>
              void send({
                action: "add-line",
                beoId: selected.id,
                section,
                groupName,
                qty,
                description,
                unitPrice,
              })
            }
            onMerge={(sourceId) => void send({ action: "merge", targetId: selected.id, sourceId })}
            onSplit={() =>
              void send({
                action: "split",
                beoId: selected.id,
                salon: splitSalon,
                lineIds: splitLines,
              })
            }
          />
        ) : step.kind === "beo" ? (
          <p>Este evento no tiene B.E.O. propuestas.</p>
        ) : null}
        </div>
      </div>
    </main>
  );
}

function AddMemo({
  types,
  onAdd,
}: {
  types: { id: string; name: string }[];
  onAdd: (memoTypeId: string) => void;
}) {
  const [memoTypeId, setMemoTypeId] = useState(types[0]?.id ?? "");
  if (types.length === 0) {
    return null;
  }
  return (
    <div className="form-inline">
      <label>
        Tipo
        <select
          aria-label="Tipo de memorándum"
          value={memoTypeId}
          onChange={(event) => setMemoTypeId(event.target.value)}
        >
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" data-testid="agregar-memo" onClick={() => onAdd(memoTypeId)}>
        Agregar memorándum
      </button>
    </div>
  );
}

function MemoView({
  memo,
  onField,
  onValidate,
  onRegenerate,
}: {
  memo: ReviewMemo;
  onField: (key: string, value: string) => void;
  onValidate: (key: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <article className="beo-sheet">
      <h2>{memo.name}</h2>
      <p data-testid="pendientes-memo">{memo.pendingCount} pendientes</p>
      {memo.stale ? (
        <p className="alert" data-testid="memo-desactualizado">
          El memorándum puede estar desactualizado.
          <button type="button" data-testid="regenerar-memo" onClick={onRegenerate}>
            Regenerar memorándum
          </button>
        </p>
      ) : null}
      {memo.fields.map((field) => {
        const open = needsAction(field.status);
        const mark = badge(field.status);
        const label = FIELD_LABELS[field.key] ?? field.key;
        return (
          <label
            key={field.id}
            className={`review-field ${tone(field.status)}`}
            data-testid={open ? "campo-abierto" : "campo"}
          >
            <span>
              {label}
              {mark ? <em className="badge">{mark}</em> : null}
            </span>
            {field.key === "cuerpo" ? (
              <textarea
                aria-label={label}
                defaultValue={field.value ?? ""}
                key={`${field.id}-${field.value}-${field.status}`}
                onBlur={(event) => onField(field.key, event.target.value)}
              />
            ) : (
              <input
                aria-label={label}
                defaultValue={field.value ?? ""}
                key={`${field.id}-${field.value}-${field.status}`}
                onBlur={(event) => onField(field.key, event.target.value)}
              />
            )}
            {field.status === "AI" || field.status === "REVIEW" || field.status === "VALIDATE" ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onValidate(field.key)}
              >
                Validar
              </button>
            ) : null}
          </label>
        );
      })}
    </article>
  );
}

function BeoView({
  beo,
  others,
  splitSalon,
  splitLines,
  onSplitSalon,
  onToggleLine,
  onField,
  onValidate,
  onLine,
  onDelete,
  onAdd,
  onMerge,
  onSplit,
}: {
  beo: ReviewBeo;
  others: ReviewBeo[];
  splitSalon: string;
  splitLines: string[];
  onSplitSalon: (value: string) => void;
  onToggleLine: (lineId: string) => void;
  onField: (key: string, value: string, remember: boolean) => void;
  onValidate: (key: string) => void;
  onLine: (line: ReviewLine, qty: number, description: string, unitPrice: string) => void;
  onDelete: (lineId: string) => void;
  onAdd: (
    section: string,
    groupName: string,
    qty: number,
    description: string,
    unitPrice: string,
  ) => void;
  onMerge: (sourceId: string) => void;
  onSplit: () => void;
}) {
  const fields = new Map(beo.fields.map((field) => [field.key, field]));
  const food = beo.lines.filter((line) => line.section === "ALIMENTOS");
  return (
    <article className="beo-sheet">
      <h2>
        {KIND_LABEL[beo.kind] ?? beo.kind} · {beo.salon}
      </h2>
      <p data-testid="pendientes-beo">{beo.pendingCount} pendientes</p>
      <div className="beo-header">
        {HEADER_KEYS.map((key) => (
          <FieldBox key={key} field={fields.get(key)} onSave={onField} onValidate={onValidate} />
        ))}
      </div>
      <div className="beo-header">
        {SUMMARY_KEYS.map((key) => (
          <FieldBox key={key} field={fields.get(key)} onSave={onField} onValidate={onValidate} />
        ))}
      </div>
      <div className="beo-columns">
        <section>
          <h3>Alimentos y bebidas</h3>
          {food.map((line) => (
            <LineBox
              key={line.id}
              line={line}
              checked={splitLines.includes(line.id)}
              onToggle={onToggleLine}
              onSave={onLine}
              onDelete={onDelete}
            />
          ))}
          <AddLine section="ALIMENTOS" groupName="" onAdd={onAdd} />
        </section>
        <section>
          {RIGHT_SECTIONS.map((section) => {
            const lines = beo.lines.filter((line) =>
              section === "PENDIENTE"
                ? line.section === "" || line.section === section
                : line.section === section,
            );
            if (lines.length === 0 && section === "PENDIENTE") return null;
            return (
              <div key={section}>
                <h3>
                  {section === "PERSONAL"
                    ? "Personal"
                    : section.charAt(0) + section.slice(1).toLowerCase()}
                </h3>
                {section === "PERSONAL" ? (
                  <Personnel
                    lines={lines}
                    splitLines={splitLines}
                    onToggle={onToggleLine}
                    onSave={onLine}
                    onDelete={onDelete}
                  />
                ) : (
                  lines.map((line) => (
                    <LineBox
                      key={line.id}
                      line={line}
                      checked={splitLines.includes(line.id)}
                      onToggle={onToggleLine}
                      onSave={onLine}
                      onDelete={onDelete}
                    />
                  ))
                )}
                <AddLine
                  section={section}
                  groupName={section === "PERSONAL" ? "Evento" : ""}
                  onAdd={onAdd}
                />
              </div>
            );
          })}
        </section>
      </div>
      <div className="beo-header">
        {NOTE_KEYS.map((key) => (
          <FieldBox key={key} field={fields.get(key)} onSave={onField} onValidate={onValidate} />
        ))}
      </div>
      <div className="form-inline">
        <label>
          Unir con
          <select
            aria-label="Unir con"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onMerge(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Elegir B.E.O. del mismo día</option>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.salon}
              </option>
            ))}
          </select>
        </label>
        <label>
          Separar hacia el salón
          <input
            aria-label="Salón de la B.E.O. separada"
            value={splitSalon}
            onChange={(event) => onSplitSalon(event.target.value)}
          />
        </label>
        <button type="button" onClick={onSplit}>
          Separar
        </button>
      </div>
    </article>
  );
}

function Personnel({
  lines,
  splitLines,
  onToggle,
  onSave,
  onDelete,
}: {
  lines: ReviewLine[];
  splitLines: string[];
  onToggle: (lineId: string) => void;
  onSave: (line: ReviewLine, qty: number, description: string, unitPrice: string) => void;
  onDelete: (lineId: string) => void;
}) {
  const groups = ["Montaje", "Evento", "Desmontaje"];
  return (
    <>
      {groups.map((group) => {
        const grouped = lines.filter((line) => line.groupName === group);
        if (grouped.length === 0) return null;
        return (
          <div key={group}>
            <h4>{group}</h4>
            {grouped.map((line) => (
              <LineBox
                key={line.id}
                line={line}
                checked={splitLines.includes(line.id)}
                onToggle={onToggle}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function FieldBox({
  field,
  onSave,
  onValidate,
}: {
  field: ReviewField | undefined;
  onSave: (key: string, value: string, remember: boolean) => void;
  onValidate: (key: string) => void;
}) {
  const [remember, setRemember] = useState(false);
  if (!field) return null;
  const open = needsAction(field.status);
  const mark = badge(field.status);
  return (
    <label
      className={`review-field ${tone(field.status)}`}
      data-testid={open ? "campo-abierto" : "campo"}
    >
      <span>
        {FIELD_LABELS[field.key] ?? field.key}
        {mark ? <em className="badge">{mark}</em> : null}
      </span>
      <input
        aria-label={FIELD_LABELS[field.key] ?? field.key}
        defaultValue={shownValue(field.key, field.value)}
        key={`${field.id}-${field.value}-${field.status}`}
        onBlur={(event) => onSave(field.key, event.target.value, remember)}
      />
      {field.status === "AI" || field.status === "REVIEW" || field.status === "VALIDATE" ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onValidate(field.key)}
        >
          Validar
        </button>
      ) : null}
      {field.key === "salonName" && open ? (
        <span>
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />{" "}
          Recordar esta corrección
        </span>
      ) : null}
    </label>
  );
}

function LineBox({
  line,
  checked,
  onToggle,
  onSave,
  onDelete,
}: {
  line: ReviewLine;
  checked: boolean;
  onToggle: (lineId: string) => void;
  onSave: (line: ReviewLine, qty: number, description: string, unitPrice: string) => void;
  onDelete: (lineId: string) => void;
}) {
  const open = needsAction(line.status);
  const price = line.unitPriceCents === null ? "" : formatAmount(line.unitPriceCents);
  return (
    <div
      className={`review-line ${tone(line.status)}`}
      data-testid={open ? "linea-abierta" : "linea"}
    >
      <div className="line-toolbar">
        <label className="check-line">
          <input
            type="checkbox"
            checked={checked}
            aria-label={`Separar ${line.description}`}
            onChange={() => onToggle(line.id)}
          />
          Separar
        </label>
        {badge(line.status) ? <em className="badge">{badge(line.status)}</em> : null}
        <button type="button" className="quiet" onClick={() => onDelete(line.id)}>
          Quitar
        </button>
      </div>
      <div className="line-fields">
        <label>
          Cantidad
          <input
            aria-label="Cantidad"
            defaultValue={String(line.qty)}
            key={`${line.id}-qty-${line.qty}`}
            onBlur={(event) => onSave(line, Number(event.target.value), line.description, price)}
          />
        </label>
        <label>
          Precio
          <input
            aria-label="Precio unitario"
            defaultValue={price}
            key={`${line.id}-price-${price}`}
            onBlur={(event) => onSave(line, line.qty, line.description, event.target.value)}
          />
        </label>
      </div>
      <label>
        Descripción
        <input
          aria-label="Descripción"
          defaultValue={line.description}
          key={`${line.id}-desc-${line.description}`}
          onBlur={(event) => onSave(line, line.qty, event.target.value, price)}
        />
      </label>
      {line.text ? <p className="line-source">{line.text}</p> : null}
    </div>
  );
}

function AddLine({
  section,
  groupName,
  onAdd,
}: {
  section: string;
  groupName: string;
  onAdd: (
    section: string,
    groupName: string,
    qty: number,
    description: string,
    unitPrice: string,
  ) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function open() {
    setQty("1");
    setDescription("");
    setPrice("");
    setLocalError(null);
    dialog.current?.showModal();
  }

  return (
    <div className="add-line">
      <button type="button" onClick={open}>
        Agregar línea
      </button>
      <dialog ref={dialog} className="line-dialog" data-testid="ventana-linea">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = Number(qty);
            if (!description.trim() || !Number.isInteger(parsed) || parsed < 0) {
              setLocalError("La línea necesita cantidad y descripción.");
              return;
            }
            onAdd(section, groupName, parsed, description.trim(), price);
            dialog.current?.close();
          }}
        >
          <label>
            Cantidad
            <input
              aria-label={`Cantidad nueva ${section}`}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
          </label>
          <label>
            Descripción
            <input
              aria-label={`Descripción nueva ${section}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Precio
            <input
              aria-label={`Precio nuevo ${section}`}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          {localError ? <p className="alert">{localError}</p> : null}
          <button type="submit">Agregar</button>
          <button type="button" onClick={() => dialog.current?.close()}>
            Cerrar
          </button>
        </form>
      </dialog>
    </div>
  );
}
