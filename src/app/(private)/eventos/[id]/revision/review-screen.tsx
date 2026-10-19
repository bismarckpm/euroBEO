"use client";

import { useEffect, useState } from "react";
import type {
  EventReview,
  ReviewBeo,
  ReviewField,
  ReviewLine,
  ReviewMemo,
} from "@/lib/event-review";
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

function shownValue(key: string, value: string | null): string {
  if (value === null) return "";
  if (key === "rentCents" && /^-?\d+$/.test(value)) return formatAmount(Number(value));
  return value;
}

function badge(status: string): string {
  if (status === "AI") return "IA";
  if (status === "PENDING") return "Pendiente";
  if (status === "REVIEW") return "Revisar";
  return "";
}

type GeneratedFile = {
  id: string;
  fileName: string;
  number: string;
  exceedsPage: boolean;
  driveStatus?: string;
  driveUrl?: string | null;
};

function driveLabel(status: string | undefined): string {
  if (status === "subido") return "Subido";
  if (status === "error") return "Error al subir";
  return "Pendiente de subir";
}

function tone(status: string): string {
  if (status === "AI") return "field-ai";
  if (status === "PENDING" || status === "REVIEW") return "field-pending";
  return "field-rule";
}

export function ReviewScreen({ initial }: { initial: EventReview }) {
  const [review, setReview] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.beos[0]?.id ?? "");
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(initial.shared);
  const [splitSalon, setSplitSalon] = useState("");
  const [splitLines, setSplitLines] = useState<string[]>([]);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [acknowledge, setAcknowledge] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);
  const selected = review.beos.find((beo) => beo.id === selectedId) ?? review.beos[0];
  const selectedMemo = review.memos.find((memo) => memo.id === selectedMemoId) ?? null;

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
  }, [review.eventId, review.pendingCount, review.beos.length]);

  async function send(body: Record<string, unknown>, notice?: string) {
    setError(null);
    const response = await fetch(`/api/events/${review.eventId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as EventReview & {
      message?: string;
      started?: boolean;
      files?: GeneratedFile[];
      driveMessage?: string | null;
    };
    if (!response.ok) {
      if (response.status === 409 && (data.message ?? "").includes("ya fue usado")) {
        setAcknowledge(true);
      }
      setError(data.message ?? "No se pudo guardar.");
      return;
    }
    if (data.started) {
      setFiles(data.files ?? []);
      setDriveNotice(data.driveMessage ?? null);
      setAcknowledge(false);
      setMessage(notice ?? "Se inició la generación de los documentos del evento.");
      const refreshed = await fetch(`/api/events/${review.eventId}/review`);
      if (refreshed.ok) {
        const next = (await refreshed.json()) as EventReview;
        setReview(next);
        setShared(next.shared);
      }
      return;
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
  }

  async function confirmShared() {
    for (const key of ["billboard", "company", "contact", "phone"] as const) {
      await send({ action: "update-shared", key, value: shared[key] ?? "" });
    }
    setMessage("Datos del evento replicados.");
  }

  return (
    <main className="panel review">
      <header className="review-heading">
        <div>
          <h1>Revisión</h1>
          <p className="lede">{review.title}</p>
        </div>
        <div>
          <p data-testid="pendientes-evento">
            {review.pendingCount === 0 ? "Sin pendientes" : `Faltan ${review.pendingCount}`}
          </p>
          {review.pendingCount === 0 ? (
            <div className="form-inline" data-testid="numeros-beo">
              {review.beos.map((beo, index) => (
                <label key={beo.id}>
                  {`Número ${index + 1}`}
                  <input
                    aria-label={`Número ${index + 1}`}
                    value={numbers[index] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAcknowledge(false);
                      setNumbers((current) => {
                        const next = review.beos.map((_, itemIndex) => current[itemIndex] ?? "");
                        next[index] = value;
                        return next;
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            data-testid="confirmar-generar"
            disabled={review.pendingCount > 0}
            onClick={() => void send({ action: "generate", numbers, acknowledge })}
          >
            Confirmar y generar
          </button>
        </div>
      </header>
      {error ? <p className="alert">{error}</p> : null}
      {message ? (
        <p className="notice" data-testid="generacion">
          {message}
        </p>
      ) : null}
      {files.length > 0 ? (
        <section data-testid="descargas">
          {driveNotice ? <p data-testid="drive-aviso">{driveNotice}</p> : null}
          {files.map((file) => (
            <p key={file.id}>
              <a href={`/api/events/${review.eventId}/documents/${file.id}?format=docx`}>
                {file.fileName}
              </a>{" "}
              <a href={`/api/events/${review.eventId}/documents/${file.id}?format=pdf`}>PDF</a>
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
              {file.driveStatus === "error" ||
              file.driveStatus === "pendiente" ||
              !file.driveStatus ? (
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
            </p>
          ))}
          <a href={`/api/events/${review.eventId}/documents/archive`}>Descargar todo</a>
        </section>
      ) : null}

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

      <div className="review-layout">
        <nav className="review-nav" aria-label="Documentos del evento">
          <h2>B.E.O.</h2>
          {review.beos.map((beo) => (
            <button
              key={beo.id}
              type="button"
              data-testid="beo-nav"
              aria-current={beo.id === selected?.id ? "page" : undefined}
              onClick={() => {
                setSelectedMemoId(null);
                setSelectedId(beo.id);
              }}
            >
              <span>
                {beo.date.slice(8)}.{beo.date.slice(5, 7)}.{beo.date.slice(0, 4)} · {beo.salon}
              </span>
              <small>
                {KIND_LABEL[beo.kind] ?? beo.kind} · {beo.pendingCount}
              </small>
            </button>
          ))}
          <h2>Memorándums</h2>
          {review.memos.length === 0 ? <p>Ninguno</p> : null}
          {review.memos.map((memo) => (
            <button
              key={memo.id}
              type="button"
              data-testid="memo-nav"
              aria-current={memo.id === selectedMemo?.id ? "page" : undefined}
              onClick={() => setSelectedMemoId(memo.id)}
            >
              <span>
                {memo.name}
                {memo.stale ? " · desactualizado" : ""}
              </span>
              <small>{memo.pendingCount}</small>
            </button>
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

        {selectedMemo ? (
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
        ) : selected ? (
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
        ) : (
          <p>Este evento no tiene B.E.O. propuestas.</p>
        )}
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
        const open = field.status !== "RULE";
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
            {field.status === "AI" || field.status === "REVIEW" ? (
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
            const lines = beo.lines.filter((line) => line.section === section);
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
  const open = field.status !== "RULE";
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
      {field.status === "AI" || field.status === "REVIEW" ? (
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
  const open = line.status !== "RULE";
  const price = line.unitPriceCents === null ? "" : formatAmount(line.unitPriceCents);
  return (
    <div
      className={`review-line ${tone(line.status)}`}
      data-testid={open ? "linea-abierta" : "linea"}
    >
      <label>
        Separar
        <input
          type="checkbox"
          checked={checked}
          aria-label={`Separar ${line.description}`}
          onChange={() => onToggle(line.id)}
        />
      </label>
      <input
        aria-label="Cantidad"
        defaultValue={String(line.qty)}
        key={`${line.id}-qty-${line.qty}`}
        onBlur={(event) => onSave(line, Number(event.target.value), line.description, price)}
      />
      <input
        aria-label="Descripción"
        defaultValue={line.description}
        key={`${line.id}-desc-${line.description}`}
        onBlur={(event) => onSave(line, line.qty, event.target.value, price)}
      />
      <input
        aria-label="Precio unitario"
        defaultValue={price}
        key={`${line.id}-price-${price}`}
        onBlur={(event) => onSave(line, line.qty, line.description, event.target.value)}
      />
      <p>{line.text}</p>
      {badge(line.status) ? <em className="badge">{badge(line.status)}</em> : null}
      <button type="button" className="quiet" onClick={() => onDelete(line.id)}>
        Quitar
      </button>
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
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  return (
    <form
      className="form-inline"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(section, groupName, Number(qty), description, price);
        setDescription("");
        setPrice("");
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
      <button type="submit">Agregar línea</button>
    </form>
  );
}
