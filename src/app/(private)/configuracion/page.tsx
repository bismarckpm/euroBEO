import { parseEventTypes, parsePresentation } from "@/core/beo/presentation";
import { BLOCK_HEADER_KINDS, BLOCK_HEADER_LABELS } from "@/core/config/block-headers";
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
import { listTemplates } from "@/lib/template-store";
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
  changePresentation,
  addEventType,
  dropEventType,
  uploadTemplate,
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
  ["presentacion", "Presentación"],
  ["aprendidas", "Aprendidas"],
  ["plantilla", "Plantilla"],
] as const;

type Tab = (typeof TABS)[number][0];

function activeTab(value: string | undefined): Tab {
  return TABS.some(([id]) => id === value) ? (value as Tab) : "salones";
}

function SectionSelect({
  name,
  defaultValue,
  blockKinds = false,
}: {
  name: string;
  defaultValue?: string;
  blockKinds?: boolean;
}) {
  const sections = BEO_SECTIONS.map((section) => (
    <option key={section} value={section}>
      {SECTION_LABELS[section]}
    </option>
  ));
  return (
    <select name={name} defaultValue={defaultValue ?? "ALIMENTOS"} aria-label="Sección destino">
      {blockKinds ? <optgroup label="Sección de la B.E.O.">{sections}</optgroup> : sections}
      {blockKinds ? (
        <optgroup label="Tipo de bloque">
          {BLOCK_HEADER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {BLOCK_HEADER_LABELS[kind]}
            </option>
          ))}
        </optgroup>
      ) : null}
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
  const [salons, mappings, items, texts, memos, sequence, learned, logs, templates] = await Promise.all([
    listSalons(),
    listMappings(),
    listItems(),
    listFixedTexts(),
    listMemos(),
    readSequence(),
    listLearnedNormalizations(),
    listAiCallLogs(),
    listTemplates(),
  ]);
  const probe = params.prueba?.trim() ? await resolveSalon(params.prueba) : null;
  const presentation = parsePresentation(texts.find((row) => row.key === "beo_presentation")?.body ?? "");
  const eventTypes = parseEventTypes(texts.find((row) => row.key === "event_types")?.body ?? "");

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
              <SectionSelect name="section" blockKinds />
            </label>
            <button type="submit">Agregar sección</button>
          </form>
          <div className="table-scroll">
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
                        <SectionSelect name="section" defaultValue={mapping.section} blockKinds />
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
          </div>
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

      {tab === "plantilla" ? (
        <form action={uploadTemplate} className="stack">
          <h2>Plantilla de la B.E.O.</h2>
          <p className="lede">
            Versión activa: {templates.find((template) => template.active)?.version ?? "ninguna"}. Al subir
            un .docx se comprueba que tenga todos los marcadores. Las B.E.O. ya generadas conservan la
            versión con la que se crearon.
          </p>
          <label>
            Archivo .docx
            <input name="template" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
          </label>
          <button type="submit">Subir plantilla</button>
        </form>
      ) : null}

      {tab === "presentacion" ? (
        <section className="stack">
          <h2>Presentación de la B.E.O.</h2>
          <form action={changePresentation} className="stack">
            <label>
              Campo EVENTO de la cabecera
              <select name="eventHeaderSource" defaultValue={presentation.eventHeaderSource}>
                <option value="client">Cliente</option>
                <option value="title">Título del evento</option>
              </select>
            </label>
            <label>
              Formato de la fecha
              <select name="dateFormat" defaultValue={presentation.dateFormat}>
                <option value="dd/mm/yy">dd/mm/aa</option>
                <option value="dd.mm.yyyy">dd.mm.aaaa</option>
              </select>
            </label>
            <label>
              <input
                name="uppercaseDayAndContact"
                type="checkbox"
                defaultChecked={presentation.uppercaseDayAndContact}
              />
              Día y contacto en mayúsculas
            </label>
            <label>
              <input name="tableCalculation" type="checkbox" defaultChecked={presentation.tableCalculation} />
              Calcular mesas
            </label>
            <label>
              Etiqueta de montaje
              <input name="setupLabel" required defaultValue={presentation.setupLabel} />
            </label>
            <label>
              Etiqueta de servicio
              <input name="serviceLabel" required defaultValue={presentation.serviceLabel} />
            </label>
            <label>
              Etiqueta de desmontaje
              <input name="teardownLabel" required defaultValue={presentation.teardownLabel} />
            </label>
            <button type="submit">Guardar presentación</button>
          </form>
          <h2>Tipos de evento</h2>
          <form action={addEventType} className="form-inline">
            <label>
              Etiqueta
              <input name="label" required maxLength={40} placeholder="LANZAMIENTO" />
            </label>
            <label>
              Palabras clave, separadas por coma
              <input name="keywords" required placeholder="lanzamiento" />
            </label>
            <button type="submit">Agregar tipo</button>
          </form>
          <ul>
            {eventTypes.map((type) => (
              <li key={type.label}>
                <form action={dropEventType} className="form-inline">
                  <span>
                    {type.label}: {type.keywords.join(", ")}
                  </span>
                  <input type="hidden" name="label" value={type.label} />
                  <button className="quiet" type="submit">
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
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
    excludeSetupDays?: boolean;
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
        <input name="excludeSetupDays" type="checkbox" defaultChecked={memo?.excludeSetupDays ?? true} />
        Omitir días que solo son de montaje o desmontaje
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
