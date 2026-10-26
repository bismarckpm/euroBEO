"use client";

import { useState } from "react";
import Link from "next/link";
import type { BudgetUploadView } from "@/core/budget/view";
import { formatAmount } from "@/lib/format";

type UploadResponse = BudgetUploadView & {
  saved?: boolean;
  duplicate?: boolean;
  message?: string;
  version?: number;
  eventId?: string;
  origin?: string;
  differences?: { field: string; before: string; after: string }[];
  arithmetic?: { equation: string; cell: string; message: string }[];
};

export function BudgetUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [pending, setPending] = useState(false);

  async function send(selected: File, options: { newVersion?: boolean }) {
    const data = new FormData();
    data.set("file", selected);
    if (options.newVersion) {
      data.set("newVersion", "1");
    }
    setPending(true);
    try {
      const response = await fetch("/api/budgets", { method: "POST", body: data });
      const body = (await response.json().catch(() => null)) as UploadResponse | null;
      setResult(body ?? ({ message: "No se pudo leer el presupuesto.", saved: false } as UploadResponse));
    } catch {
      setResult({ message: "No se pudo leer el presupuesto.", saved: false } as UploadResponse);
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
        <p className={result.saved ? "notice" : "alert"} data-testid="mensaje-presupuesto">
          {result.message}
        </p>
      ) : null}
      {result?.origin === "escaneo" ? <p data-testid="origen-escaneo">Origen: escaneo</p> : null}
      {result?.arithmetic && result.arithmetic.length > 0 ? (
        <ul data-testid="aritmetica">
          {result.arithmetic.map((issue) => (
            <li key={`${issue.equation}-${issue.cell}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {result?.differences && result.differences.length > 0 ? (
        <ul data-testid="diferencias-escaneo">
          {result.differences.map((difference) => (
            <li key={difference.field}>
              {difference.field}: {difference.before} → {difference.after}
            </li>
          ))}
        </ul>
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

      {result?.company || result?.title || result?.saved ? (
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
