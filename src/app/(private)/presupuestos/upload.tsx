"use client";

import { useState } from "react";
import Link from "next/link";
import type { BudgetUploadView } from "@/core/budget/view";
import { formatAmount } from "@/lib/format";

type UploadResponse = BudgetUploadView & {
  saved?: boolean;
  duplicate?: boolean;
  needsJustification?: boolean;
  message?: string;
  version?: number;
  eventId?: string;
};

export function BudgetUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [justification, setJustification] = useState("");
  const [pending, setPending] = useState(false);

  async function send(selected: File, options: { newVersion?: boolean; justification?: string }) {
    const data = new FormData();
    data.set("file", selected);
    if (options.newVersion) {
      data.set("newVersion", "1");
    }
    if (options.justification) {
      data.set("justification", options.justification);
    }
    setPending(true);
    try {
      const response = await fetch("/api/budgets", { method: "POST", body: data });
      setResult((await response.json()) as UploadResponse);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        const selected = new FormData(event.currentTarget).get("file");
        const chosen = selected instanceof File && selected.size > 0 ? selected : file;
        if (!chosen) {
          return;
        }
        setFile(chosen);
        void send(chosen, {});
      }}
    >
      <label>
        Presupuesto PDF
        <input
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
          }}
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Leyendo…" : "Leer presupuesto"}
      </button>

      {result?.message ? (
        <p className={result.saved ? "notice" : "alert"}>{result.message}</p>
      ) : null}

      {result?.duplicate ? (
        <button
          type="button"
          disabled={pending || !file}
          onClick={() => file && void send(file, { newVersion: true })}
        >
          Guardar como nueva versión
        </button>
      ) : null}

      {result?.structureErrors && result.structureErrors.length > 0 ? (
        <ul>
          {result.structureErrors.map((error) => (
            <li key={`${error.page}-${error.section}`}>
              Página {error.page}, {error.section}: {error.message}
            </li>
          ))}
        </ul>
      ) : null}

      {result?.needsJustification ? (
        <label>
          Justificación de la diferencia
          <textarea
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
          />
          <button
            type="button"
            disabled={pending || justification.trim().length === 0}
            onClick={() => file && void send(file, { justification })}
          >
            Justificar y continuar
          </button>
        </label>
      ) : null}

      {result?.reconciliation &&
      !result.reconciliation.ok &&
      result.reconciliation.difference !== null ? (
        <p>
          Suma leída {formatAmount(result.reconciliation.actual)}. Subtotal{" "}
          {result.reconciliation.expected === null
            ? "—"
            : formatAmount(result.reconciliation.expected)}
          . Diferencia {formatAmount(result.reconciliation.difference)}.
        </p>
      ) : null}

      {result?.company || result?.title ? (
        <section data-testid="resumen">
          <h2>Resumen</h2>
          <p>
            {result.company ?? "Sin empresa"}
            {result.title ? ` — ${result.title}` : ""}
            {result.locator ? ` · Localizador ${result.locator}` : ""}
          </p>
          <p>
            {result.dayCount} días, {result.blockCount} bloques. Subtotal{" "}
            {result.subtotalCents === null ? "—" : formatAmount(result.subtotalCents)}.
          </p>
          {result.reconciliation?.ok ? <p>Sin diferencias.</p> : null}
          {result.triggers && result.triggers.length > 0 ? (
            <p>Disparadores: {result.triggers.join(", ")}.</p>
          ) : null}
          {typeof result.version === "number" ? <p>Versión {result.version}.</p> : null}
          {result.saved && result.eventId ? (
            <p>
              <Link href={`/eventos/${result.eventId}/revision`}>Revisar evento</Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </form>
  );
}
