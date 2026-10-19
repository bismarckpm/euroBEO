"use client";

import { useState } from "react";
import type { EventReview, ReviewBeo, ReviewField, ReviewLine } from "@/lib/event-review";
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
};

const HEADER_KEYS = ["weekday", "formattedDate", "schedule", "eventType", "salonName"];
const SUMMARY_KEYS = ["guarantee", "rentCents", "billboard", "setup"];
const NOTE_KEYS = ["specialInstructions", "servicePreparation", "company", "contact", "phone", "address"];
const RIGHT_SECTIONS = ["BEBIDAS", "ACCESOS", "DESCORCHE", "SISTEMAS", "MOBILIARIO", "ELECTRICIDAD", "PERSONAL", "PENDIENTE"];
const KIND_LABEL: Record<string, string> = { MONTAJE: "Montaje", EVENTO: "Evento", DESMONTAJE: "Desmontaje" };

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

function tone(status: string): string {
  if (status === "AI") return "field-ai";
  if (status === "PENDING" || status === "REVIEW") return "field-pending";
  return "field-rule";
}

export function ReviewScreen({ initial }: { initial: EventReview }) {
  const [review, setReview] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.beos[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(initial.shared);
  const [splitSalon, setSplitSalon] = useState("");
  const [splitLines, setSplitLines] = useState<string[]>([]);
  const selected = review.beos.find((beo) => beo.id === selectedId) ?? review.beos[0];

  async function send(body: Record<string, unknown>, notice?: string) {
    setError(null);
    const response = await fetch(`/api/events/${review.eventId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as EventReview & { message?: string; started?: boolean; documents?: number };
    if (!response.ok) {
      setError(data.message ?? "No se pudo guardar.");
      return;
    }
    if (data.started) {
      setMessage(notice ?? "Se inició la generación de los documentos del evento.");
      return;
    }
    setReview(data);
    setShared(data.shared);
    if (!data.beos.some((beo) => beo.id === selectedId)) {
      setSelectedId(data.beos[0]?.id ?? "");
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
          <button
            type="button"
            data-testid="confirmar-generar"
            disabled={review.pendingCount > 0}
            onClick={() => void send({ action: "generate" })}
          >
            Confirmar y generar
          </button>
        </div>
      </header>
      {error ? <p className="alert">{error}</p> : null}
      {message ? <p className="notice" data-testid="generacion">{message}</p> : null}

      <section className="review-shared" data-testid="datos-compartidos">
        <h2>Datos del evento</h2>
        <div className="form-inline">
          {(["billboard", "company", "contact", "phone"] as const).map((key) => (
            <label key={key}>
              {FIELD_LABELS[key]} del evento
              <input
                aria-label={`${FIELD_LABELS[key]} del evento`}
                value={shared[key] ?? ""}
                onChange={(event) => setShared((current) => ({ ...current, [key]: event.target.value }))}
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
              onClick={() => setSelectedId(beo.id)}
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
            <p key={memo.id} data-testid="memo-nav">
              {memo.name} · {memo.pendingCount}
            </p>
          ))}
        </nav>

        {selected ? (
          <BeoView
            beo={selected}
            others={review.beos.filter((beo) => beo.id !== selected.id && beo.date === selected.date)}
            splitSalon={splitSalon}
            splitLines={splitLines}
            onSplitSalon={setSplitSalon}
            onToggleLine={(lineId) =>
              setSplitLines((current) =>
                current.includes(lineId) ? current.filter((id) => id !== lineId) : [...current, lineId],
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
              void send({ action: "add-line", beoId: selected.id, section, groupName, qty, description, unitPrice })
            }
            onMerge={(sourceId) => void send({ action: "merge", targetId: selected.id, sourceId })}
            onSplit={() =>
              void send({ action: "split", beoId: selected.id, salon: splitSalon, lineIds: splitLines })
            }
          />
        ) : (
          <p>Este evento no tiene B.E.O. propuestas.</p>
        )}
      </div>
    </main>
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
  onAdd: (section: string, groupName: string, qty: number, description: string, unitPrice: string) => void;
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
            <LineBox key={line.id} line={line} checked={splitLines.includes(line.id)} onToggle={onToggleLine} onSave={onLine} onDelete={onDelete} />
          ))}
          <AddLine section="ALIMENTOS" groupName="" onAdd={onAdd} />
        </section>
        <section>
          {RIGHT_SECTIONS.map((section) => {
            const lines = beo.lines.filter((line) => line.section === section);
            if (lines.length === 0 && section === "PENDIENTE") return null;
            return (
              <div key={section}>
                <h3>{section === "PERSONAL" ? "Personal" : section.charAt(0) + section.slice(1).toLowerCase()}</h3>
                {section === "PERSONAL" ? <Personnel lines={lines} splitLines={splitLines} onToggle={onToggleLine} onSave={onLine} onDelete={onDelete} /> : lines.map((line) => (
                  <LineBox key={line.id} line={line} checked={splitLines.includes(line.id)} onToggle={onToggleLine} onSave={onLine} onDelete={onDelete} />
                ))}
                <AddLine section={section} groupName={section === "PERSONAL" ? "Evento" : ""} onAdd={onAdd} />
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
          <input aria-label="Salón de la B.E.O. separada" value={splitSalon} onChange={(event) => onSplitSalon(event.target.value)} />
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
              <LineBox key={line.id} line={line} checked={splitLines.includes(line.id)} onToggle={onToggle} onSave={onSave} onDelete={onDelete} />
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
    <label className={`review-field ${tone(field.status)}`} data-testid={open ? "campo-abierto" : "campo"}>
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
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onValidate(field.key)}>
          Validar
        </button>
      ) : null}
      {field.key === "salonName" && open ? (
        <span>
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Recordar esta corrección
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
    <div className={`review-line ${tone(line.status)}`} data-testid={open ? "linea-abierta" : "linea"}>
      <label>
        Separar
        <input type="checkbox" checked={checked} aria-label={`Separar ${line.description}`} onChange={() => onToggle(line.id)} />
      </label>
      <input aria-label="Cantidad" defaultValue={String(line.qty)} key={`${line.id}-qty-${line.qty}`} onBlur={(event) => onSave(line, Number(event.target.value), line.description, price)} />
      <input aria-label="Descripción" defaultValue={line.description} key={`${line.id}-desc-${line.description}`} onBlur={(event) => onSave(line, line.qty, event.target.value, price)} />
      <input aria-label="Precio unitario" defaultValue={price} key={`${line.id}-price-${price}`} onBlur={(event) => onSave(line, line.qty, line.description, event.target.value)} />
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
  onAdd: (section: string, groupName: string, qty: number, description: string, unitPrice: string) => void;
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
        <input aria-label={`Cantidad nueva ${section}`} value={qty} onChange={(event) => setQty(event.target.value)} />
      </label>
      <label>
        Descripción
        <input aria-label={`Descripción nueva ${section}`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Precio
        <input aria-label={`Precio nuevo ${section}`} value={price} onChange={(event) => setPrice(event.target.value)} />
      </label>
      <button type="submit">Agregar línea</button>
    </form>
  );
}
