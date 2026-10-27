import { BEO_SECTIONS, SECTION_LABELS } from "@/core/config/sections";
import { addLearned, changeLearned, disableLearned, processSample } from "./actions";

type LearnedRow = {
  id: string;
  task: string;
  sourceText: string;
  result: unknown;
  active: boolean;
  updatedAt: Date;
};

type CallRow = {
  id: string;
  task: string;
  fragment: string;
  valid: boolean;
  createdAt: Date;
};

const TASK_LABELS: Record<string, string> = {
  block_fields: "Salón y bloque",
  item_section: "Sección de ítem",
  trigger_clause: "Memorándum",
};

const STATUS_LABELS: Record<string, string> = {
  RULE: "Regla",
  AI: "IA",
  PENDING: "Pendiente",
  ABSENT: "Sin dato",
};

function formatStamp(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function resultValue(task: string, result: unknown): string {
  if (!result || typeof result !== "object") {
    return "";
  }
  if (task === "block_fields" && "salon" in result && typeof result.salon === "string") {
    return result.salon;
  }
  if (task === "item_section" && "target" in result && typeof result.target === "string") {
    return result.target;
  }
  if (
    task === "trigger_clause" &&
    "memoTypeKey" in result &&
    typeof result.memoTypeKey === "string"
  ) {
    return result.memoTypeKey;
  }
  return "";
}

function resultLabel(task: string, result: unknown): string {
  const value = resultValue(task, result);
  if (!value) {
    return "—";
  }
  if (task === "item_section" && value in SECTION_LABELS) {
    return SECTION_LABELS[value as keyof typeof SECTION_LABELS];
  }
  return value;
}

function resultOptions(
  task: string,
  salons: { name: string }[],
  memos: { name: string }[],
): { value: string; label: string }[] {
  if (task === "item_section") {
    return BEO_SECTIONS.map((section) => ({ value: section, label: SECTION_LABELS[section] }));
  }
  if (task === "trigger_clause") {
    return memos.map((memo) => ({ value: memo.name, label: memo.name }));
  }
  return salons.map((salon) => ({ value: salon.name, label: salon.name }));
}

export function LearnedPanel({
  salons,
  memos,
  rows,
  logs,
  probe,
}: {
  salons: { id: string; name: string }[];
  memos: { id: string; name: string }[];
  rows: LearnedRow[];
  logs: CallRow[];
  probe: { salon: string; status: string; calls: string } | null;
}) {
  return (
    <section className="stack">
      <p className="lede">
        Cuando confirmas un texto libre, la próxima lectura lo resuelve sin llamar a la IA. Puedes
        corregirlo o desactivarlo.
      </p>
      <form action={addLearned} className="stack">
        <label>
          Texto original
          <input name="sourceText" required maxLength={500} />
        </label>
        <label>
          Tarea
          <select name="task" defaultValue="block_fields">
            <option value="block_fields">Salón y bloque</option>
            <option value="item_section">Sección de ítem</option>
            <option value="trigger_clause">Memorándum</option>
          </select>
        </label>
        <label>
          Salón aprendido
          <select name="salon" defaultValue={salons[0]?.name ?? ""}>
            {salons.map((salon) => (
              <option key={salon.id} value={salon.name}>
                {salon.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sección aprendida
          <select name="section" defaultValue="ALIMENTOS">
            {BEO_SECTIONS.map((section) => (
              <option key={section} value={section}>
                {SECTION_LABELS[section]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Memorándum aprendido
          <select name="memo" defaultValue={memos[0]?.name ?? ""}>
            {memos.map((memo) => (
              <option key={memo.id} value={memo.name}>
                {memo.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Guardar normalización</button>
      </form>

      <form action={processSample} className="form-inline">
        <label>
          Texto a procesar
          <input name="sample" required maxLength={500} />
        </label>
        <button type="submit">Procesar texto</button>
      </form>
      {probe ? (
        <p data-testid="normalizacion">
          {probe.salon || "Sin salón"} · {STATUS_LABELS[probe.status] ?? probe.status} ·{" "}
          {probe.calls === "0" ? "Sin llamada a la IA" : "Llamó a la IA"}
        </p>
      ) : null}

      {rows.length === 0 ? <p>No hay normalizaciones aprendidas.</p> : null}
      {rows.map((row) => (
        <form key={row.id} action={changeLearned} className="form-inline">
          <input type="hidden" name="id" value={row.id} />
          <p>
            <strong>{row.sourceText}</strong> · {TASK_LABELS[row.task] ?? row.task} ·{" "}
            {resultLabel(row.task, row.result)} · {formatStamp(row.updatedAt)} ·{" "}
            {row.active ? "Activa" : "Inactiva"}
          </p>
          <label>
            Resultado de {row.sourceText}
            <select name="result" defaultValue={resultValue(row.task, row.result)}>
              {resultOptions(row.task, salons, memos).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Guardar cambio</button>
          <button className="quiet" type="submit" formAction={disableLearned}>
            Desactivar
          </button>
        </form>
      ))}

      <h2>Registro de IA</h2>
      <div data-testid="registro-ia">
        {logs.length === 0 ? <p>No hay llamadas registradas.</p> : null}
        {logs.map((log) => (
          <p key={log.id}>
            {formatStamp(log.createdAt)} · {TASK_LABELS[log.task] ?? log.task} ·{" "}
            {log.valid ? "Válida" : "Rechazada"} · {log.fragment}
          </p>
        ))}
      </div>
    </section>
  );
}
