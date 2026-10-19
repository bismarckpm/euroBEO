import { BEO_SECTIONS, SECTION_LABELS } from "@/core/config/sections";
import {
  listFixedTexts,
  listItems,
  listMappings,
  listMemos,
  listSalons,
  readSequence,
  resolveSalon,
} from "@/lib/catalog-db";
import { listAiCallLogs, listLearnedNormalizations } from "@/lib/normalization";
import { LearnedPanel } from "./learned";
import {
  addAlias,
  addItem,
  addMapping,
  addMemo,
  addSalon,
  changeItem,
  changeMapping,
  changeMemo,
  changeSalon,
  changeSequence,
  changeTexts,
  dropAlias,
  dropItem,
  dropMapping,
  dropMemo,
  dropSalon,
} from "./actions";

const TABS = [
  ["salones", "Salones"],
  ["secciones", "Secciones"],
  ["items", "Ítems"],
  ["textos", "Textos"],
  ["memorandums", "Memorándums"],
  ["correlativo", "Correlativo"],
  ["aprendidas", "Aprendidas"],
] as const;

type Tab = (typeof TABS)[number][0];

function activeTab(value: string | undefined): Tab {
  return TABS.some(([id]) => id === value) ? (value as Tab) : "salones";
}

function SectionSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? "ALIMENTOS"} aria-label="Sección destino">
      {BEO_SECTIONS.map((section) => (
        <option key={section} value={section}>
          {SECTION_LABELS[section]}
        </option>
      ))}
    </select>
  );
}

export default async function ConfigurationPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    error?: string;
    guardado?: string;
    prueba?: string;
    salon?: string;
    estado?: string;
    llamadas?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = activeTab(params.tab);
  const [salons, mappings, items, texts, memos, sequence, learned, logs] = await Promise.all([
    listSalons(),
    listMappings(),
    listItems(),
    listFixedTexts(),
    listMemos(),
    readSequence(),
    listLearnedNormalizations(),
    listAiCallLogs(),
  ]);
  const probe = params.prueba?.trim() ? await resolveSalon(params.prueba) : null;

  return (
    <main className="panel">
      <h1>Configuración</h1>
      <p className="lede">
        Salones, secciones, ítems, textos fijos, memorándums y correlativo. El parser y la B.E.O.
        usan estos valores.
      </p>
      {params.guardado === "1" ? <p className="notice">Cambios guardados.</p> : null}
      {params.error ? (
        <p className="alert" role="alert">
          {params.error}
        </p>
      ) : null}
      <nav className="tabs" aria-label="Secciones de configuración">
        {TABS.map(([id, label]) => (
          <a
            key={id}
            href={`/configuracion?tab=${id}`}
            aria-current={tab === id ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>

      {tab === "salones" ? (
        <section>
          <form action={addSalon} className="form-inline">
            <label>
              Nombre oficial
              <input name="name" required maxLength={120} />
            </label>
            <button type="submit">Agregar salón</button>
          </form>
          <form action={addAlias} className="form-inline">
            <label>
              Salón del alias
              <select name="salonId" required defaultValue={salons[0]?.id ?? ""}>
                {salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alias
              <input name="label" required maxLength={160} />
            </label>
            <button type="submit">Agregar alias</button>
          </form>
          <form className="form-inline" method="get">
            <input type="hidden" name="tab" value="salones" />
            <label>
              Probar un texto
              <input name="prueba" defaultValue={params.prueba ?? ""} />
            </label>
            <button type="submit">Probar</button>
          </form>
          {probe ? (
            <p className="resolution" data-testid="resolucion">
              {probe.status === "resolved" ? `Resuelto: ${probe.name}` : "No resuelto"}
            </p>
          ) : null}
          <div className="stack">
            {salons.map((salon) => (
              <article key={salon.id}>
                <form action={changeSalon} className="form-inline">
                  <input type="hidden" name="id" value={salon.id} />
                  <label>
                    Nombre de {salon.name}
                    <input name="name" defaultValue={salon.name} required maxLength={120} />
                  </label>
                  <button type="submit">Guardar nombre</button>
                </form>
                <ul>
                  {salon.aliases.map((alias) => (
                    <li key={alias.id}>
                      {alias.label}{" "}
                      <form action={dropAlias} className="form-inline">
                        <input type="hidden" name="id" value={alias.id} />
                        <button className="quiet" type="submit">
                          Quitar alias
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={dropSalon}>
                  <input type="hidden" name="id" value={salon.id} />
                  <button className="quiet" type="submit">
                    Eliminar salón
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "secciones" ? (
        <section>
          <form action={addMapping} className="form-inline">
            <label>
              Encabezado del presupuesto
              <input name="header" required maxLength={160} />
            </label>
            <label>
              Sección destino
              <SectionSelect name="section" />
            </label>
            <button type="submit">Agregar sección</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Encabezado</th>
                <th>Destino</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) => (
                <tr key={mapping.id}>
                  <td colSpan={3}>
                    <form action={changeMapping} className="form-inline">
                      <input type="hidden" name="id" value={mapping.id} />
                      <label>
                        Encabezado
                        <input
                          name="header"
                          defaultValue={mapping.header}
                          required
                          maxLength={160}
                        />
                      </label>
                      <label>
                        Sección destino
                        <SectionSelect name="section" defaultValue={mapping.section} />
                      </label>
                      <button type="submit">Guardar</button>
                    </form>
                    <form action={dropMapping}>
                      <input type="hidden" name="id" value={mapping.id} />
                      <button className="quiet" type="submit">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "items" ? (
        <section>
          <form action={addItem} className="form-inline">
            <label>
              Descripción
              <input name="description" required maxLength={160} />
            </label>
            <label>
              Categoría
              <input name="category" required maxLength={80} />
            </label>
            <label>
              Sección destino
              <SectionSelect name="section" />
            </label>
            <button type="submit">Agregar ítem</button>
          </form>
          {items.map((item) => (
            <form key={item.id} action={changeItem} className="form-inline">
              <input type="hidden" name="id" value={item.id} />
              <label>
                Descripción
                <input
                  name="description"
                  defaultValue={item.description}
                  required
                  maxLength={160}
                />
              </label>
              <label>
                Categoría
                <input name="category" defaultValue={item.category} required maxLength={80} />
              </label>
              <label>
                Sección destino
                <SectionSelect name="section" defaultValue={item.section} />
              </label>
              <button type="submit">Guardar</button>
              <button className="quiet" type="submit" formAction={dropItem}>
                Eliminar
              </button>
            </form>
          ))}
        </section>
      ) : null}

      {tab === "textos" ? (
        <form action={changeTexts} className="stack">
          <p className="lede">
            Estos textos se usan al proponer cada B.E.O. Si alguno dice Pendiente, reemplázalo por
            el texto vigente del hotel.
          </p>
          {texts.map((text) => (
            <label key={text.key}>
              {text.label}
              <textarea name={text.key} required maxLength={4000} defaultValue={text.body} />
            </label>
          ))}
          <button type="submit">Guardar textos</button>
        </form>
      ) : null}

      {tab === "memorandums" ? (
        <section className="stack">
          <form action={addMemo} className="stack">
            <h2>Nuevo memorándum</h2>
            <MemoFields />
            <button type="submit">Agregar memorándum</button>
          </form>
          {memos.map((memo) => (
            <form key={memo.id} action={changeMemo} className="stack">
              <input type="hidden" name="id" value={memo.id} />
              <MemoFields memo={memo} />
              <button type="submit">Guardar memorándum</button>
              <button className="quiet" type="submit" formAction={dropMemo}>
                Eliminar memorándum
              </button>
            </form>
          ))}
        </section>
      ) : null}

      {tab === "correlativo" ? (
        <form action={changeSequence} className="stack">
          <p>
            Último emitido: <strong>{sequence?.last ?? "sin configurar"}</strong>
          </p>
          <p>
            Próximo número: <strong>{sequence?.next ?? "—"}</strong>
          </p>
          <label>
            Último número emitido
            <input
              name="code"
              required
              defaultValue={sequence?.last ?? ""}
              placeholder="0.947/26"
            />
          </label>
          <button type="submit">Guardar correlativo</button>
        </form>
      ) : null}

      {tab === "aprendidas" ? (
        <LearnedPanel
          salons={salons}
          memos={memos}
          rows={learned}
          logs={logs}
          probe={
            params.estado
              ? { salon: params.salon ?? "", status: params.estado, calls: params.llamadas ?? "0" }
              : null
          }
        />
      ) : null}
    </main>
  );
}

function MemoFields({
  memo,
}: {
  memo?: {
    name: string;
    recipient: string;
    company: string;
    reference: string;
    body: string;
    keywords: string[];
    templateFile: string;
  };
}) {
  return (
    <>
      <label>
        Nombre
        <input name="name" required maxLength={120} defaultValue={memo?.name ?? ""} />
      </label>
      <label>
        Destinatario
        <input name="recipient" required maxLength={160} defaultValue={memo?.recipient ?? ""} />
      </label>
      <label>
        Empresa
        <input name="company" required maxLength={160} defaultValue={memo?.company ?? ""} />
      </label>
      <label>
        Referencia
        <input name="reference" required maxLength={160} defaultValue={memo?.reference ?? ""} />
      </label>
      <label>
        Cuerpo
        <textarea
          name="body"
          required
          maxLength={4000}
          defaultValue={memo?.body ?? "Evento {evento}, días {dias}, salones {salones}."}
        />
      </label>
      <label>
        Palabras clave, separadas por coma
        <input name="keywords" required defaultValue={memo?.keywords.join(", ") ?? ""} />
      </label>
      <label>
        Plantilla .docx
        <input
          name="templateFile"
          required
          maxLength={240}
          defaultValue={memo?.templateFile ?? "templates/memo-estacionamiento.docx"}
        />
      </label>
    </>
  );
}
