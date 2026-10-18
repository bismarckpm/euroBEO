import { requireUser } from "@/lib/current-user";
import { saveProfile } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <main className="panel">
      <h1>Perfil</h1>
      <p className="lede">El nombre y el cargo se usan como firma de los memorándums.</p>
      {params.guardado === "1" ? <p className="notice">Perfil actualizado.</p> : null}
      {params.error === "datos" ? (
        <p className="alert" role="alert">
          El nombre y el cargo son obligatorios.
        </p>
      ) : null}
      <form action={saveProfile}>
        <label>
          Nombre
          <input name="name" defaultValue={user.name} required maxLength={120} />
        </label>
        <label>
          Cargo
          <input name="title" defaultValue={user.title} required maxLength={120} />
        </label>
        <button type="submit">Guardar</button>
      </form>
    </main>
  );
}
