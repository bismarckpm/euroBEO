import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

const GENERIC_ERROR = "Usuario o contraseña incorrectos";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const failed = params.error === "credenciales";

  return (
    <main className="login-screen">
      <section className="card">
        <p className="brand">Eurobuilding</p>
        <h1>Iniciar sesión</h1>
        <p className="lede">Acceso de la asistente de ventas.</p>
        {failed ? (
          <p className="alert" role="alert">
            {GENERIC_ERROR}
          </p>
        ) : null}
        <form action="/api/auth/login" method="post">
          <label>
            Usuario
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Ingresar</button>
        </form>
      </section>
    </main>
  );
}
