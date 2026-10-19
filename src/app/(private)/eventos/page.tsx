import Link from "next/link";
import { listEvents } from "@/lib/event-history";

type PageProps = {
  searchParams: Promise<{ q?: string; fecha?: string; page?: string }>;
};

export default async function EventosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page);
  const result = await listEvents({
    text: params.q,
    date: params.fecha,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  });
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.fecha) query.set("fecha", params.fecha);

  return (
    <main className="panel">
      <h1>Eventos</h1>
      <p className="lede">Busca un evento por cliente, nombre, fecha o localizador.</p>
      <form className="form-inline" method="get" data-testid="buscar-eventos">
        <label>
          Buscar
          <input name="q" aria-label="Buscar" defaultValue={params.q ?? ""} />
        </label>
        <label>
          Fecha
          <input
            name="fecha"
            aria-label="Fecha"
            placeholder="dd/mm/aaaa"
            defaultValue={params.fecha ?? ""}
          />
        </label>
        <button type="submit">Buscar</button>
      </form>
      <table data-testid="lista-eventos">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Evento</th>
            <th>Fecha</th>
            <th>Localizador</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.events.length === 0 ? (
            <tr>
              <td colSpan={6}>No hay eventos para esa búsqueda.</td>
            </tr>
          ) : null}
          {result.events.map((event) => (
            <tr key={event.id}>
              <td>{event.company}</td>
              <td>{event.title}</td>
              <td>{event.dates}</td>
              <td>{event.locator}</td>
              <td data-testid="estado-evento">{event.status}</td>
              <td>
                <Link href={`/eventos/${event.id}/revision`}>Abrir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {result.page > 1 ? (
          <Link
            href={`/eventos?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page - 1) })}`}
          >
            Anterior
          </Link>
        ) : null}{" "}
        {result.page < result.pages ? (
          <Link
            href={`/eventos?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page + 1) })}`}
          >
            Siguiente
          </Link>
        ) : null}
      </p>
    </main>
  );
}
